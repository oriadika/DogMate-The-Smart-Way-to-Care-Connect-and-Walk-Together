package Main.Domain;
import java.time.LocalDateTime;
import java.util.UUID;

public class DogDocument {
    private UUID ID;
    // Example: VACCINATION, VET, INSURANCE, VISIT
    private DocumentType documentType;

    private String fileName;

    private String fileUrl;

    private LocalDateTime uploadedAt;

    private Dog dog;


    public DogDocument(DocumentType documentType, String fileName, String fileUrl) {
        this.documentType = documentType;
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.uploadedAt = LocalDateTime.now();
    }

    public DogDocument(DocumentType documentType, String fileName, String fileUrl, Dog dog) {
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
        VACCINATION, VET, INSURANCE, VISIT
    }
}




