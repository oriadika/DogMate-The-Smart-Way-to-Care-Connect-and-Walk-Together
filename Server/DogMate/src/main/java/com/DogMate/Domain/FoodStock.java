package com.DogMate.Domain;

import java.util.UUID;

public class FoodStock {
    private UUID id;
    private String brandName;
    private double bagSizeInKg;
    private double currentLevelInKg;
    private double dailyConsumptionInGram;
    private Dog dog;

    public FoodStock(String brandName, double bagSizeInKg, double currentLevelInKg,
                     double dailyConsumptionInGram) {
        this.brandName = brandName;
        this.bagSizeInKg = bagSizeInKg;
        this.currentLevelInKg = currentLevelInKg;
        this.dailyConsumptionInGram = dailyConsumptionInGram;
    }
    public FoodStock(String brandName, double bagSizeInKg, double currentLevelInKg,
                     double dailyConsumptionInGram, Dog dog) {
        this.brandName = brandName;
        this.bagSizeInKg = bagSizeInKg;
        this.currentLevelInKg = currentLevelInKg;
        this.dailyConsumptionInGram = dailyConsumptionInGram;
        this.dog = dog;
    }

    // --- Getters and Setters ---
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public double getBagSizeInKg() {
        return bagSizeInKg;
    }

    public void setBagSizeInKg(double bagSizeInKg) {
        this.bagSizeInKg = bagSizeInKg;
    }

    public double getCurrentLevelInKg() {
        return currentLevelInKg;
    }

    public void setCurrentLevelInKg(double currentLevelInKg) {
        this.currentLevelInKg = currentLevelInKg;
    }

    public double getDailyConsumptionInGram() {
        return dailyConsumptionInGram;
    }

    public void setDailyConsumptionInGram(double dailyConsumptionInGram) {
        this.dailyConsumptionInGram = dailyConsumptionInGram;
    }

    public Dog getDog(){
        return dog;
    }

    public void setDog(Dog dog){
        this.dog = dog;
    }
}
