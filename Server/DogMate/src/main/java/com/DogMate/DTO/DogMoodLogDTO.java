package com.DogMate.DTO;

import java.time.LocalDateTime;
import java.util.UUID;

import com.DogMate.Domain.DogMoodLog;

public class DogMoodLogDTO {
    private UUID id;
    private DogMoodLog.Mood mood;
    private DogMoodLog.ActivityLevel activityLevel;
    private String notes;
    private LocalDateTime timestamp;

    public DogMoodLogDTO(UUID id, DogMoodLog.Mood mood, DogMoodLog.ActivityLevel activityLevel,
                         String notes, LocalDateTime timestamp) {
        this.id = id;
        this.mood = mood;
        this.activityLevel = activityLevel;
        this.notes = notes;
        this.timestamp = timestamp;
    }

    public DogMoodLogDTO(DogMoodLog log) {
        this.id = log.getId();
        this.mood = log.getMood();
        this.activityLevel = log.getActivityLevel();
        this.notes = log.getNotes();
        this.timestamp = log.getTimestamp();
    }

    public UUID getId() { return id; }
    public DogMoodLog.Mood getMood() { return mood; }
    public DogMoodLog.ActivityLevel getActivityLevel() { return activityLevel; }
    public String getNotes() { return notes; }
    public LocalDateTime getTimestamp() { return timestamp; }


}
