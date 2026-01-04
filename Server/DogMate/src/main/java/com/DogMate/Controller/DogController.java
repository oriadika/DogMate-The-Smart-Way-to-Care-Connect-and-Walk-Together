package com.DogMate.Controller;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.RelationshipType;
import com.DogMate.Service.DogService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
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
}
