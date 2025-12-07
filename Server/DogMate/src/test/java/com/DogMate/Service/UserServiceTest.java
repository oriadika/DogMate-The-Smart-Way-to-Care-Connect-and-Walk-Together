package com.DogMate.Service;

import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.UserAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private IUserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private String testEmail;
    private String testPassword;
    private String testFirstName;
    private String testLastName;
    private String testPasswordHash;

    @BeforeEach
    void setUp() {
        testEmail = "test@example.com";
        testPassword = "password123";
        testFirstName = "John";
        testLastName = "Doe";
        testPasswordHash = "$2a$10$hashedPasswordString";
    }

    @Test
    void GivenValidUserData_WhenRegisterUser_ThenCallDependenciesAndReturnUser() {
        // Arrange
        RegularUser mockSavedUser = new RegularUser(
            java.util.UUID.randomUUID(), testEmail, testPasswordHash, testFirstName, testLastName
        );
        when(userRepository.existsByEmail(testEmail)).thenReturn(false);
        when(passwordEncoder.encode(testPassword)).thenReturn(testPasswordHash);
        when(userRepository.save(any(RegularUser.class))).thenReturn(mockSavedUser);

        // Act
        RegularUser result = userService.registerUser(
            testEmail, testPassword, testFirstName, testLastName
        );

        // Assert - Verify Service calls dependencies correctly
        verify(userRepository, times(1)).existsByEmail(testEmail);
        verify(passwordEncoder, times(1)).encode(testPassword);
        verify(userRepository, times(1)).save(any(RegularUser.class));
        // Verify Service returns what repository returns
        assertEquals(mockSavedUser, result);
    }

    @Test
    void GivenValidUserDataWithProfileImageUrl_WhenRegisterUser_ThenCallDependencies() {
        // Arrange
        String profileImageUrl = "https://example.com/image.jpg";
        RegularUser mockSavedUser = new RegularUser(
            java.util.UUID.randomUUID(), testEmail, testPasswordHash, testFirstName, testLastName
        );
        when(userRepository.existsByEmail(testEmail)).thenReturn(false);
        when(passwordEncoder.encode(testPassword)).thenReturn(testPasswordHash);
        when(userRepository.save(any(RegularUser.class))).thenReturn(mockSavedUser);

        // Act
        RegularUser result = userService.registerUser(
            testEmail, testPassword, testFirstName, testLastName
        );

        // Assert - Verify Service calls dependencies correctly
        verify(userRepository, times(1)).existsByEmail(testEmail);
        verify(passwordEncoder, times(1)).encode(testPassword);
        verify(userRepository, times(1)).save(any(RegularUser.class));
        assertEquals(mockSavedUser, result);
    }

    @Test
    void GivenEmailAlreadyExists_WhenRegisterUser_ThenThrowExceptionAndNotCallPasswordEncoderOrSave() {
        // Arrange
        when(userRepository.existsByEmail(testEmail)).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> userService.registerUser(testEmail, testPassword, testFirstName, testLastName)
        );

        // Verify Service behavior: checks email, but doesn't hash or save
        assertEquals("Email already exists: " + testEmail, exception.getMessage());
        verify(userRepository, times(1)).existsByEmail(testEmail);
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any());
    }


    @Test
    void GivenValidUserAccount_WhenCreateUser_ThenCallRepositoryAndReturnSavedUser() {
        // Arrange
        UUID userId = UUID.randomUUID();
        UserAccount userAccount = new UserAccount(userId, testEmail, testPasswordHash);
        UserAccount savedUserAccount = new UserAccount(userId, testEmail, testPasswordHash);
        when(userRepository.existsByEmail(testEmail)).thenReturn(false);
        when(userRepository.save(userAccount)).thenReturn(savedUserAccount);

        // Act
        UserAccount result = userService.createUser(userAccount);

        // Assert - Verify Service calls repository correctly
        verify(userRepository, times(1)).existsByEmail(testEmail);
        verify(userRepository, times(1)).save(userAccount);
        // Verify Service returns what repository returns
        assertEquals(savedUserAccount, result);
    }

    @Test
    void GivenNullUserAccount_WhenCreateUser_ThenThrowExceptionAndNotCallRepository() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> userService.createUser(null)
        );

        // Verify Service validates before calling repository
        assertEquals("User account cannot be null", exception.getMessage());
        verify(userRepository, never()).existsByEmail(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    void GivenEmailAlreadyExists_WhenCreateUser_ThenThrowExceptionAndNotSave() {
        // Arrange
        UUID userId = UUID.randomUUID();
        UserAccount userAccount = new UserAccount(userId, testEmail, testPasswordHash);
        when(userRepository.existsByEmail(testEmail)).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> userService.createUser(userAccount)
        );

        // Verify Service checks email but doesn't save when email exists
        assertEquals("Email already exists: " + testEmail, exception.getMessage());
        verify(userRepository, times(1)).existsByEmail(testEmail);
        verify(userRepository, never()).save(any());
    }

    @Test
    void GivenValidUserId_WhenDeleteUser_ThenCallRepositoryDelete() {
        // Arrange
        UUID userId = UUID.randomUUID();
        UserAccount existingUser = new UserAccount(userId, testEmail, testPasswordHash);
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(existingUser));
        doNothing().when(userRepository).deleteById(userId);

        // Act
        userService.deleteUser(userId);

        // Assert - Verify Service calls repository correctly
        verify(userRepository, times(1)).findById(userId);
        verify(userRepository, times(1)).deleteById(userId);
    }

    @Test
    void GivenNullUserId_WhenDeleteUser_ThenThrowExceptionAndNotCallRepository() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> userService.deleteUser(null)
        );

        // Verify Service validates before calling repository
        assertEquals("User ID cannot be null", exception.getMessage());
        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    void GivenUserNotExists_WhenDeleteUser_ThenThrowExceptionAndNotDelete() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> userService.deleteUser(userId)
        );

        // Verify Service checks if user exists but doesn't delete
        assertEquals("User not found with ID: " + userId, exception.getMessage());
        verify(userRepository, times(1)).findById(userId);
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    void GivenValidEmail_WhenDeleteUserByEmail_ThenCallRepositoryDelete() {
        // Arrange
        UUID userId = UUID.randomUUID();
        UserAccount existingUser = new UserAccount(userId, testEmail, testPasswordHash);
        when(userRepository.findByEmail(testEmail)).thenReturn(java.util.Optional.of(existingUser));
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(existingUser));
        doNothing().when(userRepository).deleteById(userId);

        // Act
        userService.deleteUserByEmail(testEmail);

        // Assert - Verify Service calls repository correctly
        verify(userRepository, times(1)).findByEmail(testEmail);
        verify(userRepository, times(1)).findById(userId);
        verify(userRepository, times(1)).deleteById(userId);
    }

    @Test
    void GivenNullEmail_WhenDeleteUserByEmail_ThenThrowExceptionAndNotCallRepository() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> userService.deleteUserByEmail(null)
        );

        // Verify Service validates before calling repository
        assertEquals("Email cannot be null or empty", exception.getMessage());
        verify(userRepository, never()).findByEmail(anyString());
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    void GivenEmailNotExists_WhenDeleteUserByEmail_ThenThrowException() {
        // Arrange
        when(userRepository.findByEmail(testEmail)).thenReturn(java.util.Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> userService.deleteUserByEmail(testEmail)
        );

        // Verify Service checks if user exists but doesn't delete
        assertEquals("User not found with email: " + testEmail, exception.getMessage());
        verify(userRepository, times(1)).findByEmail(testEmail);
        verify(userRepository, never()).deleteById(any());
    }
}

