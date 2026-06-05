package com.DogMate.Controller;

import com.DogMate.DTO.CreateReminderRequest;
import com.DogMate.DTO.ReminderResponse;
import com.DogMate.Domain.Dog;
import com.DogMate.Domain.Reminder;
import com.DogMate.Service.ReminderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/users/{userId}/reminders")
public class ReminderController {

    private final ReminderService reminderService;

    public ReminderController(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    // POST /api/users/{userId}/reminders
    @PostMapping
    public ResponseEntity<?> createReminder(
            @PathVariable UUID userId,
            @RequestBody CreateReminderRequest req
    ) {
        try {
            Reminder reminder = reminderService.createReminder(
                    userId,
                    new LinkedList<>(req.dogIds),
                    req.title,
                    req.remindAt,
                    req.description
            );

            return ResponseEntity.ok(toResponse(reminder));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(createErrorResponse("נכשלה יצירת התזכורת: " + e.getMessage()));
        }
    }

    // GET /api/users/{userId}/reminders
    @GetMapping
    public ResponseEntity<?> getRemindersForUser(@PathVariable UUID userId) {
        try {
            List<Reminder> reminders = reminderService.getRemindersForUser(userId);

            List<ReminderResponse> data = reminders.stream()
                    .map(this::toResponse)
                    .toList();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", data.size());
            response.put("reminders", data);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(createErrorResponse("נכשלה טעינת התזכורות: " + e.getMessage()));
        }
    }

    // PUT /api/users/{userId}/reminders/{reminderId}
    @PutMapping("/{reminderId}")
    public ResponseEntity<?> updateReminder(
            @PathVariable UUID userId,
            @PathVariable UUID reminderId,
            @RequestBody CreateReminderRequest req
    ) {
        try {
            Reminder reminder = reminderService.updateReminder(
                    userId,
                    reminderId,
                    new LinkedList<>(req.dogIds),
                    req.title,
                    req.remindAt,
                    req.description
            );

            return ResponseEntity.ok(toResponse(reminder));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(createErrorResponse("נכשל עדכון התזכורת: " + e.getMessage()));
        }
    }

    // DELETE /api/users/{userId}/reminders/{reminderId}
    @DeleteMapping("/{reminderId}")
    public ResponseEntity<?> deleteReminder(
            @PathVariable UUID userId,
            @PathVariable UUID reminderId
    ) {
        try {
            boolean deleted = reminderService.removeReminder(userId, reminderId);
            return deleted ? ResponseEntity.noContent().build()
                    : ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    private ReminderResponse toResponse(Reminder r) {
        ReminderResponse res = new ReminderResponse();
        res.id = r.getId();
        res.userId = r.getUser().getId();
        res.dogIds = r.getDogIds().stream().map(Dog::getID).toList();
        res.title = r.getTitle();
        res.remindAt = r.getRemindAt();
        res.description = r.getDescription();
        res.notificationEnabled = r.isNotificationEnabled();
        res.sourceType = r.getSourceType();
        res.sourceId = r.getSourceId();
        res.systemGenerated = r.isSystemGenerated();
        return res;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        return error;
    }
}
