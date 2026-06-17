package com.DogMate.Service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class HealthDescriptionHelperTest {

    @Test
    void normalize_trimsAndCapsAt200Characters() {
        String longText = "א".repeat(250);
        assertEquals(200, HealthDescriptionHelper.normalize(longText).length());
        assertEquals("שלום", HealthDescriptionHelper.normalize("  שלום  "));
        assertNull(HealthDescriptionHelper.normalize("   "));
        assertNull(HealthDescriptionHelper.normalize(null));
    }
}
