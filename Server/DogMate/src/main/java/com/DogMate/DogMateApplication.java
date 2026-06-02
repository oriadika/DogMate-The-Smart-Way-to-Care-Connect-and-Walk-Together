package com.DogMate;

import com.DogMate.Service.SessionCleanupService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.Bean;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.File;

@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
public class DogMateApplication {

	@Autowired(required = false)
	private SessionCleanupService sessionCleanupService;

	public static void main(String[] args) {
		// Ensure data directory exists before starting Spring
		ensureDataDirectoryExists();
		SpringApplication.run(DogMateApplication.class, args);
	}

	/**
	 * Clear all user sessions on application startup.
	 * This ensures stale sessions are cleared when the server restarts.
	 */
	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady() {
		if (sessionCleanupService != null) {
			System.out.println("DogMateApplication: Clearing stale sessions on startup...");
			sessionCleanupService.logoutAllUsers();
		}
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	/**
	 * Ensures the data directory exists for H2 database
	 * This makes the application portable across different machines
	 */
	private static void ensureDataDirectoryExists() {
		File dataDir = new File("./data");
		if (!dataDir.exists()) {
			boolean created = dataDir.mkdirs();
			if (created) {
				System.out.println("Created data directory: " + dataDir.getAbsolutePath());
			} else {
				System.err.println("Warning: Could not create data directory: " + dataDir.getAbsolutePath());
			}
		}
	}

}
