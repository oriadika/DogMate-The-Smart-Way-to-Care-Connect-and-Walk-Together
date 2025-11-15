package com.DogMate.Domain;

import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

public class RegularUser extends UserAccount{
    private String first_name;
    private String last_name;
    private String profileImageURL;
    private List<DogRelationship> dogRelationships;
    private List<Dog> dogs;
    private List<SniffRequest> sniffRequests;
    private List<EmergencyContact> emergencyContacts;
    private List<Notification> notifications;


    public RegularUser(UUID id, String email, String passwordHash, String first_name
    , String last_name, String profileImageURL) {
        super(id, email, passwordHash);
        this.first_name = first_name;
        this.last_name = last_name;
        this.profileImageURL = profileImageURL;
        this.dogRelationships = new LinkedList<>();
        this.dogs = new LinkedList<>();
        this.sniffRequests = new LinkedList<>();
        this.emergencyContacts = new LinkedList<>();
        this.notifications = new LinkedList<>();
    }

    public String getFirst_name() {
        return first_name;
    }

    public void setFirst_name(String first_name) {
        this.first_name = first_name;
    }

    public String getLast_name() {
        return last_name;
    }

    public void setLast_name(String last_name) {
        this.last_name = last_name;
    }

    public String getProfileImageURL() {
        return profileImageURL;
    }

    public void setProfileImageURL(String profileImageURL) {
        this.profileImageURL = profileImageURL;
    }

    public List<DogRelationship> getDogRelationships(){
        return dogRelationships;
    }

    public void addDogRelationship(DogRelationship dogRelationship){
        this.dogRelationships.add(dogRelationship);
    }

    public void removeDogRelationship(DogRelationship dogRelationship){
        this.dogRelationships.remove(dogRelationship);
    }

    public List<Dog> getDogs(){
        return dogs;
    }

    public void addDog(Dog dog){
        this.dogs.add(dog);
    }

    public void removeDog(Dog dog){
        this.dogs.remove(dog);
    }

    public List<SniffRequest> getSniffRequests(){
        return sniffRequests;
    }

    public void addSniffRequest(SniffRequest sniffRequest){
        this.sniffRequests.add(sniffRequest);
    }

    public void removeSniffRequest(SniffRequest sniffRequest){
        this.sniffRequests.remove(sniffRequest);
    }

    public List<EmergencyContact> getEmergencyContacts(){
        return emergencyContacts;
    }

    public void addEmergencyContact(EmergencyContact emergencyContact){
        this.emergencyContacts.add(emergencyContact);
    }

    public void removeEmergencyContact(EmergencyContact emergencyContact){
        this.emergencyContacts.remove(emergencyContact);
    }

    public List<Notification> getNotifications(){
        return notifications;
    }

    public void addNotification(Notification notification){
        this.notifications.add(notification);
    }

    public void removeNotification(Notification notification){
        this.notifications.remove(notification);
    }
}
