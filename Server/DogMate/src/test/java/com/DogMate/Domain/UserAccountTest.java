package com.DogMate.Domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class UserAccountTest {

    @Test
    void GivenNullEmail_WhenValidateEmail_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validateEmail(null)
        );

        assertEquals("Email cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyEmail_WhenValidateEmail_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validateEmail("   ")
        );

        assertEquals("Email cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenValidEmail_WhenValidateEmail_ThenNoException() {
        // Act & Assert - should not throw
        assertDoesNotThrow(() -> UserAccount.validateEmail("test@example.com"));
    }

    @Test
    void GivenNullPassword_WhenValidatePassword_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validatePassword(null)
        );

        assertEquals("Password cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyPassword_WhenValidatePassword_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validatePassword("   ")
        );

        assertEquals("Password cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenValidPassword_WhenValidatePassword_ThenNoException() {
        // Act & Assert - should not throw
        assertDoesNotThrow(() -> UserAccount.validatePassword("password123"));
    }

    @Test
    void GivenNullUserAccount_WhenValidateUserAccount_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validateUserAccount(null)
        );

        assertEquals("User account cannot be null", exception.getMessage());
    }

    @Test
    void GivenValidUserAccount_WhenValidateUserAccount_ThenNoException() {
        // Arrange
        UserAccount userAccount = new UserAccount(
            java.util.UUID.randomUUID(), "test@example.com", "hashedPassword"
        );

        // Act & Assert - should not throw
        assertDoesNotThrow(() -> UserAccount.validateUserAccount(userAccount));
    }

    @Test
    void GivenEmailExists_WhenValidateEmailNotExists_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validateEmailNotExists(true, "test@example.com")
        );

        assertEquals("Email already exists: test@example.com", exception.getMessage());
    }

    @Test
    void GivenEmailNotExists_WhenValidateEmailNotExists_ThenNoException() {
        // Act & Assert - should not throw
        assertDoesNotThrow(() -> UserAccount.validateEmailNotExists(false, "test@example.com"));
    }

    @Test
    void GivenNullUserId_WhenValidateUserId_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validateUserId(null)
        );

        assertEquals("User ID cannot be null", exception.getMessage());
    }

    @Test
    void GivenValidUserId_WhenValidateUserId_ThenNoException() {
        // Arrange
        java.util.UUID userId = java.util.UUID.randomUUID();

        // Act & Assert - should not throw
        assertDoesNotThrow(() -> UserAccount.validateUserId(userId));
    }

    @Test
    void GivenUserNotExists_WhenValidateUserExists_ThenThrowException() {
        // Arrange
        java.util.UUID userId = java.util.UUID.randomUUID();

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> UserAccount.validateUserExists(false, userId)
        );

        assertEquals("User not found with ID: " + userId, exception.getMessage());
    }

    @Test
    void GivenUserExists_WhenValidateUserExists_ThenNoException() {
        // Arrange
        java.util.UUID userId = java.util.UUID.randomUUID();

        // Act & Assert - should not throw
        assertDoesNotThrow(() -> UserAccount.validateUserExists(true, userId));
    }
}
