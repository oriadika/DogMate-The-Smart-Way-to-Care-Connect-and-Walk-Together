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
import java.time.LocalTime;
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

    @Column(name = "administered_time")
    private LocalTime administeredTime = LocalTime.of(9, 0);

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "next_due_time")
    private LocalTime nextDueTime = LocalTime.of(9, 0);

    @Column(name = "vet_clinic_name", columnDefinition = "TEXT")
    private String vetClinicName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "notification_enabled", nullable = false)
    private boolean notificationEnabled = false;

    /** Comma-separated times, e.g. "08:00,20:00" */
    @Column(name = "schedule_times", columnDefinition = "TEXT")
    private String scheduleTimes = "08:00";

    @Column(name = "frequency_type", nullable = false)
    private String frequencyType = MedicationFrequencyType.DAILY.name();

    @Column(name = "frequency_interval", nullable = false)
    private int frequencyInterval = 1;

    /** Lead time amount before {@link #nextDueDate} + {@link #nextDueTime} to fire the home reminder. */
    @Column(name = "remind_days_before")
    private Integer remindBeforeValue = 7;

    @Column(name = "remind_before_unit", nullable = false)
    private String remindBeforeUnit = RemindBeforeUnit.DAYS.name();

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

    public LocalTime getAdministeredTime() {
        return administeredTime;
    }

    public void setAdministeredTime(LocalTime administeredTime) {
        this.administeredTime = administeredTime != null ? administeredTime : LocalTime.of(9, 0);
    }

    public LocalDate getNextDueDate() {
        return nextDueDate;
    }

    public void setNextDueDate(LocalDate nextDueDate) {
        this.nextDueDate = nextDueDate;
    }

    public LocalTime getNextDueTime() {
        return nextDueTime;
    }

    public void setNextDueTime(LocalTime nextDueTime) {
        this.nextDueTime = nextDueTime != null ? nextDueTime : LocalTime.of(9, 0);
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

    public boolean isNotificationEnabled() {
        return notificationEnabled;
    }

    public void setNotificationEnabled(boolean notificationEnabled) {
        this.notificationEnabled = notificationEnabled;
    }

    public String getScheduleTimes() {
        return scheduleTimes;
    }

    public void setScheduleTimes(String scheduleTimes) {
        this.scheduleTimes = scheduleTimes != null && !scheduleTimes.isBlank() ? scheduleTimes.trim() : "08:00";
    }

    public String getFrequencyType() {
        return frequencyType;
    }

    public void setFrequencyType(String frequencyType) {
        this.frequencyType = frequencyType != null ? frequencyType.trim().toUpperCase() : MedicationFrequencyType.DAILY.name();
    }

    public int getFrequencyInterval() {
        return frequencyInterval;
    }

    public void setFrequencyInterval(int frequencyInterval) {
        this.frequencyInterval = Math.max(1, frequencyInterval);
    }

    public Integer getRemindBeforeValue() {
        return remindBeforeValue;
    }

    public void setRemindBeforeValue(Integer remindBeforeValue) {
        this.remindBeforeValue = remindBeforeValue != null && remindBeforeValue > 0 ? remindBeforeValue : 7;
    }

    public RemindBeforeUnit getRemindBeforeUnit() {
        return RemindBeforeUnit.fromString(remindBeforeUnit);
    }

    public void setRemindBeforeUnit(RemindBeforeUnit unit) {
        this.remindBeforeUnit = unit != null ? unit.name() : RemindBeforeUnit.DAYS.name();
    }

    /** @deprecated use {@link #getRemindBeforeValue()} */
    public Integer getRemindDaysBefore() {
        return getRemindBeforeValue();
    }

    /** @deprecated use {@link #setRemindBeforeValue(Integer)} */
    public void setRemindDaysBefore(Integer remindDaysBefore) {
        setRemindBeforeValue(remindDaysBefore);
    }
}
