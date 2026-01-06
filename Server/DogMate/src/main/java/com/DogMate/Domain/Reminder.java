package com.DogMate.Domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedList;
import java.util.UUID;

@Entity
@Table(name = "reminders")
public class Reminder {

    @Id
    @Column(name = "id")
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private RegularUser regularUser;

    @OneToMany(mappedBy = "reminder", cascade = CascadeType.ALL, orphanRemoval = true)
    private LinkedList<Dog> dogs;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "remindAt")
    private LocalDateTime remindAt;

    public Reminder(RegularUser regularUser, LinkedList<Dog> dogs, String title, LocalDateTime remindAt, String description) {
        this.id = UUID.randomUUID();
        this.regularUser = regularUser;
        this.title = title;
        this.remindAt = remindAt;
        this.description = description;
        this.dogs = dogs;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public RegularUser getUser() {
        return regularUser;
    }

    public void setUser(RegularUser regularUser) {
        this.regularUser = regularUser;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDateTime getRemindAt() {
        return remindAt;
    }

    public void setRemindAt(LocalDateTime remindAt) {
        this.remindAt = remindAt;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }


    public LinkedList<Dog> getDogIds() {
        return dogs;
    }

    public void setDogIds(LinkedList<Dog> dogs) {
        this.dogs = dogs;
    }

    public void addDog(Dog dog){
        this.dogs.add(dog);
    }

    public void removeDog(Dog dog){
        this.dogs.remove(dog);
    }
}


