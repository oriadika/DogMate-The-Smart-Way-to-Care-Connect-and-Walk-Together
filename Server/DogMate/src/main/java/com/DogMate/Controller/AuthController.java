package com.DogMate.Controller;

import com.DogMate.Domain.UserAccount;
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

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
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

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorResponse("Invalid credentials"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to login: " + e.getMessage()));
        }
    }

    /**
     * Logout a user
     * POST /api/auth/logout
     * TODO: Implement logout logic (invalidate session/token)
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody LogoutRequest request) {
        try {
            // Validate request
            if (request == null || (request.getUserId() == null && request.getEmail() == null)) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID or email is required"));
            }

            // TODO: Invalidate user session/token
            // TODO: Clear authentication data
            // TODO: Log logout event for audit trail

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Logout successful");
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to logout: " + e.getMessage()));
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
}
