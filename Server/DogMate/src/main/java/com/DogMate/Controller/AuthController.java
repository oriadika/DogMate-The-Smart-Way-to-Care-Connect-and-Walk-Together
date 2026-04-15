package com.DogMate.Controller;

import com.DogMate.Domain.UserAccount;
import com.DogMate.Service.PendingRegistrationService;
import com.DogMate.Service.UserService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private final UserService userService;
    private final PendingRegistrationService pendingRegistrationService;

    @Autowired
    public AuthController(UserService userService, PendingRegistrationService pendingRegistrationService) {
        this.userService = userService;
        this.pendingRegistrationService = pendingRegistrationService;
    }

    /**
     * Login/Authenticate a user
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            // Validate request
            if (request == null || request.getEmail() == null || request.getPassword() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Email and password are required"));
            }

            // Authenticate user
            UserAccount user = userService.login(request.getEmail(), request.getPassword());

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            response.put("suspended", user.isSuspended());
            
            // Add user type and specific details
            if (user instanceof com.DogMate.Domain.RegularUser) {
                com.DogMate.Domain.RegularUser regularUser = (com.DogMate.Domain.RegularUser) user;
                response.put("userRole", "owner");
                response.put("firstName", regularUser.getFirst_name());
                response.put("lastName", regularUser.getLast_name());
            } else if (user instanceof com.DogMate.Domain.DogWalkerUser) {
                com.DogMate.Domain.DogWalkerUser walkerUser = (com.DogMate.Domain.DogWalkerUser) user;
                response.put("userRole", "walker");
                response.put("firstName", walkerUser.getFirst_name());
                response.put("lastName", walkerUser.getLast_name());
            } else if (user instanceof com.DogMate.Domain.AdminUser) {
                com.DogMate.Domain.AdminUser adminUser = (com.DogMate.Domain.AdminUser) user;
                response.put("userRole", "admin");
            }
            
            return ResponseEntity.ok(response);

        }
        catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to login: " + e.getMessage()));
        }
    }

    /**
     * Logout a user
     * POST /api/auth/logout
     * Supports logout by userId or email
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody LogoutRequest request) {
        try {
            // Validate request
            if (request == null || (request.getUserId() == null && request.getEmail() == null)) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID or email is required"));
            }

            // Logout by ID or email
            if (request.getUserId() != null && !request.getUserId().isEmpty()) {
                java.util.UUID userId = java.util.UUID.fromString(request.getUserId());
                userService.logout(userId);
            } else if (request.getEmail() != null && !request.getEmail().isEmpty()) {
                userService.logoutByEmail(request.getEmail());
            }

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Logout successful");
            
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse("User not found: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to logout: " + e.getMessage()));
        }
    }

    /**
     * Finishes signup after OTP: creates the user account (email already verified).
     */
    @PostMapping("/verify-registration")
    public ResponseEntity<?> verifyRegistration(@RequestBody VerifyEmailRequest request) {
        try {
            if (request == null || request.getEmail() == null || request.getCode() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Email and verification code are required"));
            }
            UserAccount user = pendingRegistrationService.completeRegistration(
                request.getEmail(),
                request.getCode()
            );
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Account created successfully");
            response.put("userId", user.getId().toString());
            response.put("email", user.getEmail());
            if (user instanceof com.DogMate.Domain.RegularUser ru) {
                response.put("userRole", "owner");
                response.put("firstName", ru.getFirst_name());
                response.put("lastName", ru.getLast_name());
                response.put("phoneNumber", ru.getPhoneNumber() != null ? ru.getPhoneNumber() : "");
            } else if (user instanceof com.DogMate.Domain.DogWalkerUser w) {
                response.put("userRole", "walker");
                response.put("firstName", w.getFirst_name());
                response.put("lastName", w.getLast_name());
                response.put("phoneNumber", w.getPhoneNumber() != null ? w.getPhoneNumber() : "");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to verify registration: " + e.getMessage()));
        }
    }

    /**
     * Resend OTP only for an in-progress signup ({@link PendingRegistrationService}).
     * Already-registered users do not receive verification codes here — they sign in instead.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendVerificationRequest request) {
        try {
            if (request == null || request.getEmail() == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("Email is required"));
            }
            pendingRegistrationService.resendOtp(request.getEmail());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Verification code sent successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to resend verification code: " + e.getMessage()));
        }
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        return error;
    }

    // Inner class for request DTO
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LoginRequest {
        private String email;
        private String password;

        // Default constructor for Jackson
        public LoginRequest() {
        }

        // Getters and Setters
        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    // Inner class for logout request DTO
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LogoutRequest {
        private String userId;
        private String email;

        // Default constructor for Jackson
        public LogoutRequest() {
        }

        // Getters and Setters
        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class VerifyEmailRequest {
        private String email;
        private String code;

        public VerifyEmailRequest() {
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ResendVerificationRequest {
        private String email;

        public ResendVerificationRequest() {
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }
}
