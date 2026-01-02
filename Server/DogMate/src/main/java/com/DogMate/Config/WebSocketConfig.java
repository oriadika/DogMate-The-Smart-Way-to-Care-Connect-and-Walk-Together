package com.DogMate.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker for /topic destinations
        config.enableSimpleBroker("/topic");
        // Set the prefix for messages sent from clients to the server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register WebSocket endpoint with SockJS fallback for better compatibility
        // Use allowedOriginPatterns instead of allowedOrigins("*") to avoid CORS credential issues
        registry.addEndpoint("/ws-ping")
                .setAllowedOriginPatterns("*")  // Allow all origins without credential conflicts
                .withSockJS();  // Enable SockJS fallback
    }
}
