package com.DogMate.Service;

import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.RemindBeforeUnit;

import java.time.LocalTime;

final class NotificationSettingsHelper {

    private NotificationSettingsHelper() {
    }

    static void applyMedicationSettings(
            DogMedication entity,
            Boolean notificationEnabled,
            Integer remindBeforeValue,
            RemindBeforeUnit remindBeforeUnit,
            LocalTime nextDueTime
    ) {
        if (notificationEnabled != null) {
            entity.setNotificationEnabled(notificationEnabled);
        }
        if (remindBeforeValue != null) {
            entity.setRemindBeforeValue(remindBeforeValue);
        }
        if (remindBeforeUnit != null) {
            entity.setRemindBeforeUnit(remindBeforeUnit);
        }
        if (nextDueTime != null) {
            entity.setNextDueTime(nextDueTime);
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
