package com.DogMate.selenium;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class AddDogSeleniumTest extends BaseSeleniumTest {

    @Test
    public void testAddDog() {
        // First login successfully
        driver.get(baseUrl + "/login.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='email-input']")));
        emailInput.sendKeys("g@g.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='password-input']"));
        passwordInput.sendKeys("123456");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='login-button']"));
        loginButton.click();

        // Wait for login success and redirect
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='login-success']")));
        wait.until(ExpectedConditions.urlContains("home.html"));

        // Click the add dog link from the home page
        WebElement addDogLink = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='add-dog-link']")));
        addDogLink.click();

        WebElement dogNameInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='dog-name-input']")));
        dogNameInput.sendKeys("Rocky");

        WebElement dogBreedInput = driver.findElement(By.cssSelector("[data-testid='dog-breed-input']"));
        dogBreedInput.sendKeys("Husky");

        WebElement dogBirthdateInput = driver.findElement(By.cssSelector("[data-testid='dog-birthdate-input']"));
        dogBirthdateInput.sendKeys("2020-01-01");

        Select genderSelect = new Select(driver.findElement(By.cssSelector("[data-testid='dog-gender-select']")));
        genderSelect.selectByValue("M");

        WebElement saveButton = driver.findElement(By.cssSelector("[data-testid='save-dog-button']"));
        saveButton.click();

        WebElement messageElement = wait.until(driver1 -> {
            WebElement success = driver1.findElement(By.cssSelector("[data-testid='success-message']"));
            if (success.isDisplayed() && !success.getText().isBlank()) {
                return success;
            }
            WebElement error = driver1.findElement(By.cssSelector("[data-testid='error-message']"));
            if (error.isDisplayed() && !error.getText().isBlank()) {
                return error;
            }
            return null;
        });

        String messageText = messageElement.getText();
        if (messageElement.getAttribute("data-testid").equals("success-message")) {
            assertEquals("Dog added successfully", messageText);
        } else {
            throw new AssertionError("Expected successful dog save, but got error: " + messageText);
        }
    }
}