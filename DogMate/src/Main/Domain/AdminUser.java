package Main.Domain;

import java.util.UUID;

public class AdminUser extends UserAccount{
    private String permissionLevel;

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
