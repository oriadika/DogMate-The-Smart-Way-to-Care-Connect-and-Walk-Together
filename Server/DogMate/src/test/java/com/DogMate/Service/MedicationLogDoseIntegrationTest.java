package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
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
class MedicationLogDoseIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private MedicationService medicationService;

    @Test
    void logDose_allowsMultipleRecordsOnSameDay() {
        RegularUser user = userService.registerUser(
                "med-multi-dose-" + UUID.randomUUID() + "@test.com",
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

        LocalDate administered = LocalDate.now().minusDays(7);
        LocalDate nextDue = LocalDate.now();
        MedicationDTO created = medicationService.create(
                user.getId(),
                dog.getID(),
                "אנטיביוטיקה",
                administered,
                LocalTime.of(9, 0),
                nextDue,
                LocalTime.of(8, 0),
                null,
                true,
                1,
                RemindBeforeUnit.HOURS
        );

        MedicationDTO firstLog = medicationService.logDose(user.getId(), created.id());
        MedicationDTO secondLog = medicationService.logDose(user.getId(), firstLog.id());

        List<MedicationDTO> medications = medicationService.listForUser(user.getId());
        assertEquals(3, medications.size());
        long todayCount = medications.stream()
                .filter(m -> m.administeredDate().equals(LocalDate.now().toString()))
                .count();
        assertEquals(2, todayCount);
        assertNotNull(secondLog.administeredTime());
    }
}
