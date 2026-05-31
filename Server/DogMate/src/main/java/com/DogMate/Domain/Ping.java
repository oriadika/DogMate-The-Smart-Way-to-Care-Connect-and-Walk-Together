package com.DogMate.Domain;

import java.time.LocalDateTime;
import java.util.UUID;

public class Ping {
    private String id;
    private String fromUserId;
    private String fromUserName;
    private String toUserId;
    private String dogName;
    private String dogBreed;
    private String dogAgeLabel;
    private String dogImageUrl;
    private LocalDateTime createdAt;
    private boolean read;

    // Default constructor
    public Ping() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
        this.read = false;
    }

    public Ping(String fromUserId, String fromUserName, String toUserId) {
        this.id = UUID.randomUUID().toString();
        this.fromUserId = fromUserId;
        this.fromUserName = fromUserName;
        this.toUserId = toUserId;
        this.createdAt = LocalDateTime.now();
        this.read = false;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFromUserId() {
        return fromUserId;
    }

    public void setFromUserId(String fromUserId) {
        this.fromUserId = fromUserId;
    }

    public String getFromUserName() {
        return fromUserName;
    }

    public void setFromUserName(String fromUserName) {
        this.fromUserName = fromUserName;
    }

    public String getToUserId() {
        return toUserId;
    }

    public void setToUserId(String toUserId) {
        this.toUserId = toUserId;
    }

    public String getDogName() {
        return dogName;
    }

    public void setDogName(String dogName) {
        this.dogName = dogName;
    }

    public String getDogBreed() {
        return dogBreed;
    }

    public void setDogBreed(String dogBreed) {
        this.dogBreed = dogBreed;
    }

    public String getDogAgeLabel() {
        return dogAgeLabel;
    }

    public void setDogAgeLabel(String dogAgeLabel) {
        this.dogAgeLabel = dogAgeLabel;
    }

    public String getDogImageUrl() {
        return dogImageUrl;
    }

    public void setDogImageUrl(String dogImageUrl) {
        this.dogImageUrl = dogImageUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }
}

