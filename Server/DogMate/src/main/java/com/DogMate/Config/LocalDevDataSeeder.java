package com.DogMate.Config;

import com.DogMate.Infrastructure.UserRepository;
import com.DogMate.Service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Seeds a local dev user when Docker Postgres starts empty.
 * Set credentials via env (see Server/DogMate/.env.example) before ./mvnw spring-boot:run.
 */
@Component
@Order(100)
@ConditionalOnProperty(name = "dogmate.local.seed.enabled", havingValue = "true")
public class LocalDevDataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(LocalDevDataSeeder.class);

    private final UserRepository userRepository;
    private final UserService userService;

    @Value("${dogmate.local.seed.email:dev@dogmate.local}")
    private String seedEmail;

    @Value("${dogmate.local.seed.password:Dogmate123!}")
    private String seedPassword;

    @Value("${dogmate.local.seed.first-name:Dev}")
    private String seedFirstName;

    @Value("${dogmate.local.seed.last-name:User}")
    private String seedLastName;

    public LocalDevDataSeeder(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            logger.info("Local dev seed skipped — database already has {} user(s)", userRepository.count());
            return;
        }

        String email = seedEmail == null ? "" : seedEmail.trim();
        if (email.isEmpty()) {
            logger.warn("Local dev seed skipped — dogmate.local.seed.email is empty");
            return;
        }

        userService.registerUser(
            email,
            seedPassword,
            seedFirstName,
            seedLastName
        );

        logger.info("=== Local dev user created ===");
        logger.info("Email: {}", email);
        logger.info("Use this account to log in from Expo (local Docker DB is separate from Supabase/EC2).");
    }
}
