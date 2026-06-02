package com.DogMate.Service;

import com.DogMate.Domain.*;
import com.DogMate.util.PhoneValidation;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;
@Service
public class UserService {
    
    private final IUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final IReminderRepository reminderRepository;
    private final ISupportRequestRepository supportRequestRepository;
    private final JavaMailSender mailSender;
    private final String supportEmail;

    @Autowired
    public UserService(IUserRepository userRepository, PasswordEncoder passwordEncoder,
                       IReminderRepository reminderRepository,
                       ISupportRequestRepository supportRequestRepository,
                       ObjectProvider<JavaMailSender> mailSenderProvider,
                       @Value("${dogmate.support.email:dogmateteam@gmail.com}") String supportEmail) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.reminderRepository = reminderRepository;
        this.supportRequestRepository = supportRequestRepository;
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.supportEmail = supportEmail;
        // createAdminUser("admin2@gmail.com", "123456", "Admin");    
    }

    /**
     * Register a new regular user
     * Service layer - only orchestration, no business logic
     * @param email User's email address
     * @param password Plain text password (will be hashed by domain)
     * @param firstName User's first name
     * @param lastName User's last name
//     * @param profileImageUrl Optional profile image URL
     * @return The created RegularUser entity
     * @throws IllegalArgumentException if email already exists or validation fails
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public RegularUser registerUser(String email, String password,
                                     String firstName, String lastName) {
        return registerUser(email, password, firstName, lastName, null);
    }

    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public RegularUser registerUser(String email, String password,
                                     String firstName, String lastName, String phoneNumber) {
        boolean emailExists = userRepository.existsByEmail(email);

        RegularUser newUser = RegularUser.create(
            email, password, firstName, lastName,
            emailExists, passwordEncoder::encode
        );
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            newUser.setPhoneNumber(phoneNumber);
        }

        UserAccount savedUser = userRepository.save(newUser);
        return (RegularUser) savedUser;
    }

    /**
     * Creates an owner after email OTP; password is already bcrypt-hashed (from pending registration).
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public RegularUser registerRegularUserFromPending(
        String email,
        String passwordHash,
        String firstName,
        String lastName,
        String phoneNumber,
        LocalDate birthDate
    ) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("כתובת המייל כבר קיימת במערכת: " + email);
        }
        RegularUser newUser = RegularUser.createWithHashedPassword(email, passwordHash, firstName, lastName, null);
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            newUser.setPhoneNumber(phoneNumber);
        }
        newUser.setBirthDate(birthDate);
        UserAccount savedUser = userRepository.save(newUser);
        return (RegularUser) savedUser;
    }

    /**
     * Create a user account (generic method for any UserAccount type)
     * Service layer - only orchestration
     * @param userAccount The user account to create (should be already validated by domain)
     * @return The saved user account
     * @throws IllegalArgumentException if email already exists
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public UserAccount createUser(UserAccount userAccount) {
        // Validate user account using domain method
        UserAccount.validateUserAccount(userAccount);

        // Check if email already exists (orchestration)
        boolean emailExists = userRepository.existsByEmail(userAccount.getEmail());
        
        // Validate email doesn't exist using domain method (business logic in domain)
        UserAccount.validateEmailNotExists(emailExists, userAccount.getEmail());

        // Save to repository (orchestration)
        return userRepository.save(userAccount);
    }

    /**
     * Delete a user by ID
     * Service layer - only orchestration
     * @param userId The UUID of the user to delete
     * @throws IllegalArgumentException if user ID is null or user doesn't exist
     */
    @Caching(evict = {
        @CacheEvict(cacheNames = "loggedUsers", allEntries = true),
        @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
        @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public void deleteUser(UUID userId) {
        // Validate user ID using domain method (business logic in domain)
        UserAccount.validateUserId(userId);

        // Check if user exists (orchestration)
        boolean userExists = userRepository.findById(userId).isPresent();
        
        // Validate user exists using domain method (business logic in domain)
        UserAccount.validateUserExists(userExists, userId);

        // Delete user from repository (orchestration)
        userRepository.deleteById(userId);
    }

    /**
     * Delete a user by email
     * Service layer - only orchestration
     * @param email The email of the user to delete
     * @throws IllegalArgumentException if email is null/empty or user doesn't exist
     */
    @Caching(evict = {
        @CacheEvict(cacheNames = "loggedUsers", allEntries = true),
        @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
        @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public void deleteUserByEmail(String email) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);

        // Find user by email (orchestration)
        java.util.Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + email);
        }

        // Delete user by ID (orchestration - delegate to other service method)
        deleteUser(userOpt.get().getId());
    }

    /**
     * Edit user password by email
     * Service layer - only orchestration
     * @param email The email of the user
     * @param newPassword The new password (will be hashed by domain)
     * @throws IllegalArgumentException if email is null/empty, user doesn't exist, or password is invalid
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void editPassword(String email, String newPassword) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);

        // Find user by email (orchestration)
        java.util.Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + email);
        }

        // Update user password using domain method (all business logic is in domain)
        UserAccount user = userOpt.get();
        if (user instanceof RegularUser) {
            ((RegularUser) user).changePassword(newPassword, passwordEncoder::encode);
        } else if (user instanceof AdminUser) {
            ((AdminUser) user).changePassword(newPassword, passwordEncoder::encode);
        } else {
            // For base UserAccount, use direct method
            UserAccount.validatePassword(newPassword);
            user.setPasswordHash(passwordEncoder.encode(newPassword));
        }
        
        // Save to repository (orchestration)
        userRepository.save(user);
    }

    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void changePassword(UUID userId, String oldPassword, String newPassword, String confirmNewPassword) {
        UserAccount.validateUserId(userId);
        UserAccount.validatePassword(oldPassword);
        UserAccount.validatePassword(newPassword);
        UserAccount.validatePassword(confirmNewPassword);

        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        UserAccount user = userOpt.get();
        boolean oldPasswordMatches = user.verifyPassword(oldPassword, passwordEncoder::matches);
        if (!oldPasswordMatches) {
            throw new IllegalArgumentException("הסיסמה הישנה שגויה");
        }
        if (!newPassword.equals(confirmNewPassword)) {
            throw new IllegalArgumentException("הסיסמה החדשה ואימות הסיסמה אינם תואמים");
        }
        if (oldPassword.equals(newPassword)) {
            throw new IllegalArgumentException("הסיסמה החדשה חייבת להיות שונה מהסיסמה הישנה");
        }

        if (user instanceof RegularUser) {
            ((RegularUser) user).changePassword(newPassword, passwordEncoder::encode);
        } else if (user instanceof AdminUser) {
            ((AdminUser) user).changePassword(newPassword, passwordEncoder::encode);
        } else {
            UserAccount.validatePassword(newPassword);
            user.setPasswordHash(passwordEncoder.encode(newPassword));
        }

        userRepository.save(user);
    }

    /**
     * Create an admin user
     * Service layer - only orchestration, no business logic
     * @param email User's email address
     * @param password Plain text password (will be hashed by domain)
     * @param permissionLevel Permission level (e.g., "Admin", "User")
     * @return The created AdminUser entity
     * @throws IllegalArgumentException if email already exists or validation fails
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public AdminUser createAdminUser(String email, String password, String permissionLevel) {
        // Check if email already exists (orchestration - getting data for domain)
        boolean emailExists = userRepository.existsByEmail(email);
        
        // Create AdminUser using domain factory method (all business logic is in domain)
        AdminUser newAdmin = AdminUser.create(
            email, password, permissionLevel, emailExists, passwordEncoder::encode
        );
        newAdmin.setEmailVerified(true);

        // Save to repository (orchestration)
        UserAccount savedUser = userRepository.save(newAdmin);
        
        // Return as AdminUser (cast is safe since we just created it)
        return (AdminUser) savedUser;
    }
    
    /**
     * Login/authenticate a user with email and password
     * Service layer - only orchestration
     * @param email User's email address
     * @param password Plain text password
     * @return The authenticated UserAccount
     * @throws IllegalArgumentException if credentials are invalid
     */
    @Transactional
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public UserAccount login(String email, String password) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);
        UserAccount.validatePassword(password);
        
        // Find user by email (case-insensitive; verification OTP applies only before account creation)
        java.util.Optional<UserAccount> userOpt = userRepository.findByEmailIgnoreCase(email.trim());
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("אימייל או סיסמה שגויים");
        }
        
        // Verify password using domain method (all business logic is in domain)
        UserAccount user = userOpt.get();
        if (user.isSuspended()){
            throw new IllegalArgumentException("המשתמש מושעה ולא יכול להתחבר");
        }
        boolean passwordMatches = user.verifyPassword(password, passwordEncoder::matches);
        
        if (!passwordMatches) {
            throw new IllegalArgumentException("אימייל או סיסמה שגויים");
        }

        if (user.isLoggedIn()){
            throw new IllegalArgumentException("המשתמש כבר מחובר");

        }
        // Set logged in status to true
        user.setLoggedIn(true);
        // Update last activity time for session timeout tracking
        user.setLastActivityTime(LocalDateTime.now());
        System.out.println("Setting user " + email + " loggedIn to true");
        
        // Save the updated user
        UserAccount savedUser = userRepository.save(user);
        System.out.println("User saved, loggedIn status: " + savedUser.isLoggedIn());
        
        return savedUser;
    }
    
    /**
     * Get all users
     * Service layer - only orchestration
     * @return List of all users in the database
     */
    public java.util.List<UserAccount> getAllUsers() {
        // Get all users from repository (orchestration)
        // UserRepository extends JpaRepository which provides findAll() method
        if (userRepository instanceof com.DogMate.Infrastructure.UserRepository) {
            return ((com.DogMate.Infrastructure.UserRepository) userRepository).findAll();
        }
        throw new IllegalStateException("מאגר המשתמשים לא מוגדר כראוי");
    }

    /**
     * Suspend a user with userId
     * @param userId
     */
    public void suspendUser(UUID userId){
        UserAccount.validateUserId(userId);

        boolean userExists = userRepository.findById(userId).isPresent();

        UserAccount.validateUserExists(userExists, userId);

        UserAccount user = userRepository.findById(userId).get();

        user.setSuspended(true);

        userRepository.save(user);
    }

    /**
     * Logout a user by ID
     * Service layer - only orchestration
     * @param userId The UUID of the user to logout
     * @throws IllegalArgumentException if user ID is null or user doesn't exist
     */
    @Transactional
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void logout(UUID userId) {
        // Validate user ID using domain method (business logic in domain)
        UserAccount.validateUserId(userId);
        
        // Find user by ID (orchestration)
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        
        // Update user's logged-in status (orchestration)
        UserAccount user = userOpt.get();
        user.setLoggedIn(false);
        
        // Clear location when logging out
        if (user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            regularUser.setLatitude(null);
            regularUser.setLongitude(null);
        }
        
        // Save to repository (orchestration)
        userRepository.save(user);
    }
    
    /**
     * Logout a user by email
     * Service layer - only orchestration
     * @param email The email of the user to logout
     * @throws IllegalArgumentException if email is null/empty or user doesn't exist
     */
    @Transactional
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void logoutByEmail(String email) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);
        
        // Find user by email (orchestration)
        Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + email);
        }
        
        // Update user's logged-in status (orchestration)
        UserAccount user = userOpt.get();
        user.setLoggedIn(false);
        
        // Clear location when logging out
        if (user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            regularUser.setLatitude(null);
            regularUser.setLongitude(null);
        }
        
        // Save to repository (orchestration)
        userRepository.save(user);
    }

    /**
     * Updates the active status (isActive) of a user by ID.
     * Used by: UserController.logoutUserById
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void updateUserActiveStatus(UUID userId, boolean isActive) {
        UserAccount.validateUserId(userId);

        Optional<UserAccount> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        UserAccount user = userOpt.get();
        user.setLoggedIn(isActive);
        
        // Clear location when logging out
        if (!isActive && user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            regularUser.setLatitude(null);
            regularUser.setLongitude(null);
        }
        
        userRepository.save(user);
    }    /**
     * Updates the active status (isActive) of a user by email.
     * Used by: UserController.logoutUserByEmail
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void updateUserActiveStatusByEmail(String email, boolean isActive) {
        UserAccount.validateEmail(email);

        Optional<UserAccount> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + email);
        }

        UserAccount user = userOpt.get();
        user.setLoggedIn(isActive);
        
        // Clear location when logging out
        if (!isActive && user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            regularUser.setLatitude(null);
            regularUser.setLongitude(null);
        }
        
        userRepository.save(user);
    }

    /**
     * Update user's current location
     * Service layer - only orchestration
     * @param userId The UUID of the user to update
     * @param latitude The latitude coordinate
     * @param longitude The longitude coordinate
     * @throws IllegalArgumentException if user ID is null or user doesn't exist
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void updateUserLocation(UUID userId, Double latitude, Double longitude) {
        // Validate user ID using domain method (business logic in domain)
        UserAccount.validateUserId(userId);

        // Validate coordinates
        if (latitude == null || latitude < -90 || latitude > 90) {
            throw new IllegalArgumentException("קו רוחב חייב להיות בין ‎-90‎ ל־‎90");
        }
        if (longitude == null || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("קו אורך חייב להיות בין ‎-180‎ ל־‎180");
        }

        // Find user by ID (orchestration)
        Optional<UserAccount> userOpt = userRepository.findById(userId);

        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        // Update user location (orchestration)
        UserAccount user = userOpt.get();
        if (user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            regularUser.setLatitude(latitude);
            regularUser.setLongitude(longitude);
            userRepository.save(regularUser);
        } else {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לעדכן מיקום");
        }
    }

    /**
     * Clear user's location (set to null to hide from other users)
     * Service layer - only orchestration
     * @param userId The UUID of the user to clear location for
     * @throws IllegalArgumentException if user ID is null or user doesn't exist
     */
    @Transactional
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void clearUserLocation(UUID userId) {
        // Validate user ID using domain method (business logic in domain)
        UserAccount.validateUserId(userId);

        // Find user by ID (orchestration)
        Optional<UserAccount> userOpt = userRepository.findById(userId);

        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        // Clear user location (orchestration)
        UserAccount user = userOpt.get();
        if (user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            regularUser.setLatitude(null);
            regularUser.setLongitude(null);
            userRepository.save(regularUser);
            System.out.println("Location cleared for user: " + userId);
        } else {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לעדכן מיקום");
        }
    }

    /**
     * Search for users that their emails or first or last name contains the parameter text
     * @param text
     * @return users
     */
    public List<UserAccount> searchUsers(String text){
        String normalized = text == null ? "" : text.trim().replaceAll("\\s+", " ");
        return userRepository.searchUsers(normalized);
    }

    public boolean hasAtLeastOneDog(String email){
        if(!userRepository.existsByEmail(email)){
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל שהוזן");
        }
        Optional<UserAccount> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + email);
        }
        UserAccount user = optUser.get();
        if (user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            if(regularUser.getDogRelationships().isEmpty()){
                return false;
            }
            return true;
        }
        return false;
    }

    public List<Dog> getDogs(String email){
        if(!userRepository.existsByEmail(email)){
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל שהוזן");
        }
        Optional<UserAccount> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + email);
        }
        UserAccount user = optUser.get();
        if (user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            if(regularUser.getDogRelationships().isEmpty()){
                return null;
            }
            return regularUser.getDogRelationships().stream().filter(dogRelationship ->
                    dogRelationship.getRegularUser().getEmail().equals(email))
                    .map(dogRelationship -> dogRelationship.getDog()).toList();
        }
        return null;
    }

    public UserProfileData getUserProfile(UUID userId) {
        UserAccount.validateUserId(userId);
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        UserAccount user = userOpt.get();
        if (user instanceof RegularUser regularUser) {
            return new UserProfileData(
                regularUser.getId(),
                regularUser.getEmail(),
                "owner",
                regularUser.getFirst_name(),
                regularUser.getLast_name(),
                regularUser.getPhoneNumber(),
                regularUser.getBirthDate()
            );
        }
        if (user instanceof DogWalkerUser walkerUser) {
            return new UserProfileData(
                walkerUser.getId(),
                walkerUser.getEmail(),
                "walker",
                walkerUser.getFirst_name(),
                walkerUser.getLast_name(),
                walkerUser.getPhoneNumber(),
                walkerUser.getBirthDate()
            );
        }
        throw new IllegalArgumentException("רק חשבונות בעל כלב או דוגווקר יכולים לערוך פרופיל");
    }

    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public UserProfileData updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber) {
        UserAccount.validateUserId(userId);
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        String normalizedPhone = PhoneValidation.requireValidIsraeliMobile(phoneNumber);
        UserAccount user = userOpt.get();

        if (user instanceof RegularUser regularUser) {
            RegularUser.validateFirstName(firstName);
            RegularUser.validateLastName(lastName);
            regularUser.setFirst_name(firstName.trim());
            regularUser.setLast_name(lastName.trim());
            regularUser.setPhoneNumber(normalizedPhone);
            UserAccount saved = userRepository.save(regularUser);
            RegularUser persisted = (RegularUser) saved;
            return new UserProfileData(
                persisted.getId(),
                persisted.getEmail(),
                "owner",
                persisted.getFirst_name(),
                persisted.getLast_name(),
                persisted.getPhoneNumber(),
                persisted.getBirthDate()
            );
        }

        if (user instanceof DogWalkerUser walkerUser) {
            DogWalkerUser.validateFirstName(firstName);
            DogWalkerUser.validateLastName(lastName);
            walkerUser.setFirst_name(firstName.trim());
            walkerUser.setLast_name(lastName.trim());
            walkerUser.setPhoneNumber(normalizedPhone);
            UserAccount saved = userRepository.save(walkerUser);
            DogWalkerUser persisted = (DogWalkerUser) saved;
            return new UserProfileData(
                persisted.getId(),
                persisted.getEmail(),
                "walker",
                persisted.getFirst_name(),
                persisted.getLast_name(),
                persisted.getPhoneNumber(),
                persisted.getBirthDate()
            );
        }

        throw new IllegalArgumentException("רק חשבונות בעל כלב או דוגווקר יכולים לערוך פרופיל");
    }

    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public UserProfileData updateUserBirthDate(UUID userId, LocalDate birthDate) {
        UserAccount.validateUserId(userId);
        if (birthDate == null) {
            throw new IllegalArgumentException("תאריך לידה הוא שדה חובה");
        }
        if (birthDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("תאריך לידה לא יכול להיות בעתיד");
        }
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        UserAccount user = userOpt.get();
        user.setBirthDate(birthDate);
        UserAccount saved = userRepository.save(user);
        if (saved instanceof RegularUser persistedRegular) {
            return new UserProfileData(
                persistedRegular.getId(),
                persistedRegular.getEmail(),
                "owner",
                persistedRegular.getFirst_name(),
                persistedRegular.getLast_name(),
                persistedRegular.getPhoneNumber(),
                persistedRegular.getBirthDate()
            );
        }
        if (saved instanceof DogWalkerUser persistedWalker) {
            return new UserProfileData(
                persistedWalker.getId(),
                persistedWalker.getEmail(),
                "walker",
                persistedWalker.getFirst_name(),
                persistedWalker.getLast_name(),
                persistedWalker.getPhoneNumber(),
                persistedWalker.getBirthDate()
            );
        }
        throw new IllegalArgumentException("רק חשבונות בעל כלב או דוגווקר יכולים לערוך פרופיל");
    }

    public record UserProfileData(
        UUID userId,
        String email,
        String userRole,
        String firstName,
        String lastName,
        String phoneNumber,
        LocalDate birthDate
    ) {}

    /**
     * Lists all support requests for an admin dashboard (newest first).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSupportRequestsForAdmin(UUID adminUserId) {
        UserAccount admin = userRepository.findById(adminUserId)
            .orElseThrow(() -> new IllegalArgumentException("משתמש לא נמצא"));
        if (!(admin instanceof AdminUser)) {
            throw new IllegalArgumentException("רק מנהלים יכולים לצפות בפניות התמיכה");
        }
        List<SupportRequest> all = supportRequestRepository.findAll(
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        List<Map<String, Object>> out = new ArrayList<>();
        for (SupportRequest sr : all) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", sr.getId().toString());
            row.put("userId", sr.getUserId().toString());
            row.put("category", sr.getCategory());
            row.put("subject", sr.getSubject());
            row.put("description", sr.getDescription());
            row.put("contactEmail", sr.getContactEmail());
            row.put("contactPhone", sr.getContactPhone() != null ? sr.getContactPhone() : "");
            row.put("status", sr.getStatus());
            row.put("createdAt", sr.getCreatedAt().toString());
            userRepository.findById(sr.getUserId())
                .ifPresent(u -> row.put("submitterEmail", u.getEmail()));
            out.add(row);
        }
        return out;
    }

    /**
     * Admin: update support request status (OPEN / CLOSED).
     */
    @Transactional
    public Map<String, Object> updateSupportRequestStatus(UUID adminUserId, UUID requestId, String newStatus) {
        UserAccount admin = userRepository.findById(adminUserId)
            .orElseThrow(() -> new IllegalArgumentException("משתמש לא נמצא"));
        if (!(admin instanceof AdminUser)) {
            throw new IllegalArgumentException("רק מנהלים יכולים לעדכן פניות");
        }
        String normalized = newStatus == null ? "" : newStatus.trim().toUpperCase();
        if (!"CLOSED".equals(normalized) && !"OPEN".equals(normalized)) {
            throw new IllegalArgumentException("סטטוס לא חוקי");
        }
        SupportRequest sr = supportRequestRepository.findById(requestId)
            .orElseThrow(() -> new IllegalArgumentException("פנייה לא נמצאה"));
        sr.setStatus(normalized);
        supportRequestRepository.save(sr);
        Map<String, Object> row = new HashMap<>();
        row.put("id", sr.getId().toString());
        row.put("status", sr.getStatus());
        return row;
    }

    public SupportRequest createSupportRequest(
        UUID userId,
        String category,
        String subject,
        String description,
        String contactEmail,
        String contactPhone
    ) {
        UserAccount.validateUserId(userId);
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        String normalizedCategory = category == null ? "" : category.trim();
        String normalizedSubject = subject == null ? "" : subject.trim();
        String normalizedDescription = description == null ? "" : description.trim();
        String normalizedContactEmail = contactEmail == null ? "" : contactEmail.trim();
        String normalizedContactPhone = contactPhone == null ? "" : contactPhone.trim();

        if (normalizedCategory.isEmpty() || normalizedSubject.isEmpty() || normalizedDescription.isEmpty()) {
            throw new IllegalArgumentException("חובה למלא קטגוריה, כותרת ותיאור");
        }
        if (normalizedDescription.length() < 10) {
            throw new IllegalArgumentException("התיאור חייב להכיל לפחות 10 תווים");
        }
        if (normalizedDescription.length() > 1000) {
            throw new IllegalArgumentException("התיאור חייב להכיל לכל היותר 1,000 תווים");
        }
        if (normalizedContactEmail.isEmpty()) {
            normalizedContactEmail = userOpt.get().getEmail();
        }
        UserAccount.validateEmail(normalizedContactEmail);

        SupportRequest supportRequest = new SupportRequest(
            userId,
            normalizedCategory,
            normalizedSubject,
            normalizedDescription,
            normalizedContactEmail,
            normalizedContactPhone
        );
        SupportRequest saved = supportRequestRepository.save(supportRequest);
        sendSupportRequestEmail(saved, userOpt.get());
        return saved;
    }

    private void sendSupportRequestEmail(SupportRequest supportRequest, UserAccount user) {
        if (mailSender == null) {
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(user.getEmail());
            message.setReplyTo(user.getEmail());
            message.setTo(supportEmail);
            message.setSubject("[DogMate תמיכה] " + supportRequest.getSubject());
            message.setText(
                "פנייה חדשה התקבלה\n" +
                "מזהה פנייה: " + supportRequest.getId() + "\n" +
                "מזהה משתמש: " + user.getId() + "\n" +
                "אימייל משתמש: " + user.getEmail() + "\n" +
                "קטגוריה: " + supportRequest.getCategory() + "\n" +
                "אימייל ליצירת קשר: " + supportRequest.getContactEmail() + "\n" +
                "טלפון: " + supportRequest.getContactPhone() + "\n" +
                "נוצר בתאריך: " + supportRequest.getCreatedAt() + "\n\n" +
                "תיאור:\n" +
                supportRequest.getDescription()
            );
            mailSender.send(message);
        } catch (Exception ignored) {
            // Intentionally do not fail request creation when email delivery fails.
        }
    }
}