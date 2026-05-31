package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Domain.RegularUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class DogServiceTest {

    @Autowired private DogService dogService;
    @Autowired private UserService userService;

    @Autowired private IDogRepository dogRepository;
    @Autowired
    private com.DogMate.Infrastructure.DogRelationshipRepository dogRelationshipRepository;


    @Test
    void addDogToUser_shouldInsertIntoDogsAndDogRelationships() {
        RegularUser user = userService.registerUser(
                "omry@gmail.com",
                "bla bla",
                "Omry",
                "Muadi"
        );

        UUID userId = user.getId();
        assertNotNull(userId);

        Dog savedDog = dogService.addDogToUser(
                userId,
                "Rex",
                "Husky",
                LocalDate.now(),
                'M',
                "img_url",
                null,
                RelationshipType.OWNERSHIP
        );

        Optional<Dog> dogFromDbOpt = dogRepository.findById(savedDog.getID());
        assertTrue(dogFromDbOpt.isPresent());

        Dog dogFromDb = dogFromDbOpt.get();
        assertEquals("Rex", dogFromDb.getName());
        assertEquals("Husky", dogFromDb.getBreed());
        assertEquals('M', dogFromDb.getGender());

        boolean relExists = dogRelationshipRepository.findAll().stream().anyMatch(rel ->
                rel.getUserID().equals(userId) &&
                        rel.getDogID().equals(savedDog.getID()) &&
                        rel.getRelationshipString().equals(RelationshipType.OWNERSHIP.toString())
        );

        assertTrue(relExists);
    }

    @Test
    void addDogToUser_whenUserNotFound_shouldThrow() {
        UUID notExistingUserId = UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dogService.addDogToUser(
                        notExistingUserId,
                        "Rex",
                        "Husky",
                        LocalDate.now(),
                        'M',
                        "img_url",
                        null,
                        RelationshipType.OWNERSHIP
                )
        );

        assertEquals("User with ID " + notExistingUserId + " not found", ex.getMessage());
    }

    @Test
    void addDogToUser_whenRelationshipTypeNull_shouldThrow() {
        RegularUser user = userService.registerUser(
                "neg1@test.com", "password123", "A", "B"
        );

        // Your DogRelationship has @Enumerated(EnumType.STRING) but no explicit null check.
        // Passing null will typically fail at flush/commit (constraint / persistence error).
        assertThrows(
                Exception.class,
                () -> dogService.addDogToUser(
                        user.getId(),
                        "Rex",
                        "Husky",
                        LocalDate.now(),
                        'M',
                        "img_url",
                        null,
                        null
                )
        );
    }

    @Test
    void addDogToUser_whenGenderInvalid_shouldFail() {
        RegularUser user = userService.registerUser(
                "neg2@test.com", "password123", "C", "D"
        );

        assertThrows(
                Exception.class,
                () -> dogService.addDogToUser(
                        user.getId(),
                        "Rex",
                        "Husky",
                        LocalDate.now(),
                        'X',
                        "img_url",
                        null,
                        RelationshipType.OWNERSHIP
                )
        );
    }
}
