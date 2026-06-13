package com.DogMate.Controller;

import com.DogMate.DTO.SchedulableNotificationDTO;
import com.DogMate.Service.NotificationResyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/notification-schedule")
public class NotificationScheduleController {

    private final NotificationResyncService resyncService;

    public NotificationScheduleController(NotificationResyncService resyncService) {
        this.resyncService = resyncService;
    }

    @GetMapping
    public ResponseEntity<?> getSchedulableNotifications(@PathVariable UUID userId) {
        try {
            List<SchedulableNotificationDTO> notifications = resyncService.getSchedulableNotifications(userId);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("count", notifications.size());
            body.put("notifications", notifications);
            return ResponseEntity.ok(body);
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
}
