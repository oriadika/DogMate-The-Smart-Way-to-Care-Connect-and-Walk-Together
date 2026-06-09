package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.DTO.VaccinationDTO;
import com.DogMate.Infrastructure.DogVaccinationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class VaccinationService {

    private final DogVaccinationRepository vaccinationRepository;
    private final IDogRepository dogRepository;
    private final HealthReminderSyncService healthReminderSyncService;

    public VaccinationService(
            DogVaccinationRepository vaccinationRepository,
            IDogRepository dogRepository,
            HealthReminderSyncService healthReminderSyncService
    ) {
        this.vaccinationRepository = vaccinationRepository;
        this.dogRepository = dogRepository;
        this.healthReminderSyncService = healthReminderSyncService;
    }

    private boolean dogBelongsToUser(UUID userId, UUID dogId) {
        return dogRepository.findAllForRegularUser(userId).stream()
                .anyMatch(d -> d.getID().equals(dogId));
    }

    @Transactional(readOnly = true)
    public DogVaccination findOwnedVaccination(UUID userId, UUID vaccinationId) {
        return loadOwnedOrThrow(userId, vaccinationId);
    }

    private DogVaccination loadOwnedOrThrow(UUID userId, UUID vaccinationId) {
        DogVaccination v = vaccinationRepository.findById(vaccinationId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא חיסון עם המזהה: " + vaccinationId));
        UUID dogId = v.getDog().getID();
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("אין הרשאה לחיסון זה");
        }
        return v;
    }

    @Transactional(readOnly = true)
    public List<VaccinationDTO> listForUser(UUID userId) {
        return vaccinationRepository.findAllForRegularUser(userId).stream()
                .map(VaccinationDTO::fromEntity)
                .toList();
    }

    @Transactional
    public VaccinationDTO create(UUID userId, UUID dogId, String vaccineName, LocalDate administeredDate,
                                 LocalDate nextDueDate, String vetClinicName,
                                 Boolean notificationEnabled, String remindDaysBefore) {
        if (vaccineName == null || vaccineName.isBlank()) {
            throw new IllegalArgumentException("חובה להזין שם חיסון");
        }
        if (administeredDate == null) {
            throw new IllegalArgumentException("חובה להזין תאריך חיסון");
        }
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("הכלב לא משויך למשתמש זה");
        }
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));
        DogVaccination entity = new DogVaccination(null, dog, vaccineName, administeredDate);
        entity.setNextDueDate(nextDueDate);
        entity.setVetClinicName(vetClinicName);
        NotificationSettingsHelper.applyVaccinationSettings(entity, notificationEnabled, remindDaysBefore);
        DogVaccination saved = vaccinationRepository.save(entity);
        healthReminderSyncService.syncVaccinationReminder(saved, userId);
        return VaccinationDTO.fromEntity(saved);
    }

    @Transactional
    public VaccinationDTO update(UUID userId, UUID vaccinationId, UUID dogId, String vaccineName,
                                 LocalDate administeredDate, LocalDate nextDueDate, String vetClinicName,
                                 Boolean notificationEnabled, String remindDaysBefore) {
        DogVaccination v = loadOwnedOrThrow(userId, vaccinationId);
        if (vaccineName == null || vaccineName.isBlank()) {
            throw new IllegalArgumentException("חובה להזין שם חיסון");
        }
        if (administeredDate == null) {
            throw new IllegalArgumentException("חובה להזין תאריך חיסון");
        }
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("הכלב לא משויך למשתמש זה");
        }
        if (!v.getDog().getID().equals(dogId)) {
            Dog dog = dogRepository.findById(dogId)
                    .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));
            v.setDog(dog);
        }
        v.setVaccineName(vaccineName);
        v.setAdministeredDate(administeredDate);
        v.setNextDueDate(nextDueDate);
        v.setVetClinicName(vetClinicName);
        NotificationSettingsHelper.applyVaccinationSettings(v, notificationEnabled, remindDaysBefore);
        DogVaccination saved = vaccinationRepository.save(v);
        healthReminderSyncService.syncVaccinationReminder(saved, userId);
        return VaccinationDTO.fromEntity(saved);
    }

    /**
     * Logs today's vaccination as a new history record and schedules the next cycle from the template interval.
     */
    @Transactional
    public VaccinationDTO logDose(UUID userId, UUID vaccinationId) {
        return logDoseAt(userId, vaccinationId, LocalDate.now(), true);
    }

    @Transactional
    public VaccinationDTO logDoseAt(UUID userId, UUID vaccinationId, LocalDate administeredDate, boolean blockDuplicateDay) {
        DogVaccination template = loadOwnedOrThrow(userId, vaccinationId);
        LocalDate doseDate = administeredDate != null ? administeredDate : LocalDate.now();
        if (blockDuplicateDay
                && template.getAdministeredDate() != null
                && template.getAdministeredDate().equals(doseDate)) {
            throw new IllegalArgumentException("החיסון כבר נרשם היום");
        }

        DogVaccination entity = new DogVaccination(
                null,
                template.getDog(),
                template.getVaccineName(),
                doseDate
        );
        entity.setVetClinicName(template.getVetClinicName());
        entity.setNextDueDate(HealthCycleScheduleHelper.computeNextDueAfterAdministration(
                template.getAdministeredDate(),
                template.getNextDueDate(),
                doseDate
        ));
        NotificationSettingsHelper.applyVaccinationSettings(
                entity,
                template.isNotificationEnabled(),
                template.getRemindDaysBefore()
        );
        DogVaccination saved = vaccinationRepository.save(entity);
        healthReminderSyncService.syncVaccinationReminder(saved, userId);
        return VaccinationDTO.fromEntity(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID vaccinationId) {
        DogVaccination v = loadOwnedOrThrow(userId, vaccinationId);
        healthReminderSyncService.deleteVaccinationReminder(vaccinationId, userId);
        vaccinationRepository.delete(v);
    }

    /**
     * Re-enables vaccination alerts when a VACCINATION system reminder is edited from home.
     * Lead-day settings stay as configured in the vaccination form.
     */
    @Transactional
    public void syncVaccinationFromReminderEdit(UUID vaccinationId, UUID userId) {
        DogVaccination v = loadOwnedOrThrow(userId, vaccinationId);
        v.setNotificationEnabled(true);
        vaccinationRepository.save(v);
    }

    /** After a lead-time reminder fires, schedule the next future vaccination reminder on home. */
    @Transactional
    public void resyncVaccinationReminderAfterFired(UUID vaccinationId, UUID userId) {
        DogVaccination v = loadOwnedOrThrow(userId, vaccinationId);
        healthReminderSyncService.deleteVaccinationReminder(vaccinationId, userId);
        if (v.isNotificationEnabled()) {
            healthReminderSyncService.syncVaccinationReminder(v, userId);
        }
    }
}
