package com.DogMate.DTO;

import com.DogMate.Domain.DogMedication;

import java.util.UUID;

/**
 * API payload for a dog medication record.
 */
public record MedicationDTO(
        UUID id,
        UUID dogId,
        String dogName,
        String medicationName,
        String administeredDate,
        String nextDueDate,
        String vetClinicName,
        String createdAt
) {
    public static MedicationDTO fromEntity(DogMedication m) {
        return new MedicationDTO(
                m.getId(),
                m.getDog().getID(),
                m.getDog().getName(),
                m.getMedicationName(),
                m.getAdministeredDate().toString(),
                m.getNextDueDate() != null ? m.getNextDueDate().toString() : null,
                m.getVetClinicName(),
                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null
        );
    }
}
