package com.DogMate.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.UUID;

public class ReminderResponseDTO {
    private UUID id;
    private String title;
    private String description;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime remindAt;
    
    private boolean sent;

    public ReminderResponseDTO(UUID id, String title, String description, LocalDateTime remindAt, boolean sent) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.remindAt = remindAt;
        this.sent = sent;
    }

    // Getters
    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDateTime getRemindAt() {
        return remindAt;
    }

    public boolean isSent() {
        return sent;
    }
}
