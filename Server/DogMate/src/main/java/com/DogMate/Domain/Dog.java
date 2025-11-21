package com.DogMate.Domain;

import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

public class Dog {
    private UUID ID;
    private String name;
    private String breed;
    private Date birthdate;
    private char gender; // M for male, F for Female
    private String profileImageURL;
    private List<DogEvent> dogEvents;
    private List<FoodStock> foodStocks;
    private List<DogMoodLog> dogMoodLogs;
    private List<DogDocument> dogDocuments;
    private RegularUser regularUser;

    public Dog(UUID ID, String name, String breed, Date birthdate, char gender,
               String profileImageURL, RegularUser regularUser){
        this.ID = ID;
        this.name = name;
        this.breed = breed;
        this.birthdate = birthdate;
        this.gender = gender;
        this.profileImageURL = profileImageURL;
        this.regularUser = regularUser;
        this.dogEvents = new LinkedList<>();
        this.foodStocks = new LinkedList<>();
        this.dogMoodLogs = new LinkedList<>();
        this.dogDocuments = new LinkedList<>();
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

    public Date getBirthdate() {
        return birthdate;
    }

    public void setBirthdate(Date birthdate) {
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

    public RegularUser getRegularUser(){
        return regularUser;
    }

    public void setRegularUser(RegularUser regularUser){
        this.regularUser = regularUser;
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
