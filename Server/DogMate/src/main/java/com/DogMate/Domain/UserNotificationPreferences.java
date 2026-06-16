package com.DogMate.Domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_notification_preferences")
public class UserNotificationPreferences {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(optional = false)
    @MapsId
    @JoinColumn(name = "user_id")
    private RegularUser user;

    @Column(name = "notifications_enabled", nullable = false)
    private boolean notificationsEnabled = true;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected UserNotificationPreferences() {
    }

    public UserNotificationPreferences(RegularUser user) {
        this.user = user;
        this.notificationsEnabled = true;
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    @PreUpdate
    protected void touchUpdatedAt() {
        updatedAt = LocalDateTime.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public RegularUser getUser() {
        return user;
    }

    public boolean isNotificationsEnabled() {
        return notificationsEnabled;
    }

    public void setNotificationsEnabled(boolean notificationsEnabled) {
        this.notificationsEnabled = notificationsEnabled;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
