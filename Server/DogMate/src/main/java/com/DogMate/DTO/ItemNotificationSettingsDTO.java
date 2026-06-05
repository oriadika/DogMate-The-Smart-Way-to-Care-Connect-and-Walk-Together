package com.DogMate.DTO;

public record ItemNotificationSettingsDTO(
        boolean notificationEnabled,
        String scheduleTimes,
        String frequencyType,
        Integer frequencyInterval,
        String remindDaysBefore,
        Integer lowStockThresholdDays
) {
    public static ItemNotificationSettingsDTO medicationDefaults() {
        return new ItemNotificationSettingsDTO(false, "08:00", "DAILY", 1, null, null);
    }

    public static ItemNotificationSettingsDTO vaccinationDefaults() {
        return new ItemNotificationSettingsDTO(false, null, null, null, "7,1", null);
    }

    public static ItemNotificationSettingsDTO foodDefaults() {
        return new ItemNotificationSettingsDTO(false, null, null, null, null, 7);
    }
}
