package com.DogMate.Controller;

import com.DogMate.Service.DogWalkerService;
import com.DogMate.Service.PendingRegistrationService;
import com.DogMate.Service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private DogWalkerService dogWalkerService;

    @MockBean
    private PendingRegistrationService pendingRegistrationService;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID testUserId;
    private String testEmail;
    private String testPassword;
    private String testFirstName;
    private String testLastName;
    /** Valid Israeli mobile digits for successful registration */
    private String testValidPhone;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testEmail = "test@example.com";
        testPassword = "password123";
        testFirstName = "John";
        testLastName = "Doe";
        testValidPhone = "0501234567";
    }

    @Test
    void GivenValidUserData_WhenRegisterUser_ThenReturnCreated() throws Exception {
        when(pendingRegistrationService.startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"))
        ).thenReturn(true);

        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setPhoneNumber(testValidPhone);

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.pendingVerification").value(true))
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.userRole").value("owner"));

        verify(pendingRegistrationService, times(1)).startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));
        verify(userService, never()).registerUser(
            anyString(), anyString(), anyString(), anyString(), any());
        verify(dogWalkerService, never()).registerDogWalker(
            anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void GivenValidUserDataWithProfileImageUrl_WhenRegisterUser_ThenReturnCreated() throws Exception {
        when(pendingRegistrationService.startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"))
        ).thenReturn(true);

        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setPhoneNumber(testValidPhone);

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.pendingVerification").value(true));

        verify(pendingRegistrationService, times(1)).startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));
        verify(dogWalkerService, never()).registerDogWalker(
            anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void GivenUserRoleWalker_WhenRegisterUser_ThenCallsDogWalkerServiceAndReturnsWalkerRole() throws Exception {
        when(pendingRegistrationService.startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("walker"))
        ).thenReturn(true);

        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setPhoneNumber(testValidPhone);
        request.setUserRole("walker");

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.userRole").value("walker"))
                .andExpect(jsonPath("$.pendingVerification").value(true));

        verify(pendingRegistrationService, times(1)).startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("walker"));
        verify(userService, never()).registerUser(
            anyString(), anyString(), anyString(), anyString(), any());
        verify(dogWalkerService, never()).registerDogWalker(
            anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void GivenMissingEmail_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        // Arrange
        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);

        // Act & Assert
        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Missing required fields"));

        verify(pendingRegistrationService, never()).startRegistration(
            anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void GivenMissingPassword_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        // Arrange
        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);

        // Act & Assert
        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Missing required fields"));

        verify(pendingRegistrationService, never()).startRegistration(
            anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void GivenMissingFirstName_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        // Arrange
        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setLastName(testLastName);

        // Act & Assert
        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Missing required fields"));

        verify(pendingRegistrationService, never()).startRegistration(
            anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void GivenMissingLastName_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        // Arrange
        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);

        // Act & Assert
        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Missing required fields"));

        verify(pendingRegistrationService, never()).startRegistration(
            anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void GivenEmailAlreadyExists_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        doThrow(new IllegalArgumentException("Email already exists: " + testEmail))
            .when(pendingRegistrationService).startRegistration(
                eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));

        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setPhoneNumber(testValidPhone);

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Email already exists: " + testEmail));

        verify(pendingRegistrationService, times(1)).startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));
        verify(dogWalkerService, never()).registerDogWalker(
            anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void GivenInvalidEmail_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        doThrow(new IllegalArgumentException("Email cannot be null or empty"))
            .when(pendingRegistrationService).startRegistration(
                eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));

        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setPhoneNumber(testValidPhone);

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Email cannot be null or empty"));

        verify(pendingRegistrationService, times(1)).startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));
        verify(dogWalkerService, never()).registerDogWalker(
            anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void GivenDatabaseConnectionFailure_WhenRegisterUser_ThenReturnInternalServerError() throws Exception {
        doThrow(new RuntimeException("Database connection failed"))
            .when(pendingRegistrationService).startRegistration(
                eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));

        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setPhoneNumber(testValidPhone);

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error", containsString("Failed to register user")));

        verify(pendingRegistrationService, times(1)).startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), eq(testValidPhone), eq("owner"));
        verify(dogWalkerService, never()).registerDogWalker(
            anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void GivenWalkerMissingPhone_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setUserRole("walker");

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Phone number is required"));

        verify(pendingRegistrationService, never()).startRegistration(
            anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void GivenOwnerMissingPhone_WhenRegisterUser_ThenReturnCreated() throws Exception {
        when(pendingRegistrationService.startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), isNull(), eq("owner"))
        ).thenReturn(true);

        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.userRole").value("owner"));

        verify(pendingRegistrationService, times(1)).startRegistration(
            eq(testEmail), eq(testPassword), eq(testFirstName), eq(testLastName), isNull(), eq("owner"));
        verify(dogWalkerService, never()).registerDogWalker(
            anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void GivenInvalidIsraeliMobile_WhenRegisterUser_ThenReturnBadRequest() throws Exception {
        UserController.RegisterUserRequest request = new UserController.RegisterUserRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);
        request.setFirstName(testFirstName);
        request.setLastName(testLastName);
        request.setPhoneNumber("0312345678");

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Invalid Israeli mobile phone number"));

        verify(pendingRegistrationService, never()).startRegistration(
            anyString(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void GivenValidUserId_WhenDeleteUser_ThenReturnOk() throws Exception {
        // Arrange
        doNothing().when(userService).deleteUser(testUserId);

        // Act & Assert
        mockMvc.perform(delete("/api/users/{userId}", testUserId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User deleted successfully"))
                .andExpect(jsonPath("$.userId").value(testUserId.toString()));

        verify(userService, times(1)).deleteUser(testUserId);
    }

    @Test
    void GivenInvalidUserIdFormat_WhenDeleteUser_ThenReturnBadRequest() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/users/{userId}", "invalid-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Invalid user ID format"));

        verify(userService, never()).deleteUser(any());
    }

    @Test
    void GivenEmptyUserId_WhenDeleteUser_ThenReturnBadRequest() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/users/{userId}", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("User ID is required"));

        verify(userService, never()).deleteUser(any());
    }

    @Test
    void GivenUserNotExists_WhenDeleteUser_ThenReturnBadRequest() throws Exception {
        // Arrange
        doThrow(new IllegalArgumentException("User not found with ID: " + testUserId))
                .when(userService).deleteUser(testUserId);

        // Act & Assert
        mockMvc.perform(delete("/api/users/{userId}", testUserId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("User not found with ID: " + testUserId));

        verify(userService, times(1)).deleteUser(testUserId);
    }

    @Test
    void GivenValidEmail_WhenDeleteUserByEmail_ThenReturnOk() throws Exception {
        // Arrange
        doNothing().when(userService).deleteUserByEmail(testEmail);

        // Act & Assert
        mockMvc.perform(delete("/api/users/email/{email}", testEmail))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User deleted successfully"))
                .andExpect(jsonPath("$.email").value(testEmail));

        verify(userService, times(1)).deleteUserByEmail(testEmail);
    }

    @Test
    void GivenEmptyEmail_WhenDeleteUserByEmail_ThenReturnBadRequest() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/users/email/{email}", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Email is required"));

        verify(userService, never()).deleteUserByEmail(anyString());
    }

    @Test
    void GivenUserNotExistsByEmail_WhenDeleteUserByEmail_ThenReturnBadRequest() throws Exception {
        // Arrange
        doThrow(new IllegalArgumentException("User not found with email: " + testEmail))
                .when(userService).deleteUserByEmail(testEmail);

        // Act & Assert
        mockMvc.perform(delete("/api/users/email/{email}", testEmail))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("User not found with email: " + testEmail));

        verify(userService, times(1)).deleteUserByEmail(testEmail);
    }

    @Test
    void GivenInternalServerError_WhenDeleteUser_ThenReturn500() throws Exception {
        // Arrange
        doThrow(new RuntimeException("Database connection failed"))
                .when(userService).deleteUser(testUserId);

        // Act & Assert
        mockMvc.perform(delete("/api/users/{userId}", testUserId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error", containsString("Failed to delete user")));

        verify(userService, times(1)).deleteUser(testUserId);
    }
}
