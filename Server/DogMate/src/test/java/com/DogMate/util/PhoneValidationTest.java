package com.DogMate.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneValidationTest {

    @Test
    void tenDigitsStartingWith05_ok() {
        assertEquals("0501234567", PhoneValidation.requireValidIsraeliMobile("0501234567"));
        assertEquals("0501234567", PhoneValidation.requireValidIsraeliMobile("050-123-4567"));
    }

    @Test
    void nineDigitsStartingWith5_ok() {
        assertEquals("501234567", PhoneValidation.requireValidIsraeliMobile("501234567"));
    }

    @Test
    void blank_throws() {
        assertThrows(IllegalArgumentException.class, () -> PhoneValidation.requireValidIsraeliMobile(null));
        assertThrows(IllegalArgumentException.class, () -> PhoneValidation.requireValidIsraeliMobile(""));
        assertThrows(IllegalArgumentException.class, () -> PhoneValidation.requireValidIsraeliMobile("   "));
    }

    @Test
    void nonMobile_throws() {
        assertThrows(IllegalArgumentException.class, () -> PhoneValidation.requireValidIsraeliMobile("031234567"));
        assertThrows(IllegalArgumentException.class, () -> PhoneValidation.requireValidIsraeliMobile("123"));
        assertThrows(IllegalArgumentException.class, () -> PhoneValidation.requireValidIsraeliMobile("054"));
    }
}
