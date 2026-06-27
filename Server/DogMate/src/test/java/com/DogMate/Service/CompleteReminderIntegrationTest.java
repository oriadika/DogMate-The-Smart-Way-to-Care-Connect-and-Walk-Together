package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Domain.Reminder;
import com.DogMate.DTO.VaccinationDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class CompleteReminderIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReminderService reminderService;

    @Autowired
    private VaccinationService vaccinationService;

    @Test
    void completeVaccinationReminder_logsDoseAndRemovesCompletedReminderFromHome() {
        RegularUser user = userService.registerUser(
                "complete-reminder-" + UUID.randomUUID() + "@test.com",
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

        LocalDate administered = LocalDate.now().minusMonths(11);
        LocalDate nextDue = LocalDate.now().plusDays(14);
        VaccinationDTO created = vaccinationService.create(
                user.getId(),
                dog.getID(),
                "כלבת",
                administered,
                nextDue,
                null,
                null,
                true,
                "7"
        );

        Reminder vaccinationReminder = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "VACCINATION".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        UUID reminderId = vaccinationReminder.getId();
        UUID templateVaccinationId = vaccinationReminder.getSourceId();
        String expectedAdministeredDate = nextDue.toString();

        reminderService.completeReminder(user.getId(), reminderId);

        List<VaccinationDTO> vaccinations = vaccinationService.listForUser(user.getId());
        assertEquals(2, vaccinations.size());
        assertTrue(vaccinations.stream().anyMatch(v -> v.id().equals(templateVaccinationId)));
        assertTrue(vaccinations.stream().anyMatch(v ->
                v.administeredDate().equals(expectedAdministeredDate)
                        && !v.id().equals(templateVaccinationId)));

        assertTrue(reminderService.getRemindersForUser(user.getId()).stream()
                .noneMatch(r -> r.getId().equals(reminderId)));
    }
}
