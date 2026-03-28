package com.DogMate.Service;

import com.DogMate.Domain.UserAccount;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IUserRepository {
    /**
     * Save a new user account to the database
     * @param userAccount The user account to save
     * @return The saved user account with generated ID
     */
    UserAccount save(UserAccount userAccount);

    /**
     * Find a user by email
     * @param email The email to search for
     * @return Optional containing the user if found
     */
    Optional<UserAccount> findByEmail(String email);

    /**
     * Find a user by ID
     * @param id The UUID of the user
     * @return Optional containing the user if found
     */
    Optional<UserAccount> findById(UUID id);

    /**
     * Check if a user with the given email exists
     * @param email The email to check
     * @return true if email exists, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Delete a user by ID
     * @param id The UUID of the user to delete
     */
    void deleteById(UUID id);

    /**
     * Return all users in the
     * @return users
     */
    List<UserAccount> findAll();
}