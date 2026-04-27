package com.DogMate.Controller;

import com.DogMate.DTO.AddFoodStockRequest;
import com.DogMate.DTO.AddMoodLogRequest;
import com.DogMate.DTO.DogMoodLogDTO;
import com.DogMate.DTO.FoodStockDTO;
import com.DogMate.Domain.*;
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

    @GetMapping
    public ResponseEntity<?> getAllDogs(){
        try {
            // Get dogs for this user using DogService
            List<Dog> dogs = dogService.getAllDogs();

            java.util.List<Map<String, Object>> dogsResponse = new java.util.ArrayList<>();
            for (Dog dog : dogs) {
                Map<String, Object> dogResponse = createDogResponse(dog);
                List<String> users_related = dog.getDogRelationships().stream().filter(dogRelationship ->
                        dogRelationship.getDogID() == dog.getID())
                        .map(dogRelationship ->
                                dogRelationship.getRegularUser().getFirst_name() +
                                        " " + dogRelationship.getRegularUser().getLast_name()
                                        + "(" + dogRelationship.getRegularUser().getEmail() + ")").toList();
                dogResponse.put("users_related", users_related);
                dogsResponse.add(dogResponse);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("dogs", dogsResponse);

            System.out.println("Found " + dogsResponse.size() + " dogs");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Failed to get dogs: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה טעינת הכלבים: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchDogs(@RequestParam String query){
        try {
            // Get dogs for this user using DogService
            List<Dog> dogs = dogService.searchDogs(query);

            java.util.List<Map<String, Object>> dogsResponse = new java.util.ArrayList<>();

            for (Dog dog: dogs){
                Map<String, Object> dogResponse = createDogResponse(dog);
                List<String> users_related = dog.getDogRelationships().stream().filter(dogRelationship ->
                        dogRelationship.getDogID() == dog.getID()).map(dogRelationship -> dogRelationship.getRegularUser().getFirst_name() + " " + dogRelationship.getRegularUser().getLast_name()).toList();
                dogResponse.put("users_related", users_related);
                dogsResponse.add(dogResponse);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("dogs", dogsResponse);

            System.out.println("Found " + dogs.size() + " dogs");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Failed to get dogs: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה טעינת הכלבים: " + e.getMessage()));
        }
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
                    .body(createErrorResponse("חסרים שדות נדרשים: מזהה משתמש, שם, גזע, תאריך לידה"));
            }

            System.out.println("Received add dog request for user: " + request.getUserId());

            // Parse user ID
            UUID userId;
            try {
                userId = UUID.fromString(request.getUserId());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
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
                        .body(createErrorResponse("מין לא תקין. השתמש ב־M לזכר או ב־F לנקבה"));
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
            response.put("message", "הכלב נוסף בהצלחה");
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
                .body(createErrorResponse("נכשלה הוספת הכלב: " + e.getMessage()));
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
                    .body(createErrorResponse("נדרש מזהה משתמש"));
            }

            // Parse UUID
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("מזהה משתמש בפורמט לא תקין"));
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
                .body(createErrorResponse("נכשלה טעינת הכלבים: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{dogId}")
    public ResponseEntity<?> deleteDog(@PathVariable String dogId) {
        try {
            if (dogId == null || dogId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("נדרש מזהה כלב"));
            }

            // Parse UUIDs
            UUID dogUuid;
            try {
                dogUuid = UUID.fromString(dogId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("מזהה משתמש או כלב בפורמט לא תקין"));
            }

            System.out.println("Deleting dog: " + dogId);

            // Remove dog from user
            dogService.deleteDog(dogUuid);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "הכלב נמחק בהצלחה");
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
                    .body(createErrorResponse("נכשלה מחיקת הכלב: " + e.getMessage()));
        }
    }

    /**
     * Delete a dog for a user
     * DELETE /api/dogs/{userId}/{dogId}
     */
    @DeleteMapping("/{userId}/{dogId}")
    public ResponseEntity<?> removeDogFromUser(@PathVariable String userId, @PathVariable String dogId) {
        try {
            if (userId == null || userId.trim().isEmpty() || dogId == null || dogId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("נדרשים מזהה משתמש ומזהה כלב"));
            }

            // Parse UUIDs
            UUID userUuid;
            UUID dogUuid;
            try {
                userUuid = UUID.fromString(userId);
                dogUuid = UUID.fromString(dogId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("מזהה משתמש או כלב בפורמט לא תקין"));
            }

            System.out.println("Deleting dog: " + dogId + " for user: " + userId);

            // Remove dog from user
            dogService.removeDogFromUser(userUuid, dogUuid);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "הכלב נמחק בהצלחה");
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
                .body(createErrorResponse("נכשלה מחיקת הכלב: " + e.getMessage()));
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
            response.put("message", "מלאי המזון נוצר וקושר לכלב");
            response.put("foodStockId", newStock.getId().toString());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה הוספת מלאי מזון: " + e.getMessage()));
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
            response.put("message", "הכלב קושר למלאי המזון הקיים");

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה קישור הכלב למלאי המזון: " + e.getMessage()));
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
                    .body(createErrorResponse("נכשלה הוספת רשומת מצב רוח: " + e.getMessage()));
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
        response.put("message", "רשומת מצב הרוח נמחקה");
        
        return ResponseEntity.ok(response);
    }
}
