package com.DogMate.Service;

import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.MedicationFrequencyType;

final class NotificationSettingsHelper {

    private NotificationSettingsHelper() {
    }

    static void applyMedicationSettings(
            DogMedication entity,
            Boolean notificationEnabled,
            String scheduleTimes,
            String frequencyType,
            Integer frequencyInterval
    ) {
        if (notificationEnabled != null) {
            entity.setNotificationEnabled(notificationEnabled);
        }
        if (scheduleTimes != null) {
            entity.setScheduleTimes(scheduleTimes);
        }
        if (frequencyType != null) {
            entity.setFrequencyType(MedicationFrequencyType.fromString(frequencyType).name());
        }
        if (frequencyInterval != null) {
            entity.setFrequencyInterval(frequencyInterval);
        }
    }

    static void applyVaccinationSettings(
            DogVaccination entity,
            Boolean notificationEnabled,
            String remindDaysBefore
    ) {
        if (notificationEnabled != null) {
            entity.setNotificationEnabled(notificationEnabled);
        }
        if (remindDaysBefore != null) {
            entity.setRemindDaysBefore(remindDaysBefore);
        }
    }

    static void applyFoodStockSettings(
            FoodStock entity,
            Boolean notificationEnabled,
            Integer lowStockThresholdDays
    ) {
        if (notificationEnabled != null) {
            entity.setNotificationEnabled(notificationEnabled);
        }
        if (lowStockThresholdDays != null) {
            entity.setLowStockThresholdDays(lowStockThresholdDays);
        }
    }
}
