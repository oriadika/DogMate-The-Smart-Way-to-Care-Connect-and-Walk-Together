package com.DogMate.DTO;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.FoodStock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class FoodStockDTO {

    private UUID id;
    

    private String brandName;
    

    private double bagSizeInKg;
    

    private double currentLevelInKg;
    

    private double dailyConsumptionInGram;

    private boolean notificationEnabled;

    private Integer lowStockThresholdDays;

    private List<Map<String,Object>> dogs = new ArrayList<>();

    /** Required for Jackson request deserialization (PUT /food-stock/{id}). */
    public FoodStockDTO() {
    }

    public FoodStockDTO(FoodStock stock) {
        this.id = stock.getId();
        this.brandName = stock.getBrandName();
        this.bagSizeInKg = stock.getBagSizeInKg();
        this.currentLevelInKg = stock.getCurrentLevelInKg();
        this.dailyConsumptionInGram = stock.getDailyConsumptionInGram();
        this.notificationEnabled = stock.isNotificationEnabled();
        this.lowStockThresholdDays = stock.getLowStockThresholdDays();
        List<Dog> stockDogs = stock.getDogs();
        if (stockDogs == null) {
            return;
        }
        for (Dog dog : stockDogs) {
            if (dog == null) {
                continue;
            }
            Map<String, Object> dogData = new HashMap<>();
            if (dog.getID() != null) {
                dogData.put("id", dog.getID().toString());
            }
            dogData.put("name", dog.getName());
            if (dog.getBreed() != null) {
                dogData.put("breed", dog.getBreed());
            }
            if (dog.getBirthdate() != null) {
                dogData.put("birthdate", dog.getBirthdate().toString());
            }
            dogData.put("gender", dog.getGender());
            dogData.put("profileImageUrl", dog.getProfileImageURL());
            this.dogs.add(dogData);
        }
    }


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
    public List<Map<String, Object>> getDogs() {
        return dogs;
    }
    public void setDogs(List<Map<String, Object>> dogs) {
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

}


