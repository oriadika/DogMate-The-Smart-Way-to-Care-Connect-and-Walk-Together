package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogMedication;
import com.DogMate.DTO.MedicationDTO;
import com.DogMate.Infrastructure.DogMedicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class MedicationService {

    private final DogMedicationRepository medicationRepository;
    private final IDogRepository dogRepository;
    private final HealthReminderSyncService healthReminderSyncService;

    public MedicationService(
            DogMedicationRepository medicationRepository,
            IDogRepository dogRepository,
            HealthReminderSyncService healthReminderSyncService
    ) {
        this.medicationRepository = medicationRepository;
        this.dogRepository = dogRepository;
        this.healthReminderSyncService = healthReminderSyncService;
    }

    private boolean dogBelongsToUser(UUID userId, UUID dogId) {
        return dogRepository.findAllForRegularUser(userId).stream()
                .anyMatch(d -> d.getID().equals(dogId));
    }

    private DogMedication loadOwnedOrThrow(UUID userId, UUID medicationId) {
        DogMedication m = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצאה תרופה עם המזהה: " + medicationId));
        UUID dogId = m.getDog().getID();
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("אין הרשאה לתרופה זו");
        }
        return m;
    }

    @Transactional(readOnly = true)
    public List<MedicationDTO> listForUser(UUID userId) {
        return medicationRepository.findAllForRegularUser(userId).stream()
                .map(MedicationDTO::fromEntity)
                .toList();
    }

    @Transactional
    public MedicationDTO create(UUID userId, UUID dogId, String medicationName, LocalDate administeredDate,
                                LocalDate nextDueDate, String vetClinicName,
                                Boolean notificationEnabled, String scheduleTimes,
                                String frequencyType, Integer frequencyInterval) {
        if (medicationName == null || medicationName.isBlank()) {
            throw new IllegalArgumentException("חובה להזין שם תרופה");
        }
        if (administeredDate == null) {
            throw new IllegalArgumentException("חובה להזין תאריך מתן תרופה");
        }
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("הכלב לא משויך למשתמש זה");
        }
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));
        DogMedication entity = new DogMedication(null, dog, medicationName, administeredDate);
        entity.setNextDueDate(nextDueDate);
        entity.setVetClinicName(vetClinicName);
        NotificationSettingsHelper.applyMedicationSettings(
                entity, notificationEnabled, scheduleTimes, frequencyType, frequencyInterval
        );
        DogMedication saved = medicationRepository.save(entity);
        healthReminderSyncService.syncMedicationReminder(saved, userId);
        return MedicationDTO.fromEntity(saved);
    }

    @Transactional
    public MedicationDTO update(UUID userId, UUID medicationId, UUID dogId, String medicationName,
                                LocalDate administeredDate, LocalDate nextDueDate, String vetClinicName,
                                Boolean notificationEnabled, String scheduleTimes,
                                String frequencyType, Integer frequencyInterval) {
        DogMedication m = loadOwnedOrThrow(userId, medicationId);
        if (medicationName == null || medicationName.isBlank()) {
            throw new IllegalArgumentException("חובה להזין שם תרופה");
        }
        if (administeredDate == null) {
            throw new IllegalArgumentException("חובה להזין תאריך מתן תרופה");
        }
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("הכלב לא משויך למשתמש זה");
        }
        if (!m.getDog().getID().equals(dogId)) {
            Dog dog = dogRepository.findById(dogId)
                    .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));
            m.setDog(dog);
        }
        m.setMedicationName(medicationName);
        m.setAdministeredDate(administeredDate);
        m.setNextDueDate(nextDueDate);
        m.setVetClinicName(vetClinicName);
        NotificationSettingsHelper.applyMedicationSettings(
                m, notificationEnabled, scheduleTimes, frequencyType, frequencyInterval
        );
        DogMedication saved = medicationRepository.save(m);
        healthReminderSyncService.syncMedicationReminder(saved, userId);
        return MedicationDTO.fromEntity(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID medicationId) {
        DogMedication m = loadOwnedOrThrow(userId, medicationId);
        healthReminderSyncService.deleteMedicationReminder(medicationId, userId);
        medicationRepository.delete(m);
    }
}
