package com.DogMate.Domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dog_documents")
public class DogDocument {
    @Id
    @Column(name = "id")
    private UUID ID;
    
    // Example: VACCINATION, VET, INSURANCE, VISIT
    @Column(name = "document_type")
    @Enumerated(EnumType.STRING)
    private DocumentType documentType;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @ManyToOne
    @JoinColumn(name = "dog_id")
    private Dog dog;

    // Default constructor required by JPA
    protected DogDocument() {
    }

    public DogDocument(DocumentType documentType, String fileName, String fileUrl) {
        this.ID = UUID.randomUUID();
        this.documentType = documentType;
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.uploadedAt = LocalDateTime.now();
    }

    public DogDocument(DocumentType documentType, String fileName, String fileUrl, Dog dog) {
        this.ID = UUID.randomUUID();
        this.documentType = documentType;
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.uploadedAt = LocalDateTime.now();
        this.dog = dog;
    }

    // --- Getters and Setters ---
    public UUID getId() { return this.ID; }
    public void setId(UUID ID) { this.ID = ID; }

    public DocumentType getDocumentType() { return documentType; }
    public void setDocumentType(DocumentType documentType) { this.documentType = documentType; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }

    public Dog getDog(){
        return dog;
    }

    public void setDog(Dog dog){
        this.dog = dog;
    }

    // --- Enum for document types ---
    public enum DocumentType {
        BLOOD_TEST, VACCINE_HEXAGONAL, VACCINE_OCTAGONAL, VACCINE_RABIES, ROUTINE_CHECKUP,
        UNPLANNED_VET_VISIT, MEDICAL_INSURANCE, OTHER, TRAVEL_DOCUMENT, TRAINING_CERTIFICATE,
        FCI_CERTIFICATE
    }
}




