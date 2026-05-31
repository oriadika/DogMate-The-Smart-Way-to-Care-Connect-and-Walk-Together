package com.DogMate.DTO;

import com.DogMate.Domain.DogVaccination;

import java.util.UUID;

/**
 * API payload for a dog vaccination record.
 */
public record VaccinationDTO(
        UUID id,
        UUID dogId,
        String dogName,
        String vaccineName,
        String administeredDate,
        String nextDueDate,
        String vetClinicName,
        String createdAt
) {
    public static VaccinationDTO fromEntity(DogVaccination v) {
        return new VaccinationDTO(
                v.getId(),
                v.getDog().getID(),
                v.getDog().getName(),
                v.getVaccineName(),
                v.getAdministeredDate().toString(),
                v.getNextDueDate() != null ? v.getNextDueDate().toString() : null,
                v.getVetClinicName(),
                v.getCreatedAt() != null ? v.getCreatedAt().toString() : null
        );
    }
}
