package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Infrastructure.FoodStockRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class FoodStockIntegrationTest {

    @Autowired private DogService dogService;
    @Autowired private UserService userService;

    @Autowired private FoodStockRepository foodStockRepository; // infrastructure repo (JpaRepository)

    @Test
    void addFoodStockToDog_shouldInsertFoodStockWithDogId() {
        // create user + dog first
        RegularUser user = userService.registerUser("fs1@test.com", "password123", "E", "F");

        Dog dog = dogService.addDogToUser(
                user.getId(),
                "Rex",
                "Husky",
                LocalDate.now(),
                'M',
                "img_url",
                RelationshipType.OWNERSHIP
        );

        // add food stock
        FoodStock saved = dogService.addFoodStockToDog(
                dog.getID(),
                "Acana",
                10.0,
                7.5,
                250.0
        );

        assertNotNull(saved.getId());

        // verify in DB
        FoodStock fromDb = foodStockRepository.findById(saved.getId()).orElseThrow();
        assertEquals("Acana", fromDb.getBrandName());
        assertEquals(10.0, fromDb.getBagSizeInKg());
        assertEquals(7.5, fromDb.getCurrentLevelInKg());
        assertEquals(250.0, fromDb.getDailyConsumptionInGram());

        assertNotNull(fromDb.getDogs());
        assertEquals(1, fromDb.getDogs().size());
    }

    @Test
    void addFoodStockToDog_whenDogNotFound_shouldThrow() {
        UUID fakeDogId = UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dogService.addFoodStockToDog(
                        fakeDogId,
                        "Acana",
                        10.0,
                        7.5,
                        250.0
                )
        );

        assertEquals("Dog with ID " + fakeDogId + " not found", ex.getMessage());
    }

    @Test
    void addFoodStockToDog_whenNegativeBagSize_shouldFail_() {
        // Currently you don't validate bag size in domain/service,
        // so this might PASS. If you want it to FAIL, add validation and keep this test.
        RegularUser user = userService.registerUser("fs2@test.com", "password123", "G", "H");
        Dog dog = dogService.addDogToUser(user.getId(), "Max", "Pug", LocalDate.now(), 'M', "img_url", RelationshipType.OWNERSHIP);

        assertThrows(Exception.class, () -> dogService.addFoodStockToDog(
                dog.getID(),
                "Brand",
                -1.0,   // invalid
                1.0,
                100.0
        ));
    }


}
