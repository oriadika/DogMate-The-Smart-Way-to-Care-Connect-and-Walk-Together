package com.DogMate.Service;

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

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Transactional
class FoodStockConsumptionIntegrationTest {

    @Autowired
    private DogService dogService;

    @Autowired
    private UserService userService;

    @Autowired
    private IFoodStockRepository foodStockRepository;

    @Test
    void applyElapsedConsumption_reducesLevelAfterWholeDays() {
        RegularUser user = userService.registerUser(
                "food-consumption-" + UUID.randomUUID() + "@test.com",
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
                10,
                10,
                200
        );

        FoodStock stock = foodStockRepository.findByIdWithDogs(created.getId()).orElseThrow();
        stock.setLevelAdjustedAt(LocalDate.now().minusDays(3));
        foodStockRepository.save(stock);

        var dto = dogService.getUserFoodStocks(user.getId()).stream()
                .filter(s -> s.getId().equals(created.getId()))
                .findFirst()
                .orElseThrow();

        // 3 days * 200g = 600g = 0.6kg deducted from 10kg
        assertEquals(9.4, dto.getCurrentLevelInKg(), 0.001);
        assertEquals(47L, Math.floorDiv((long) (dto.getCurrentLevelInKg() * 1000), 200L));
    }
}
