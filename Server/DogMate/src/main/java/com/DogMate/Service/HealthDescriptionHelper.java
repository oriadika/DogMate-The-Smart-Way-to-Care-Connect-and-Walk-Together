package com.DogMate.Service;

final class HealthDescriptionHelper {

    static final int MAX_LENGTH = 200;

    private HealthDescriptionHelper() {
    }

    static String normalize(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > MAX_LENGTH ? trimmed.substring(0, MAX_LENGTH) : trimmed;
    }

    static String orDefault(String description, String fallback) {
        String normalized = normalize(description);
        return normalized != null ? normalized : fallback;
    }
}
