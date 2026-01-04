package com.DogMate.Service;

import com.DogMate.Domain.AdminUser;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Reminder;
import com.DogMate.Domain.UserAccount;
import com.DogMate.Infrastructure.ReminderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Optional;
@Service
public class ReminderService {

    private final ReminderRepository reminderRepo;
    private final IUserRepository userRepo;

    @Autowired
    public ReminderService(ReminderRepository reminderRepo, IUserRepository userRepo) {
        this.reminderRepo = reminderRepo;
        this.userRepo = userRepo;
    }

    public Reminder createReminder(UUID userId, String title, LocalDateTime remindAt) {
        var userAcc = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with id " + userId + " not found"));

        if (!(userAcc instanceof RegularUser)) {
            throw new IllegalArgumentException("User must be a RegularUser");
        }

        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }

        if (remindAt == null || remindAt.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("remindAt must be in the future");
        }

        Reminder r = new Reminder((RegularUser) userAcc, title, remindAt);
        return reminderRepo.save(r);
    }
}

