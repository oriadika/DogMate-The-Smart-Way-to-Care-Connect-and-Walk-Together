package com.DogMate.Controller;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.DogWalkerRating;
import com.DogMate.Domain.WalkerCityOffering;
import com.DogMate.Service.DogWalkerService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/dog-walkers")
public class DogWalkerController {

    private final DogWalkerService dogWalkerService;

    public DogWalkerController(DogWalkerService dogWalkerService) {
        this.dogWalkerService = dogWalkerService;
    }

    /**
     * List all dog walkers who have saved professional profile rows (non-empty city offerings).
     */
    @GetMapping("/available-with-professional-profile")
    public ResponseEntity<?> getWalkersWithProfessionalProfiles(
            @RequestParam(name = "ownerId", required = false) UUID ownerId) {
        try {
            List<DogWalkerUser> walkers = dogWalkerService.getWalkersWithProfessionalDetails();
            List<UUID> walkerIds = walkers.stream().map(DogWalkerUser::getId).toList();
            Map<UUID, DogWalkerService.WalkerRatingSummary> ratingSummaries =
                    dogWalkerService.getRatingSummariesForWalkers(walkerIds, ownerId);
            List<ProfessionalProfileResponse> list = walkers.stream()
                    .map(w -> toResponse(w, ownerId, ratingSummaries.get(w.getId())))
                    .toList();
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה טעינת הדוגווקרים: " + e.getMessage()));
        }
    }

    @PostMapping("/{walkerId}/ratings")
    public ResponseEntity<?> createRating(
            @PathVariable UUID walkerId,
            @RequestBody CreateRatingRequest body) {
        try {
            if (body == null || body.getOwnerId() == null || body.getStars() == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("נדרשים מזהה בעלים וציון כוכבים"));
            }
            DogWalkerRating saved = dogWalkerService.createRating(
                    walkerId,
                    body.getOwnerId(),
                    body.getStars(),
                    body.getComment()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "הדירוג נשמר בהצלחה",
                    "ratingId", saved.getId().toString()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה שמירת הדירוג: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{walkerId}/ratings/{ratingId}")
    public ResponseEntity<?> deleteRating(
            @PathVariable UUID walkerId,
            @PathVariable UUID ratingId,
            @RequestParam(name = "ownerId") UUID ownerId) {
        try {
            dogWalkerService.deleteRating(walkerId, ratingId, ownerId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "הביקורת נמחקה בהצלחה",
                    "ratingId", ratingId.toString()
            ));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(createErrorResponse(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה מחיקת הדירוג: " + e.getMessage()));
        }
    }

    @GetMapping("/{userId}/professional-profile")
    public ResponseEntity<?> getProfessionalProfile(@PathVariable UUID userId) {
        try {
            DogWalkerUser walker = dogWalkerService.getProfessionalProfile(userId);
            return ResponseEntity.ok(toResponse(walker));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשלה טעינת הפרופיל המקצועי: " + e.getMessage()));
        }
    }

    @PutMapping("/{userId}/professional-profile")
    public ResponseEntity<?> updateProfessionalProfile(
            @PathVariable UUID userId,
            @RequestBody ProfessionalProfileUpdateRequest body) {
        try {
            if (body == null || body.getCityOfferings() == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("חובה לשלוח cityOfferings (מערך ריק אם אין הצעות)"));
            }
            List<WalkerCityOffering> domain = body.getCityOfferings().stream()
                    .map(DogWalkerController::toDomainOffering)
                    .toList();
            DogWalkerUser updated = dogWalkerService.updateProfessionalProfile(userId, domain);
            return ResponseEntity.ok(toResponse(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("נכשל עדכון הפרופיל המקצועי: " + e.getMessage()));
        }
    }

    private static WalkerCityOffering toDomainOffering(CityOfferingDto dto) {
        if (dto == null) {
            return new WalkerCityOffering(null, null, null);
        }
        return new WalkerCityOffering(dto.city(), dto.availability(), dto.pricing());
    }

    private ProfessionalProfileResponse toResponse(DogWalkerUser walker) {
        return toResponse(walker, null);
    }

    private ProfessionalProfileResponse toResponse(DogWalkerUser walker, UUID ownerId) {
        DogWalkerService.WalkerRatingSummary ratingSummary =
                dogWalkerService.getRatingSummaryForWalker(walker.getId(), ownerId);
        return toResponse(walker, ownerId, ratingSummary);
    }

    private ProfessionalProfileResponse toResponse(
            DogWalkerUser walker,
            UUID ownerId,
            DogWalkerService.WalkerRatingSummary ratingSummary
    ) {
        List<CityOfferingDto> offerings = walker.getCityOfferings() != null
                ? walker.getCityOfferings().stream()
                .map(o -> new CityOfferingDto(o.getCity(), o.getAvailability(), o.getPricing()))
                .toList()
                : List.of();
        DogWalkerService.WalkerRatingSummary summary = ratingSummary != null
                ? ratingSummary
                : dogWalkerService.getRatingSummaryForWalker(walker.getId(), ownerId);
        return new ProfessionalProfileResponse(
                walker.getId(),
                walker.getEmail(),
                walker.getFirst_name(),
                walker.getLast_name(),
                walker.getPhoneNumber(),
                offerings,
                summary.averageRating(),
                summary.ratingsCount(),
                summary.alreadyRatedByCurrentOwner(),
                summary.reviews().stream()
                        .map(r -> new WalkerReviewDto(
                                r.ratingId(),
                                r.reviewerId(),
                                r.stars(),
                                r.comment(),
                                r.reviewerName(),
                                r.createdAt() != null ? r.createdAt().toString() : null
                        ))
                        .toList()
        );
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        return error;
    }

    public record CityOfferingDto(
            String city,
            String availability,
            String pricing
    ) {
    }

    public record ProfessionalProfileResponse(
            UUID userId,
            String email,
            String firstName,
            String lastName,
            String phoneNumber,
            List<CityOfferingDto> cityOfferings,
            Double averageRating,
            Integer ratingsCount,
            boolean alreadyRatedByCurrentOwner,
            List<WalkerReviewDto> reviews
    ) {
    }

    public record WalkerReviewDto(
            UUID ratingId,
            UUID reviewerId,
            Integer stars,
            String comment,
            String reviewerName,
            String createdAt
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ProfessionalProfileUpdateRequest {
        private List<CityOfferingDto> cityOfferings;

        public List<CityOfferingDto> getCityOfferings() {
            return cityOfferings;
        }

        public void setCityOfferings(List<CityOfferingDto> cityOfferings) {
            this.cityOfferings = cityOfferings;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateRatingRequest {
        private UUID ownerId;
        private Integer stars;
        private String comment;

        public UUID getOwnerId() {
            return ownerId;
        }

        public void setOwnerId(UUID ownerId) {
            this.ownerId = ownerId;
        }

        public Integer getStars() {
            return stars;
        }

        public void setStars(Integer stars) {
            this.stars = stars;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }
    }
}
