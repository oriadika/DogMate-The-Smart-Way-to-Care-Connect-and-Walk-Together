package com.DogMate.Domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "walk_requests")
public class WalkRequest {

    @Id
    @Column(name = "id")
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "walker_id", nullable = false)
    private DogWalkerUser walker;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private RegularUser owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dog_id")
    private Dog dog;

    @Column(name = "scheduled_start", nullable = false)
    private Instant scheduledStart;

    @Column(name = "scheduled_end", nullable = false)
    private Instant scheduledEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private WalkRequestStatus status;

    @Column(name = "charged", nullable = false)
    private boolean charged;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "notes", length = 2000)
    private String notes;

    protected WalkRequest() {
    }

    public WalkRequest(
            UUID id,
            DogWalkerUser walker,
            RegularUser owner,
            Dog dog,
            Instant scheduledStart,
            Instant scheduledEnd,
            WalkRequestStatus status,
            boolean charged,
            Instant createdAt,
            String notes) {
        this.id = id;
        this.walker = walker;
        this.owner = owner;
        this.dog = dog;
        this.scheduledStart = scheduledStart;
        this.scheduledEnd = scheduledEnd;
        this.status = status;
        this.charged = charged;
        this.createdAt = createdAt;
        this.notes = notes;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public DogWalkerUser getWalker() {
        return walker;
    }

    public void setWalker(DogWalkerUser walker) {
        this.walker = walker;
    }

    public RegularUser getOwner() {
        return owner;
    }

    public void setOwner(RegularUser owner) {
        this.owner = owner;
    }

    public Dog getDog() {
        return dog;
    }

    public void setDog(Dog dog) {
        this.dog = dog;
    }

    public Instant getScheduledStart() {
        return scheduledStart;
    }

    public void setScheduledStart(Instant scheduledStart) {
        this.scheduledStart = scheduledStart;
    }

    public Instant getScheduledEnd() {
        return scheduledEnd;
    }

    public void setScheduledEnd(Instant scheduledEnd) {
        this.scheduledEnd = scheduledEnd;
    }

    public WalkRequestStatus getStatus() {
        return status;
    }

    public void setStatus(WalkRequestStatus status) {
        this.status = status;
    }

    public boolean isCharged() {
        return charged;
    }

    public void setCharged(boolean charged) {
        this.charged = charged;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
