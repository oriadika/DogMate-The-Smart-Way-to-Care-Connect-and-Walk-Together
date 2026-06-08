package com.DogMate.Service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class HealthCycleScheduleHelperTest {

    @Test
    void computeNextDueAfterAdministration_appliesIntervalDays() {
        LocalDate previousAdmin = LocalDate.of(2026, 1, 1);
        LocalDate previousNext = LocalDate.of(2026, 1, 8);
        LocalDate today = LocalDate.of(2026, 6, 8);

        LocalDate next = HealthCycleScheduleHelper.computeNextDueAfterAdministration(
                previousAdmin,
                previousNext,
                today
        );

        assertEquals(LocalDate.of(2026, 6, 15), next);
    }

    @Test
    void computeNextDueAfterAdministration_returnsNullWhenIntervalInvalid() {
        assertNull(HealthCycleScheduleHelper.computeNextDueAfterAdministration(
                LocalDate.of(2026, 1, 10),
                LocalDate.of(2026, 1, 8),
                LocalDate.of(2026, 6, 8)
        ));
    }
}
