package com.DogMate.Controller;

import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Ping;
import com.DogMate.Service.UserService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;
    
    // In-memory ping storage: Map<toUserId, List<Ping>>
    private static final Map<String, List<Ping>> pingStorage = new ConcurrentHashMap<>();

    @Autowired
    public UserController(UserService userService, SimpMessagingTemplate messagingTemplate) {
        this.userService = userService;
        this.messagingTemplate = messagingTemplate;
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
                request.getLastName()
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
     * Logout a user by ID (sets isActive to false)
     * POST /api/users/logout/{userId}
     */
    @PostMapping("/logout/{userId}")
    public ResponseEntity<?> logoutUserById(@PathVariable String userId) {
        try {
            // Validate userId parameter
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID is required"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid user ID format"));
            }

            // Logout user
            userService.updateUserActiveStatus(userUuid, false); // Assuming you have this method in UserService

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User logged out successfully");
            response.put("userId", userId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND) // Use NOT_FOUND for user not found errors
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to log out user: " + e.getMessage()));
        }
    }

    /**
     * Logout a user by email (sets isActive to false)
     * POST /api/users/logout/email/{email}
     */
    @PostMapping("/logout/email/{email}")
    public ResponseEntity<?> logoutUserByEmail(@PathVariable String email) {
        try {
            // Validate email parameter
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Email is required"));
            }

            // Logout user
            userService.updateUserActiveStatusByEmail(email, false); // Assuming you have this method in UserService

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User logged out successfully");
            response.put("email", email);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND) // Use NOT_FOUND for user not found errors
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to log out user: " + e.getMessage()));
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

        /**
     * Get all users
     * GET /api/users
     */
    @GetMapping("/logged")
    public ResponseEntity<?> getAllLoggedUsers() {
        try {
            System.out.println("Fetching all logged in users");
            java.util.List<com.DogMate.Domain.UserAccount> users = userService.getAllUsers();
            
            java.util.List<Map<String, Object>> usersList = new java.util.ArrayList<>();
            for (com.DogMate.Domain.UserAccount user : users) {
                if (!user.isLoggedIn()) {
                    continue; // Skip inactive users
                }
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("id", user.getId());
                userInfo.put("email", user.getEmail());
                userInfo.put("createdAt", user.getCreatedAt());
                
                if (user instanceof com.DogMate.Domain.RegularUser) {
                    com.DogMate.Domain.RegularUser regularUser = (com.DogMate.Domain.RegularUser) user;
                    userInfo.put("type", "RegularUser");
                    userInfo.put("firstName", regularUser.getFirst_name());
                    userInfo.put("lastName", regularUser.getLast_name());
                    // Add location if available
                    if (regularUser.getLatitude() != null && regularUser.getLongitude() != null) {
                        userInfo.put("latitude", regularUser.getLatitude());
                        userInfo.put("longitude", regularUser.getLongitude());
                    }
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

    /**
     * Send a ping to another user
     * POST /api/users/ping
     */
    @PostMapping("/ping")
    public ResponseEntity<?> sendPing(@RequestBody PingRequest request) {
        try {
            // Validate request
            if (request == null || request.getFromUserId() == null || request.getToUserId() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("From user ID and to user ID are required"));
            }

            System.out.println("Ping received from: " + request.getFromUserId() + " to: " + request.getToUserId());

            // Create and store ping
            Ping ping = new Ping();
            ping.setFromUserId(request.getFromUserId());
            ping.setFromUserName(request.getFromUserName() != null ? request.getFromUserName() : "Unknown User");
            ping.setToUserId(request.getToUserId());
            ping.setRead(false);

            // Store ping in memory
            pingStorage.computeIfAbsent(request.getToUserId(), k -> new ArrayList<>()).add(ping);
            System.out.println("Ping stored for user: " + request.getToUserId());

            // Send WebSocket notification to the target user (for real-time fallback)
            PingWebSocketController.PingNotification notification = 
                new PingWebSocketController.PingNotification(
                    request.getFromUserId(),
                    request.getFromUserName() != null ? request.getFromUserName() : "Unknown User",
                    request.getToUserId()
                );

            messagingTemplate.convertAndSend(
                "/topic/ping/" + request.getToUserId(),
                notification
            );

            System.out.println("WebSocket notification sent to user: " + request.getToUserId());

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Ping sent successfully");
            response.put("fromUserId", request.getFromUserId());
            response.put("toUserId", request.getToUserId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to send ping: " + e.getMessage()));
        }
    }

    /**
     * Get pending (unread) pings for a user
     * GET /api/users/pings/pending/{userId}
     * Note: Used primarily for recovery if WebSocket connection is lost
     */
    @GetMapping("/pings/pending/{userId}")
    public ResponseEntity<?> getPendingPings(@PathVariable String userId) {
        try {
            // Validate userId parameter
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID is required"));
            }

            // Retrieve unread pings for this user (fallback for WebSocket disconnections)
            List<Ping> pings = pingStorage.getOrDefault(userId, new ArrayList<>());
            List<Ping> unreadPings = new ArrayList<>();
            
            for (Ping ping : pings) {
                if (!ping.isRead()) {
                    unreadPings.add(ping);
                }
            }

            System.out.println("Returning " + unreadPings.size() + " unread pings for user: " + userId);

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("pings", unreadPings);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to get pending pings: " + e.getMessage()));
        }
    }

    /**
     * Mark a ping as read (cleanup for undelivered pings)
     * POST /api/users/pings/{pingId}/read
     * Note: WebSocket notifications are instant, no need to mark as read
     */
    @PostMapping("/pings/{pingId}/read")
    public ResponseEntity<?> markPingAsRead(@PathVariable String pingId) {
        try {
            // Validate pingId parameter
            if (pingId == null || pingId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Ping ID is required"));
            }

            // Find and mark ping as read
            boolean found = false;
            for (List<Ping> pings : pingStorage.values()) {
                for (Ping ping : pings) {
                    if (ping.getId().equals(pingId)) {
                        ping.setRead(true);
                        found = true;
                        System.out.println("Marked ping " + pingId + " as read");
                        break;
                    }
                }
                if (found) break;
            }

            if (!found) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Ping not found"));
            }

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Ping marked as read");
            response.put("pingId", pingId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to mark ping as read: " + e.getMessage()));
        }
    }

    /**
     * Update user's current location
     * POST /api/users/{userId}/location
     */
    @PostMapping("/{userId}/location")
    public ResponseEntity<?> updateUserLocation(
            @PathVariable String userId,
            @RequestBody LocationUpdateRequest request) {
        try {
            // Validate inputs
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID is required"));
            }

            if (request == null || request.getLatitude() == null || request.getLongitude() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Latitude and longitude are required"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid user ID format"));
            }

            // Update user location via service
            userService.updateUserLocation(userUuid, request.getLatitude(), request.getLongitude());

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Location updated successfully");
            response.put("userId", userId);
            response.put("latitude", request.getLatitude());
            response.put("longitude", request.getLongitude());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to update location: " + e.getMessage()));
        }
    }

    /**
     * Clear user's location (hide from other users)
     * DELETE /api/users/{userId}/location
     */
    @DeleteMapping("/{userId}/location")
    public ResponseEntity<?> clearUserLocation(@PathVariable String userId) {
        try {
            // Validate inputs
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID is required"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid user ID format"));
            }

            // Clear user location via service (set to null)
            userService.clearUserLocation(userUuid);

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Location cleared successfully");
            response.put("userId", userId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to clear location: " + e.getMessage()));
        }
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        return error;
    }

    // Inner class for location update request DTO
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LocationUpdateRequest {
        private Double latitude;
        private Double longitude;

        public LocationUpdateRequest() {
        }

        public Double getLatitude() {
            return latitude;
        }

        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }

        public Double getLongitude() {
            return longitude;
        }

        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }
    }

    // Inner class for request DTO
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RegisterUserRequest {
        private String email;
        private String password;
        private String firstName;
        private String lastName;
        private boolean isLoggedIn;

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

        public boolean isLogggedIn() {
            return isLoggedIn;
        }

        public void setisActive(boolean isActive) {
            this.isLoggedIn = isActive;
        }
    }

    // Inner class for ping request DTO
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PingRequest {
        private String fromUserId;
        private String fromUserName;
        private String toUserId;

        // Default constructor for Jackson
        public PingRequest() {
        }

        // Getters and Setters
        public String getFromUserId() {
            return fromUserId;
        }

        public void setFromUserId(String fromUserId) {
            this.fromUserId = fromUserId;
        }

        public String getFromUserName() {
            return fromUserName;
        }

        public void setFromUserName(String fromUserName) {
            this.fromUserName = fromUserName;
        }

        public String getToUserId() {
            return toUserId;
        }

        public void setToUserId(String toUserId) {
            this.toUserId = toUserId;
        }
    }
}