package com.DogMate.Domain;

import jakarta.persistence.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "dog_walker_users")
@PrimaryKeyJoinColumn(name = "id")
public class DogWalkerUser extends UserAccount {
    @Column(name = "first_name")
    private String first_name;
    
    @Column(name = "last_name")
    private String last_name;
    
    @ElementCollection
    @CollectionTable(name = "dog_walker_cities", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "city")
    private List<String> cities;
    
    @ElementCollection
    @CollectionTable(name = "dog_walker_availability_hours", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "hour")
    private List<String> availablityHours;
    
    @Column(name = "is_active")
    private Boolean isActive;

    // Default constructor required by JPA
    protected DogWalkerUser() {
        // JPA requires a no-args constructor
    }

    public DogWalkerUser(UUID id, String email, String passwordHash, String first_name, String last_name,
                         String profileImageURL, List<String> cities, List<String> availablityHours) {
        super(id, email, passwordHash);
        this.first_name = first_name;
        this.last_name = last_name;
        this.cities = cities;
        this.availablityHours = availablityHours;
        this.isActive = false;
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

    public List<String> getCities() {
        return cities;
    }

    public void setCities(List<String> cities) {
        this.cities = cities;
    }

    public List<String> getAvailablityHours() {
        return availablityHours;
    }

    public void setAvailablityHours(List<String> availablityHours) {
        this.availablityHours = availablityHours;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

}
