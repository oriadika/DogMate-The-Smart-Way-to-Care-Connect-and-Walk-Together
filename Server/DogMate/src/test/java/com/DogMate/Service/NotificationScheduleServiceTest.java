package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Reminder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    void computeMedicationReminderTrigger_schedulesDaysBeforeNextDose() {
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        DogMedication med = new DogMedication(null, dog, "Pill", LocalDate.now());
        med.setNextDueDate(LocalDate.now().plusDays(14));
        med.setRemindBeforeValue(7);
        med.setNextDueTime(NotificationScheduleService.DEFAULT_NOTIFICATION_TIME);

        LocalDateTime trigger = service.computeMedicationReminderTrigger(med);
        assertNotNull(trigger);
        assertEquals(LocalDate.now().plusDays(7).atTime(NotificationScheduleService.DEFAULT_NOTIFICATION_TIME), trigger);
    }

    @Test
    void computeMedicationReminderTrigger_schedulesHoursBeforeNextDose() {
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        DogMedication med = new DogMedication(null, dog, "Pill", LocalDate.now());
        med.setNextDueDate(LocalDate.now().plusDays(1));
        med.setNextDueTime(LocalDateTime.now().plusHours(5).toLocalTime());
        med.setRemindBeforeValue(2);
        med.setRemindBeforeUnit(com.DogMate.Domain.RemindBeforeUnit.HOURS);

        LocalDateTime dueAt = med.getNextDueDate().atTime(med.getNextDueTime());
        LocalDateTime trigger = service.computeMedicationReminderTrigger(med);
        assertNotNull(trigger);
        assertEquals(dueAt.minusHours(2), trigger);
    }

    @Test
    void computeVaccinationReminderTrigger_schedulesDaysBeforeDueDate() {
        LocalDate nextDue = LocalDate.now().plusDays(10);
        LocalDateTime trigger = service.computeVaccinationReminderTrigger(nextDue, "7");

        assertNotNull(trigger);
        assertEquals(LocalDate.now().plusDays(3).atTime(NotificationScheduleService.DEFAULT_NOTIFICATION_TIME), trigger);
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
        med.setNextDueDate(LocalDate.now().plusDays(14));
        med.setRemindBeforeValue(7);

        assertTrue(service.buildMedicationTriggers(List.of(med), false).isEmpty());
        assertFalse(service.buildMedicationTriggers(List.of(med), true).isEmpty());
    }

    @Test
    void buildMedicationTriggers_usesOnlyLatestHistoryRecordPerGroup() {
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        DogMedication older = new DogMedication(UUID.randomUUID(), dog, "Pill", LocalDate.now().minusDays(30));
        older.setNotificationEnabled(true);
        older.setNextDueDate(LocalDate.now().plusDays(5));
        older.setRemindBeforeValue(2);

        DogMedication latest = new DogMedication(UUID.randomUUID(), dog, "Pill", LocalDate.now().minusDays(2));
        latest.setNotificationEnabled(false);
        latest.setNextDueDate(LocalDate.now().plusDays(10));
        latest.setRemindBeforeValue(2);

        assertTrue(service.buildMedicationTriggers(List.of(older, latest), true).isEmpty());
    }

    @Test
    void buildVaccinationTriggers_usesOnlyLatestHistoryRecordPerGroup() {
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        DogVaccination older = new DogVaccination(UUID.randomUUID(), dog, "Rabies", LocalDate.now().minusDays(30));
        older.setNotificationEnabled(true);
        older.setNextDueDate(LocalDate.now().plusDays(14));

        DogVaccination latest = new DogVaccination(UUID.randomUUID(), dog, "Rabies", LocalDate.now().minusDays(2));
        latest.setNotificationEnabled(false);
        latest.setNextDueDate(LocalDate.now().plusDays(14));

        assertTrue(service.buildVaccinationTriggers(List.of(older, latest), true).isEmpty());
    }

    @Test
    void buildMedicationTriggers_usesCustomDescriptionWhenPresent() {
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", LocalDate.of(2020, 1, 1), 'M', "url");
        DogMedication med = new DogMedication(null, dog, "Pill", LocalDate.now());
        med.setNotificationEnabled(true);
        med.setNextDueDate(LocalDate.now().plusDays(14));
        med.setRemindBeforeValue(7);
        med.setDescription("לתת עם אוכל");

        var triggers = service.buildMedicationTriggers(List.of(med), true);
        assertEquals(1, triggers.size());
        assertEquals("לתת עם אוכל", triggers.get(0).body());
    }
}
