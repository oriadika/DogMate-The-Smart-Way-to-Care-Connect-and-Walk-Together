package Main.Domain;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserAccount {
    private UUID ID;
    private String email;
    private String passwordHash;
    private LocalDateTime createdAt;


    public UserAccount(UUID ID, String email, String passwordHash) {
        this.ID = ID;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() {
        return ID;
    }

    public void setId(UUID ID) {
        this.ID = ID;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

}
