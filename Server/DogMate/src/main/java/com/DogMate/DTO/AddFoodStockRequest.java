package com.DogMate.DTO;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public class AddFoodStockRequest {
        @NotBlank()
        private String brandName;
        @Positive
        private double bagSizeInKg;
        @Positive
        private double currentLevelInKg;
        @Positive
        private double dailyConsumptionInGram;

        public AddFoodStockRequest() {
        }
        // Getters and Setters
        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }
        public double getBagSizeInKg() { return bagSizeInKg; }
        public void setBagSizeInKg(double bagSizeInKg) { this.bagSizeInKg = bagSizeInKg; }
        public double getCurrentLevelInKg() { return currentLevelInKg; }
        public void setCurrentLevelInKg(double currentLevelInKg) { this.currentLevelInKg = currentLevelInKg; }
        public double getDailyConsumptionInGram() { return dailyConsumptionInGram; }
        public void setDailyConsumptionInGram(double dailyConsumptionInGram) { this.dailyConsumptionInGram = dailyConsumptionInGram; }
    }
