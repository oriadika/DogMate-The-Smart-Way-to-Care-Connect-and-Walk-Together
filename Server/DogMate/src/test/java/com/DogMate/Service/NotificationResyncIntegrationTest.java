package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.DTO.MedicationDTO;
import com.DogMate.DTO.SchedulableNotificationDTO;
import com.DogMate.DTO.VaccinationDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Transactional
class NotificationResyncIntegrationTest {

    @Autowired
    private NotificationResyncService notificationResyncService;

    @Autowired
    private UserService userService;

    @Autowired
    private DogService dogService;

    @Autowired
    private MedicationService medicationService;

    @Autowired
    private VaccinationService vaccinationService;

    @Test
    void getSchedulableNotifications_doesNotDuplicateMedicationPush() {
        RegularUser user = userService.registerUser(
                "notif-dedupe-" + UUID.randomUUID() + "@test.com",
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
                "Heartgard",
                LocalDate.now().minusDays(2),
                LocalTime.of(9, 0),
                LocalDate.now().plusDays(10),
                LocalTime.of(9, 0),
                null,
                null,
                true,
                2,
                com.DogMate.Domain.RemindBeforeUnit.DAYS
        );

        List<SchedulableNotificationDTO> schedulable =
                notificationResyncService.getSchedulableNotifications(user.getId());

        long medicationPushes = schedulable.stream()
                .filter(n -> "MEDICATION".equals(n.sourceType())
                        && created.id().equals(n.sourceId()))
                .count();
        long reminderPushesForSameMed = schedulable.stream()
                .filter(n -> "REMINDER".equals(n.sourceType()))
                .count();

        assertEquals(1, medicationPushes, "Expected exactly one medication push notification");
        assertEquals(0, reminderPushesForSameMed, "System medication reminders must not also schedule as REMINDER");
    }

    @Test
    void getSchedulableNotifications_excludesMedicationPushWhenLatestNotificationsDisabled() {
        RegularUser user = userService.registerUser(
                "notif-off-" + UUID.randomUUID() + "@test.com",
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
                "Heartgard",
                LocalDate.now().minusDays(30),
                LocalTime.of(9, 0),
                LocalDate.now().plusDays(5),
                LocalTime.of(9, 0),
                null,
                null,
                true,
                2,
                com.DogMate.Domain.RemindBeforeUnit.DAYS
        );

        medicationService.logDose(user.getId(), created.id());

        List<MedicationDTO> meds = medicationService.listForUser(user.getId());
        MedicationDTO latest = meds.stream()
                .filter(m -> "Heartgard".equals(m.medicationName()))
                .max(java.util.Comparator.comparing(MedicationDTO::administeredDate))
                .orElseThrow();

        medicationService.update(
                user.getId(),
                latest.id(),
                dog.getID(),
                "Heartgard",
                LocalDate.parse(latest.administeredDate()),
                LocalTime.of(9, 0),
                LocalDate.now().plusDays(10),
                LocalTime.of(9, 0),
                null,
                null,
                false,
                2,
                com.DogMate.Domain.RemindBeforeUnit.DAYS
        );

        List<SchedulableNotificationDTO> schedulable =
                notificationResyncService.getSchedulableNotifications(user.getId());

        long medicationPushes = schedulable.stream()
                .filter(n -> "MEDICATION".equals(n.sourceType()))
                .count();

        assertEquals(0, medicationPushes, "Disabled latest medication must not schedule push notifications");
    }

    @Test
    void getSchedulableNotifications_excludesVaccinationPushWhenLatestNotificationsDisabled() {
        RegularUser user = userService.registerUser(
                "vac-notif-off-" + UUID.randomUUID() + "@test.com",
                "password123",
                "Test",
                "User"
        );

        Dog dog = dogService.addDogToUser(
                user.getId(),
                "Luna",
                "Mix",
                LocalDate.of(2020, 1, 1),
                'F',
                null,
                null,
                RelationshipType.OWNERSHIP
        );

        VaccinationDTO created = vaccinationService.create(
                user.getId(),
                dog.getID(),
                "כלבת",
                LocalDate.now().minusDays(30),
                LocalDate.now().plusDays(5),
                null,
                null,
                true,
                "7"
        );

        vaccinationService.logDose(user.getId(), created.id());

        List<VaccinationDTO> vaccinations = vaccinationService.listForUser(user.getId());
        VaccinationDTO latest = vaccinations.stream()
                .filter(v -> "כלבת".equals(v.vaccineName()))
                .max(java.util.Comparator.comparing(VaccinationDTO::administeredDate))
                .orElseThrow();

        vaccinationService.update(
                user.getId(),
                latest.id(),
                dog.getID(),
                "כלבת",
                LocalDate.parse(latest.administeredDate()),
                LocalDate.now().plusDays(10),
                null,
                null,
                false,
                "7"
        );

        List<SchedulableNotificationDTO> schedulable =
                notificationResyncService.getSchedulableNotifications(user.getId());

        long vaccinationPushes = schedulable.stream()
                .filter(n -> "VACCINATION".equals(n.sourceType()))
                .count();

        assertEquals(0, vaccinationPushes, "Disabled latest vaccination must not schedule push notifications");
    }
}
