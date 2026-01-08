package com.DogMate.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ReminderResponse {
    public UUID id;
    public UUID userId;
    public List<UUID> dogIds;
    public String title;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    public LocalDateTime remindAt;

    public String description;
}