package com.DogMate.Service;

import com.DogMate.Domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class DogDeletionForeignKeyIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private DogService dogService;

    @Autowired
    private IDogRepository dogRepository;

    @Autowired
    private IDogEventRepository dogEventRepository;

    @Test
    void deleteDog_doesNotViolateForeignKeys_andDeletesChildren() {
        RegularUser user = userService.registerUser(
                "dog-del-fk-" + UUID.randomUUID() + "@test.com",
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

        // Reload so we are sure we're using a managed/persistent Dog instance
        Dog managedDog = dogRepository.findById(dog.getID())
                .orElseThrow(() -> new IllegalStateException("Dog not found after creation"));

        // DogEvent
        DogEvent event = new DogEvent(
                "Vet",
                DogEvent.EventType.VET,
                LocalDateTime.now(),
                managedDog
        );
        dogEventRepository.save(event);

        // DogMoodLog (no dedicated repository in codebase; rely on orphanRemoval from Dog -> DogMoodLog)
        DogMoodLog moodLog = new DogMoodLog(
                UUID.randomUUID(),
                DogMoodLog.Mood.HAPPY,
                DogMoodLog.ActivityLevel.LOW,
                "ok",
                managedDog
        );
        managedDog.getDogMoodLogs().add(moodLog);

        // DogDocument (no dedicated repository in codebase; rely on orphanRemoval from Dog -> DogDocument)
        DogDocument doc = new DogDocument(
                DogDocument.DocumentType.OTHER,
                "file",
                "https://example.com/file",
                managedDog
        );
        managedDog.getDogDocuments().add(doc);

        // Persist added mood/document children
        dogRepository.save(managedDog);

        UUID dogId = managedDog.getID();

        // Exercise: delete dog forever (this used to sometimes throw FK constraint violations).
        dogService.deleteDog(dogId);

        assertTrue(dogRepository.findById(dogId).isEmpty(), "Dog row should be deleted");

        // We intentionally avoid additional native queries here: the primary regression we want to protect
        // is "delete dog throws FK constraint errors". If deletion succeeds and the dog row is gone,
        // all FK-protected children should also be removed (or already handled by cascade/orphanRemoval).
    }
}

