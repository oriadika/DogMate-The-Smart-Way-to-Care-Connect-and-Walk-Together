package com.DogMate.Domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "admin_users")
@PrimaryKeyJoinColumn(name = "id")
public class AdminUser extends UserAccount{
    @Column(name = "permission_level")
    private String permissionLevel;

    // Default constructor required by JPA
    protected AdminUser() {
        // JPA requires a no-args constructor
    }

    public AdminUser(UUID id, String email, String passwordHash, String permissionLevel){
        super(id, email, passwordHash);
        this.permissionLevel = permissionLevel;
    }
    public String getPermissionLevel(){
        return this.permissionLevel;
    }
    public void setPermissionLevel(String permissionLevel){
        this.permissionLevel = permissionLevel;
    }
}
