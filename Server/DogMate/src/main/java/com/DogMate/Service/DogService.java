package com.DogMate.Service;

import com.DogMate.DTO.AddMoodLogRequest;
import com.DogMate.DTO.DogMoodLogDTO;
import com.DogMate.DTO.FoodStockDTO;
import com.DogMate.Domain.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
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
    private final ReminderService reminderService;

    @Autowired
    public DogService(IDogRepository dogRepository, IDogRelationshipRepository dogRelationshipRepository, 
                      IUserRepository userRepository, IFoodStockRepository foodStockRepository,
                      ReminderService reminderService) {
        this.dogRepository = dogRepository;
        this.dogRelationshipRepository = dogRelationshipRepository;
        this.userRepository = userRepository;
        this.foodStockRepository = foodStockRepository;
        this.reminderService = reminderService;
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
    @Transactional
    public Dog addDogToUser(UUID userId, String name, String breed, LocalDate birthdate,
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
        if (birthdate.isAfter(LocalDate.now())){
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
        
        // Check if the dog has any remaining relationships
        List<DogRelationship> allRelationships = dogRelationshipRepository.findAll();
        boolean hasRelationships = allRelationships.stream()
            .anyMatch(rel -> rel.getDogID().equals(dogId));
        
        // If no relationships left, remove from reminders and delete the dog
        if (!hasRelationships) {
            reminderService.removeDogFromAllReminders(dogId);
            dogRepository.deleteById(dogId);
        }
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
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("Dog with ID " + dogId + " not found"));

         FoodStock foodStock = dog.getFoodStock();
        if (foodStock != null) {
            // disconnect (owning side)
            foodStock.removeDog(dog);
            if (foodStock.getDogs().isEmpty()) {
                foodStockRepository.deleteById(foodStock.getId());
            }
        }

        dogRepository.deleteById(dogId);

    }

    @Transactional
    public FoodStock addFoodStockToDog(
            UUID dogId,
            String brandName,
            double bagSizeInKg,
            double currentLevelInKg,
            double dailyConsumptionInGram
    ) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("Dog with ID " + dogId + " not found"));

        validateFoodStockInput(brandName, bagSizeInKg, currentLevelInKg, dailyConsumptionInGram);
        
        FoodStock oldFoodStock = dog.getFoodStock();
        if (oldFoodStock != null) {
            // disconnect (owning side)
            oldFoodStock.removeDog(dog);
            if (oldFoodStock.getDogs().isEmpty()) {
                foodStockRepository.deleteById(oldFoodStock.getId());
            }
        }

        FoodStock foodStock = new FoodStock(
                brandName,
                bagSizeInKg,
                currentLevelInKg,
                dailyConsumptionInGram
        );

        // persist first to avoid transient instance error
        foodStock = foodStockRepository.save(foodStock);

        // connect (owning side)
        foodStock.addDog(dog);

        // optional but good for consistency on both sides
        dog.setFoodStock(foodStock);

        // persist the updated foodStock with the dog relationship
        return foodStockRepository.save(foodStock);
    }

    @Transactional
    public boolean addDogToFoodStock(UUID dogId, UUID foodStockId) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("Dog with ID " + dogId + " not found"));

        FoodStock foodStock = foodStockRepository.findById(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("Food stock with ID " + foodStockId + " not found"));

        // disconnect (owning side)
        FoodStock oldFoodStock = dog.getFoodStock();
        if (oldFoodStock != null) {
            oldFoodStock.removeDog(dog);
            if (oldFoodStock.getDogs().isEmpty()) {
                foodStockRepository.deleteById(oldFoodStock.getId());
            }
        }

        // connect (owning side)
        foodStock.addDog(dog);

        // optional but good for consistency on both sides
        dog.setFoodStock(foodStock);

        // persist
        return true;
    }

    private void validateFoodStockInput(String name, double size, double level, double consumption) {
        if (name == null || name.isBlank()) {throw new IllegalArgumentException("Brand name cannot be empty");}
        if (size <= 0) {throw new IllegalArgumentException("Bag size must be greater than 0 kg");}
        if (level < 0) {throw new IllegalArgumentException("Current level cannot be negative");}
        if (level > size) {throw new IllegalArgumentException("Current level cannot exceed the total bag size (" + size + " kg)");}
        if (consumption <= 0) {throw new IllegalArgumentException("Daily consumption must be greater than 0 grams");}
    }

    /**
     * Get all dogs for a specific user
     * Service layer - orchestration only
     * @param userId The ID of the user
     * @return List of dogs owned/associated with the user
     */
    public List<Dog> getDogsForUser(UUID userId) {
        // Get all dogs from repository and filter by user relationships
        List<Dog> allDogs = dogRepository.findAll();
        List<Dog> userDogs = new java.util.ArrayList<>();

        for (Dog dog : allDogs) {
            // Check if this dog has any relationships with the user
            // Since we don't have a direct query method, we check through the dog's relationships
            for (DogRelationship relationship : dog.getDogRelationships()) {
                if (relationship.getRegularUser().getId().equals(userId)) {
                    userDogs.add(dog);
                    break; // No need to check other relationships for same dog
                }
            }
        }

        return userDogs;
    }

    public List<Dog> getAllDogsforUser(UUID userId) {
        return dogRepository.findAll().stream().filter(dog -> dog.getDogRelationships().stream().anyMatch(rel -> rel.getRegularUser().getId().equals(userId))).collect(Collectors.toList());
    }

    public List<FoodStockDTO> getUserFoodStocks(UUID userId) {
        List<Dog> userDogs = getDogsForUser(userId);
        List<FoodStock> userFoodStocks =  userDogs.stream()
                .map(Dog::getFoodStock)
                .filter(stock -> stock != null).distinct()
                .collect(Collectors.toList());

        List<FoodStockDTO> foodStockDTOs = new ArrayList<>();
        for (FoodStock stock : userFoodStocks) {
            foodStockDTOs.add(new FoodStockDTO(stock));
        }
        return foodStockDTOs;
    }

    public FoodStockDTO renewFoodStock(UUID foodStockId) {
        FoodStock foodStock = foodStockRepository.findById(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("Food stock with ID " + foodStockId + " not found"));
        foodStock.renewStock();
        FoodStock updatedStock = foodStockRepository.save(foodStock);
        return new FoodStockDTO(updatedStock);
    }

    public void deleteFoodStock(UUID foodStockId) {
        FoodStock foodStock = foodStockRepository.findById(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("Food stock with ID " + foodStockId + " not found"));
        List<Dog> dogs = foodStock.getDogs();        
        for (Dog dog : new ArrayList<>(dogs)) {
            foodStock.removeDog(dog);
            dog.setFoodStock(null);
            dogRepository.save(dog);
        }
        foodStockRepository.deleteById(foodStockId);
    }

    @Transactional
    public FoodStockDTO updateFoodStock(UUID foodStockId, FoodStockDTO foodStockDTO) {
        FoodStock foodStock = foodStockRepository.findById(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("Food stock with ID " + foodStockId + " not found"));

        validateFoodStockInput(
                foodStockDTO.getBrandName(),
                foodStockDTO.getBagSizeInKg(),
                foodStockDTO.getCurrentLevelInKg(),
                foodStockDTO.getDailyConsumptionInGram()
        );

        foodStock.setBrandName(foodStockDTO.getBrandName());
        foodStock.setBagSizeInKg(foodStockDTO.getBagSizeInKg());
        foodStock.setCurrentLevelInKg(foodStockDTO.getCurrentLevelInKg());
        foodStock.setDailyConsumptionInGram(foodStockDTO.getDailyConsumptionInGram());

        FoodStock updatedStock = foodStockRepository.save(foodStock);
        return new FoodStockDTO(updatedStock);
    }

    @Transactional
    public DogMoodLog addMoodLogToDog(UUID dogId, AddMoodLogRequest request) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new RuntimeException("Dog not found"));

        DogMoodLog newLog = new DogMoodLog(
                UUID.randomUUID(), 
                request.getMood(),
                request.getActivityLevel(),
                request.getNotes(),
                dog
        );

        dog.getDogMoodLogs().add(newLog);

        dogRepository.save(dog);
        
        return newLog;
    }


    public List<DogMoodLogDTO> getMoodLogsByDogId(UUID dogId) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new RuntimeException("Dog not found"));
        List<DogMoodLog> logs = dog.getDogMoodLogs();
        List<DogMoodLogDTO> logDTOs = new ArrayList<>();
        for (DogMoodLog log : logs) {
            logDTOs.add(new DogMoodLogDTO(log));
        }
        return logDTOs;

    }

    @Transactional
    public void deleteMoodLog(UUID dogID,UUID moodLogId) {
        Dog dog = dogRepository.findById(dogID)
                .orElseThrow(() -> new RuntimeException("Dog not found"));

        dog.getDogMoodLogs().removeIf(log -> log.getId().equals(moodLogId));

        dogRepository.save(dog);
    }
}