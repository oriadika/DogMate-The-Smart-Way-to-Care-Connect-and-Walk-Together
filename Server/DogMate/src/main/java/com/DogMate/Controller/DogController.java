package com.DogMate.Controller;

import com.DogMate.DTO.AddFoodStockRequest;
import com.DogMate.DTO.AddMoodLogRequest;
import com.DogMate.DTO.DogMoodLogDTO;
import com.DogMate.DTO.FoodStockDTO;
import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogMoodLog;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Service.DogService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/dogs")
public class DogController {

    private final DogService dogService;

    @Autowired
    public DogController(DogService dogService) {
        this.dogService = dogService;
    }

    /**
     * Add a new dog to a user
     * POST /api/dogs/add
     */
    @PostMapping("/add")
    public ResponseEntity<?> addDogToUser(@RequestBody AddDogRequest request) {
        try {
            // Validate request
            if (request == null || request.getUserId() == null || request.getName() == null || 
                request.getBreed() == null || request.getBirthdate() == null) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Missing required fields: userId, name, breed, birthdate"));
            }

            System.out.println("Received add dog request for user: " + request.getUserId());

            // Parse user ID
            UUID userId;
            try {
                userId = UUID.fromString(request.getUserId());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid user ID format"));
            }

            // Parse gender (default to 'M' if not provided)
            char gender = 'M';
            if (request.getGender() != null && !request.getGender().isEmpty()) {
                String genderStr = request.getGender().toUpperCase();
                if (genderStr.equals("M") || genderStr.equals("MALE")) {
                    gender = 'M';
                } else if (genderStr.equals("F") || genderStr.equals("FEMALE")) {
                    gender = 'F';
                } else {
                    return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid gender. Use 'M' for male or 'F' for female"));
                }
            }

            // Create the dog (OWNERSHIP relationship by default)
            Dog newDog = dogService.addDogToUser(
                userId,
                request.getName().trim(),
                request.getBreed().trim(),
                request.getBirthdate(),
                gender,
                request.getProfileImageUrl() != null ? request.getProfileImageUrl() : "",
                RelationshipType.OWNERSHIP
            );

            // Create success response with dog data
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Dog added successfully");
            response.put("dog", createDogResponse(newDog));

            System.out.println("Dog created successfully with ID: " + newDog.getID());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            System.err.println("Validation error: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.err.println("Failed to add dog: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to add dog: " + e.getMessage()));
        }
    }

