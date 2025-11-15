package com.DogMate.Domain;

import java.awt.*;
import java.time.LocalDateTime;
import java.util.UUID;

public class UserLiveLocation {
    private UUID ID;

    private Point location;

    private LocalDateTime lastUpdatedAt;

    private boolean isVisible;

    private RegularUser user;

    public UserLiveLocation(UUID ID, Point location, RegularUser user){
        this.ID = ID;
        this.location = location;
        this.lastUpdatedAt = LocalDateTime.now();
        this.user = user;
    }

    public UUID getId() { return ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public Point getLocation() { return location; }
    public void setLocation(Point location) { this.location = location; }

    public LocalDateTime getLastUpdatedAt() { return lastUpdatedAt; }
    public void setLastUpdatedAt(LocalDateTime lastUpdatedAt) { this.lastUpdatedAt = lastUpdatedAt; }

    public boolean isVisible() { return isVisible; }
    public void setVisible(boolean visible) { isVisible = visible; }

    public RegularUser getUser() { return user; }
    public void setUser(RegularUser user) { this.user = user; }
}
