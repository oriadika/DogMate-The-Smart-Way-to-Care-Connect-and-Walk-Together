package com.DogMate.DTO;

import java.time.LocalDateTime;

public record ReminderDTO(
    String title,
    String description,
    LocalDateTime remindAt
) {}

