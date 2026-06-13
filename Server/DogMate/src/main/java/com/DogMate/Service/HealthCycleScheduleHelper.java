package com.DogMate.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

final class HealthCycleScheduleHelper {

    private HealthCycleScheduleHelper() {
    }

    static LocalDate computeNextDueAfterAdministration(
            LocalDate previousAdministered,
            LocalDate previousNextDue,
            LocalDate administeredToday
    ) {
        if (previousNextDue == null || previousAdministered == null || administeredToday == null) {
            return null;
        }
        long intervalDays = ChronoUnit.DAYS.between(previousAdministered, previousNextDue);
        if (intervalDays <= 0) {
            return null;
        }
        return administeredToday.plusDays(intervalDays);
    }
}
