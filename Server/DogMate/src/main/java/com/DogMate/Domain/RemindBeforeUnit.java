package com.DogMate.Domain;

public enum RemindBeforeUnit {
    DAYS,
    HOURS,
    MINUTES;

    public static RemindBeforeUnit fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            return DAYS;
        }
        return RemindBeforeUnit.valueOf(raw.trim().toUpperCase());
    }
}
