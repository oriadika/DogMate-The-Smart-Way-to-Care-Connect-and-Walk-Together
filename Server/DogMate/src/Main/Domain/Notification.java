package Main.Domain;

import java.time.LocalDateTime;
import java.util.UUID;

public class Notification {
    private UUID id;

    private NotificationType notificationType; // SNIFF_REQUEST, DOG_EVENT, FOOD_ALERT

    private String message;

    private boolean isRead = false;

    private LocalDateTime createdAt;

    private RegularUser recipient;
    public Notification(NotificationType type, String message, RegularUser recipient) {
        this.notificationType = type;
        this.message = message;
        this.recipient = recipient;
        this.createdAt = LocalDateTime.now();
    }

    // --- Getters & Setters ---
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public NotificationType getNotificationType() { return notificationType; }
    public void setNotificationType(NotificationType notificationType) { this.notificationType = notificationType; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public RegularUser getRecipient() { return recipient; }
    public void setRecipient(RegularUser recipient) { this.recipient = recipient; }

    // --- Enum ---
    public enum NotificationType {
        SNIFF_REQUEST,
        DOG_EVENT,
        FOOD_ALERT
    }
}
