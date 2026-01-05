package com.DogMate.Domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class DogRelationshipTest {

    private RegularUser user;
    private Dog dog;
    private Function<String, String> passwordEncoder;

    @BeforeEach
    void setUp() {
        passwordEncoder = s -> "$2a$10$hashedPasswordString";

        user = RegularUser.create(
                "test@example.com",
                "password123",
                "John",
                "Doe",
                false,
                passwordEncoder
        );

        dog = new Dog(
                UUID.randomUUID(),
                "Rex",
                "German Shepherd",
                LocalDate.now(),
                'M',
                "http://img.url/rex.png"
        );
    }

    @Test
    void GivenUserAndDog_WhenCreateRelationship_ThenReferencesIdsAndRoleAreCorrect() {
        // Act
        DogRelationship rel = new DogRelationship(user, dog, RelationshipType.OWNERSHIP);

        // Assert: relationship has its own id
        assertNotNull(rel.getId());

        // Assert: references are stored
        assertSame(user, rel.getRegularUser());
        assertSame(dog, rel.getDog());

        // Assert: convenience getters
        assertEquals(user.getId(), rel.getUserID());
        assertEquals(dog.getID(), rel.getDogID());

        // Assert: role (since you don't have getRole(), use string)
        assertEquals("OWNERSHIP", rel.getRelationshipString());
    }

    @Test
    void GivenRelationship_WhenAddToUser_ThenUserContainsRelationship() {
        // Arrange
        DogRelationship rel = new DogRelationship(user, dog, RelationshipType.OWNERSHIP);

        // Act
        user.addDogRelationship(rel);

        // Assert
        assertEquals(1, user.getDogRelationships().size());
        assertTrue(user.getDogRelationships().contains(rel));
    }

    @Test
    void GivenRelationshipAdded_WhenRemoveFromUser_ThenUserDoesNotContainRelationship() {
        // Arrange
        DogRelationship rel = new DogRelationship(user, dog, RelationshipType.OWNERSHIP);
        user.addDogRelationship(rel);

        // Act
        user.removeDogRelationship(rel);

        // Assert
        assertEquals(0, user.getDogRelationships().size());
        assertFalse(user.getDogRelationships().contains(rel));
    }

    @Test
    void GivenRelationshipWithNullUser_WhenGetUserId_ThenReturnNull() {
        // Act
        DogRelationship rel = new DogRelationship(null, dog, RelationshipType.AUDIT);

        // Assert
        assertNull(rel.getUserID());
        assertEquals(dog.getID(), rel.getDogID());
        assertEquals("AUDIT", rel.getRelationshipString());
    }

    @Test
    void GivenRelationshipWithNullDog_WhenGetDogId_ThenReturnNull() {
        // Act
        DogRelationship rel = new DogRelationship(user, null, RelationshipType.BLOCKED);

        // Assert
        assertEquals(user.getId(), rel.getUserID());
        assertNull(rel.getDogID());
        assertEquals("BLOCKED", rel.getRelationshipString());
    }

    @Test
    void GivenRelationship_WhenChangeRole_ThenRoleStringUpdates() {
        // Arrange
        DogRelationship rel = new DogRelationship(user, dog, RelationshipType.AUDIT);

        // Act
        rel.setRole(RelationshipType.OWNERSHIP);

        // Assert
        assertEquals("OWNERSHIP", rel.getRelationshipString());
    }
}
