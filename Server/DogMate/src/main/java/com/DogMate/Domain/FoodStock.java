package com.DogMate.Domain;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "food_stocks")
public class FoodStock {
    @Id
    @Column(name = "id")
    private UUID id;
    
    @Column(name = "brand_name")
    private String brandName;
    
    @Column(name = "bag_size_in_kg")
    private double bagSizeInKg;
    
    @Column(name = "current_level_in_kg")
    private double currentLevelInKg;
    
    @Column(name = "daily_consumption_in_gram")
    private double dailyConsumptionInGram;

    @Column(name = "notification_enabled", nullable = false)
    private boolean notificationEnabled = false;

    @Column(name = "low_stock_threshold_days")
    private Integer lowStockThresholdDays;
    
    @OneToMany(mappedBy = "foodStock")
    private List<Dog> dogs = new ArrayList<>();

    // Default constructor required by JPA
    protected FoodStock() {
    }

    public FoodStock(String brandName, double bagSizeInKg, double currentLevelInKg,
                     double dailyConsumptionInGram) {
        this.id = UUID.randomUUID();
        this.brandName = brandName;
        this.bagSizeInKg = bagSizeInKg;
        this.currentLevelInKg = currentLevelInKg;
        this.dailyConsumptionInGram = dailyConsumptionInGram;
    }
    
    public FoodStock(String brandName, double bagSizeInKg, double currentLevelInKg,
                     double dailyConsumptionInGram, List<Dog> dogs) {
        this.id = UUID.randomUUID();
        this.brandName = brandName;
        this.bagSizeInKg = bagSizeInKg;
        this.currentLevelInKg = currentLevelInKg;
        this.dailyConsumptionInGram = dailyConsumptionInGram;
        this.dogs = dogs;
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

    public void decreaseCurrentLevel(double amountInKg) {
        if (amountInKg <= currentLevelInKg) {
            this.currentLevelInKg -= amountInKg;
        } else {
            this.currentLevelInKg = 0;
        }
    }

    public void renewStock() {
        this.currentLevelInKg = this.bagSizeInKg;
    }

    public double getDailyConsumptionInGram() {
        return dailyConsumptionInGram;
    }

    public void setDailyConsumptionInGram(double dailyConsumptionInGram) {
        this.dailyConsumptionInGram = dailyConsumptionInGram;
    }

    public void addDog(Dog dog){
        this.dogs.add(dog);
    }

    public void removeDog(Dog dog){
        this.dogs.remove(dog);
    }

    public List<Dog> getDogs(){
        return dogs;
    }

    public void setDogList(List<Dog> dogs){
        this.dogs = dogs;
    }

    public boolean isNotificationEnabled() {
        return notificationEnabled;
    }

    public void setNotificationEnabled(boolean notificationEnabled) {
        this.notificationEnabled = notificationEnabled;
    }

    public Integer getLowStockThresholdDays() {
        return lowStockThresholdDays;
    }

    public void setLowStockThresholdDays(Integer lowStockThresholdDays) {
        this.lowStockThresholdDays = lowStockThresholdDays;
    }

    /** Whole days until the bag runs out at current consumption. */
    public long computeDaysRemaining() {
        if (dailyConsumptionInGram <= 0) {
            return 0;
        }
        double currentGrams = currentLevelInKg * 1000.0;
        return (long) Math.floor(currentGrams / dailyConsumptionInGram);
    }
}
