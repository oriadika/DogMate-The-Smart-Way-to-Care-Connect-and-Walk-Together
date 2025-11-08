package Main.Domain;

import java.time.LocalDateTime;
import java.util.UUID;

public class SniffRequest {
    private UUID ID;

    private Status status;

    private LocalDateTime createdAt;

    private RegularUser requesterUser;

    private RegularUser targetUser;


    public SniffRequest(UUID ID,RegularUser requesterUser, RegularUser targetUser, Status status) {
        this.ID = ID;
        this.requesterUser = requesterUser;
        this.targetUser = targetUser;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    // --- Getters & Setters ---
    public UUID getId() { return ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public RegularUser getRequesterUser() { return requesterUser; }
    public void setRequesterUser(RegularUser requesterUser) { this.requesterUser = requesterUser; }

    public RegularUser getTargetUser() { return targetUser; }
    public void setTargetUser(RegularUser targetUser) { this.targetUser = targetUser; }

    // --- Enum for status ---
    public enum Status {
        PENDING,
        ACCEPTED,
        DECLINED,
        CANCELED
    }
}
