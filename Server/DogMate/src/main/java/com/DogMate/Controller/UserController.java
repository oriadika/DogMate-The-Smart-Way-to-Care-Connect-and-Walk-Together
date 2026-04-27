package com.DogMate.Controller;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Ping;
import com.DogMate.Service.DogWalkerService;
import com.DogMate.Service.PendingRegistrationService;
import com.DogMate.Service.UserService;
import com.DogMate.util.PhoneValidation;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;
    private final DogWalkerService dogWalkerService;
    private final PendingRegistrationService pendingRegistrationService;
    private final SimpMessagingTemplate messagingTemplate;
    
    // In-memory ping storage: Map<toUserId, List<Ping>>
    private static final Map<String, List<Ping>> pingStorage = new ConcurrentHashMap<>();

    /** True when the service message indicates the resource was not found (Hebrew or English). */
    private static boolean isUserNotFoundMessage(String message) {
        if (message == null) {
            return false;
        }
        if (message.contains("לא נמצא")) {
            return true;
        }
        return message.toLowerCase(Locale.ROOT).contains("not found");
    }

    @Autowired
    public UserController(UserService userService, DogWalkerService dogWalkerService,
                          PendingRegistrationService pendingRegistrationService,
                          SimpMessagingTemplate messagingTemplate) {
        this.userService = userService;
        this.dogWalkerService = dogWalkerService;
        this.pendingRegistrationService = pendingRegistrationService;
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
                    .body(createErrorResponse("חסרים שדות חובה"));
            }

            String role = normalizeRegistrationRole(request.getUserRole());
            String phoneDigits = "walker".equals(role)
                ? PhoneValidation.requireValidIsraeliMobile(request.getPhoneNumber())
                : PhoneValidation.optionalValidIsraeliMobile(request.getPhoneNumber());

            boolean verificationEmailSent = pendingRegistrationService.startRegistration(
                request.getEmail(),
                request.getPassword(),
                request.getFirstName(),
                request.getLastName(),
                phoneDigits,
                role
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put(
                "message",
                verificationEmailSent
                    ? "נשלח קוד אימות למייל שלך. הזן את הקוד כדי להשלים את יצירת החשבון."
                    : "ההרשמה נשמרה אך השרת לא הצליח לשלוח מייל (הגדר SPRING_MAIL_PASSWORD ל-Gmail). אפשר לראות את הקוד בלוג השרת או ללחוץ על שליחה מחדש אחרי תיקון המייל."
            );
            response.put("email", request.getEmail().trim());
            response.put("userRole", role);
            response.put("pendingVerification", true);
            response.put("verificationEmailSent", verificationEmailSent);

            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("אירעה שגיאה בהרשמה. נסה שוב מאוחר יותר."));
        }
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable String userId) {
        UUID parsedId;
        try {
            parsedId = UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
        }

        try {
            UserService.UserProfileData profile = userService.getUserProfile(parsedId);
            return ResponseEntity.ok(new UserProfileResponse(
                profile.userId().toString(),
                profile.email(),
                profile.userRole(),
                profile.firstName(),
                profile.lastName(),
                profile.phoneNumber()
            ));
        } catch (IllegalArgumentException e) {
            HttpStatus status = isUserNotFoundMessage(e.getMessage()) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשלה טעינת הפרופיל: " + e.getMessage()));
        }
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<?> updateUserProfile(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request) {
        UUID parsedId;
        try {
            parsedId = UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
        }

        if (request == null ||
            request.getFirstName() == null ||
            request.getLastName() == null ||
            request.getPhoneNumber() == null) {
            return ResponseEntity.badRequest().body(createErrorResponse("חסרים שדות נדרשים"));
        }

        try {
            UserService.UserProfileData profile = userService.updateUserProfile(
                parsedId,
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber()
            );
            return ResponseEntity.ok(new UserProfileResponse(
                profile.userId().toString(),
                profile.email(),
                profile.userRole(),
                profile.firstName(),
                profile.lastName(),
                profile.phoneNumber()
            ));
        } catch (IllegalArgumentException e) {
            HttpStatus status = isUserNotFoundMessage(e.getMessage()) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשל עדכון הפרופיל: " + e.getMessage()));
        }
    }

    @PostMapping("/{userId}/change-password")
    public ResponseEntity<?> changePassword(
            @PathVariable String userId,
            @RequestBody ChangePasswordRequest request) {
        UUID parsedId;
        try {
            parsedId = UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
        }

        if (request == null ||
            request.getOldPassword() == null ||
            request.getNewPassword() == null ||
            request.getConfirmNewPassword() == null) {
            return ResponseEntity.badRequest().body(createErrorResponse("חסרים שדות נדרשים"));
        }

        try {
            userService.changePassword(
                parsedId,
                request.getOldPassword(),
                request.getNewPassword(),
                request.getConfirmNewPassword()
            );
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "הסיסמה עודכנה בהצלחה"
            ));
        } catch (IllegalArgumentException e) {
            HttpStatus status = isUserNotFoundMessage(e.getMessage()) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשל עדכון הסיסמה: " + e.getMessage()));
        }
    }

    @PostMapping("/{userId}/support-requests")
    public ResponseEntity<?> createSupportRequest(
            @PathVariable String userId,
            @Valid @RequestBody SupportRequestCreateRequest request) {
        UUID parsedId;
        try {
            parsedId = UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
        }

        if (request == null ||
            request.getCategory() == null ||
            request.getSubject() == null ||
            request.getDescription() == null) {
            return ResponseEntity.badRequest().body(createErrorResponse("חסרים שדות נדרשים"));
        }

        try {
            var saved = userService.createSupportRequest(
                parsedId,
                request.getCategory(),
                request.getSubject(),
                request.getDescription(),
                request.getContactEmail(),
                request.getContactPhone()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "הפנייה נשלחה בהצלחה",
                "requestId", saved.getId().toString()
            ));
        } catch (IllegalArgumentException e) {
            HttpStatus status = isUserNotFoundMessage(e.getMessage()) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("אירעה שגיאה בשליחת הפנייה. נסה שוב מאוחר יותר."));
        }
    }

    /**
     * Admin: list all customer support requests (newest first).
     * GET /api/users/{adminUserId}/support-requests
     */
    @GetMapping("/{adminUserId}/support-requests")
    public ResponseEntity<?> listSupportRequestsForAdmin(@PathVariable String adminUserId) {
        UUID parsedId;
        try {
            parsedId = UUID.fromString(adminUserId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse("מזהה משתמש לא תקין"));
        }
        try {
            List<Map<String, Object>> requests = userService.listSupportRequestsForAdmin(parsedId);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("requests", requests);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            String msg = e.getMessage() == null ? "" : e.getMessage();
            if (msg.contains("לא נמצא")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(msg));
            }
            if (msg.contains("מנהלים")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(createErrorResponse(msg));
            }
            return ResponseEntity.badRequest().body(createErrorResponse(msg));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("אירעה שגיאה בטעינת הפניות."));
        }
    }

    /**
     * Admin: set support request status (OPEN or CLOSED).
     * PATCH /api/users/{adminUserId}/support-requests/{requestId}
     */
    @PatchMapping("/{adminUserId}/support-requests/{requestId}")
    public ResponseEntity<?> updateSupportRequestStatus(
            @PathVariable String adminUserId,
            @PathVariable String requestId,
            @RequestBody SupportRequestStatusUpdateRequest request) {
        UUID parsedAdminId;
        UUID parsedRequestId;
        try {
            parsedAdminId = UUID.fromString(adminUserId);
            parsedRequestId = UUID.fromString(requestId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse("מזהה לא תקין"));
        }
        if (request == null || request.getStatus() == null || request.getStatus().isBlank()) {
            return ResponseEntity.badRequest().body(createErrorResponse("חסר סטטוס"));
        }
        try {
            Map<String, Object> updated = userService.updateSupportRequestStatus(
                parsedAdminId,
                parsedRequestId,
                request.getStatus()
            );
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("requestId", updated.get("id"));
            body.put("status", updated.get("status"));
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            String msg = e.getMessage() == null ? "" : e.getMessage();
            if (msg.contains("לא נמצא") && msg.contains("פנייה")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(msg));
            }
            if (msg.contains("לא נמצא")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(msg));
            }
            if (msg.contains("מנהלים")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(createErrorResponse(msg));
            }
            return ResponseEntity.badRequest().body(createErrorResponse(msg));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("אירעה שגיאה בעדכון הפנייה."));
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
                    .body(createErrorResponse("נדרש מזהה משתמש"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
            }

            // Logout user
            userService.updateUserActiveStatus(userUuid, false); // Assuming you have this method in UserService

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "התנתקת בהצלחה");
            response.put("userId", userId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND) // Use NOT_FOUND for user not found errors
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשלה ההתנתקות: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש אימייל"));
            }

            // Logout user
            userService.updateUserActiveStatusByEmail(email, false); // Assuming you have this method in UserService

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "התנתקת בהצלחה");
            response.put("email", email);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND) // Use NOT_FOUND for user not found errors
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשלה ההתנתקות: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש מזהה משתמש"));
            }

            // Parse UUID
            java.util.UUID userUuid;
            try {
                userUuid = java.util.UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
            }

            // Delete user
            userService.deleteUser(userUuid);

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "המשתמש נמחק בהצלחה");
            response.put("userId", userId);
            
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשלה מחיקת המשתמש: " + e.getMessage()));
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
                        .body(createErrorResponse("נדרש מזהה משתמש"));
            }

            // Parse UUID
            java.util.UUID userUuid;
            try {
                userUuid = java.util.UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
            }

            // Suspend user
            userService.suspendUser(userUuid);

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "המשתמש הושעה בהצלחה");
            response.put("userId", userId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה השעיית המשתמש: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש אימייל"));
            }

            // Delete user
            userService.deleteUserByEmail(email);

            // Create success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "המשתמש נמחק בהצלחה");
            response.put("email", email);
            
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשלה מחיקת המשתמש: " + e.getMessage()));
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
                .body(createErrorResponse("נכשלה טעינת המשתמשים: " + e.getMessage()));
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
                .body(createErrorResponse("נכשלה טעינת המשתמשים: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרשים מזהה שולח ומזהה נמען"));
            }

            System.out.println("Ping received from: " + request.getFromUserId() + " to: " + request.getToUserId());

            // Create and store ping
            Ping ping = new Ping();
            ping.setFromUserId(request.getFromUserId());
            ping.setFromUserName(request.getFromUserName() != null ? request.getFromUserName() : "משתמש לא ידוע");
            ping.setToUserId(request.getToUserId());
            ping.setRead(false);

            // Store ping in memory
            pingStorage.computeIfAbsent(request.getToUserId(), k -> new ArrayList<>()).add(ping);
            System.out.println("Ping stored for user: " + request.getToUserId());

            // Send WebSocket notification to the target user (for real-time fallback)
            PingWebSocketController.PingNotification notification = 
                new PingWebSocketController.PingNotification(
                    request.getFromUserId(),
                    request.getFromUserName() != null ? request.getFromUserName() : "משתמש לא ידוע",
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
            response.put("message", "הפינג נשלח בהצלחה");
            response.put("fromUserId", request.getFromUserId());
            response.put("toUserId", request.getToUserId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשלה שליחת הפינג: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש מזהה משתמש"));
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
                .body(createErrorResponse("נכשלה טעינת הפינגים: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש מזהה פינג"));
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
                    .body(createErrorResponse("הפינג לא נמצא"));
            }

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "הפינג סומן כנקרא");
            response.put("pingId", pingId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשל סימון הפינג כנקרא: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש מזהה משתמש"));
            }

            if (request == null || request.getLatitude() == null || request.getLongitude() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("נדרשים קו רוחב וקו אורך"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
            }

            // Update user location via service
            userService.updateUserLocation(userUuid, request.getLatitude(), request.getLongitude());

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "המיקום עודכן בהצלחה");
            response.put("userId", userId);
            response.put("latitude", request.getLatitude());
            response.put("longitude", request.getLongitude());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשל עדכון המיקום: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש מזהה משתמש"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
            }

            // Clear user location via service (set to null)
            userService.clearUserLocation(userUuid);

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "המיקום הוסר מהצגה");
            response.put("userId", userId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("נכשלה הסרת המיקום: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String query) {

        List<com.DogMate.Domain.UserAccount> users = userService.searchUsers(query);

        java.util.List<Map<String, Object>> usersList = new java.util.ArrayList<>();
        for (com.DogMate.Domain.UserAccount user : users) {
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("email", user.getEmail());
            userInfo.put("createdAt", user.getCreatedAt());
            userInfo.put("suspended", user.isSuspended());

            if (user instanceof RegularUser regularUser) {
                userInfo.put("type", "RegularUser");
                userInfo.put("firstName", regularUser.getFirst_name());
                userInfo.put("lastName", regularUser.getLast_name());
            } else if (user instanceof com.DogMate.Domain.AdminUser adminUser) {
                userInfo.put("type", "AdminUser");
                userInfo.put("permissionLevel", adminUser.getPermissionLevel());
            }

            usersList.add(userInfo);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "users", usersList
        ));
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
        private String phoneNumber;
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

        public String getPhoneNumber() {
            return phoneNumber;
        }

        public void setPhoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
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
    public static class ProfileUpdateRequest {
        private String firstName;
        private String lastName;
        private String phoneNumber;

        public ProfileUpdateRequest() {
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

        public String getPhoneNumber() {
            return phoneNumber;
        }

        public void setPhoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;
        private String confirmNewPassword;

        public ChangePasswordRequest() {
        }

        public String getOldPassword() {
            return oldPassword;
        }

        public void setOldPassword(String oldPassword) {
            this.oldPassword = oldPassword;
        }

        public String getNewPassword() {
            return newPassword;
        }

        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }

        public String getConfirmNewPassword() {
            return confirmNewPassword;
        }

        public void setConfirmNewPassword(String confirmNewPassword) {
            this.confirmNewPassword = confirmNewPassword;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SupportRequestCreateRequest {
        private String category;
        private String subject;
        @Size(max = 1000, message = "התיאור חייב להכיל לכל היותר 1,000 תווים")
        private String description;
        private String contactEmail;
        private String contactPhone;

        public SupportRequestCreateRequest() {
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getSubject() {
            return subject;
        }

        public void setSubject(String subject) {
            this.subject = subject;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getContactEmail() {
            return contactEmail;
        }

        public void setContactEmail(String contactEmail) {
            this.contactEmail = contactEmail;
        }

        public String getContactPhone() {
            return contactPhone;
        }

        public void setContactPhone(String contactPhone) {
            this.contactPhone = contactPhone;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SupportRequestStatusUpdateRequest {
        private String status;

        public SupportRequestStatusUpdateRequest() {
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

    public record UserProfileResponse(
        String userId,
        String email,
        String userRole,
        String firstName,
        String lastName,
        String phoneNumber
    ) {}

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