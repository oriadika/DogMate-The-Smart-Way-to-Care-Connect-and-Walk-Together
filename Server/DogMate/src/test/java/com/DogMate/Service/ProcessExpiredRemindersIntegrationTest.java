package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Domain.Reminder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class ProcessExpiredRemindersIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReminderService reminderService;

    @Test
    void expiredFoodReminder_isRemovedAndDisablesInventoryNotifications() {
        RegularUser user = userService.registerUser(
                "food-expired-" + UUID.randomUUID() + "@test.com",
                "password123",
                "Test",
                "User"
        );

        Dog dog = dogService.addDogToUser(
                user.getId(),
                "Max",
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

        var update = new com.DogMate.DTO.FoodStockDTO();
        update.setBrandName("Acana");
        update.setBagSizeInKg(12);
        update.setCurrentLevelInKg(10);
        update.setDailyConsumptionInGram(200);
        update.setNotificationEnabled(true);
        update.setLowStockThresholdDays(7);
        dogService.updateFoodStock(created.getId(), update);

        Reminder foodReminder = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "FOOD".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        foodReminder.setRemindAt(LocalDateTime.now().minusMinutes(5));
        reminderService.upsertSystemReminder(
                user.getId(),
                foodReminder.getSourceType(),
                foodReminder.getSourceId(),
                foodReminder.getDogIds().stream().map(Dog::getID).toList(),
                foodReminder.getTitle(),
                foodReminder.getDescription(),
                foodReminder.getRemindAt(),
                true
        );

        List<Reminder> active = reminderService.getRemindersForUser(user.getId());
        assertTrue(active.stream().noneMatch(r -> "FOOD".equals(r.getSourceType())));

        var stockAfter = dogService.getUserFoodStocks(user.getId()).stream()
                .filter(s -> s.getId().equals(created.getId()))
                .findFirst()
                .orElseThrow();
        assertFalse(stockAfter.isNotificationEnabled());
    }
}
