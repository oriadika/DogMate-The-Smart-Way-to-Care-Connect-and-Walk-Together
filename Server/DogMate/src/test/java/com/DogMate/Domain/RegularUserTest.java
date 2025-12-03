package com.DogMate.Domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class RegularUserTest {

    private String testEmail;
    private String testPlainPassword;
    private String testPasswordHash;
    private String testFirstName;
    private String testLastName;
    private Function<String, String> passwordEncoder;

    @BeforeEach
    void setUp() {
        testEmail = "test@example.com";
        testPlainPassword = "password123";
        testPasswordHash = "$2a$10$hashedPasswordString";
        testFirstName = "John";
        testLastName = "Doe";
        // Simple password encoder for testing (just returns hash)
        passwordEncoder = password -> testPasswordHash;
    }

    @Test
    void GivenValidData_WhenCreate_ThenReturnRegularUser() {
        // Act
        RegularUser user = RegularUser.create(
            testEmail, testPlainPassword, testFirstName, testLastName, null, false, passwordEncoder
        );

        // Assert
        assertNotNull(user);
        assertEquals(testEmail, user.getEmail());
        assertEquals(testPasswordHash, user.getPasswordHash());
        assertEquals(testFirstName, user.getFirst_name());
        assertEquals(testLastName, user.getLast_name());
        assertNotNull(user.getId());
    }

    @Test
    void GivenValidDataWithProfileImageUrl_WhenCreate_ThenReturnRegularUserWithProfileImage() {
        // Arrange
        String profileImageUrl = "https://example.com/image.jpg";

        // Act
        RegularUser user = RegularUser.create(
            testEmail, testPlainPassword, testFirstName, testLastName, profileImageUrl, false, passwordEncoder
        );

        // Assert
        assertEquals(profileImageUrl, user.getProfileImageURL());
    }

    @Test
    void GivenNullProfileImageUrl_WhenCreate_ThenReturnRegularUserWithEmptyString() {
        // Act
        RegularUser user = RegularUser.create(
            testEmail, testPlainPassword, testFirstName, testLastName, null, false, passwordEncoder
        );

        // Assert
        assertEquals("", user.getProfileImageURL());
    }

    @Test
    void GivenNullEmail_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(null, testPlainPassword, testFirstName, testLastName, null, false, passwordEncoder)
        );

        assertEquals("Email cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyEmail_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create("   ", testPlainPassword, testFirstName, testLastName, null, false, passwordEncoder)
        );

        assertEquals("Email cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenNullPassword_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, null, testFirstName, testLastName, null, false, passwordEncoder)
        );

        assertEquals("Password cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyPassword_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, "   ", testFirstName, testLastName, null, false, passwordEncoder)
        );

        assertEquals("Password cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenNullFirstName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPlainPassword, null, testLastName, null, false, passwordEncoder)
        );

        assertEquals("First name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyFirstName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPlainPassword, "   ", testLastName, null, false, passwordEncoder)
        );

        assertEquals("First name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenNullLastName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPlainPassword, testFirstName, null, null, false, passwordEncoder)
        );

        assertEquals("Last name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyLastName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPlainPassword, testFirstName, "   ", null, false, passwordEncoder)
        );

        assertEquals("Last name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmailExists_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(
                testEmail, testPlainPassword, testFirstName, testLastName, null, true, passwordEncoder
            )
        );

        assertEquals("Email already exists: " + testEmail, exception.getMessage());
    }

    @Test
    void GivenEmailNotExists_WhenCreate_ThenReturnRegularUser() {
        // Act
        RegularUser user = RegularUser.create(
            testEmail, testPlainPassword, testFirstName, testLastName, null, false, passwordEncoder
        );

        // Assert
        assertNotNull(user);
        assertEquals(testEmail, user.getEmail());
        assertEquals(testFirstName, user.getFirst_name());
        assertEquals(testLastName, user.getLast_name());
    }
}
