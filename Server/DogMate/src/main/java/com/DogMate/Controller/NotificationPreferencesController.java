package com.DogMate.Controller;

import com.DogMate.DTO.NotificationPreferencesDTO;
import com.DogMate.Service.UserNotificationPreferencesService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/notification-preferences")
public class NotificationPreferencesController {

    private final UserNotificationPreferencesService preferencesService;

    public NotificationPreferencesController(UserNotificationPreferencesService preferencesService) {
        this.preferencesService = preferencesService;
    }

    @GetMapping
    public ResponseEntity<?> getPreferences(@PathVariable UUID userId) {
        try {
            NotificationPreferencesDTO prefs = preferencesService.getPreferences(userId);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("preferences", prefs);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        }
    }

    @PutMapping
    public ResponseEntity<?> updatePreferences(
            @PathVariable UUID userId,
            @RequestBody UpdateNotificationPreferencesRequest body
    ) {
        try {
            boolean enabled = body != null && body.notificationsEnabled;
            NotificationPreferencesDTO prefs = preferencesService.updatePreferences(userId, enabled);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("preferences", prefs);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        }
    }

    private static Map<String, Object> error(String message) {
        Map<String, Object> m = new HashMap<>();
        m.put("success", false);
        m.put("error", message);
        return m;
    }

    public static class UpdateNotificationPreferencesRequest {
        public boolean notificationsEnabled = true;
    }
}
