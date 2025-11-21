package com.DogMate.Domain;

import java.util.UUID;

public class BehaviorProfile {
    private UUID id;

    private String notes;

    private EnergyLevel energyLevel;

    private Friendliness friendliness;


    public BehaviorProfile(String notes, EnergyLevel energyLevel, Friendliness friendliness) {
        this.notes = notes;
        this.energyLevel = energyLevel;
        this.friendliness = friendliness;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public EnergyLevel getEnergyLevel() { return energyLevel; }
    public void setEnergyLevel(EnergyLevel energyLevel) { this.energyLevel = energyLevel; }

    public Friendliness getFriendliness() { return friendliness; }
    public void setFriendliness(Friendliness friendliness) { this.friendliness = friendliness; }

    // --- Enums ---
    public enum EnergyLevel {
        LOW, MEDIUM, HIGH
    }

    public enum Friendliness {
        LOW, MEDIUM, HIGH
    }
}
