package Main.Domain;

import java.util.UUID;

public class DogProfile {
    private UUID ID;

    private String behaviorProfile;
    private String healthProfile;
    private Dog dog;


    // --- Getters and Setters ---
    public UUID getId() { return ID; }
    public void setId(UUID id) { this.ID = ID; }

    public String getBehaviorProfile() { return behaviorProfile; }
    public void setBehaviorProfile(String behaviorProfile) { this.behaviorProfile = behaviorProfile; }

    public String getHealthProfile() { return healthProfile; }
    public void setHealthProfile(String healthProfile) { this.healthProfile = healthProfile; }

    public Dog getDog() { return dog; }
    public void setDog(Dog dog) { this.dog = dog; }
}
