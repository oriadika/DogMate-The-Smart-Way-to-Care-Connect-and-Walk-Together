package com.DogMate.util;

/**
 * Israeli mobile numbers: 10 digits starting with {@code 05}, or 9 digits starting with {@code 5}
 * (same national number without leading zero).
 */
public final class PhoneValidation {

    private PhoneValidation() {
    }

    /**
     * @return digits only (e.g. {@code 0501234567} or {@code 501234567})
     * @throws IllegalArgumentException if missing or not a valid Israeli mobile pattern
     */
    public static String requireValidIsraeliMobile(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("נדרש מספר טלפון");
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            throw new IllegalArgumentException("נדרש מספר טלפון");
        }
        boolean validTen = digits.length() == 10 && digits.startsWith("05");
        boolean validNine = digits.length() == 9 && digits.charAt(0) == '5';
        if (!validTen && !validNine) {
            throw new IllegalArgumentException("מספר פלאפון ישראלי לא תקין");
        }
        return digits;
    }

    /**
     * For optional phone (e.g. dog owner registration): returns {@code null} if blank.
     * If non-blank, validates the same way as {@link #requireValidIsraeliMobile(String)}.
     */
    public static String optionalValidIsraeliMobile(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return requireValidIsraeliMobile(raw);
    }
}
