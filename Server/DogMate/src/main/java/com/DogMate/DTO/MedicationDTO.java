package com.DogMate.DTO;

import com.DogMate.Domain.DogMedication;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
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
        String administeredTime,
        String nextDueDate,
        String nextDueTime,
        String vetClinicName,
        String description,
        String createdAt,
        boolean notificationEnabled,
        Integer remindBeforeValue,
        String remindBeforeUnit
) {
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    public static MedicationDTO fromEntity(DogMedication m) {
        LocalTime administeredTime = m.getAdministeredTime();
        LocalTime dueTime = m.getNextDueTime();
        return new MedicationDTO(
                m.getId(),
                m.getDog().getID(),
                m.getDog().getName(),
                m.getMedicationName(),
                m.getAdministeredDate().toString(),
                administeredTime != null ? administeredTime.format(TIME_FORMAT) : "09:00",
                m.getNextDueDate() != null ? m.getNextDueDate().toString() : null,
                dueTime != null ? dueTime.format(TIME_FORMAT) : "09:00",
                m.getVetClinicName(),
                m.getDescription(),
                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                m.isNotificationEnabled(),
                m.getRemindBeforeValue(),
                m.getRemindBeforeUnit().name()
        );
    }
}
