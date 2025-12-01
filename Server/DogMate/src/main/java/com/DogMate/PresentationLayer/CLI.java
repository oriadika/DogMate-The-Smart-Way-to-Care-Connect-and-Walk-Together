package com.DogMate.PresentationLayer;

import com.DogMate.Domain.RegularUser;
import com.DogMate.Service.UserService;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.Scanner;
import java.util.UUID;

public class CLI {
    // Creating a private static variable prevents the option to create multiple scanner type variables
    private static Scanner scanner = new Scanner(System.in);
    // Singleton of Service Controller.
    public static UserService userService;
    private static ConfigurableApplicationContext ctx;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Initialize CLI with Spring context (called once from Main)
     */
    public static void initialize(ConfigurableApplicationContext applicationContext) {
        ctx = applicationContext;
        userService = ctx.getBean(UserService.class);
    }
    
    /**
     * Start the Users Menu
     */
    public static void start() {
        try {
            if (ctx == null || userService == null) {
                System.out.println("Error: CLI not initialized. Please restart the application.");
                return;
            }
            
            System.out.println("Welcome to DogMate Users CLI!\n");
            main();
        } catch (Exception e) {
            System.out.println("Error starting Users Menu: " + e.getMessage());
            e.printStackTrace();
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /*  Mains */
    public static void main() {
        boolean exitProgram = false;
        System.out.println("Login was successful !\n");
        
        System.out.println("What would you like to accomplish today?");
        while (!exitProgram) {
            System.out.println("_________________________________________________");
            System.out.println("1. Add a new user.");
            System.out.println("2. Edit user password.");
            System.out.println("3. Delete a user.");
            System.out.println("4. Exit From Users Menu.");
            System.out.println("_________________________________________________");
            System.out.print("Please enter the number of your choice here: ");
            
            try {
                int choice = scanner.nextInt();
                scanner.nextLine(); // Consume newline
                System.out.println();

                switch (choice) {
                    case 1:
                        addUser();
                        System.out.println("\nIs there anything else you would like to accomplish?");
                        break;
                    case 2:
                        editPassword();
                        System.out.println("\nIs there anything else you would like to accomplish?");
                        break;
                    case 3:
                        deleteUser();
                        System.out.println("\nIs there anything else you would like to accomplish?");
                        break;
                    case 4:
                        exitProgram = true;
                        System.out.println("\n\n~You have chosen to exit from the Users menu~\n");
                        break;
                    default:
                        System.out.println("\n\nOops... It seems like you entered an invalid choice number.");
                        System.out.println("Let's try again.");
                        break;
                }
            } catch (Exception e) {
                System.out.println("\n\nInvalid input. Please enter a number.");
                scanner.nextLine(); // Clear invalid input
            }
        }
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Users Methods */
    public static void addUser() {
        try {
            System.out.print("Enter Username (email): ");
            String username = scanner.nextLine();
            
            System.out.print("Enter Password: ");
            String password = scanner.nextLine();
            
            String permission = choosePermission();
            
            if ("Admin".equals(permission)) {
                com.DogMate.Domain.AdminUser adminUser = userService.createAdminUser(username, password, permission);
                System.out.println("\n✓ Admin user created successfully!");
                System.out.println("  ID: " + adminUser.getId());
                System.out.println("  Email: " + adminUser.getEmail());
                System.out.println("  Permission Level: " + adminUser.getPermissionLevel());
            } else {
                // For regular users, we need first name and last name
                System.out.print("Enter the user's first name: ");
                String firstName = scanner.nextLine();
                
                System.out.print("Enter the user's last name: ");
                String lastName = scanner.nextLine();
                
                System.out.print("Enter the user's profile image URL (optional, press Enter to skip): ");
                String profileImageUrl = scanner.nextLine();
                if (profileImageUrl.trim().isEmpty()) {
                    profileImageUrl = null;
                }
                
                RegularUser user = userService.registerUser(username, password, firstName, lastName, profileImageUrl);
                System.out.println("\n✓ User created successfully!");
                System.out.println("  ID: " + user.getId());
                System.out.println("  Email: " + user.getEmail());
                System.out.println("  Name: " + user.getFirst_name() + " " + user.getLast_name());
            }
        } catch (IllegalArgumentException e) {
            System.out.println("\n✗ Error: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("\n✗ Unexpected error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public static void editPassword() {
        try {
            System.out.print("Enter Username (email): ");
            String username = scanner.nextLine();
            
            System.out.print("Enter new Password: ");
            String password = scanner.nextLine();
            
            userService.editPassword(username, password);
            
            System.out.println("\n✓ Password updated successfully!");
            System.out.println("  Email: " + username);
        } catch (IllegalArgumentException e) {
            System.out.println("\n✗ Error: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("\n✗ Unexpected error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public static void deleteUser() {
        try {
            System.out.print("Enter Username (email): ");
            String username = scanner.nextLine();
            
            userService.deleteUserByEmail(username);
            
            System.out.println("\n✓ User deleted successfully!");
            System.out.println("  Email: " + username);
        } catch (IllegalArgumentException e) {
            System.out.println("\n✗ Error: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("\n✗ Unexpected error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public static String choosePermission() {
        System.out.println("Please select the desired permission for the new user:");
        while (true) {
            System.out.println("1. User permission");
            System.out.println("2. Admin permission");
            System.out.print("Please enter the number of your choice here: ");
            
            try {
                int choice = scanner.nextInt();
                scanner.nextLine(); // Consume newline
                
                switch (choice) {
                    case 1:
                        return "User";
                    case 2:
                        return "Admin";
                    default:
                        System.out.println("\n\nOops... It seems like you entered an invalid choice number.");
                        System.out.println("Let's try again.");
                        break;
                }
            } catch (Exception e) {
                System.out.println("\n\nInvalid input. Please enter a number.");
                scanner.nextLine(); // Clear invalid input
            }
        }
    }

    public static void exitData() {
        try {
            if (ctx != null) {
                ctx.close();
            }
        } catch (Exception e) {
            System.out.println("Error exiting data: " + e.getMessage());
        }
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
}
