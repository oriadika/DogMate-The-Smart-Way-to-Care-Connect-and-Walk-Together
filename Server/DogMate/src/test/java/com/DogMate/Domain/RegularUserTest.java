package com.DogMate.Domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class RegularUserTest {

    private String testEmail;
    private String testPasswordHash;
    private String testFirstName;
    private String testLastName;

    @BeforeEach
    void setUp() {
        testEmail = "test@example.com";
        testPasswordHash = "$2a$10$hashedPasswordString";
        testFirstName = "John";
        testLastName = "Doe";
    }

    @Test
    void GivenValidData_WhenCreate_ThenReturnRegularUser() {
        // Act
        RegularUser user = RegularUser.create(
            testEmail, testPasswordHash, testFirstName, testLastName, null
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
            testEmail, testPasswordHash, testFirstName, testLastName, profileImageUrl
        );

        // Assert
        assertEquals(profileImageUrl, user.getProfileImageURL());
    }

    @Test
    void GivenNullProfileImageUrl_WhenCreate_ThenReturnRegularUserWithEmptyString() {
        // Act
        RegularUser user = RegularUser.create(
            testEmail, testPasswordHash, testFirstName, testLastName, null
        );

        // Assert
        assertEquals("", user.getProfileImageURL());
    }

    @Test
    void GivenNullEmail_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(null, testPasswordHash, testFirstName, testLastName, null)
        );

        assertEquals("Email cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyEmail_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create("   ", testPasswordHash, testFirstName, testLastName, null)
        );

        assertEquals("Email cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenNullFirstName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPasswordHash, null, testLastName, null)
        );

        assertEquals("First name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyFirstName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPasswordHash, "   ", testLastName, null)
        );

        assertEquals("First name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenNullLastName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPasswordHash, testFirstName, null, null)
        );

        assertEquals("Last name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmptyLastName_WhenCreate_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.create(testEmail, testPasswordHash, testFirstName, "   ", null)
        );

        assertEquals("Last name cannot be null or empty", exception.getMessage());
    }

    @Test
    void GivenEmailExists_WhenCreateWithEmailCheck_ThenThrowException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> RegularUser.createWithEmailCheck(
                testEmail, testPasswordHash, testFirstName, testLastName, null, true
            )
        );

        assertEquals("Email already exists: " + testEmail, exception.getMessage());
    }

    @Test
    void GivenEmailNotExists_WhenCreateWithEmailCheck_ThenReturnRegularUser() {
        // Act
        RegularUser user = RegularUser.createWithEmailCheck(
            testEmail, testPasswordHash, testFirstName, testLastName, null, false
        );

        // Assert
        assertNotNull(user);
        assertEquals(testEmail, user.getEmail());
        assertEquals(testFirstName, user.getFirst_name());
        assertEquals(testLastName, user.getLast_name());
    }
}
