package com.DogMate.Domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class WalkerCityOffering {

    @Column(name = "city")
    private String city;

    @Column(name = "availability")
    private String availability;

    @Column(name = "pricing")
    private String pricing;

    protected WalkerCityOffering() {
    }

    public WalkerCityOffering(String city, String availability, String pricing) {
        this.city = city;
        this.availability = availability;
        this.pricing = pricing;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getAvailability() {
        return availability;
    }

    public void setAvailability(String availability) {
        this.availability = availability;
    }

    public String getPricing() {
        return pricing;
    }

    public void setPricing(String pricing) {
        this.pricing = pricing;
    }
}
