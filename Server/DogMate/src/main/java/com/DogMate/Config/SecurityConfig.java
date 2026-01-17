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
            .csrf(csrf -> csrf.disable()) // Disable CSRF for API
            .authorizeHttpRequests(auth -> auth
                // Allow public access to all API endpoints (no authentication required)
                .requestMatchers("/", "/api/**", "/h2-console/**", "/ws-ping", "/ws-ping/**").permitAll()
                // Require authentication for all other endpoints
                .anyRequest().authenticated()
            )
            // Allow H2 console frames
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
        
        return http.build();
    }
}
