package com.DogMate.Main;

import com.DogMate.PresentationLayer.CLI;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import java.util.Scanner;

public class Main {
    private static ConfigurableApplicationContext ctx;
    
    public static void main(String[] args) {
        // Initialize Spring context once at startup
        try {
            System.out.println("Initializing Spring context...");
            System.out.flush();
            
            // Create Spring application
            SpringApplication app = new SpringApplication(com.DogMate.DogMateApplication.class);
            app.setWebApplicationType(org.springframework.boot.WebApplicationType.NONE);
            app.setLazyInitialization(true);
            app.setRegisterShutdownHook(false);
            
            // Run Spring application (this may take a moment)
            ctx = app.run(new String[0]);
            
            // Check if context was created successfully
            if (ctx == null) {
                System.err.println("ERROR: Spring context is null!");
                System.err.flush();
                return;
            }
            
            System.out.println("Spring context initialized successfully!");
            System.out.println("Context is active: " + ctx.isActive());
            System.out.flush();
            
            // Initialize CLI with the context
            CLI.initialize(ctx);
            System.out.println("CLI initialized successfully!");
            System.out.flush();
        } catch (Exception e) {
            System.err.println("Error initializing Spring context: " + e.getMessage());
            e.printStackTrace();
            System.err.println("Exiting due to Spring initialization error...");
            System.err.flush();
            return;
        }
        
        System.out.println("DEBUG: Reached after Spring initialization");
        System.out.flush();
        
        System.out.println("\n\n");
        System.out.flush();
        System.out.println("██████╗   ██████╗   ██████╗  ███╗   ███╗  █████╗ ████████╗ ███████╗");
        System.out.println("██╔══██╗ ██╔═══██╗ ██╔════╝  ████╗ ████║ ██╔══██╗╚══██╔══╝ ██╔════╝");
        System.out.println("██║  ██║ ██║   ██║ ██║  ███╗ ██╔████╔██║ ███████║   ██║    █████╗  ");
        System.out.println("██║  ██║ ██║   ██║ ██║   ██║ ██║╚██╔╝██║ ██╔══██║   ██║    ██╔══╝  ");
        System.out.println("██████╔╝ ╚██████╔╝ ╚██████╔╝ ██║ ╚═╝ ██║ ██║  ██║   ██║    ███████╗");
        System.out.println("╚═════╝   ╚═════╝   ╚═════╝  ╚═╝     ╚═╝ ╚═╝  ╚═╝   ╚═╝    ╚══════╝");
        System.out.println("\n\n");
        System.out.flush();
        
        System.out.println("DEBUG: About to start main menu loop");
        System.out.flush();
        
        Scanner scanner = new Scanner(System.in);
        boolean exitProgram = false;
        
        while (!exitProgram) {
            System.out.println("_________________________________________________");
            System.out.println("1. Users Menu.");
            System.out.println("2. Dogs Menu. (TODO)");
            System.out.println("3. Walks Menu. (TODO)");
            System.out.println("4. Exit From The System.");
            System.out.println("_________________________________________________");
            System.out.print("Please enter the number of your choice here: ");
            
            try {
                int choice = scanner.nextInt();
                scanner.nextLine(); // Consume newline
                System.out.println();
                
                switch (choice) {
                    case 1:
                        startUsersMenu();
                        System.out.println("\nIs there anything else you would like to accomplish?");
                        break;
                    case 2:
                        System.out.println("TODO: Dogs menu not yet implemented");
                        break;
                    case 3:
                        System.out.println("TODO: Walks menu not yet implemented");
                        break;
                    case 4:
                        exitProgram = true;
                        System.out.println("It was a pleasure working with you today.\nHave a nice day!");
                        exitData();
                        if (ctx != null) {
                            // Close datasource explicitly to ensure database file is written
                            try {
                                javax.sql.DataSource dataSource = ctx.getBean(javax.sql.DataSource.class);
                                if (dataSource instanceof com.zaxxer.hikari.HikariDataSource) {
                                    ((com.zaxxer.hikari.HikariDataSource) dataSource).close();
                                }
                            } catch (Exception e) {
                                // Ignore if datasource is already closed
                            }
                            ctx.close();
                        }
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
    
    public static void startUsersMenu() {
        try {
            CLI.start();
        } catch (Exception e) {
            System.out.println("Error starting Users Menu: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public static void exitData() {
        try {
            CLI.exitData();
        } catch (Exception e) {
            System.out.println("Error exiting data: " + e.getMessage());
        }
    }
}
