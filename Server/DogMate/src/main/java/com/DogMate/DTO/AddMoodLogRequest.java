package com.DogMate.DTO;

import com.DogMate.Domain.DogMoodLog;

public class AddMoodLogRequest {
    private DogMoodLog.Mood mood;
    private DogMoodLog.ActivityLevel activityLevel;
    private String notes;

    // Getters and Setters
    public DogMoodLog.Mood getMood() { return mood; }
    public DogMoodLog.ActivityLevel getActivityLevel() { return activityLevel; }
    public String getNotes() { return notes; }
}