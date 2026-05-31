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
    name = "dog_medications",
    indexes = {
        @Index(name = "idx_dog_medications_dog_id", columnList = "dog_id"),
        @Index(name = "idx_dog_medications_administered_date", columnList = "administered_date")
    }
)
public class DogMedication {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dog_id", nullable = false)
    private Dog dog;

    @Column(name = "medication_name", nullable = false, columnDefinition = "TEXT")
    private String medicationName;

    @Column(name = "administered_date", nullable = false)
    private LocalDate administeredDate;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "vet_clinic_name", columnDefinition = "TEXT")
    private String vetClinicName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected DogMedication() {
    }

    public DogMedication(UUID id, Dog dog, String medicationName, LocalDate administeredDate) {
        this.id = id;
        this.dog = dog;
        this.medicationName = medicationName != null ? medicationName.trim() : "";
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
        if (medicationName == null) {
            medicationName = "";
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

    public String getMedicationName() {
        return medicationName;
    }

    public void setMedicationName(String medicationName) {
        this.medicationName = medicationName != null ? medicationName.trim() : "";
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
