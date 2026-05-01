package com.DogMate.selenium;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class LoginSeleniumTest extends BaseSeleniumTest {

    @Test
    public void testSuccessfulLogin() {
        driver.get(baseUrl + "/login.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='email-input']")));
        emailInput.sendKeys("g@g.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='password-input']"));
        passwordInput.sendKeys("123456");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='login-button']"));
        loginButton.click();

        // Wait for success message
        WebElement successDiv = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='login-success']")));
        assertTrue(successDiv.getText().contains("Login successful"));
    }

    @Test
    public void testFailedLogin() {
        driver.get(baseUrl + "/login.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='email-input']")));
        emailInput.sendKeys("g@g.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='password-input']"));
        passwordInput.sendKeys("wrongpassword");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='login-button']"));
        loginButton.click();

        // Wait for the server error message to appear
        boolean errorAppeared = wait.until(ExpectedConditions.textToBePresentInElementLocated(
            By.cssSelector("[data-testid='login-error']"),
            "Invalid credentials"
        ));
        assertTrue(errorAppeared);
    }

    @Test
    public void testNonExistentUser() {
        driver.get(baseUrl + "/login.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='email-input']")));
        emailInput.sendKeys("qq@qq.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='password-input']"));
        passwordInput.sendKeys("123456");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='login-button']"));
        loginButton.click();

        // Wait for the server error message to appear
        boolean errorAppeared = wait.until(ExpectedConditions.textToBePresentInElementLocated(
            By.cssSelector("[data-testid='login-error']"),
            "Invalid credentials"
        ));
        assertTrue(errorAppeared);
    }

    @Test
    public void testEmptyUser() {
        driver.get(baseUrl + "/login.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='email-input']")));
        emailInput.sendKeys("");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='password-input']"));
        passwordInput.sendKeys("123456");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='login-button']"));
        loginButton.click();

        // Wait for the server error message to appear
        boolean errorAppeared = wait.until(ExpectedConditions.textToBePresentInElementLocated(
            By.cssSelector("[data-testid='login-error']"),
            "Invalid credentials"
        ));
        assertTrue(errorAppeared);
    }

    @Test
    public void testEmptyPassword() {
        driver.get(baseUrl + "/login.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='email-input']")));
        emailInput.sendKeys("g@g.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='password-input']"));
        passwordInput.sendKeys("");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='login-button']"));
        loginButton.click();

        // Wait for the server error message to appear
        boolean errorAppeared = wait.until(ExpectedConditions.textToBePresentInElementLocated(
            By.cssSelector("[data-testid='login-error']"),
            "Invalid credentials"
        ));
        assertTrue(errorAppeared);
    }
}