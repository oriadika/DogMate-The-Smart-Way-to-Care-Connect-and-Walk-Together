package com.DogMate.Domain;

import jakarta.persistence.*;
import java.util.ArrayList;
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
    @CollectionTable(name = "dog_walker_city_offerings", joinColumns = @JoinColumn(name = "user_id"))
    private List<WalkerCityOffering> cityOfferings;
    
    @Column(name = "is_active")
    private Boolean isActive;

    protected DogWalkerUser() {
        this.cityOfferings = new ArrayList<>();
    }

    public DogWalkerUser(UUID id, String email, String passwordHash, String first_name, String last_name) {
        super(id, email, passwordHash);
        this.first_name = first_name;
        this.last_name = last_name;
        this.cityOfferings = new ArrayList<>();
        this.isActive = false;
    }

    public static void validateFirstName(String firstName) {
        if (firstName == null || firstName.trim().isEmpty()) {
            throw new IllegalArgumentException("First name cannot be null or empty");
        }
    }

    public static void validateLastName(String lastName) {
        if (lastName == null || lastName.trim().isEmpty()) {
            throw new IllegalArgumentException("Last name cannot be null or empty");
        }
    }

    /**
     * Factory for a new dog walker: validation, password hashing, UUID, empty offerings, inactive.
     */
    public static DogWalkerUser create(String email, String plainPassword,
                                       String firstName, String lastName,
                                       boolean emailExists,
                                       java.util.function.Function<String, String> passwordEncoder) {
        UserAccount.validateEmail(email);
        UserAccount.validatePassword(plainPassword);
        validateFirstName(firstName);
        validateLastName(lastName);
        UserAccount.validateEmailNotExists(emailExists, email);

        String passwordHash = passwordEncoder.apply(plainPassword);
        UUID userId = UUID.randomUUID();
        return new DogWalkerUser(userId, email, passwordHash, firstName, lastName);
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

    public List<WalkerCityOffering> getCityOfferings() {
        return cityOfferings;
    }

    public void setCityOfferings(List<WalkerCityOffering> cityOfferings) {
        this.cityOfferings = cityOfferings;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

}
