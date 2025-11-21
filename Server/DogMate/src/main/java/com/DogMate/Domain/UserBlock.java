package com.DogMate.Domain;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserBlock {
    private UUID blockerUserId;
    private UUID blockedUserId;
    private LocalDateTime timestamp;
    public UserBlock(UUID blockerUserId, UUID blockedUserId){
        this.blockedUserId = blockedUserId;
        this.blockerUserId = blockerUserId;
        this.timestamp = LocalDateTime.now();
    }
}
