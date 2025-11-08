package Main.Domain;

import java.util.List;
import java.util.UUID;

public class HealthProfile {
    private UUID ID;

    private List<String> allergies;

    private List<String> medications;

    private DogProfile dogProfile;

    public HealthProfile(UUID ID,List<String> allergies, List<String> medications) {
        this.ID = ID;
        this.allergies = allergies;
        this.medications = medications;
    }

    public UUID getId() { return ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public List<String> getAllergies() { return allergies; }
    public void setAllergies(List<String> allergies) { this.allergies = allergies; }

    public List<String> getMedications() { return medications; }
    public void setMedications(List<String> medications) { this.medications = medications; }

    public DogProfile getDogProfile() { return dogProfile; }
    public void setDogProfile(DogProfile dogProfile) { this.dogProfile = dogProfile; }


}
