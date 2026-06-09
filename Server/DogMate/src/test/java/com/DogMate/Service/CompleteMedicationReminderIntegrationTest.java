package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Domain.Reminder;
import com.DogMate.Domain.RemindBeforeUnit;
import com.DogMate.DTO.MedicationDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class CompleteMedicationReminderIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReminderService reminderService;

    @Autowired
    private MedicationService medicationService;

    @Test
    void completeMedicationReminder_onTime_logsNowAndRemovesReminder() {
        RegularUser user = userService.registerUser(
                "med-complete-ontime-" + UUID.randomUUID() + "@test.com",
                "password123",
                "Test",
                "User"
        );

        Dog dog = dogService.addDogToUser(
                user.getId(),
                "Rex",
                "Mix",
                LocalDate.of(2020, 1, 1),
                'M',
                null,
                null,
                RelationshipType.OWNERSHIP
        );

        LocalDate administered = LocalDate.now().minusDays(2);
        LocalDate nextDue = LocalDate.now().plusDays(1);
        MedicationDTO created = medicationService.create(
                user.getId(),
                dog.getID(),
                "אנטיביוטיקה",
                administered,
                LocalTime.of(9, 0),
                nextDue,
                LocalTime.of(9, 0),
                null,
                true,
                1,
                RemindBeforeUnit.DAYS
        );

        Reminder medicationReminder = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        reminderService.completeReminder(user.getId(), medicationReminder.getId());

        List<MedicationDTO> medications = medicationService.listForUser(user.getId());
        assertEquals(2, medications.size());
        MedicationDTO logged = medications.stream()
                .filter(m -> !m.id().equals(created.id()))
                .findFirst()
                .orElseThrow();
        assertEquals(LocalDate.now().toString(), logged.administeredDate());
        assertTrue(reminderService.getRemindersForUser(user.getId()).stream()
                .noneMatch(r -> r.getId().equals(medicationReminder.getId())));
    }

    @Test
    void completeMedicationReminder_overdue_requiresChoice() {
        RegularUser user = userService.registerUser(
                "med-complete-overdue-" + UUID.randomUUID() + "@test.com",
                "password123",
                "Test",
                "User"
        );

        Dog dog = dogService.addDogToUser(
                user.getId(),
                "Rex",
                "Mix",
                LocalDate.of(2020, 1, 1),
                'M',
                null,
                null,
                RelationshipType.OWNERSHIP
        );

        LocalDate administered = LocalDate.now().minusDays(5);
        LocalDate overdueDue = LocalDate.now().minusDays(1);
        medicationService.create(
                user.getId(),
                dog.getID(),
                "אנטיביוטיקה",
                administered,
                LocalTime.of(9, 0),
                overdueDue,
                LocalTime.of(9, 0),
                null,
                true,
                1,
                RemindBeforeUnit.DAYS
        );

        Reminder medicationReminder = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        assertThrows(
                IllegalArgumentException.class,
                () -> reminderService.completeReminder(user.getId(), medicationReminder.getId())
        );
    }

    @Test
    void completeMedicationReminder_overdue_withPlannedChoice_logsPlannedDate() {
        RegularUser user = userService.registerUser(
                "med-complete-planned-" + UUID.randomUUID() + "@test.com",
                "password123",
                "Test",
                "User"
        );

        Dog dog = dogService.addDogToUser(
                user.getId(),
                "Rex",
                "Mix",
                LocalDate.of(2020, 1, 1),
                'M',
                null,
                null,
                RelationshipType.OWNERSHIP
        );

        LocalDate administered = LocalDate.now().minusDays(5);
        LocalDate overdueDue = LocalDate.now().minusDays(1);
        LocalTime dueTime = LocalTime.of(8, 30);
        MedicationDTO created = medicationService.create(
                user.getId(),
                dog.getID(),
                "אנטיביוטיקה",
                administered,
                LocalTime.of(9, 0),
                overdueDue,
                dueTime,
                null,
                true,
                1,
                RemindBeforeUnit.DAYS
        );

        Reminder medicationReminder = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        LocalDateTime plannedAt = LocalDateTime.of(overdueDue, dueTime);
        reminderService.completeReminder(
                user.getId(),
                medicationReminder.getId(),
                plannedAt
        );

        List<MedicationDTO> medications = medicationService.listForUser(user.getId());
        MedicationDTO logged = medications.stream()
                .filter(m -> !m.id().equals(created.id()))
                .findFirst()
                .orElseThrow();
        assertEquals(overdueDue.toString(), logged.administeredDate());
        assertEquals(
                dueTime.format(DateTimeFormatter.ofPattern("HH:mm")),
                logged.administeredTime()
        );
    }
}
