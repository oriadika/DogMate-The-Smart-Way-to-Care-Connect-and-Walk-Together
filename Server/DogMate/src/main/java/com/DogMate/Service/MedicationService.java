package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.RemindBeforeUnit;
import com.DogMate.DTO.MedicationDTO;
import com.DogMate.Infrastructure.DogMedicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
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
                                LocalTime administeredTime, LocalDate nextDueDate, LocalTime nextDueTime,
                                String vetClinicName,
                                Boolean notificationEnabled, Integer remindBeforeValue,
                                RemindBeforeUnit remindBeforeUnit) {
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
        entity.setAdministeredTime(administeredTime);
        entity.setNextDueDate(nextDueDate);
        entity.setVetClinicName(vetClinicName);
        NotificationSettingsHelper.applyMedicationSettings(
                entity, notificationEnabled, remindBeforeValue, remindBeforeUnit, nextDueTime);
        DogMedication saved = medicationRepository.save(entity);
        healthReminderSyncService.syncMedicationReminder(saved, userId);
        return MedicationDTO.fromEntity(saved);
    }

    @Transactional
    public MedicationDTO update(UUID userId, UUID medicationId, UUID dogId, String medicationName,
                                LocalDate administeredDate, LocalTime administeredTime,
                                LocalDate nextDueDate, LocalTime nextDueTime, String vetClinicName,
                                Boolean notificationEnabled, Integer remindBeforeValue,
                                RemindBeforeUnit remindBeforeUnit) {
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
        m.setAdministeredTime(administeredTime);
        m.setNextDueDate(nextDueDate);
        m.setVetClinicName(vetClinicName);
        NotificationSettingsHelper.applyMedicationSettings(
                m, notificationEnabled, remindBeforeValue, remindBeforeUnit, nextDueTime);
        DogMedication saved = medicationRepository.save(m);
        healthReminderSyncService.syncMedicationReminder(saved, userId);
        return MedicationDTO.fromEntity(saved);
    }

    /**
     * Logs today's dose as a new history record and schedules the next cycle from the template interval.
     */
    @Transactional
    public MedicationDTO logDose(UUID userId, UUID medicationId) {
        DogMedication template = loadOwnedOrThrow(userId, medicationId);
        LocalDate today = LocalDate.now();
        if (template.getAdministeredDate() != null && template.getAdministeredDate().equals(today)) {
            throw new IllegalArgumentException("המנה כבר נרשמה היום");
        }

        DogMedication entity = new DogMedication(
                null,
                template.getDog(),
                template.getMedicationName(),
                today
        );
        entity.setAdministeredTime(LocalTime.now());
        entity.setVetClinicName(template.getVetClinicName());
        entity.setNextDueDate(HealthCycleScheduleHelper.computeNextDueAfterAdministration(
                template.getAdministeredDate(),
                template.getNextDueDate(),
                today
        ));
        NotificationSettingsHelper.applyMedicationSettings(
                entity,
                template.isNotificationEnabled(),
                template.getRemindBeforeValue(),
                template.getRemindBeforeUnit(),
                template.getNextDueTime()
        );
        DogMedication saved = medicationRepository.save(entity);
        healthReminderSyncService.syncMedicationReminder(saved, userId);
        return MedicationDTO.fromEntity(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID medicationId) {
        DogMedication m = loadOwnedOrThrow(userId, medicationId);
        healthReminderSyncService.deleteMedicationReminder(medicationId, userId);
        medicationRepository.delete(m);
    }

    /**
     * Re-enables medication alerts when a MEDICATION system reminder is edited from home.
     * Schedule settings stay as configured in the medication form.
     */
    @Transactional
    public void syncMedicationFromReminderEdit(UUID medicationId, UUID userId) {
        DogMedication m = loadOwnedOrThrow(userId, medicationId);
        m.setNotificationEnabled(true);
        medicationRepository.save(m);
    }

    /** After a dose reminder fires, schedule the next future medication reminder on home. */
    @Transactional
    public void resyncMedicationReminderAfterFired(UUID medicationId, UUID userId) {
        DogMedication m = loadOwnedOrThrow(userId, medicationId);
        healthReminderSyncService.deleteMedicationReminder(medicationId, userId);
        if (m.isNotificationEnabled()) {
            healthReminderSyncService.syncMedicationReminder(m, userId);
        }
    }
}
