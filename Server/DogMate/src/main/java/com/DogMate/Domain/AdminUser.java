package com.DogMate.Domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "admin_users")
@PrimaryKeyJoinColumn(name = "id")
public class AdminUser extends UserAccount{
    @Column(name = "permission_level")
    private String permissionLevel;

    // Default constructor required by JPA
    protected AdminUser() {
        // JPA requires a no-args constructor
    }

    public AdminUser(UUID id, String email, String passwordHash, String permissionLevel){
        super(id, email, passwordHash);
        this.permissionLevel = permissionLevel;
    }
    
    /**
     * Factory method to create a new AdminUser with validation and password hashing
     * Contains all business logic for admin user creation
     * @param email User's email address
     * @param plainPassword Plain text password (will be validated and hashed)
     * @param permissionLevel Permission level (e.g., "Admin", "User")
     * @param emailExists true if email already exists, false otherwise
     * @param passwordEncoder Password encoder for hashing (infrastructure dependency)
     * @return A new AdminUser instance
     * @throws IllegalArgumentException if validation fails or email already exists
     */
    public static AdminUser create(String email, String plainPassword, 
                                   String permissionLevel,
                                   boolean emailExists,
                                   java.util.function.Function<String, String> passwordEncoder) {
        // Validate all fields (business logic)
        UserAccount.validateEmail(email);
        UserAccount.validatePassword(plainPassword);
        
        if (permissionLevel == null || permissionLevel.trim().isEmpty()) {
            throw new IllegalArgumentException("חובה להגדיר רמת הרשאה");
        }
        
        // Validate email doesn't exist (business logic)
        UserAccount.validateEmailNotExists(emailExists, email);

        // Hash the password (infrastructure concern, but done in domain for encapsulation)
        String passwordHash = passwordEncoder.apply(plainPassword);

        // Generate UUID for new user
        UUID userId = UUID.randomUUID();

        // Create and return new AdminUser
        return new AdminUser(userId, email, passwordHash, permissionLevel);
    }
    
    /**
     * Change password for this admin user (business logic)
     * @param newPlainPassword The new plain text password
     * @param passwordEncoder Password encoder for hashing
     * @throws IllegalArgumentException if password is invalid
     */
    public void changePassword(String newPlainPassword, java.util.function.Function<String, String> passwordEncoder) {
        UserAccount.validatePassword(newPlainPassword);
        String passwordHash = passwordEncoder.apply(newPlainPassword);
        this.setPasswordHash(passwordHash);
    }
    
    public String getPermissionLevel(){
        return this.permissionLevel;
    }
    public void setPermissionLevel(String permissionLevel){
        this.permissionLevel = permissionLevel;
    }
}
