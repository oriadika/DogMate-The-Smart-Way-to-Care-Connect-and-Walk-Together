package com.DogMate.Domain;

import jakarta.persistence.*;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

import org.apache.catalina.User;

@Entity
@Table(name = "regular_users")
@PrimaryKeyJoinColumn(name = "id")
public class RegularUser extends UserAccount{
    @Column(name = "first_name")
    private String first_name;
    
    @Column(name = "last_name")
    private String last_name;
    
    @Column(name = "latitude")
    private Double latitude;
    
    @Column(name = "longitude")
    private Double longitude;
    
    @OneToMany(mappedBy = "regularUser", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DogRelationship> dogRelationships;

    @OneToMany(mappedBy = "regularUser", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Reminder> reminders;
    
    @Transient
    private List<SniffRequest> sniffRequests;
    
    @Transient
    private List<EmergencyContact> emergencyContacts;
    
    @Transient
    private List<Notification> notifications;

    // Default constructor required by JPA
    protected RegularUser() {
        // JPA requires a no-args constructor
        // Initialize collections to avoid NullPointerException
        this.dogRelationships = new LinkedList<>();
        this.sniffRequests = new LinkedList<>();
        this.emergencyContacts = new LinkedList<>();
        this.notifications = new LinkedList<>();
    }

    public RegularUser(UUID id, String email, String passwordHash, String first_name
    , String last_name) {
        super(id, email, passwordHash);
        this.first_name = first_name;
        this.last_name = last_name;
        this.dogRelationships = new LinkedList<>();
        this.sniffRequests = new LinkedList<>();
        this.emergencyContacts = new LinkedList<>();
        this.notifications = new LinkedList<>();
    }

    /**
     * Validate first name field
     * @param firstName The first name to validate
     * @throws IllegalArgumentException if first name is null or empty
     */
    public static void validateFirstName(String firstName) {
        if (firstName == null || firstName.trim().isEmpty()) {
            throw new IllegalArgumentException("חובה להזין שם פרטי");
        }
    }

    /**
     * Validate last name field
     * @param lastName The last name to validate
     * @throws IllegalArgumentException if last name is null or empty
     */
    public static void validateLastName(String lastName) {
        if (lastName == null || lastName.trim().isEmpty()) {
            throw new IllegalArgumentException("חובה להזין שם משפחה");
        }
    }
    
    /**
     * Change password for this user (business logic)
     * @param newPlainPassword The new plain text password
     * @param passwordEncoder Password encoder for hashing
     * @throws IllegalArgumentException if password is invalid
     */
    public void changePassword(String newPlainPassword, java.util.function.Function<String, String> passwordEncoder) {
        UserAccount.validatePassword(newPlainPassword);
        String passwordHash = passwordEncoder.apply(newPlainPassword);
        this.setPasswordHash(passwordHash);
    }

    /**
     * Factory method to create a new RegularUser with validation and password hashing
     * Contains all business logic for user creation
     * @param email User's email address
     * @param plainPassword Plain text password (will be validated and hashed)
     * @param firstName User's first name
     * @param lastName User's last name
     * @param emailExists true if email already exists, false otherwise
     * @param passwordEncoder Password encoder for hashing (infrastructure dependency)
     * @return A new RegularUser instance
     * @throws IllegalArgumentException if validation fails or email already exists
     */
    public static RegularUser create(String email, String plainPassword, 
                                     String firstName, String lastName, 
                                     boolean emailExists,
                                     java.util.function.Function<String, String> passwordEncoder) {
        // Validate all fields (business logic)
        UserAccount.validateEmail(email);
        UserAccount.validatePassword(plainPassword);
        validateFirstName(firstName);
        validateLastName(lastName);
        
        // Validate email doesn't exist (business logic)
        UserAccount.validateEmailNotExists(emailExists, email);

        // Hash the password (infrastructure concern, but done in domain for encapsulation)
        String passwordHash = passwordEncoder.apply(plainPassword);

        // Generate UUID for new user
        UUID userId = UUID.randomUUID();

        // Create and return new RegularUser
        return new RegularUser(userId, email, passwordHash, firstName, lastName);
    }
    
    /**
     * Factory method to create a new RegularUser with already hashed password
     * Used when password is already hashed (e.g., from database)
     * @param email User's email address
     * @param passwordHash Already hashed password
     * @param firstName User's first name
     * @param lastName User's last name
     * @param profileImageUrl Optional profile image URL
     * @return A new RegularUser instance
     * @throws IllegalArgumentException if validation fails
     */
    public static RegularUser createWithHashedPassword(String email, String passwordHash, 
                                                        String firstName, String lastName, 
                                                        String profileImageUrl) {
        // Validate all fields
        UserAccount.validateEmail(email);
        validateFirstName(firstName);
        validateLastName(lastName);

        // Generate UUID for new user
        UUID userId = UUID.randomUUID();


        // Create and return new RegularUser
        return new RegularUser(userId, email, passwordHash, firstName, lastName);
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

    public List<DogRelationship> getDogRelationships(){
        return dogRelationships;
    }

    public void addDogRelationship(DogRelationship dogRelationship){
        this.dogRelationships.add(dogRelationship);
    }

    public void removeDogRelationship(DogRelationship dogRelationship){
        this.dogRelationships.remove(dogRelationship);
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

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
}
