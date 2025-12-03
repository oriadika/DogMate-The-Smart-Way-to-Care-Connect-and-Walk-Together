package com.DogMate.Controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HomeController {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @GetMapping("/")
    public Map<String, Object> home() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Welcome to DogMate API");
        response.put("version", "1.0.0");
        response.put("status", "running");
        
        Map<String, String> endpoints = new HashMap<>();
        endpoints.put("register", "POST /api/users/register");
        endpoints.put("login", "POST /api/auth/login");
        endpoints.put("deleteUser", "DELETE /api/users/{userId}");
        endpoints.put("deleteUserByEmail", "DELETE /api/users/email/{email}");
        endpoints.put("h2Console", "GET /h2-console");
        
        response.put("availableEndpoints", endpoints);
        
        // Add H2 Console connection info
        Map<String, String> h2ConsoleInfo = new HashMap<>();
        h2ConsoleInfo.put("url", "http://localhost:8080/h2-console");
        h2ConsoleInfo.put("jdbcUrl", datasourceUrl);
        h2ConsoleInfo.put("username", "sa");
        h2ConsoleInfo.put("password", "(empty)");
        h2ConsoleInfo.put("note", "Use the JDBC URL above to connect. The path is relative to the Server/DogMate directory.");
        
        response.put("h2Console", h2ConsoleInfo);
        
        return response;
    }
}
