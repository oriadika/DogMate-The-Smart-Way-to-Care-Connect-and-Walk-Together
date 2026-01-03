package com.DogMate.Service;

import com.DogMate.Domain.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DogService {

    private final IDogRepository dogRepository;
    private final IDogRelationshipRepository dogRelationshipRepository;
    private final IUserRepository userRepository;
    private final IFoodStockRepository foodStockRepository;

    @Autowired
    public DogService(IDogRepository dogRepository, IDogRelationshipRepository dogRelationshipRepository, 
                      IUserRepository userRepository, IFoodStockRepository foodStockRepository) {
        this.dogRepository = dogRepository;
        this.dogRelationshipRepository = dogRelationshipRepository;
        this.userRepository = userRepository;
        this.foodStockRepository = foodStockRepository;
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

        if (!(gender == 'M' || gender == 'F')){
            throw new IllegalArgumentException("gender is not valid");
        }
        if (birthdate.after(new Date())){
            throw new IllegalArgumentException("Date is not before current time");
        }
        // Create new dog (domain logic)
        UUID dogId = UUID.randomUUID();
        Dog newDog = new Dog(dogId, name, breed, birthdate, gender, profileImageURL);
        
        // Save dog to repository (orchestration)
        Dog savedDog = dogRepository.save(newDog);

        if (relationshipType == null) {
            throw new IllegalArgumentException("Relationship type is null");
        }
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

    public FoodStock addFoodStockToDog(
            UUID dogId,
            String brandName,
            double bagSizeInKg,
            double currentLevelInKg,
            double dailyConsumptionInGram
    ) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("Dog with ID " + dogId + " not found"));
        if(brandName == null || brandName.isEmpty()){
            throw new IllegalArgumentException("Name is invalid");
        }
        if (bagSizeInKg <= 0){
            throw new IllegalArgumentException("Bag size is invalid");
        }
        if (currentLevelInKg <= 0){
            throw new IllegalArgumentException("Current level is invalid");
        }
        if (dailyConsumptionInGram <= 0){
            throw new IllegalArgumentException("Daily consumption is invalid");
        }
        FoodStock foodStock = new FoodStock(
                brandName,
                bagSizeInKg,
                currentLevelInKg,
                dailyConsumptionInGram
        );

        // connect (owning side)
        foodStock.setDog(dog);

        // optional but good for consistency on both sides
        dog.getFoodStocks().add(foodStock);

        // persist
        return foodStockRepository.save(foodStock);
    }
}
