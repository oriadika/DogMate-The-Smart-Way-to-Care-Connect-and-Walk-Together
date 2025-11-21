package com.DogMate.Domain;

import java.util.UUID;

public class DogProfile {
    private UUID ID;

    private BehaviorProfile behaviorProfile;
    private HealthProfile healthProfile;
    private Dog dog;

    public DogProfile(UUID ID, Dog dog, BehaviorProfile behaviorProfile, HealthProfile healthProfile){
        this.ID = ID;
        this.dog = dog;
        this.behaviorProfile = behaviorProfile;
        this.healthProfile = healthProfile;
    }


    public UUID getId() { return ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public BehaviorProfile getBehaviorProfile() { return behaviorProfile; }
    public void setBehaviorProfile(BehaviorProfile behaviorProfile) { this.behaviorProfile = behaviorProfile; }

    public HealthProfile getHealthProfile() { return healthProfile; }
    public void setHealthProfile(HealthProfile healthProfile) { this.healthProfile = healthProfile; }

    public Dog getDog() { return dog; }
    public void setDog(Dog dog) { this.dog = dog; }
}
