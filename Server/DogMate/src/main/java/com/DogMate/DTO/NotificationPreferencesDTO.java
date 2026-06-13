package com.DogMate.DTO;

import com.DogMate.Domain.UserNotificationPreferences;

public record NotificationPreferencesDTO(
        boolean notificationsEnabled
) {
    public static NotificationPreferencesDTO fromEntity(UserNotificationPreferences prefs) {
        return new NotificationPreferencesDTO(prefs.isNotificationsEnabled());
    }

    public static NotificationPreferencesDTO defaults() {
        return new NotificationPreferencesDTO(true);
    }
}
