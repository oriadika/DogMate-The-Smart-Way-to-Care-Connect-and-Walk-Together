package com.DogMate.Controller;

import com.DogMate.Domain.RegularUser;
import com.DogMate.Service.UserService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /* Register a new user
     * POST /api/users/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterUserRequest request) {
        
        try {
            System.out.println("Received registration request for email: " + request.getEmail());
            // Validate request
            if (request == null || request.getEmail() == null || request.getPassword() == null ||
                request.getFirstName() == null || request.getLastName() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Missing required fields"));
            }

            // Register user
            RegularUser newUser = userService.registerUser(
                request.getEmail(),
                request.getPassword(),
                request.getFirstName(),
                request.getLastName(),
                request.getProfileImageUrl()
            );

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User registered successfully");
            response.put("userId", newUser.getId());
            response.put("email", newUser.getEmail());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to register user: " + e.getMessage()));
        }
    }

    /**
     * Delete a user by ID
     * DELETE /api/users/{userId}
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        try {
            // Validate userId parameter
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID is required"));
            }

            // Parse UUID
            java.util.UUID userUuid;
            try {
                userUuid = java.util.UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid user ID format"));
            }

            // Delete user
            userService.deleteUser(userUuid);

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User deleted successfully");
            response.put("userId", userId);
            
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to delete user: " + e.getMessage()));
        }
    }

    /**
     * Delete a user by email
     * DELETE /api/users/email/{email}
     */
    @DeleteMapping("/email/{email}")
    public ResponseEntity<?> deleteUserByEmail(@PathVariable String email) {
        try {
            // Validate email parameter
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Email is required"));
            }

            // Delete user
            userService.deleteUserByEmail(email);

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User deleted successfully");
            response.put("email", email);
            
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to delete user: " + e.getMessage()));
        }
    }

    /**
     * Get all users
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        try {
            java.util.List<com.DogMate.Domain.UserAccount> users = userService.getAllUsers();
            
            java.util.List<Map<String, Object>> usersList = new java.util.ArrayList<>();
            for (com.DogMate.Domain.UserAccount user : users) {
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("id", user.getId());
                userInfo.put("email", user.getEmail());
                userInfo.put("createdAt", user.getCreatedAt());
                
                if (user instanceof com.DogMate.Domain.RegularUser) {
                    com.DogMate.Domain.RegularUser regularUser = (com.DogMate.Domain.RegularUser) user;
                    userInfo.put("type", "RegularUser");
                    userInfo.put("firstName", regularUser.getFirst_name());
                    userInfo.put("lastName", regularUser.getLast_name());
                } else if (user instanceof com.DogMate.Domain.AdminUser) {
                    com.DogMate.Domain.AdminUser adminUser = (com.DogMate.Domain.AdminUser) user;
                    userInfo.put("type", "AdminUser");
                    userInfo.put("permissionLevel", adminUser.getPermissionLevel());
                }
                
                usersList.add(userInfo);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", usersList.size());
            response.put("users", usersList);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to get users: " + e.getMessage()));
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
    public static class RegisterUserRequest {
        private String email;
        private String password;
        private String firstName;
        private String lastName;
        private String profileImageUrl;

        // Default constructor for Jackson
        public RegisterUserRequest() {
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

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getProfileImageUrl() {
            return profileImageUrl;
        }

        public void setProfileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
        }
    }
}