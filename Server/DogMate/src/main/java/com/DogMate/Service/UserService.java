package com.DogMate.Service;

import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.UserAccount;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserService {
    
    private final IUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(IUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Register a new regular user
     * @param email User's email address
     * @param password Plain text password (will be hashed)
     * @param firstName User's first name
     * @param lastName User's last name
     * @param profileImageUrl Optional profile image URL
     * @return The created RegularUser entity
     * @throws IllegalArgumentException if email already exists or validation fails
     */
    public RegularUser registerUser(String email, String password, 
                                     String firstName, String lastName, 
                                     String profileImageUrl) {
        // Validate password before hashing (using domain validation)
        UserAccount.validatePassword(password);
        
        // Check if email already exists (before hashing to avoid unnecessary work)
        boolean emailExists = userRepository.existsByEmail(email);
        
        // Validate email doesn't exist (using domain validation)
        UserAccount.validateEmailNotExists(emailExists, email);

        // Hash the password
        String passwordHash = passwordEncoder.encode(password);

        // Create RegularUser using domain factory method (includes validation)
        RegularUser newUser = RegularUser.create(
            email, passwordHash, firstName, lastName, profileImageUrl
        );

        // Save to repository
        UserAccount savedUser = userRepository.save(newUser);
        
        // Return as RegularUser (cast is safe since we just created it)
        return (RegularUser) savedUser;
    }

    /**
     * Create a user account (generic method for any UserAccount type)
     * @param userAccount The user account to create
     * @return The saved user account
     * @throws IllegalArgumentException if email already exists
     */
    public UserAccount createUser(UserAccount userAccount) {
        // Validate user account using domain method
        UserAccount.validateUserAccount(userAccount);

        // Check if email already exists
        boolean emailExists = userRepository.existsByEmail(userAccount.getEmail());
        
        // Validate email doesn't exist using domain method
        UserAccount.validateEmailNotExists(emailExists, userAccount.getEmail());

        return userRepository.save(userAccount);
    }

    /**
     * Delete a user by ID
     * @param userId The UUID of the user to delete
     * @throws IllegalArgumentException if user ID is null or user doesn't exist
     */
    public void deleteUser(UUID userId) {
        // Validate user ID using domain method
        UserAccount.validateUserId(userId);

        // Check if user exists
        boolean userExists = userRepository.findById(userId).isPresent();
        
        // Validate user exists using domain method
        UserAccount.validateUserExists(userExists, userId);

        // Delete user from repository
        userRepository.deleteById(userId);
    }

    /**
     * Delete a user by email
     * @param email The email of the user to delete
     * @throws IllegalArgumentException if email is null/empty or user doesn't exist
     */
    public void deleteUserByEmail(String email) {
        // Validate email using domain method
        UserAccount.validateEmail(email);

        // Find user by email
        java.util.Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        
        // Validate user exists
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
        }

        // Delete user by ID
        deleteUser(userOpt.get().getId());
    }
}