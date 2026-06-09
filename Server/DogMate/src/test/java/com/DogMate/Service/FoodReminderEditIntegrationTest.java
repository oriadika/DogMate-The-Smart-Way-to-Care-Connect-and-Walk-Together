package com.DogMate.Service;

import com.DogMate.DTO.FoodStockDTO;
import com.DogMate.Domain.Dog;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Domain.Reminder;
import com.DogMate.Service.IFoodStockRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class FoodReminderEditIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReminderService reminderService;

    @Autowired
    private IFoodStockRepository foodStockRepository;

    @Test
    void updateFoodSystemReminder_doesNotHangAndSyncsInventory() {
        RegularUser user = userService.registerUser(
                "food-reminder-edit-" + UUID.randomUUID() + "@test.com",
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
        dogService.updateFoodStock(created.getId(), update);

        Reminder foodReminder = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "FOOD".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        LocalDateTime newRemindAt = LocalDateTime.now().plusDays(10).withHour(10).withMinute(0).withSecond(0).withNano(0);

        Reminder updated = reminderService.updateReminder(
                user.getId(),
                foodReminder.getId(),
                new LinkedList<>(foodReminder.getDogIds().stream().map(Dog::getID).toList()),
                "לקנות אוכל לרex",
                newRemindAt,
                "מלאי המזון של Rex עומד להיגמר בקרוב..."
        );

        assertEquals("לקנות אוכל לרex", updated.getTitle());
        assertEquals(newRemindAt, updated.getRemindAt());

        FoodStockDTO stockAfter = dogService.getUserFoodStocks(user.getId()).stream()
                .filter(s -> s.getId().equals(created.getId()))
                .findFirst()
                .orElseThrow();
        assertTrue(stockAfter.isNotificationEnabled());
        // Threshold stays as the user configured in food inventory (days before bag ends).
        assertEquals(7, stockAfter.getLowStockThresholdDays());
    }

    @Test
    void updatePastFoodReminder_reEnablesInventoryNotifications() {
        RegularUser user = userService.registerUser(
                "food-reminder-past-" + UUID.randomUUID() + "@test.com",
                "password123",
                "Test",
                "User"
        );

        Dog dog = dogService.addDogToUser(
                user.getId(),
                "Buddy",
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
        dogService.updateFoodStock(created.getId(), update);

        Reminder foodReminder = reminderService.getRemindersForUser(user.getId()).stream()
                .filter(r -> "FOOD".equals(r.getSourceType()))
                .findFirst()
                .orElseThrow();

        FoodStock stock = foodStockRepository.findByIdWithDogs(created.getId()).orElseThrow();
        stock.setNotificationEnabled(false);
        foodStockRepository.save(stock);

        LocalDateTime newRemindAt = LocalDateTime.now().plusDays(7).withHour(10).withMinute(0).withSecond(0).withNano(0);

        reminderService.updateReminder(
                user.getId(),
                foodReminder.getId(),
                new LinkedList<>(foodReminder.getDogIds().stream().map(Dog::getID).toList()),
                foodReminder.getTitle(),
                newRemindAt,
                foodReminder.getDescription()
        );

        FoodStockDTO stockAfter = dogService.getUserFoodStocks(user.getId()).stream()
                .filter(s -> s.getId().equals(created.getId()))
                .findFirst()
                .orElseThrow();
        assertTrue(stockAfter.isNotificationEnabled());
        assertEquals(7, stockAfter.getLowStockThresholdDays());
    }
}
