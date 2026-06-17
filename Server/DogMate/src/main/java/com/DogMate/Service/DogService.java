package com.DogMate.Service;

import com.DogMate.DTO.AddMoodLogRequest;
import com.DogMate.DTO.DogMoodLogDTO;
import com.DogMate.DTO.FoodStockDTO;
import com.DogMate.Domain.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DogService {

    private final IDogRepository dogRepository;
    private final IDogRelationshipRepository dogRelationshipRepository;
    private final IUserRepository userRepository;
    private final IFoodStockRepository foodStockRepository;
    private final ReminderService reminderService;
    private final HealthReminderSyncService healthReminderSyncService;
    private final FoodStockConsumptionService foodStockConsumptionService;

    @Autowired
    public DogService(IDogRepository dogRepository, IDogRelationshipRepository dogRelationshipRepository, 
                      IUserRepository userRepository, IFoodStockRepository foodStockRepository,
                      ReminderService reminderService,
                      HealthReminderSyncService healthReminderSyncService,
                      FoodStockConsumptionService foodStockConsumptionService) {
        this.dogRepository = dogRepository;
        this.dogRelationshipRepository = dogRelationshipRepository;
        this.userRepository = userRepository;
        this.foodStockRepository = foodStockRepository;
        this.reminderService = reminderService;
        this.healthReminderSyncService = healthReminderSyncService;
        this.foodStockConsumptionService = foodStockConsumptionService;
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
    @CacheEvict(cacheNames = "dogsByUser", key = "#userId")
    public Dog addDogToUser(UUID userId, String name, String breed, LocalDate birthdate,
                            char gender, String profileImageURL, Double weightKg, RelationshipType relationshipType) {
        
        // Find the user (orchestration)
        Optional<UserAccount> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        
        UserAccount userAccount = userOptional.get();
        if (!(userAccount instanceof RegularUser)) {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לבצע פעולה זו");
        }
        RegularUser user = (RegularUser) userAccount;

        if (!(gender == 'M' || gender == 'F')){
            throw new IllegalArgumentException("מין הכלב חייב להיות M או F");
        }
        if (birthdate.isAfter(LocalDate.now())){
            throw new IllegalArgumentException("תאריך הלידה לא יכול להיות בעתיד");
        }
        // Create new dog (domain logic)
        UUID dogId = UUID.randomUUID();
        Dog newDog = new Dog(dogId, name, breed, birthdate, gender, profileImageURL, weightKg);
        
        // Save dog to repository (orchestration)
        Dog savedDog = dogRepository.save(newDog);

        if (relationshipType == null) {
            throw new IllegalArgumentException("חסר סוג קשר");
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
     * Update dog fields for a user who has a relationship with the dog.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "dogsByUser", key = "#userId"),
            @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    })
    public Dog updateDogForUser(
            UUID userId,
            UUID dogId,
            String name,
            String breed,
            LocalDate birthdate,
            char gender,
            String profileImageUrlOrNull,
            Double weightKgOrNull
    ) {
        Optional<UserAccount> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        UserAccount userAccount = userOptional.get();
        if (!(userAccount instanceof RegularUser)) {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לבצע פעולה זו");
        }
        RegularUser user = (RegularUser) userAccount;

        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));

        boolean linked = dog.getDogRelationships().stream()
                .anyMatch(rel -> rel.getRegularUser() != null && rel.getRegularUser().getId().equals(user.getId()));
        if (!linked) {
            throw new IllegalArgumentException("הכלב לא משויך למשתמש זה");
        }

        if (!(gender == 'M' || gender == 'F')) {
            throw new IllegalArgumentException("מין הכלב חייב להיות M או F");
        }
        if (birthdate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("תאריך הלידה לא יכול להיות בעתיד");
        }

        dog.setName(name.trim());
        dog.setBreed(breed.trim());
        dog.setBirthdate(birthdate);
        dog.setGender(gender);
        if (profileImageUrlOrNull != null && !profileImageUrlOrNull.isBlank()) {
            dog.setProfileImageURL(profileImageUrlOrNull.trim());
        }
        dog.setWeightKg(weightKgOrNull);

        return dogRepository.save(dog);
    }

    /**
     * Add an existing dog to a user through DogRelationship
     * Service layer - orchestration only
     * @param userId The ID of the user
     * @param dogId The ID of the existing dog
     * @param relationshipType The type of relationship (OWNER, WALKER, etc.)
     * @throws IllegalArgumentException if user or dog not found
     */
    @Transactional
    @CacheEvict(cacheNames = "dogsByUser", key = "#userId")
    public void connectDogToUser(UUID userId, UUID dogId, RelationshipType relationshipType) {
        
        // Find the user (orchestration)
        Optional<UserAccount> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        
        UserAccount userAccount = userOptional.get();
        if (!(userAccount instanceof RegularUser)) {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לבצע פעולה זו");
        }
        RegularUser user = (RegularUser) userAccount;
        
        // Find the dog (orchestration)
        Optional<Dog> dogOptional = dogRepository.findById(dogId);
        if (dogOptional.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId);
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
    @Transactional
    @Caching(evict = {
        @CacheEvict(cacheNames = "dogsByUser", key = "#userId"),
        @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public void removeDogFromUser(UUID userId, UUID dogId) {
        
        // Find the user (orchestration)
        Optional<UserAccount> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        
        UserAccount userAccount = userOptional.get();
        if (!(userAccount instanceof RegularUser)) {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לבצע פעולה זו");
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
            deleteDogSafely(dogId);
        }
    }

    /**
     * Deletes a dog and ensures all dependent rows are removed first
     * (to avoid FK constraint errors such as "update or delete on table dogs violates foreign key").
     *
     * The caller is expected to remove reminders (reminder_dogs + reminders) if needed.
     */
    private void deleteDogSafely(UUID dogId) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));

        // Disconnect food stock (owning side is Dog.foodStock).
        FoodStock foodStock = dog.getFoodStock();
        if (foodStock != null) {
            foodStock.removeDog(dog);
            dog.setFoodStock(null);
            if (foodStock.getDogs().isEmpty()) {
                foodStockRepository.deleteById(foodStock.getId());
            }
        }

        // Force-load children collections before clearing, so orphanRemoval can delete them.
        dog.getDogEvents().size();
        dog.getDogEvents().clear();

        dog.getDogMoodLogs().size();
        dog.getDogMoodLogs().clear();

        dog.getDogDocuments().size();
        dog.getDogDocuments().clear();

        dog.getDogRelationships().size();
        dog.getDogRelationships().clear();

        dogRepository.deleteById(dogId);
    }

    /**
     * Get a dog by ID
     * @param dogId The ID of the dog
     * @return Optional containing the dog if found
     */
    @Transactional(readOnly = true)
    public Optional<Dog> getDogById(UUID dogId) {
        return dogRepository.findById(dogId);
    }

    /**
     * Delete a dog
     * @param dogId The ID of the dog to delete
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
        @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public void deleteDog(UUID dogId) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));

         FoodStock foodStock = dog.getFoodStock();
        if (foodStock != null) {
            // disconnect (owning side)
            foodStock.removeDog(dog);
            dog.setFoodStock(null);
            if (foodStock.getDogs().isEmpty()) {
                foodStockRepository.deleteById(foodStock.getId());
            }
        }

        List<UserAccount> allUsers = userRepository.findAll();
        for (UserAccount user: allUsers){
            if (user instanceof RegularUser) {
                if (((RegularUser) user).getDogRelationships().stream()
                        .map(DogRelationship::getDogID)
                        .toList().contains(dogId)) {
                    removeDogFromUser(user.getId(),dogId);
                }
            }
        }
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
            @CacheEvict(cacheNames = "foodStocksByUser", allEntries = true),
            @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public FoodStock addFoodStockToDog(
            UUID dogId,
            String brandName,
            double bagSizeInKg,
            double currentLevelInKg,
            double dailyConsumptionInGram
    ) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));

        validateFoodStockInput(brandName, bagSizeInKg, currentLevelInKg, dailyConsumptionInGram);
        
        FoodStock oldFoodStock = dog.getFoodStock();
        if (oldFoodStock != null) {
            // disconnect (owning side)
            oldFoodStock.removeDog(dog);
            dog.setFoodStock(null);
            if (oldFoodStock.getDogs().isEmpty()) {
                healthReminderSyncService.deleteFoodStockReminder(oldFoodStock.getId());
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
        FoodStock saved = foodStockRepository.save(foodStock);
        healthReminderSyncService.syncFoodStockReminder(saved);
        return saved;
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
            @CacheEvict(cacheNames = "foodStocksByUser", allEntries = true),
            @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public boolean addDogToFoodStock(UUID dogId, UUID foodStockId) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));

        FoodStock foodStock = foodStockRepository.findByIdWithDogs(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא מלאי מזון עם המזהה: " + foodStockId));

        // disconnect (owning side)
        FoodStock oldFoodStock = dog.getFoodStock();
        if (oldFoodStock != null) {
            oldFoodStock.removeDog(dog);
            dog.setFoodStock(null);
            if (oldFoodStock.getDogs().isEmpty()) {
                healthReminderSyncService.deleteFoodStockReminder(oldFoodStock.getId());
                foodStockRepository.deleteById(oldFoodStock.getId());
            }
        }

        // connect (owning side)
        foodStock.addDog(dog);

        // optional but good for consistency on both sides
        dog.setFoodStock(foodStock);

        foodStockRepository.save(foodStock);
        dogRepository.save(dog);
        healthReminderSyncService.syncFoodStockReminder(foodStock);
        return true;
    }

    private void validateFoodStockInput(String name, double size, double level, double consumption) {
        if (name == null || name.isBlank()) {throw new IllegalArgumentException("חובה להזין שם מותג");}
        if (size <= 0) {throw new IllegalArgumentException("גודל השק חייב להיות גדול מ־0 ק״ג");}
        if (level < 0) {throw new IllegalArgumentException("הכמות הנוכחית לא יכולה להיות שלילית");}
        if (level > size) {throw new IllegalArgumentException("הכמות הנוכחית לא יכולה לעלות על גודל השק (" + size + " ק״ג)");}
        if (consumption <= 0) {throw new IllegalArgumentException("צריכה יומית חייבת להיות גדולה מ־0 גרם");}
    }

    /**
     * Get all dogs for a specific user
     * Service layer - orchestration only
     * @param userId The ID of the user
     * @return List of dogs owned/associated with the user
     */
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "dogsByUser", key = "#userId")
    public List<Dog> getDogsForUser(UUID userId) {
        return dogRepository.findAllForRegularUser(userId);
    }

    /**
     * First non-blank dog profile image URL for map markers (e.g. logged-users API).
     */
    @Transactional(readOnly = true)
    public Optional<String> getFirstMapDogProfileImageUrl(UUID userId) {
        return getFirstMapDogProfileImageUrl(getDogsForUser(userId));
    }

    @Transactional(readOnly = true)
    public Optional<String> getFirstMapDogProfileImageUrl(List<Dog> userDogs) {
        for (Dog dog : userDogs) {
            String url = dog.getProfileImageURL();
            if (url != null && !url.isBlank()) {
                return Optional.of(url.trim());
            }
        }
        return Optional.empty();
    }

    /**
     * Same dog as map avatar when possible: first with profile image; otherwise first dog of the user.
     */
    @Transactional(readOnly = true)
    public Optional<Dog> getPrimaryDogForMap(UUID userId) {
        return getPrimaryDogForMap(getDogsForUser(userId));
    }

    @Transactional(readOnly = true)
    public Optional<Dog> getPrimaryDogForMap(List<Dog> userDogs) {
        if (userDogs.isEmpty()) {
            return Optional.empty();
        }
        for (Dog dog : userDogs) {
            String url = dog.getProfileImageURL();
            if (url != null && !url.isBlank()) {
                return Optional.of(dog);
            }
        }
        return Optional.of(userDogs.get(0));
    }

    /**
     * Adds mapDogName, mapDogBreed, mapDogBirthdate (ISO), mapDogAgeYears to userInfo when a dog exists.
     */
    @Transactional(readOnly = true)
    public void putMapDogSummaryFields(UUID userId, Map<String, Object> userInfo) {
        putMapDogSummaryFields(userId, userInfo, getDogsForUser(userId));
    }

    @Transactional(readOnly = true)
    public void putMapDogSummaryFields(UUID userId, Map<String, Object> userInfo, List<Dog> userDogs) {
        getPrimaryDogForMap(userDogs).ifPresent(dog -> applyMapDogSummaryFields(dog, userInfo));
        getFirstMapDogProfileImageUrl(userDogs)
                .ifPresent(url -> userInfo.put("mapDogProfileImageUrl", url));
    }

    private void applyMapDogSummaryFields(Dog dog, Map<String, Object> userInfo) {
        if (dog.getName() != null && !dog.getName().isBlank()) {
            userInfo.put("mapDogName", dog.getName().trim());
        }
        if (dog.getBreed() != null && !dog.getBreed().isBlank()) {
            userInfo.put("mapDogBreed", dog.getBreed().trim());
        }
        if (dog.getBirthdate() != null) {
            userInfo.put("mapDogBirthdate", dog.getBirthdate().toString());
            userInfo.put("mapDogAgeYears", Period.between(dog.getBirthdate(), LocalDate.now()).getYears());
        }
    }

    /**
     * Batch-load dogs for map markers — one query for all logged-in regular users.
     */
    @Transactional(readOnly = true)
    public Map<UUID, List<Dog>> getDogsGroupedByRegularUserIds(Collection<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<Dog>> grouped = new HashMap<>();
        if (!(dogRelationshipRepository instanceof com.DogMate.Infrastructure.DogRelationshipRepository repo)) {
            for (UUID userId : userIds) {
                grouped.put(userId, getDogsForUser(userId));
            }
            return grouped;
        }
        for (DogRelationship relationship : repo.findByRegularUserIdInWithDog(userIds)) {
            UUID ownerId = relationship.getRegularUser().getId();
            grouped.computeIfAbsent(ownerId, ignored -> new ArrayList<>()).add(relationship.getDog());
        }
        return grouped;
    }

    @Transactional(readOnly = true)
    public List<Dog> getAllDogsforUser(UUID userId) {
        return dogRepository.findAllForRegularUser(userId);
    }

    /**
     * Get all dogs
     * Service layer - only orchestration
     * @return List of all dogs in the database
     */
    @Transactional(readOnly = true)
    public java.util.List<Dog> getAllDogs() {
        // Get all users from repository (orchestration)
        // UserRepository extends JpaRepository which provides findAll() method
        if (dogRepository instanceof com.DogMate.Infrastructure.DogRepository) {
            return ((com.DogMate.Infrastructure.DogRepository) dogRepository).findAll();
        }
        throw new IllegalStateException("מאגר הכלבים לא מוגדר כראוי");
    }

    @Transactional
    public List<FoodStock> getUserFoodStockEntities(UUID userId) {
        foodStockConsumptionService.applyElapsedConsumptionForUser(userId);
        return foodStockRepository.findAllForRegularUserWithDogs(userId);
    }

    @Transactional
    public List<FoodStockDTO> getUserFoodStocks(UUID userId) {
        foodStockConsumptionService.applyElapsedConsumptionForUser(userId);
        return foodStockRepository.findAllForRegularUserWithDogs(userId).stream()
                .map(FoodStockDTO::new)
                .toList();
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "foodStocksByUser", allEntries = true),
            @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public FoodStockDTO renewFoodStock(UUID foodStockId) {
        FoodStock foodStock = foodStockRepository.findByIdWithDogs(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא מלאי מזון עם המזהה: " + foodStockId));
        foodStock.renewStock();
        FoodStock updatedStock = foodStockRepository.save(foodStock);
        healthReminderSyncService.syncFoodStockReminder(updatedStock);
        return new FoodStockDTO(updatedStock);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
            @CacheEvict(cacheNames = "foodStocksByUser", allEntries = true),
            @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public void deleteFoodStock(UUID foodStockId) {
        healthReminderSyncService.deleteFoodStockReminder(foodStockId);
        FoodStock foodStock = foodStockRepository.findByIdWithDogs(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא מלאי מזון עם המזהה: " + foodStockId));
        List<Dog> dogs = foodStock.getDogs();        
        for (Dog dog : new ArrayList<>(dogs)) {
            foodStock.removeDog(dog);
            dog.setFoodStock(null);
            dogRepository.save(dog);
        }
        foodStockRepository.deleteById(foodStockId);
    }

    /**
     * Re-enables food-stock alerts when a FOOD reminder is edited from home.
     * {@code lowStockThresholdDays} is left unchanged — it is the user-facing
     * "days before the bag runs out" setting from food inventory, not derived from remindAt.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
            @CacheEvict(cacheNames = "foodStocksByUser", allEntries = true),
            @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public void syncFoodStockFromReminderEdit(UUID foodStockId, List<UUID> dogIds, LocalDateTime remindAt) {
        FoodStock stock = foodStockRepository.findByIdWithDogs(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא מלאי מזון עם המזהה: " + foodStockId));

        stock.setNotificationEnabled(true);
        foodStockRepository.save(stock);

        for (UUID dogId : dogIds) {
            boolean alreadyLinked = stock.getDogs().stream()
                    .anyMatch(dog -> dog.getID().equals(dogId));
            if (!alreadyLinked) {
                linkDogToFoodStockWithoutReminderSync(dogId, foodStockId);
            }
        }
    }

    /**
     * Turns off food-stock alerts after the reminder fired so it no longer appears on home.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
            @CacheEvict(cacheNames = "foodStocksByUser", allEntries = true),
            @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public void disableFoodStockReminderAfterFired(UUID foodStockId) {
        FoodStock stock = foodStockRepository.findByIdWithDogs(foodStockId).orElse(null);
        if (stock == null || !stock.isNotificationEnabled()) {
            return;
        }
        stock.setNotificationEnabled(false);
        foodStockRepository.save(stock);
        healthReminderSyncService.syncFoodStockReminder(stock);
    }

    /** Connects a dog to food stock without touching system reminders (caller already updated the reminder). */
    private void linkDogToFoodStockWithoutReminderSync(UUID dogId, UUID foodStockId) {
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));

        FoodStock foodStock = foodStockRepository.findByIdWithDogs(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא מלאי מזון עם המזהה: " + foodStockId));

        FoodStock oldFoodStock = dog.getFoodStock();
        if (oldFoodStock != null && !oldFoodStock.getId().equals(foodStockId)) {
            oldFoodStock.removeDog(dog);
            dog.setFoodStock(null);
            if (oldFoodStock.getDogs().isEmpty()) {
                healthReminderSyncService.deleteFoodStockReminder(oldFoodStock.getId());
                foodStockRepository.deleteById(oldFoodStock.getId());
            } else {
                foodStockRepository.save(oldFoodStock);
            }
        }

        foodStock.addDog(dog);
        dog.setFoodStock(foodStock);
        foodStockRepository.save(foodStock);
        dogRepository.save(dog);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "dogsByUser", allEntries = true),
            @CacheEvict(cacheNames = "foodStocksByUser", allEntries = true),
            @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    })
    public FoodStockDTO updateFoodStock(UUID foodStockId, FoodStockDTO foodStockDTO) {
        FoodStock foodStock = foodStockRepository.findByIdWithDogs(foodStockId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא מלאי מזון עם המזהה: " + foodStockId));

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
        foodStock.setNotificationEnabled(foodStockDTO.isNotificationEnabled());
        foodStock.setLowStockThresholdDays(foodStockDTO.getLowStockThresholdDays());
        foodStock.markLevelAdjustedToday();

        FoodStock updatedStock = foodStockRepository.save(foodStock);
        healthReminderSyncService.syncFoodStockReminder(updatedStock);
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


    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public List<Dog> searchDogs(String text){
        return dogRepository.searchDogs(text.trim());
    }
}