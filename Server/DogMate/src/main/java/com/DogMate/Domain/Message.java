package com.DogMate.Domain;

import java.time.LocalDateTime;
import java.util.UUID;

public class Message {
    private UUID ID;
    private String content;
    private LocalDateTime timestamp;
    private RegularUser senderUser;
    private RegularUser recieverUser;
    public Message(UUID ID, String content, RegularUser senderUser, RegularUser recieverUser){
        this.timestamp = LocalDateTime.now();
        this.ID = ID;
        this.content = content;
        this.senderUser = senderUser;
        this.recieverUser = recieverUser;
    }
}
