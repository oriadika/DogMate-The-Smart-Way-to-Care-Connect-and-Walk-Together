package com.DogMate.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for API (can enable later if needed)
            .authorizeHttpRequests(auth -> auth
                // Allow public access to root, registration, login endpoints, H2 console, WebSocket, dogs, and get logged users
                .requestMatchers("/", "/api/auth/**", "/api/users/**", "/api/dogs/**", "/h2-console/**", "/ws-ping", "/ws-ping/**").permitAll()
                // Require authentication for all other endpoints
                .anyRequest().authenticated()
            )
            // Allow H2 console frames (needed for H2 console to work)
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
        
        return http.build();
    }
}
