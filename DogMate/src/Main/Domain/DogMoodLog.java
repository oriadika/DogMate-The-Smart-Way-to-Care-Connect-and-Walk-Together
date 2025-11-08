package Main.Domain;

import java.time.LocalDateTime;
import java.util.UUID;

public class DogMoodLog {
    private UUID ID;

    private Mood mood;                // e.g., HAPPY, NEUTRAL, ANXIOUS, SAD

    private ActivityLevel activityLevel; // e.g., LOW, MODERATE, HIGH

    private String notes;

    private LocalDateTime timestamp;

    private Dog dog;

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
