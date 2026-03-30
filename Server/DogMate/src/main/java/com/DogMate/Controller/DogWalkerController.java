package com.DogMate.Controller;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.WalkerCityOffering;
import com.DogMate.Service.DogWalkerService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
