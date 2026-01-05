package com.DogMate.Domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dog_mood_logs")
public class DogMoodLog {
    @Id
    @Column(name = "id")
    private UUID ID;

    @Column(name = "mood")
    @Enumerated(EnumType.STRING)
    private Mood mood;                // e.g., HAPPY, NEUTRAL, ANXIOUS, SAD

    @Column(name = "activity_level")
    @Enumerated(EnumType.STRING)
    private ActivityLevel activityLevel; // e.g., LOW, MODERATE, HIGH

    @Column(name = "notes")
    private String notes;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "dog_id")
    private Dog dog;

    // Default constructor required by JPA
    protected DogMoodLog() {
    }

    public DogMoodLog(UUID ID, Mood mood, ActivityLevel activityLevel, String notes,
                      Dog dog){
        this.ID = ID;
        this.mood = mood;
        this.activityLevel = activityLevel;
        this.notes = notes;
        this.timestamp = LocalDateTime.now();
        this.dog = dog;
    }

    public DogMoodLog(UUID ID, Mood mood, ActivityLevel activityLevel, String notes){
        this.ID = ID;
        this.mood = mood;
        this.activityLevel = activityLevel;
        this.notes = notes;
        this.timestamp = LocalDateTime.now();
    }

    public UUID getId() { return ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public Mood getMood() { return mood; }
    public void setMood(Mood mood) { this.mood = mood; }

    public ActivityLevel getActivityLevel() { return activityLevel; }
    public void setActivityLevel(ActivityLevel activityLevel) { this.activityLevel = activityLevel; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Dog getDog() { return dog; }
    public void setDog(Dog dog) { this.dog = dog; }

    // --- Enums ---
    public enum Mood { HAPPY, NEUTRAL, ANXIOUS, SAD, EXCITED, TIRED }
    public enum ActivityLevel { LOW, MODERATE, HIGH }
}
