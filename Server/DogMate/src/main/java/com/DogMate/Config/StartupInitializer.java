package com.DogMate.Config;

import com.DogMate.Infrastructure.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Startup initializer that runs when the server starts.
 * Resets all users to logged out state and clears their locations.
 */
@Component
public class StartupInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(StartupInitializer.class);

    private final UserRepository userRepository;

    public StartupInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        logger.info("=== Server Startup: Resetting all users ===");
        
        // Reset all users: set loggedIn to false and clear locations
        int updatedCount = userRepository.resetAllUsersOnStartup();
        
        logger.info("Reset {} users - all logged out and locations cleared", updatedCount);
        logger.info("=== Server Startup initialization complete ===");
    }
}
