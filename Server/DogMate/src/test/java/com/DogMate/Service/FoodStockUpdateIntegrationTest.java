package com.DogMate.Service;

import com.DogMate.DTO.FoodStockDTO;
import com.DogMate.Domain.Dog;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class FoodStockUpdateIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReminderService reminderService;

    @Test
    void updateFoodStock_withNotifications_createsSystemReminder() {
        RegularUser user = userService.registerUser(
                "food-update-" + UUID.randomUUID() + "@test.com",
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

        FoodStock created = dogService.addFoodStockToDog(
                dog.getID(),
                "Acana",
                12,
                10,
                200
        );

        FoodStockDTO update = new FoodStockDTO();
        update.setBrandName("Acana");
        update.setBagSizeInKg(12);
        update.setCurrentLevelInKg(10);
        update.setDailyConsumptionInGram(200);
        update.setNotificationEnabled(true);
        update.setLowStockThresholdDays(7);

        FoodStockDTO saved = dogService.updateFoodStock(created.getId(), update);

        assertNotNull(saved.getId());
        assertTrue(saved.isNotificationEnabled());
        assertEquals(7, saved.getLowStockThresholdDays());

        var reminders = reminderService.getRemindersForUser(user.getId());
        var foodReminder = reminders.stream()
                .filter(r -> r.isSystemGenerated()
                        && "FOOD".equals(r.getSourceType())
                        && created.getId().equals(r.getSourceId()))
                .findFirst()
                .orElseThrow();
        assertTrue(foodReminder.getTitle().startsWith("לקנות אוכל ל"));
        assertTrue(foodReminder.getDescription().contains("מלאי המזון של"));
        assertTrue(foodReminder.getDescription().contains("עומד להיגמר בקרוב"));
    }
}
