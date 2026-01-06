package com.DogMate.Controller;

import com.DogMate.DTO.ReminderDTO;
import com.DogMate.Domain.Reminder;
import com.DogMate.Infrastructure.UserRepository;
import com.DogMate.Service.ReminderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/reminders")
public class ReminderController {

    private final ReminderService reminderService;

    @Autowired
    public ReminderController(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    /**
     * Create a new reminder for a user
     * POST /api/users/{userId}/reminders
     */
    @PostMapping
    public ResponseEntity<?> createReminder(
            @PathVariable UUID userId,
            @RequestBody ReminderDTO request
    ) {
        try {
            if (request == null || request.title() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Title is required"));
            }

            Reminder reminder = reminderService.createReminder(
                    userId,
                    request.title(),
                    request.description(),
                    request.remindAt()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Reminder created successfully");
            response.put("reminder", reminder);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(createErrorResponse("Error creating reminder: " + e.getMessage()));
        }
    }

    private Map<String, Object> createErrorResponse(String error) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", error);
        return response;
    }
}


