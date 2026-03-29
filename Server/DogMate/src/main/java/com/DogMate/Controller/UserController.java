package com.DogMate.Controller;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Ping;
import com.DogMate.Domain.WalkRequest;
import com.DogMate.Service.DogWalkerService;
import com.DogMate.Service.UserService;
import com.DogMate.Service.WalkRequestService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
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
    private final DogWalkerService dogWalkerService;
    private final WalkRequestService walkRequestService;
    private final SimpMessagingTemplate messagingTemplate;
    
    // In-memory ping storage: Map<toUserId, List<Ping>>
    private static final Map<String, List<Ping>> pingStorage = new ConcurrentHashMap<>();

    @Autowired
    public UserController(UserService userService, DogWalkerService dogWalkerService,
                          WalkRequestService walkRequestService,
                          SimpMessagingTemplate messagingTemplate) {
        this.userService = userService;
        this.dogWalkerService = dogWalkerService;
        this.walkRequestService = walkRequestService;
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

            String role = normalizeRegistrationRole(request.getUserRole());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User registered successfully");

            if ("walker".equals(role)) {
                DogWalkerUser newWalker = dogWalkerService.registerDogWalker(
                    request.getEmail(),
                    request.getPassword(),
                    request.getFirstName(),
                    request.getLastName()
                );
                response.put("userId", newWalker.getId());
                response.put("email", newWalker.getEmail());
                response.put("userRole", "walker");
            } else {
                RegularUser newUser = userService.registerUser(
                    request.getEmail(),
                    request.getPassword(),
                    request.getFirstName(),
                    request.getLastName()
                );
                response.put("userId", newUser.getId());
                response.put("email", newUser.getEmail());
                response.put("userRole", "owner");
            }

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
     * Suspend a user by ID
     * POST /api/users/{userId}
     */
    @PostMapping("/{userId}/suspend")
    public ResponseEntity<?> suspendUser(@PathVariable String userId) {
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

            // Suspend user
            userService.suspendUser(userUuid);

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User suspended successfully");
            response.put("userId", userId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to suspend user: " + e.getMessage()));
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
                userInfo.put("suspended", user.isSuspended());
                
                if (user instanceof com.DogMate.Domain.RegularUser) {
                    com.DogMate.Domain.RegularUser regularUser = (com.DogMate.Domain.RegularUser) user;
                    userInfo.put("type", "RegularUser");
                    userInfo.put("firstName", regularUser.getFirst_name());
                    userInfo.put("lastName", regularUser.getLast_name());
                } else if (user instanceof com.DogMate.Domain.DogWalkerUser) {
                    com.DogMate.Domain.DogWalkerUser walker = (com.DogMate.Domain.DogWalkerUser) user;
                    userInfo.put("type", "DogWalkerUser");
                    userInfo.put("firstName", walker.getFirst_name());
                    userInfo.put("lastName", walker.getLast_name());
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
     * Get all logged-in users
     * GET /api/users/logged
     */
    @GetMapping("/logged")
    @Cacheable(cacheNames = "loggedUsers")
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
                userInfo.put("suspended", user.isSuspended());
                
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
                } else if (user instanceof com.DogMate.Domain.DogWalkerUser) {
                    com.DogMate.Domain.DogWalkerUser walker = (com.DogMate.Domain.DogWalkerUser) user;
                    userInfo.put("type", "DogWalkerUser");
                    userInfo.put("firstName", walker.getFirst_name());
                    userInfo.put("lastName", walker.getLast_name());
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

    /**
     * Owner creates a walk request to a dog walker (minimal flow for tests / demos).
     * POST /api/users/{ownerId}/walk-requests
     */
    @PostMapping("/{ownerId}/walk-requests")
    public ResponseEntity<?> createWalkRequest(
            @PathVariable String ownerId,
            @RequestBody CreateWalkRequestBody body) {
        try {
            if (ownerId == null || ownerId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("Owner user ID is required"));
            }
            UUID ownerUuid;
            try {
                ownerUuid = UUID.fromString(ownerId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(createErrorResponse("Invalid owner user ID format"));
            }
            if (body == null || body.getWalkerId() == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("walkerId is required"));
            }
            if (body.getScheduledStart() == null || body.getScheduledEnd() == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("scheduledStart and scheduledEnd are required (ISO-8601 instant)"));
            }

            WalkRequest created = walkRequestService.createForOwner(
                    ownerUuid,
                    body.getWalkerId(),
                    body.getDogId(),
                    body.getScheduledStart(),
                    body.getScheduledEnd(),
                    body.getNotes());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(DogWalkerController.walkRequestToResponse(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to create walk request: " + e.getMessage()));
        }
    }

    private static String normalizeRegistrationRole(String userRole) {
        if (userRole == null || userRole.trim().isEmpty()) {
            return "owner";
        }
        if ("walker".equalsIgnoreCase(userRole.trim())) {
            return "walker";
        }
        return "owner";
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
        /** "owner" (default) or "walker" */
        private String userRole;
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

        public String getUserRole() {
            return userRole;
        }

        public void setUserRole(String userRole) {
            this.userRole = userRole;
        }

        public boolean isLogggedIn() {
            return isLoggedIn;
        }

        public void setisActive(boolean isActive) {
            this.isLoggedIn = isActive;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateWalkRequestBody {
        private UUID walkerId;
        private UUID dogId;
        private Instant scheduledStart;
        private Instant scheduledEnd;
        private String notes;

        public UUID getWalkerId() {
            return walkerId;
        }

        public void setWalkerId(UUID walkerId) {
            this.walkerId = walkerId;
        }

        public UUID getDogId() {
            return dogId;
        }

        public void setDogId(UUID dogId) {
            this.dogId = dogId;
        }

        public Instant getScheduledStart() {
            return scheduledStart;
        }

        public void setScheduledStart(Instant scheduledStart) {
            this.scheduledStart = scheduledStart;
        }

        public Instant getScheduledEnd() {
            return scheduledEnd;
        }

        public void setScheduledEnd(Instant scheduledEnd) {
            this.scheduledEnd = scheduledEnd;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
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