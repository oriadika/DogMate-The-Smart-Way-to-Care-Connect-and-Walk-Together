package com.DogMate.Domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reminders")
public class Reminder {

    @Id
    @Column(name = "id")
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private RegularUser regularUser;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "remind_at", nullable = false)
    private LocalDateTime remindAt;

    @Column(name = "sent", nullable = false)
    private boolean sent;


    public Reminder(RegularUser regularUser, String title, LocalDateTime remindAt) {
        this.id = UUID.randomUUID();
        this.regularUser = regularUser;
        this.title = title;
        this.remindAt = remindAt;
        this.sent = false;
    }

    // getters/setters...
}


