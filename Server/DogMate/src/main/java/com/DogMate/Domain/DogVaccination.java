package com.DogMate.Domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "dog_vaccinations",
    indexes = {
        @Index(name = "idx_dog_vaccinations_dog_id", columnList = "dog_id"),
        @Index(name = "idx_dog_vaccinations_administered_date", columnList = "administered_date")
    }
)
public class DogVaccination {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dog_id", nullable = false)
    private Dog dog;

    @Column(name = "vaccine_name", nullable = false, columnDefinition = "TEXT")
    private String vaccineName;

    @Column(name = "administered_date", nullable = false)
    private LocalDate administeredDate;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "vet_clinic_name", columnDefinition = "TEXT")
    private String vetClinicName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected DogVaccination() {
    }

    public DogVaccination(UUID id, Dog dog, String vaccineName, LocalDate administeredDate) {
        this.id = id;
        this.dog = dog;
        this.vaccineName = vaccineName != null ? vaccineName.trim() : "";
        this.administeredDate = administeredDate;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (vaccineName == null) {
            vaccineName = "";
        }
    }

    public UUID getId() {
        return id;
    }

    public Dog getDog() {
        return dog;
    }

    public void setDog(Dog dog) {
        this.dog = dog;
    }

    public String getVaccineName() {
        return vaccineName;
    }

    public void setVaccineName(String vaccineName) {
        this.vaccineName = vaccineName != null ? vaccineName.trim() : "";
    }

    public LocalDate getAdministeredDate() {
        return administeredDate;
    }

    public void setAdministeredDate(LocalDate administeredDate) {
        this.administeredDate = administeredDate;
    }

    public LocalDate getNextDueDate() {
        return nextDueDate;
    }

    public void setNextDueDate(LocalDate nextDueDate) {
        this.nextDueDate = nextDueDate;
    }

    public String getVetClinicName() {
        return vetClinicName;
    }

    public void setVetClinicName(String vetClinicName) {
        this.vetClinicName = vetClinicName != null ? vetClinicName.trim() : null;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
