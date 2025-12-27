package com.DogMate.Domain;

import jakarta.persistence.*;
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
    
    @ManyToOne
    @JoinColumn(name = "dog_id")
    private Dog dog;

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
                     double dailyConsumptionInGram, Dog dog) {
        this.id = UUID.randomUUID();
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
