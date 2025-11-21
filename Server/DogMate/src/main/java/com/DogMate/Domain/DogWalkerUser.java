package com.DogMate.Domain;

import java.util.List;
import java.util.UUID;

public class DogWalkerUser extends UserAccount {
    private String first_name;
    private String last_name;
    private String profileImageURL;
    private List<String> cities;
    private List<String> availablityHours;
    private Boolean isActive;

    public DogWalkerUser(UUID id, String email, String passwordHash, String first_name, String last_name,
                         String profileImageURL, List<String> cities, List<String> availablityHours) {
        super(id, email, passwordHash);
        this.first_name = first_name;
        this.last_name = last_name;
        this.profileImageURL = profileImageURL;
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

    public String getProfileImageURL() {
        return profileImageURL;
    }

    public void setProfileImageURL(String profileImageURL) {
        this.profileImageURL = profileImageURL;
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
