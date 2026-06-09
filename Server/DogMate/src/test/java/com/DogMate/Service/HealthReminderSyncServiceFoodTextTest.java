package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class HealthReminderSyncServiceFoodTextTest {

    @Test
    void buildsFoodReminderTitleAndDescriptionWithDogNames() {
        Dog rex = new Dog(UUID.randomUUID(), "רex", "Mix", LocalDate.of(2020, 1, 1), 'M', null);
        Dog max = new Dog(UUID.randomUUID(), "מקס", "Pug", LocalDate.of(2021, 1, 1), 'M', null);

        assertEquals("לקנות אוכל לרex", HealthReminderSyncService.buildFoodReminderTitle(List.of(rex)));
        assertEquals(
                "מלאי המזון של רex עומד להיגמר בקרוב...",
                HealthReminderSyncService.buildFoodReminderDescription(List.of(rex))
        );
        assertEquals("לקנות אוכל לרex ומקס", HealthReminderSyncService.buildFoodReminderTitle(List.of(rex, max)));
    }
}
