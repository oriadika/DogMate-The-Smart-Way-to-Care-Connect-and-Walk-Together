package com.DogMate.Domain;

import java.util.UUID;

public class DogRelationship {
    private UUID ID;
    private String role;
    private RegularUser regularUser;

    public DogRelationship(UUID ID, String role, RegularUser regularUser){
        this.ID = ID;
        this.role = role;
        this.regularUser = regularUser;
    }

    public UUID getID(){
        return ID;
    }

    public void setId(UUID ID){
        this.ID = ID;
    }

    public String getRole(){
        return role;
    }

    public void setRole(String role){
        this.role = role;
    }

    public RegularUser getRegularUser(){
        return regularUser;
    }

    public void setRegularUser(RegularUser regularUser){
        this.regularUser = regularUser;
    }
}
