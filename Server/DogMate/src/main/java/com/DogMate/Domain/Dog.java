package com.DogMate.Domain;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "dogs")
public class Dog {
    @Id
    @Column(name = "id")
    private UUID ID;
    
    @Column(name = "name")
    private String name;
    
    @Column(name = "breed")
    private String breed;
    
    @Column(name = "birthdate")
    private LocalDate birthdate;
    
    @Column(name = "gender")
    private char gender; // M for male, F for Female
    
    @Column(name = "profile_image_url")
    private String profileImageURL;
    
    @OneToMany(mappedBy = "dog", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DogEvent> dogEvents;
    
    @OneToMany(mappedBy = "dog", orphanRemoval = true)
    private List<FoodStock> foodStocks;
    
    @OneToMany(mappedBy = "dog", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DogMoodLog> dogMoodLogs;
    
    @OneToMany(mappedBy = "dog", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DogDocument> dogDocuments;

    @OneToMany(mappedBy = "dog", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DogRelationship> dogRelationships;

    // Default constructor required by JPA
    protected Dog() {
        this.dogEvents = new LinkedList<>();
        this.foodStocks = new LinkedList<>();
        this.dogMoodLogs = new LinkedList<>();
        this.dogDocuments = new LinkedList<>();
        this.dogRelationships = new LinkedList<>();
    }

    public Dog(UUID ID, String name, String breed, LocalDate  birthdate, char gender,
               String profileImageURL){
        this.ID = ID;
        this.name = name;
        this.breed = breed;
        this.birthdate = birthdate;
        this.gender = gender;
        this.profileImageURL = profileImageURL;
        this.dogEvents = new LinkedList<>();
        this.foodStocks = new LinkedList<>();
        this.dogMoodLogs = new LinkedList<>();
        this.dogDocuments = new LinkedList<>();
        this.dogRelationships = new LinkedList<>();
    }

    public UUID getID() {
        return ID;
    }

    public void setID(UUID ID) {
        this.ID = ID;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBreed() {
        return breed;
    }

    public void setBreed(String breed) {
        this.breed = breed;
    }

    public LocalDate getBirthdate() {
        return birthdate;
    }

    public void setBirthdate(LocalDate birthdate) {
        this.birthdate = birthdate;
    }

    public char getGender() {
        return gender;
    }

    public void setGender(char gender) {
        this.gender = gender;
    }

    public String getProfileImageURL() {
        return profileImageURL;
    }

    public void setProfileImageURL(String profileImageURL) {
        this.profileImageURL = profileImageURL;
    }

    public List<DogEvent> getDogEvents(){
        return this.dogEvents;
    }

    public void addDogEvent(DogEvent dogEvent){
        this.dogEvents.add(dogEvent);
    }

    public void removeDogEvent(DogEvent dogEvent){
        this.dogEvents.remove(dogEvent);
    }

    public List<FoodStock> getFoodStocks(){
        return this.foodStocks;
    }

    public void addFoodStocks(FoodStock foodStock){
        this.foodStocks.add(foodStock);
    }

    public void removeFoodStock(FoodStock foodStock){
        this.foodStocks.remove(foodStock);
    }

    public List<DogMoodLog> getDogMoodLogs(){
        return this.dogMoodLogs;
    }

    public void addDogMoodLog(DogMoodLog dogMoodLog){
        this.dogMoodLogs.add(dogMoodLog);
    }

    public void removeDogMoodLog(DogMoodLog dogMoodLog){
        this.dogMoodLogs.remove(dogMoodLog);
    }

    public List<DogDocument> getDogDocuments(){
        return this.dogDocuments;
    }

    public void addDogDocuments(DogDocument dogDocument){
        this.dogDocuments.add(dogDocument);
    }

    public void removeDogDocuments(DogDocument dogDocument){
        this.dogDocuments.remove(dogDocument);
    }

}
