package com.DogMate.Domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "dog_walker_ratings",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_dog_walker_rating_owner_walker",
                columnNames = {"walker_id", "owner_id"}
        )
)
public class DogWalkerRating {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "walker_id", nullable = false)
    private UUID walkerId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "stars", nullable = false)
    private Integer stars;

    @Column(name = "comment", nullable = false, length = 1000)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected DogWalkerRating() {
    }

    public DogWalkerRating(UUID id, UUID walkerId, UUID ownerId, Integer stars, String comment) {
        this.id = id;
        this.walkerId = walkerId;
        this.ownerId = ownerId;
        this.stars = stars;
        this.comment = comment != null ? comment : "";
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (comment == null) {
            comment = "";
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getWalkerId() {
        return walkerId;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public Integer getStars() {
        return stars;
    }

    public String getComment() {
        return comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
