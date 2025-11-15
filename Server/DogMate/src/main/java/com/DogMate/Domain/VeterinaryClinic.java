package com.DogMate.Domain;

import javax.xml.stream.Location;
import java.util.UUID;

public class VeterinaryClinic {
    private UUID ID;
    private String name;
    private Location location;
    private OpeningHours openingHours;
    private String phoneNumber;
    public VeterinaryClinic(UUID ID, String name, Location location, OpeningHours openingHours, String phoneNumber){
        this.ID =ID;
        this.name = name;
        this.location = location;
        this.openingHours = openingHours;
        this.phoneNumber = phoneNumber;
    }
}


