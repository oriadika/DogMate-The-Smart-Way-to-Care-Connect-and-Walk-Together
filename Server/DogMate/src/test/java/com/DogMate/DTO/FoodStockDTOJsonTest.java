package com.DogMate.DTO;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FoodStockDTOJsonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deserializesUpdateRequestBody() throws Exception {
        String json = """
                {
                  "brandName": "מזון כלבים",
                  "bagSizeInKg": 12,
                  "dailyConsumptionInGram": 200,
                  "currentLevelInKg": 5,
                  "notificationEnabled": true,
                  "lowStockThresholdDays": 7
                }
                """;

        FoodStockDTO dto = objectMapper.readValue(json, FoodStockDTO.class);

        assertEquals("מזון כלבים", dto.getBrandName());
        assertEquals(12, dto.getBagSizeInKg());
        assertEquals(200, dto.getDailyConsumptionInGram());
        assertEquals(5, dto.getCurrentLevelInKg());
        assertTrue(dto.isNotificationEnabled());
        assertEquals(7, dto.getLowStockThresholdDays());
    }
}
