package com.DogMate.Domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_accounts")
@Inheritance(strategy = InheritanceType.JOINED)
public class UserAccount {
    @Id
    @Column(name = "id")
    private UUID ID;
    
    @Column(name = "email", unique = true, nullable = false)
    private String email;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Default constructor required by JPA
    protected UserAccount() {
        // JPA requires a no-args constructor
    }

    public UserAccount(UUID ID, String email, String passwordHash) {
        this.ID = ID;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * Validate email field
     * @param email The email to validate
     * @throws IllegalArgumentException if email is null or empty
     */
    public static void validateEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }
    }

    /**
     * Validate password field
     * @param password The password to validate
     * @throws IllegalArgumentException if password is null or empty
     */
    public static void validatePassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be null or empty");
        }
    }

    /**
     * Validate that user account is not null
     * @param userAccount The user account to validate
     * @throws IllegalArgumentException if user account is null
     */
    public static void validateUserAccount(UserAccount userAccount) {
        if (userAccount == null) {
            throw new IllegalArgumentException("User account cannot be null");
        }
    }

    /**
     * Validate that email doesn't already exist
     * @param emailExists true if email exists, false otherwise
     * @param email The email address
     * @throws IllegalArgumentException if email already exists
     */
    public static void validateEmailNotExists(boolean emailExists, String email) {
        if (emailExists) {
            throw new IllegalArgumentException("Email already exists: " + email);
        }
    }

    /**
     * Validate that user ID is not null
     * @param userId The user ID to validate
     * @throws IllegalArgumentException if user ID is null
     */
    public static void validateUserId(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }
    }

    /**
     * Validate that user exists before deletion
     * @param userExists true if user exists, false otherwise
     * @param userId The user ID
     * @throws IllegalArgumentException if user doesn't exist
     */
    public static void validateUserExists(boolean userExists, UUID userId) {
        if (!userExists) {
            throw new IllegalArgumentException("User not found with ID: " + userId);
        }
    }
    
    /**
     * Verify if the provided plain password matches the stored password hash
     * Business logic for password verification
     * @param plainPassword The plain text password to verify
     * @param passwordMatcher Function to match password (from PasswordEncoder.matches)
     * @return true if password matches, false otherwise
     */
    public boolean verifyPassword(String plainPassword, java.util.function.BiPredicate<String, String> passwordMatcher) {
        if (plainPassword == null || passwordHash == null) {
            return false;
        }
        return passwordMatcher.test(plainPassword, passwordHash);
    }

    public UUID getId() {
        return ID;
    }

    public void setId(UUID ID) {
        this.ID = ID;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

}
