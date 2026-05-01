package com.DogMate.selenium;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class AdminSeleniumTest extends BaseSeleniumTest {

    @Test
    public void testAdminFailedLoginWithWrongPassword() {
        driver.get(baseUrl + "/admin.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='admin-email-input']")));
        emailInput.sendKeys("admin@admin.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='admin-password-input']"));
        passwordInput.sendKeys("wrongpassword");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='admin-login-button']"));
        loginButton.click();

        // Wait for error message
        boolean errorAppeared = wait.until(ExpectedConditions.textToBePresentInElementLocated(
            By.cssSelector("[data-testid='admin-login-error']"),
            "Invalid credentials"
        ));
        assertTrue(errorAppeared);
    }

    @Test
    public void testAdminSuccessfulLoginAndUsersListDisplay() {
        driver.get(baseUrl + "/admin.html");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement emailInput = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='admin-email-input']")));
        emailInput.sendKeys("admin@admin.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("[data-testid='admin-password-input']"));
        passwordInput.sendKeys("123456");

        WebElement loginButton = driver.findElement(By.cssSelector("[data-testid='admin-login-button']"));
        loginButton.click();

        // Wait for users table to appear and be visible
        WebElement usersTable = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='users-table']")));
        assertTrue(usersTable.isDisplayed());

        // Verify table has at least header row
        java.util.List<WebElement> rows = usersTable.findElements(By.tagName("tr"));
        assertTrue(rows.size() > 0, "Users table should have at least header row");

        // Keep table visible for 5 seconds
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
