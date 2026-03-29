package com.DogMate.Controller;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.WalkerCityOffering;
import com.DogMate.Domain.WalkRequest;
import com.DogMate.Service.DogWalkerService;
import com.DogMate.Service.WalkRequestService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dog-walkers")
public class DogWalkerController {

    private final DogWalkerService dogWalkerService;
    private final WalkRequestService walkRequestService;

    public DogWalkerController(DogWalkerService dogWalkerService, WalkRequestService walkRequestService) {
        this.dogWalkerService = dogWalkerService;
        this.walkRequestService = walkRequestService;
    }

    @GetMapping("/{walkerId}/walk-requests")
    public ResponseEntity<?> listWalkRequests(@PathVariable UUID walkerId) {
        try {
            List<WalkRequestResponse> list = walkRequestService.listPendingForWalker(walkerId).stream()
                    .map(this::toWalkRequestResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to list walk requests: " + e.getMessage()));
        }
    }

    @GetMapping("/{walkerId}/walk-schedule")
    public ResponseEntity<?> listWalkSchedule(@PathVariable UUID walkerId) {
        try {
            List<WalkRequestResponse> list = walkRequestService.listUpcomingScheduleForWalker(walkerId).stream()
                    .map(this::toWalkRequestResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to load walk schedule: " + e.getMessage()));
        }
    }

    @PostMapping("/{walkerId}/walk-requests/{requestId}/confirm-charge")
    public ResponseEntity<?> confirmWalkRequestCharge(
            @PathVariable UUID walkerId,
            @PathVariable UUID requestId) {
        try {
            WalkRequest updated = walkRequestService.confirmCharge(walkerId, requestId);
            return ResponseEntity.ok(toWalkRequestResponse(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to confirm walk request: " + e.getMessage()));
        }
    }

    @PostMapping("/{walkerId}/walk-requests/{requestId}/decline")
    public ResponseEntity<?> declineWalkRequest(
            @PathVariable UUID walkerId,
            @PathVariable UUID requestId) {
        try {
            WalkRequest updated = walkRequestService.decline(walkerId, requestId);
            return ResponseEntity.ok(toWalkRequestResponse(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to decline walk request: " + e.getMessage()));
        }
    }

    private WalkRequestResponse toWalkRequestResponse(WalkRequest w) {
        return walkRequestToResponse(w);
    }

    public static WalkRequestResponse walkRequestToResponse(WalkRequest w) {
        UUID dogId = w.getDog() != null ? w.getDog().getID() : null;
        String dogName = w.getDog() != null ? w.getDog().getName() : null;
        return new WalkRequestResponse(
                w.getId(),
                w.getWalker().getId(),
                w.getOwner().getId(),
                w.getOwner().getFirst_name(),
                w.getOwner().getLast_name(),
                dogId,
                dogName,
                w.getScheduledStart(),
                w.getScheduledEnd(),
                w.getStatus().name(),
                w.isCharged(),
                w.getNotes());
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
                    .body(createErrorResponse("Failed to load professional profile: " + e.getMessage()));
        }
    }

    @PutMapping("/{userId}/professional-profile")
    public ResponseEntity<?> updateProfessionalProfile(
            @PathVariable UUID userId,
            @RequestBody ProfessionalProfileUpdateRequest body) {
        try {
            if (body == null || body.getCityOfferings() == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("cityOfferings is required (use empty array if none)"));
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
                    .body(createErrorResponse("Failed to update professional profile: " + e.getMessage()));
        }
    }

    private static WalkerCityOffering toDomainOffering(CityOfferingDto dto) {
        if (dto == null) {
            return new WalkerCityOffering(null, null, null);
        }
        return new WalkerCityOffering(dto.city(), dto.availability(), dto.pricing());
    }

    private ProfessionalProfileResponse toResponse(DogWalkerUser walker) {
        List<CityOfferingDto> offerings = walker.getCityOfferings() != null
                ? walker.getCityOfferings().stream()
                .map(o -> new CityOfferingDto(o.getCity(), o.getAvailability(), o.getPricing()))
                .toList()
                : List.of();
        return new ProfessionalProfileResponse(
                walker.getId(),
                walker.getEmail(),
                walker.getFirst_name(),
                walker.getLast_name(),
                offerings);
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
            List<CityOfferingDto> cityOfferings
    ) {
    }

    public record WalkRequestResponse(
            UUID requestId,
            UUID walkerId,
            UUID ownerId,
            String ownerFirstName,
            String ownerLastName,
            UUID dogId,
            String dogName,
            Instant scheduledStart,
            Instant scheduledEnd,
            String status,
            boolean charged,
            String notes
    ) {
    }

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
}
