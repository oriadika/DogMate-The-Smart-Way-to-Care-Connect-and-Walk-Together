package com.DogMate.Controller;

import com.DogMate.DTO.ReminderDTO;
import com.DogMate.Domain.Reminder;
import com.DogMate.Infrastructure.UserRepository;
import com.DogMate.Service.ReminderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/reminders")
public class ReminderController {

    private final ReminderService reminderService;

    @Autowired
    public ReminderController(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @PostMapping
    public Reminder createReminder(
            @PathVariable UUID userId,
            @RequestBody ReminderDTO request
    ) {
        return reminderService.createReminder(
                userId,
                request.title(),
                request.remindAt()
        );
    }
}


