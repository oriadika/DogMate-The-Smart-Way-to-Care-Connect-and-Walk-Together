package com.DogMate.Service;

import com.DogMate.Domain.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
@Service
public class UserService {
    
    private final IUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final IReminderRepository reminderRepository;

    @Autowired
    public UserService(IUserRepository userRepository, PasswordEncoder passwordEncoder,
                       IReminderRepository reminderRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.reminderRepository = reminderRepository;
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
    public RegularUser registerUser(String email, String password, 
                                     String firstName, String lastName 
                                     ) {
        // Check if email already exists (orchestration - getting data for domain)
        boolean emailExists = userRepository.existsByEmail(email);
        
        // Create RegularUser using domain factory method (all business logic is in domain)
        RegularUser newUser = RegularUser.create(
            email, password, firstName, lastName, 
            emailExists, passwordEncoder::encode
        );

        // Save to repository (orchestration)
        UserAccount savedUser = userRepository.save(newUser);
        
        // Return as RegularUser (cast is safe since we just created it)
        return (RegularUser) savedUser;
    }

    /**
     * Create a user account (generic method for any UserAccount type)
     * Service layer - only orchestration
     * @param userAccount The user account to create (should be already validated by domain)
     * @return The saved user account
     * @throws IllegalArgumentException if email already exists
     */
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
    public void deleteUserByEmail(String email) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);

        // Find user by email (orchestration)
        java.util.Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
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
    public void editPassword(String email, String newPassword) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);

        // Find user by email (orchestration)
        java.util.Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
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

    /**
     * Create an admin user
     * Service layer - only orchestration, no business logic
     * @param email User's email address
     * @param password Plain text password (will be hashed by domain)
     * @param permissionLevel Permission level (e.g., "Admin", "User")
     * @return The created AdminUser entity
     * @throws IllegalArgumentException if email already exists or validation fails
     */
    public AdminUser createAdminUser(String email, String password, String permissionLevel) {
        // Check if email already exists (orchestration - getting data for domain)
        boolean emailExists = userRepository.existsByEmail(email);
        
        // Create AdminUser using domain factory method (all business logic is in domain)
        AdminUser newAdmin = AdminUser.create(
            email, password, permissionLevel, emailExists, passwordEncoder::encode
        );

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
    public UserAccount login(String email, String password) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);
        UserAccount.validatePassword(password);
        
        // Find user by email (orchestration)
        java.util.Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        
        // Verify password using domain method (all business logic is in domain)
        UserAccount user = userOpt.get();
        boolean passwordMatches = user.verifyPassword(password, passwordEncoder::matches);
        
        if (!passwordMatches) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        
        user.setLoggedIn(passwordMatches);
        userRepository.save(user);
        
        return user;
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
        throw new IllegalStateException("UserRepository is not properly configured");
    }

    /**
     * Logout a user by ID
     * Service layer - only orchestration
     * @param userId The UUID of the user to logout
     * @throws IllegalArgumentException if user ID is null or user doesn't exist
     */
    public void logout(UUID userId) {
        // Validate user ID using domain method (business logic in domain)
        UserAccount.validateUserId(userId);
        
        // Find user by ID (orchestration)
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with ID: " + userId);
        }
        
        // Update user's logged-in status (orchestration)
        UserAccount user = userOpt.get();
        user.setLoggedIn(false);
        
        // Save to repository (orchestration)
        userRepository.save(user);
    }
    
    /**
     * Logout a user by email
     * Service layer - only orchestration
     * @param email The email of the user to logout
     * @throws IllegalArgumentException if email is null/empty or user doesn't exist
     */
    public void logoutByEmail(String email) {
        // Validate email using domain method (business logic in domain)
        UserAccount.validateEmail(email);
        
        // Find user by email (orchestration)
        Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
        }
        
        // Update user's logged-in status (orchestration)
        UserAccount user = userOpt.get();
        user.setLoggedIn(false);
        
        // Save to repository (orchestration)
        userRepository.save(user);
    }

    /**
     * Updates the active status (isActive) of a user by ID.
     * Used by: UserController.logoutUserById
     */
    public void updateUserActiveStatus(UUID userId, boolean isActive) {
        UserAccount.validateUserId(userId);

        Optional<UserAccount> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with ID: " + userId);
        }

        UserAccount user = userOpt.get();
        user.setLoggedIn(isActive);
        
        userRepository.save(user);
    }    /**
     * Updates the active status (isActive) of a user by email.
     * Used by: UserController.logoutUserByEmail
     */
    public void updateUserActiveStatusByEmail(String email, boolean isActive) {
        UserAccount.validateEmail(email);

        Optional<UserAccount> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
        }

        UserAccount user = userOpt.get();
        user.setLoggedIn(isActive);
        
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
    public void updateUserLocation(UUID userId, Double latitude, Double longitude) {
        // Validate user ID using domain method (business logic in domain)
        UserAccount.validateUserId(userId);

        // Validate coordinates
        if (latitude == null || latitude < -90 || latitude > 90) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }
        if (longitude == null || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }

        // Find user by ID (orchestration)
        Optional<UserAccount> userOpt = userRepository.findById(userId);

        // Validate user exists (business logic)
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with ID: " + userId);
        }

        // Update user location (orchestration)
        UserAccount user = userOpt.get();
        if (user instanceof RegularUser) {
            RegularUser regularUser = (RegularUser) user;
            regularUser.setLatitude(latitude);
            regularUser.setLongitude(longitude);
            userRepository.save(regularUser);
        } else {
            throw new IllegalArgumentException("Only RegularUser accounts support location tracking");
        }
    }

    public boolean hasAtLeastOneDog(String email){
        if(!userRepository.existsByEmail(email)){
            throw new IllegalArgumentException("user not found with the given email");
        }
        Optional<UserAccount> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
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
            throw new IllegalArgumentException("user not found with the given email");
        }
        Optional<UserAccount> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
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
}