package com.DogMate.Domain;

public enum MedicationFrequencyType {
    HOURLY,
    DAILY,
    EVERY_X_DAYS;

    public static MedicationFrequencyType fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            return DAILY;
        }
        return MedicationFrequencyType.valueOf(raw.trim().toUpperCase());
    }
}
