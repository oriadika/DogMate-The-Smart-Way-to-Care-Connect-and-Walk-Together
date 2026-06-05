package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.MedicationFrequencyType;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Reminder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotificationScheduleServiceTest {

    private NotificationScheduleService service;

    @BeforeEach
    void setUp() {
        service = new NotificationScheduleService();
    }

    @Test
    void shouldSchedule_requiresBothGlobalAndItemEnabled() {
        assertTrue(service.shouldSchedule(true, true));
        assertFalse(service.shouldSchedule(true, false));
        assertFalse(service.shouldSchedule(false, true));
        assertFalse(service.shouldSchedule(false, false));
    }

    @Test
    void computeMedicationTriggers_dailyProducesMultipleTimes() {
        LocalDateTime from = LocalDate.of(2026, 6, 5).atTime(0, 0);
        LocalDateTime until = from.plusDays(2);

        List<LocalDateTime> triggers = service.computeMedicationTriggers(
                "08:00,20:00",
                MedicationFrequencyType.DAILY,
                1,
                from,
                until
        );

        assertTrue(triggers.size() >= 4);
        assertTrue(triggers.stream().anyMatch(t -> t.toLocalTime().equals(LocalTime.of(8, 0))));
        assertTrue(triggers.stream().anyMatch(t -> t.toLocalTime().equals(LocalTime.of(20, 0))));
    }

    @Test
    void computeMedicationTriggers_everyXDaysRespectsInterval() {
        LocalDateTime from = LocalDate.of(2026, 6, 5).atTime(10, 0);
        LocalDateTime until = from.plusDays(10);

        List<LocalDateTime> triggers = service.computeMedicationTriggers(
                "09:00",
                MedicationFrequencyType.EVERY_X_DAYS,
                3,
                from,
                until
        );

        assertEquals(3, triggers.size());
        assertEquals(LocalDate.of(2026, 6, 8).atTime(9, 0), triggers.get(0));
        assertEquals(LocalDate.of(2026, 6, 11).atTime(9, 0), triggers.get(1));
    }

    @Test
    void computeVaccinationTriggers_includesConfiguredLeadDays() {
        LocalDate nextDue = LocalDate.now().plusDays(10);
        List<LocalDateTime> triggers = service.computeVaccinationTriggers(nextDue, "7,1");

        assertFalse(triggers.isEmpty());
        assertTrue(triggers.stream().anyMatch(t -> t.toLocalDate().equals(nextDue.minusDays(7))));
        assertTrue(triggers.stream().anyMatch(t -> t.toLocalDate().equals(nextDue.minusDays(1))));
    }

    @Test
    void computeFoodLowStockTrigger_whenDaysRemainingAtOrBelowThresholdIsImmediate() {
        FoodStock stock = new FoodStock("Brand", 10, 5.0, 1000);
        stock.setLowStockThresholdDays(7);

        LocalDateTime trigger = service.computeFoodLowStockTrigger(stock);
        assertNotNull(trigger);
        assertTrue(trigger.isBefore(LocalDateTime.now().plusMinutes(5)));
    }

    @Test
    void computeFoodLowStockTrigger_schedulesReminderDaysBeforeBagEnds() {
        FoodStock stock = new FoodStock("Brand", 10, 10.0, 500);
        stock.setLowStockThresholdDays(7);

        LocalDateTime trigger = service.computeFoodLowStockTrigger(stock);
        assertNotNull(trigger);
        assertEquals(
                LocalDate.now().plusDays(13).atTime(NotificationScheduleService.DEFAULT_NOTIFICATION_TIME),
                trigger
        );
    }

    @Test
    void buildManualReminderTriggers_filtersDisabledItemsAndPastDates() {
        RegularUser user = new RegularUser(UUID.randomUUID(), "a@b.com", "pw", "A", "B");
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        Reminder future = new Reminder(user, new java.util.LinkedList<>(List.of(dog)), "Walk", LocalDateTime.now().plusDays(1), "desc");
        future.setNotificationEnabled(true);
        Reminder disabled = new Reminder(user, new java.util.LinkedList<>(List.of(dog)), "Vet", LocalDateTime.now().plusDays(2), "desc");
        disabled.setNotificationEnabled(false);

        var triggers = service.buildManualReminderTriggers(List.of(future, disabled), true);
        assertEquals(1, triggers.size());
        assertEquals("REMINDER", triggers.get(0).sourceType());
    }

    @Test
    void buildMedicationTriggers_skipsWhenGlobalDisabled() {
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        DogMedication med = new DogMedication(null, dog, "Pill", LocalDate.now());
        med.setNotificationEnabled(true);

        assertTrue(service.buildMedicationTriggers(List.of(med), false).isEmpty());
        assertFalse(service.buildMedicationTriggers(List.of(med), true).isEmpty());
    }

    @Test
    void buildVaccinationTriggers_skipsWhenItemDisabled() {
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        DogVaccination v = new DogVaccination(null, dog, "Rabies", LocalDate.now());
        v.setNextDueDate(LocalDate.now().plusDays(14));
        v.setNotificationEnabled(false);

        assertTrue(service.buildVaccinationTriggers(List.of(v), true).isEmpty());
    }
}
