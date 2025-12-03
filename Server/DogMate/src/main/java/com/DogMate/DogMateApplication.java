package com.DogMate;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;

@SpringBootApplication
public class DogMateApplication {

	public static void main(String[] args) {
		// Ensure data directory exists before starting Spring
		ensureDataDirectoryExists();
		SpringApplication.run(DogMateApplication.class, args);
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
