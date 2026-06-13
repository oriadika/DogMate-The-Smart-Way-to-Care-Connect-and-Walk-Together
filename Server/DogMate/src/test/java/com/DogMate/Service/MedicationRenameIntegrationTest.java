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
class MedicationRenameIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private MedicationService medicationService;

    @Autowired
    private ReminderService reminderService;

    @Test
    void updateMedicationName_renamesHistoryAndKeepsSingleReminder() {
        RegularUser user = userService.registerUser(
                "med-rename-" + UUID.randomUUID() + "@test.com",
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

        MedicationDTO older = medicationService.create(
                user.getId(),
                dog.getID(),
                "שם שגוי",
                LocalDate.now().minusDays(14),
                LocalTime.of(9, 0),
                LocalDate.now().minusDays(7),
                LocalTime.of(9, 0),
                null,
                true,
                1,
                RemindBeforeUnit.DAYS
        );

        MedicationDTO latest = medicationService.logDoseAt(
                user.getId(),
                older.id(),
                LocalDate.now().minusDays(7),
                LocalTime.of(10, 0)
        );

        List<Reminder> remindersBefore = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .toList();
        assertEquals(1, remindersBefore.size());

        medicationService.update(
                user.getId(),
                latest.id(),
                dog.getID(),
                "שם מתוקן",
                latest.administeredDate() != null
                        ? LocalDate.parse(latest.administeredDate())
                        : LocalDate.now().minusDays(7),
                LocalTime.of(10, 0),
                LocalDate.now().plusDays(7),
                LocalTime.of(9, 0),
                null,
                true,
                1,
                RemindBeforeUnit.DAYS
        );

        List<MedicationDTO> medications = medicationService.listForUser(user.getId());
        assertEquals(2, medications.size());
        assertTrue(medications.stream().allMatch(m -> "שם מתוקן".equals(m.medicationName())));

        List<Reminder> remindersAfter = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "MEDICATION".equals(r.getSourceType()))
                .toList();
        assertEquals(1, remindersAfter.size());
        assertTrue(remindersAfter.get(0).getTitle().contains("שם מתוקן"));
    }
}
