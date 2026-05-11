package com.DogMate.Domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Holds signup data until the email OTP is verified; only then a {@link UserAccount} is created.
 */
@Entity
@Table(
    name = "pending_registrations",
    indexes = {
        @Index(name = "idx_pending_registrations_email", columnList = "email", unique = true)
    }
)
public class PendingRegistration {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Normalized email (trim + lower case) for lookup. */
    @Column(name = "email", nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 200)
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "phone_number", length = 32)
    private String phoneNumber;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    /** "owner" or "walker" */
    @Column(name = "user_role", nullable = false, length = 16)
    private String userRole;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String otpCode;

    /** Updated when a new OTP is sent (resend) to extend the validity window. */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected PendingRegistration() {
    }

    public PendingRegistration(
        UUID id,
        String email,
        String passwordHash,
        String firstName,
        String lastName,
        String phoneNumber,
        LocalDate birthDate,
        String userRole,
        String otpCode,
        LocalDateTime createdAt
    ) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phoneNumber = phoneNumber;
        this.birthDate = birthDate;
        this.userRole = userRole;
        this.otpCode = otpCode;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getUserRole() {
        return userRole;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public String getOtpCode() {
        return otpCode;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setOtpCode(String otpCode) {
        this.otpCode = otpCode;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }
}
