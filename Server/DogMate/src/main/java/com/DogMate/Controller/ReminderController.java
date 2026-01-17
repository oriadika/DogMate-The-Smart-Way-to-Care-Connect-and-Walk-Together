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
                    .body(createErrorResponse("Failed to create reminder: " + e.getMessage()));
        }
    }

    // GET /api/users/{userId}/reminders
    @GetMapping
    public ResponseEntity<Map<String, Object>> getRemindersForUser(@PathVariable UUID userId) {
        List<Reminder> reminders = reminderService.getRemindersForUser(userId);

        List<ReminderResponse> data = reminders.stream()
                .map(this::toResponse)
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", data.size());
        response.put("reminders", data);

        return ResponseEntity.ok(response);
    }

    // DELETE /api/users/{userId}/reminders/{reminderId}
    @DeleteMapping("/{reminderId}")
    public ResponseEntity<Void> deleteReminder(
            @PathVariable UUID userId,
            @PathVariable UUID reminderId
    ) {
        boolean deleted = reminderService.removeReminder(userId, reminderId);
        return deleted ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    private ReminderResponse toResponse(Reminder r) {
        ReminderResponse res = new ReminderResponse();
        res.id = r.getId();
        res.userId = r.getUser().getId();
        res.dogIds = r.getDogIds().stream().map(Dog::getID).toList();
        res.title = r.getTitle();
        res.remindAt = r.getRemindAt();
        res.description = r.getDescription();
        return res;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        return error;
    }
}
