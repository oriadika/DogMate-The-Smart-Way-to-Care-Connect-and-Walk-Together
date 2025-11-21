package com.DogMate.Domain;


import java.time.LocalDateTime;
import java.util.UUID;



public class DogEvent {
    private UUID ID;

    private String title;

    // Example: VET, GROOMING, FEEDING, CUSTOM, MEDICATION
    private EventType eventType;

    private LocalDateTime eventTime;

    private boolean isRecurring;

    private RecurringSettings recurringSettings;

    private NotificationSettings notificationSettings;

    private Dog dog;

    public DogEvent(String title, EventType eventType, LocalDateTime eventTime) {
        this.title = title;
        this.eventType = eventType;
        this.eventTime = eventTime;
        this.isRecurring = false;
    }

    public DogEvent(String title, EventType eventType, LocalDateTime eventTime, Dog dog) {
        this.title = title;
        this.eventType = eventType;
        this.eventTime = eventTime;
        this.isRecurring = false;
        this.dog = dog;
    }

    // --- Getters and Setters ---
    public UUID getId() { return ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }

    public LocalDateTime getEventTime() { return eventTime; }
    public void setEventTime(LocalDateTime eventTime) { this.eventTime = eventTime; }

    public boolean isRecurring() { return isRecurring; }
    public void setRecurring(boolean recurring) { isRecurring = recurring; }

    public RecurringSettings getRecurringSettings() { return recurringSettings; }
    public void setRecurringSettings(RecurringSettings recurringSettings) { this.recurringSettings = recurringSettings; }

    public NotificationSettings getNotificationSettings() { return notificationSettings; }
    public void setNotificationSettings(NotificationSettings notificationSettings) { this.notificationSettings = notificationSettings; }

    // --- Enum for event type ---
    public enum EventType {
        VET, GROOMING, WALK, TRAINING
    }

    public static class RecurringSettings {
        private Frequency frequency;

        public Frequency getFrequency() { return frequency; }
        public void setFrequency(Frequency frequency) { this.frequency = frequency; }

        public enum Frequency {
            NONE, DAILY, WEEKLY, MONTHLY
        }
    }

    public static class NotificationSettings {
        // Minutes before event to notify
        private int minutesBefore;

        public int getMinutesBefore() { return minutesBefore; }
        public void setMinutesBefore(int minutesBefore) { this.minutesBefore = minutesBefore; }
    }
}
