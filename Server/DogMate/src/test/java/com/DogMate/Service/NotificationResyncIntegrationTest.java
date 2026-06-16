package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.DTO.MedicationDTO;
import com.DogMate.DTO.SchedulableNotificationDTO;
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
}
