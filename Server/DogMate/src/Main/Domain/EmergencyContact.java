package Main.Domain;

import java.util.UUID;

public class EmergencyContact {
    private UUID ID;

    private String contactName;

    private String phoneNumber;

    private ContactType contactType; // VET, CAREGIVER, FAMILY

    private RegularUser regularUser;


    public EmergencyContact(String contactName, String phoneNumber, ContactType contactType) {
        this.contactName = contactName;
        this.phoneNumber = phoneNumber;
        this.contactType = contactType;
    }

    public UUID getId() { return ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public ContactType getContactType() { return contactType; }
    public void setContactType(ContactType contactType) { this.contactType = contactType; }

    public RegularUser getRegularUser(){
        return regularUser;
    }

    public void setRegularUser(RegularUser regularUser){
        this.regularUser = regularUser;
    }

    // --- Enum for contact type ---
    public enum ContactType {
        VET,
        CAREGIVER,
        FAMILY
    }
}
