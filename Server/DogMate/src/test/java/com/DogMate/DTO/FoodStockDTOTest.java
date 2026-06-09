package com.DogMate.DTO;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.FoodStock;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class FoodStockDTOTest {

    @Test
    void constructor_handlesDogWithNullBirthdate() {
        FoodStock stock = new FoodStock("Acana", 12, 5, 200);
        Dog dog = new Dog(UUID.randomUUID(), "Rex", "Mix", null, 'M', null);
        stock.addDog(dog);

        assertDoesNotThrow(() -> new FoodStockDTO(stock));

        FoodStockDTO dto = new FoodStockDTO(stock);
        assertEquals(1, dto.getDogs().size());
        assertFalse(dto.getDogs().get(0).containsKey("birthdate"));
        assertEquals("Rex", dto.getDogs().get(0).get("name"));
    }
}
