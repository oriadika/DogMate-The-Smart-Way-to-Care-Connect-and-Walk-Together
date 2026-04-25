package com.DogMate.selenium;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class BaseSeleniumTest {
    protected WebDriver driver;
    protected String baseUrl = "http://localhost:8080/selenium-test";
    protected String apiBaseUrl = "http://localhost:8080/api";

    @BeforeEach
    public void setUp() {
        // Ensure user state is clean before starting the browser
        logoutUserByEmail("g@g.com");

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--disable-notifications");
        options.addArguments("--disable-popup-blocking");
        options.addArguments("--disable-infobars");
        options.addArguments("--disable-save-password-bubble");
        options.addArguments("--disable-features=PasswordManagerAutoSignIn");
        options.addArguments("--disable-features=AutofillServerCommunication");
        options.setExperimentalOption("prefs", java.util.Map.of(
            "credentials_enable_service", false,
            "profile.password_manager_enabled", false,
            "password_manager_enabled", false,
            "profile.default_content_setting_values.notifications", 2
        ));
        // Selenium Manager will handle the driver path
        driver = new ChromeDriver(options);
        driver.manage().window().maximize();
    }

    @AfterEach
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
        logoutUserByEmail("g@g.com");
    }

    protected void logoutUserByEmail(String email) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            String requestBody = String.format("{\"email\":\"%s\"}", email);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiBaseUrl + "/auth/logout"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
            client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception ignored) {
            // Ignore logout failures, which may occur if the user is not logged in or server is unavailable.
        }
    }
}