    /**
     * Get all dogs for a user
     * GET /api/dogs/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getDogsForUser(@PathVariable String userId) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID is required"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid user ID format"));
            }

            System.out.println("Fetching dogs for user: " + userId);

            // Get dogs for this user using DogService
            List<Dog> userDogs = dogService.getDogsForUser(userUuid);
            
            java.util.List<Map<String, Object>> dogsResponse = new java.util.ArrayList<>();
            for (Dog dog : userDogs) {
                dogsResponse.add(createDogResponse(dog));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", dogsResponse.size());
            response.put("dogs", dogsResponse);

            System.out.println("Found " + dogsResponse.size() + " dogs for user: " + userId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Failed to get dogs: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to fetch dogs: " + e.getMessage()));
        }
    }

    

    /**
     * Delete a dog for a user
     * DELETE /api/dogs/{userId}/{dogId}
     */
    @DeleteMapping("/{userId}/{dogId}")
    public ResponseEntity<?> deleteDog(@PathVariable String userId, @PathVariable String dogId) {
        try {
            if (userId == null || userId.trim().isEmpty() || dogId == null || dogId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("User ID and Dog ID are required"));
            }

            // Parse UUIDs
            UUID userUuid;
            UUID dogUuid;
            try {
                userUuid = UUID.fromString(userId);
                dogUuid = UUID.fromString(dogId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid user ID or dog ID format"));
            }

            System.out.println("Deleting dog: " + dogId + " for user: " + userId);

            // Remove dog from user
            dogService.removeDogFromUser(userUuid, dogUuid);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Dog deleted successfully");
            response.put("dogId", dogId);

            System.out.println("Dog deleted successfully");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            System.err.println("Validation error: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.err.println("Failed to delete dog: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to delete dog: " + e.getMessage()));
        }
    }


    /**
     * Create a new food stock and assign it to a dog
     * POST /api/dogs/{dogId}/food-stock
     */
    @PostMapping("/{dogId}/food-stock")
    public ResponseEntity<?> addFoodStockToDog(
            @PathVariable String dogId,
            @RequestBody AddFoodStockRequest request) {
        try {
            UUID dogUuid = UUID.fromString(dogId);

            FoodStock newStock = dogService.addFoodStockToDog(
                    dogUuid,
                    request.getBrandName(),
                    request.getBagSizeInKg(),
                    request.getCurrentLevelInKg(),
                    request.getDailyConsumptionInGram()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Food stock created and linked to dog");
            response.put("foodStockId", newStock.getId().toString());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to add food stock: " + e.getMessage()));
        }
    }

    /**
     * Connect an existing food stock to a dog
     * POST /api/dogs/{dogId}/food-stock/{foodStockId}
     */
    @PostMapping("/{dogId}/food-stock/{foodStockId}")
    public ResponseEntity<?> connectDogToFoodStock(
            @PathVariable String dogId,
            @PathVariable String foodStockId) {
        try {
            UUID dogUuid = UUID.fromString(dogId);
            UUID stockUuid = UUID.fromString(foodStockId);

            dogService.addDogToFoodStock(dogUuid, stockUuid);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Dog successfully connected to existing food stock");

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to connect dog to food stock: " + e.getMessage()));
        }
    }


    /**
     * Create a dog response object
     */
    private Map<String, Object> createDogResponse(Dog dog) {
        Map<String, Object> dogData = new HashMap<>();
        dogData.put("id", dog.getID().toString());
        dogData.put("name", dog.getName());
        dogData.put("breed", dog.getBreed());
        dogData.put("birthdate", dog.getBirthdate().toString());
        dogData.put("gender", dog.getGender());
        dogData.put("profileImageUrl", dog.getProfileImageURL());
        return dogData;
    }

    /**
     * Create error response object
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        return error;
    }

    /**
     * DTO for add dog request
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AddDogRequest {
        private String userId;
        private String name;
        private String breed;
        private LocalDate birthdate;
        private String gender; // "M" or "F"
        private String profileImageUrl;

        // Default constructor for Jackson
        public AddDogRequest() {
        }

        // Getters and Setters
        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getBreed() {
            return breed;
        }

        public void setBreed(String breed) {
            this.breed = breed;
        }

        public LocalDate getBirthdate() {
            return birthdate;
        }

        public void setBirthdate(LocalDate birthdate) {
            this.birthdate = birthdate;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public String getProfileImageUrl() {
            return profileImageUrl;
        }

        public void setProfileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
        }
    }

    @PostMapping("/{dogId}/mood")
    public ResponseEntity<?> addMoodLog(
            @PathVariable UUID dogId,
            @RequestBody AddMoodLogRequest request) {
        try {
            DogMoodLog log = dogService.addMoodLogToDog(dogId, request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("moodLogId", log.getId());
            response.put("timestamp", log.getTimestamp());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to add mood log: " + e.getMessage());
        }
    }

    @GetMapping("/{dogId}/moods")
    public ResponseEntity<List<DogMoodLogDTO>> getDogMoods(@PathVariable UUID dogId) {
        List<DogMoodLogDTO> moods = dogService.getMoodLogsByDogId(dogId);
        return ResponseEntity.ok(moods);
    }

    @DeleteMapping("/moods/{dogId}/{moodLogId}")
    public ResponseEntity<?> deleteMoodLog(@PathVariable UUID dogId, @PathVariable UUID moodLogId) {
        dogService.deleteMoodLog(dogId, moodLogId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Mood log deleted successfully");
        
        return ResponseEntity.ok(response);
    }
}
