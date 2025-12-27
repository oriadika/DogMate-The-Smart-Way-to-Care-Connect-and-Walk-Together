package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogRelationship;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.UserAccount;
import com.DogMate.Domain.RelationshipType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.UUID;
import java.util.Optional;

@Service
public class DogService {

    private final IDogRepository dogRepository;
    private final IDogRelationshipRepository dogRelationshipRepository;
    private final IUserRepository userRepository;

    @Autowired
    public DogService(IDogRepository dogRepository, IDogRelationshipRepository dogRelationshipRepository, 
                      IUserRepository userRepository) {
        this.dogRepository = dogRepository;
        this.dogRelationshipRepository = dogRelationshipRepository;
        this.userRepository = userRepository;
    }

    /**
     * Create a new dog and add it to a user through DogRelationship
     * Service layer - orchestration only
     * @param userId The ID of the user (owner) who will own this dog
     * @param name Dog's name
     * @param breed Dog's breed
     * @param birthdate Dog's birthdate
     * @param gender Dog's gender (M for male, F for female)
     * @param profileImageURL Dog's profile image URL
     * @param relationshipType The type of relationship (OWNER, WALKER, etc.)
     * @return The created Dog entity
     * @throws IllegalArgumentException if user not found or validation fails
     */
    public Dog addDogToUser(UUID userId, String name, String breed, Date birthdate, 
                            char gender, String profileImageURL, RelationshipType relationshipType) {
        
        // Find the user (orchestration)
        Optional<UserAccount> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("User with ID " + userId + " not found");
        }
        
        UserAccount userAccount = userOptional.get();
        if (!(userAccount instanceof RegularUser)) {
            throw new IllegalArgumentException("User must be a RegularUser");
        }
        RegularUser user = (RegularUser) userAccount;
        
        // Create new dog (domain logic)
        UUID dogId = UUID.randomUUID();
        Dog newDog = new Dog(dogId, name, breed, birthdate, gender, profileImageURL);
        
        // Save dog to repository (orchestration)
        Dog savedDog = dogRepository.save(newDog);
        
        // Create relationship between user and dog
        DogRelationship relationship = new DogRelationship(user, savedDog, relationshipType);
        
        // Save the relationship
        dogRelationshipRepository.save(relationship);
        
        // Add relationship to user
        user.addDogRelationship(relationship);
        
        // Save updated user (will cascade save the relationship)
        userRepository.save(user);
        
        return savedDog;
    }

    /**
     * Add an existing dog to a user through DogRelationship
     * Service layer - orchestration only
     * @param userId The ID of the user
     * @param dogId The ID of the existing dog
     * @param relationshipType The type of relationship (OWNER, WALKER, etc.)
     * @throws IllegalArgumentException if user or dog not found
     */
    public void connectDogToUser(UUID userId, UUID dogId, RelationshipType relationshipType) {
        
        // Find the user (orchestration)
        Optional<UserAccount> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("User with ID " + userId + " not found");
        }
        
        UserAccount userAccount = userOptional.get();
        if (!(userAccount instanceof RegularUser)) {
            throw new IllegalArgumentException("User must be a RegularUser");
        }
        RegularUser user = (RegularUser) userAccount;
        
        // Find the dog (orchestration)
        Optional<Dog> dogOptional = dogRepository.findById(dogId);
        if (dogOptional.isEmpty()) {
            throw new IllegalArgumentException("Dog with ID " + dogId + " not found");
        }
        
        Dog dog = dogOptional.get();
        
        // Create and add relationship
        DogRelationship relationship = new DogRelationship(user, dog, relationshipType);
        dogRelationshipRepository.save(relationship);
        
        // Add to user's relationships
        user.addDogRelationship(relationship);
        
        // Save updated user
        userRepository.save(user);
    }

    /**
     * Remove a dog from a user (delete the relationship)
     * Service layer - orchestration only
     * @param userId The ID of the user
     * @param dogId The ID of the dog
     * @throws IllegalArgumentException if user or dog not found
     */
    public void removeDogFromUser(UUID userId, UUID dogId) {
        
        // Find the user (orchestration)
        Optional<UserAccount> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("User with ID " + userId + " not found");
        }
        
        UserAccount userAccount = userOptional.get();
        if (!(userAccount instanceof RegularUser)) {
            throw new IllegalArgumentException("User must be a RegularUser");
        }
        RegularUser user = (RegularUser) userAccount;
        
        // Find and remove the relationship
        user.getDogRelationships().removeIf(rel -> rel.getDogID().equals(dogId));
        
        // Save updated user
        userRepository.save(user);
    }

    /**
     * Get a dog by ID
     * @param dogId The ID of the dog
     * @return Optional containing the dog if found
     */
    public Optional<Dog> getDogById(UUID dogId) {
        return dogRepository.findById(dogId);
    }

    /**
     * Delete a dog
     * @param dogId The ID of the dog to delete
     */
    public void deleteDog(UUID dogId) {
        dogRepository.deleteById(dogId);
    }
}
