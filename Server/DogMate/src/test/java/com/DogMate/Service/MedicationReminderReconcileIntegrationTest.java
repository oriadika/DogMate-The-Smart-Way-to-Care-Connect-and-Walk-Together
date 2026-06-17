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
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class MedicationReminderReconcileIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private MedicationService medicationService;

    @Autowired
    private ReminderService reminderService;

    @Test
    void getRemindersForUser_recreatesMissingMedicationHomeReminder() {
        RegularUser user = userService.registerUser(
                "med-reconcile-" + UUID.randomUUID() + "@test.com",
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

        MedicationDTO created = medicationService.create(
                user.getId(),
                dog.getID(),
                "אנטיביוטיקה",
                LocalDate.now().minusDays(2),
                LocalTime.of(9, 0),
                LocalDate.now().plusDays(2),
                LocalTime.of(9, 0),
                null,
                null,
                true,
                1,
                RemindBeforeUnit.DAYS
        );

        Reminder existing = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        reminderService.deleteSystemReminder(user.getId(), "MEDICATION", created.id());

        assertTrue(reminderService.getRemindersForUser(user.getId()).stream()
                .noneMatch(r -> r.getId().equals(existing.getId())));

        List<Reminder> reconciled = reminderService.getRemindersForUser(user.getId());
        assertEquals(1, reconciled.stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .count());
        assertTrue(reconciled.stream()
                .anyMatch(r -> "MEDICATION".equals(r.getSourceType())
                        && r.getTitle().contains("אנטיביוטיקה")));
    }

    @Test
    void reconcile_preservesExistingMedicationReminderId() {
        RegularUser user = userService.registerUser(
                "med-reconcile-keep-id-" + UUID.randomUUID() + "@test.com",
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

        medicationService.create(
                user.getId(),
                dog.getID(),
                "אנטיביוטיקה",
                LocalDate.now().minusDays(2),
                LocalTime.of(9, 0),
                LocalDate.now().plusDays(2),
                LocalTime.of(9, 0),
                null,
                null,
                true,
                1,
                RemindBeforeUnit.DAYS
        );

        Reminder before = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        reminderService.getRemindersForUser(user.getId());

        Reminder after = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        assertEquals(before.getId(), after.getId());
    }
}
