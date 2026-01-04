package com.DogMate.Domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "dog_relationships")
public class DogRelationship {
    @Id
    @Column(name = "id")
    private UUID id;
    
    @ManyToOne
    @JoinColumn(name = "regular_user_id", nullable = false)
    private RegularUser regularUser;
    
    @ManyToOne
    @JoinColumn(name = "dog_id", nullable = false)
    private Dog dog;
    
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private RelationshipType role;

    // Default constructor required by JPA
    protected DogRelationship() {
    }

    public DogRelationship(RegularUser regularUser, Dog dog, RelationshipType role){
        this.id = UUID.randomUUID();
        this.regularUser = regularUser;
        this.dog = dog;
        this.role = role;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public RegularUser getRegularUser() {
        return regularUser;
    }

    public void setRegularUser(RegularUser regularUser) {
        this.regularUser = regularUser;
    }

    public Dog getDog() {
        return dog;
    }

    public void setDog(Dog dog) {
        this.dog = dog;
    }

    public UUID getUserID(){
        return regularUser != null ? regularUser.getId() : null;
    }

    public void setUserId(UUID ID){
        // For backwards compatibility - would need the regularUser object
        // It's better to use setRegularUser instead
    }

    public UUID getDogID(){
        return dog != null ? dog.getID() : null;
    }

    public void setDogID(UUID ID){
        // For backwards compatibility - would need the dog object
        // It's better to use setDog instead
    }

    public String getRelationshipString(){
        return role.toString();
    }

    public void setRole(RelationshipType role){
        this.role = role;
    }
}
