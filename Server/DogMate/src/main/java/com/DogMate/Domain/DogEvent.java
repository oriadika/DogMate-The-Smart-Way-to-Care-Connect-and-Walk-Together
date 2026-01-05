package com.DogMate.Domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dog_events")
public class DogEvent {
    @Id
    @Column(name = "id")
    private UUID ID;

    @Column(name = "title")
    private String title;

    // Example: VET, GROOMING, FEEDING, CUSTOM, MEDICATION
    @Column(name = "event_type")
    @Enumerated(EnumType.STRING)
    private EventType eventType;

    @Column(name = "event_time")
    private LocalDateTime eventTime;

    @Column(name = "is_recurring")
    private boolean isRecurring;

    @Transient
    private RecurringSettings recurringSettings;

    @Transient
    private NotificationSettings notificationSettings;

    @ManyToOne
    @JoinColumn(name = "dog_id")
    private Dog dog;

    // Default constructor required by JPA
    protected DogEvent() {
    }

    public DogEvent(String title, EventType eventType, LocalDateTime eventTime) {
        this.ID = UUID.randomUUID();
        this.title = title;
        this.eventType = eventType;
        this.eventTime = eventTime;
        this.isRecurring = false;
    }

    public DogEvent(String title, EventType eventType, LocalDateTime eventTime, Dog dog) {
        this.ID = UUID.randomUUID();
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
