package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Reminder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies reminder filtering semantics used by {@link ReminderService#getSchedulableRemindersForUser(UUID)}
 * without Mockito (JDK 25 inline-mock limitations).
 */
class ReminderServiceNotificationTest {

    private NotificationScheduleService scheduleService;
    private RegularUser user;
    private Dog dog;

    @BeforeEach
    void setUp() {
        scheduleService = new NotificationScheduleService();
        user = new RegularUser(java.util.UUID.randomUUID(), "owner@test.com", "hash", "Owner", "Test");
        dog = new Dog(java.util.UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
    }

    @Test
    void schedulableReminders_respectGlobalAndItemToggles() {
        Reminder enabledFuture = new Reminder(user, new LinkedList<>(List.of(dog)), "Enabled",
                LocalDateTime.now().plusDays(2), "");
        enabledFuture.setNotificationEnabled(true);
        Reminder disabledFuture = new Reminder(user, new LinkedList<>(List.of(dog)), "Disabled",
                LocalDateTime.now().plusDays(3), "");
        disabledFuture.setNotificationEnabled(false);

        var globalOn = scheduleService.buildManualReminderTriggers(
                List.of(enabledFuture, disabledFuture), true
        );
        assertEquals(1, globalOn.size());
        assertEquals("Enabled", globalOn.get(0).title());

        var globalOff = scheduleService.buildManualReminderTriggers(
                List.of(enabledFuture, disabledFuture), false
        );
        assertTrue(globalOff.isEmpty());
    }
}
