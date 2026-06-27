package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.RemindBeforeUnit;
import com.DogMate.Domain.ReminderSourceType;
import com.DogMate.DTO.MedicationDTO;
import com.DogMate.Infrastructure.DogMedicationRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class MedicationService {

    private final DogMedicationRepository medicationRepository;
    private final IDogRepository dogRepository;
    private final HealthReminderSyncService healthReminderSyncService;
    private final ReminderService reminderService;

    public MedicationService(
            DogMedicationRepository medicationRepository,
            IDogRepository dogRepository,
            HealthReminderSyncService healthReminderSyncService,
            @Lazy ReminderService reminderService
    ) {
        this.medicationRepository = medicationRepository;
        this.dogRepository = dogRepository;
        this.healthReminderSyncService = healthReminderSyncService;
        this.reminderService = reminderService;
    }

    private boolean dogBelongsToUser(UUID userId, UUID dogId) {
        return dogRepository.findAllForRegularUser(userId).stream()
                .anyMatch(d -> d.getID().equals(dogId));
    }

    @Transactional(readOnly = true)
    public DogMedication findOwnedMedication(UUID userId, UUID medicationId) {
        return loadOwnedOrThrow(userId, medicationId);
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
                                String vetClinicName, String description,
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
        entity.setDescription(description);
        NotificationSettingsHelper.applyMedicationSettings(
                entity, notificationEnabled, remindBeforeValue, remindBeforeUnit, nextDueTime);
        DogMedication saved = medicationRepository.save(entity);
        syncMedicationRemindersForGroup(userId, saved.getDog().getID(), saved.getMedicationName());
        return MedicationDTO.fromEntity(saved);
    }

    @Transactional
    public MedicationDTO update(UUID userId, UUID medicationId, UUID dogId, String medicationName,
                                LocalDate administeredDate, LocalTime administeredTime,
                                LocalDate nextDueDate, LocalTime nextDueTime, String vetClinicName,
                                String description,
                                Boolean notificationEnabled, Integer remindBeforeValue,
                                RemindBeforeUnit remindBeforeUnit) {
        DogMedication m = loadOwnedOrThrow(userId, medicationId);
        String previousName = m.getMedicationName();
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
        m.setDescription(description);
        NotificationSettingsHelper.applyMedicationSettings(
                m, notificationEnabled, remindBeforeValue, remindBeforeUnit, nextDueTime);
        DogMedication saved = medicationRepository.save(m);
        propagateGroupNotificationSettings(userId, saved);

        if (!Objects.equals(previousName, medicationName)) {
            propagateMedicationRename(userId, saved.getDog().getID(), previousName, medicationName);
        }
        syncMedicationRemindersForGroup(userId, saved.getDog().getID(), medicationName);
        return MedicationDTO.fromEntity(saved);
    }

    private void propagateMedicationRename(
            UUID userId,
            UUID dogId,
            String oldName,
            String newName
    ) {
        if (oldName == null || oldName.equals(newName)) {
            return;
        }
        for (DogMedication med : medicationRepository.findAllForRegularUser(userId)) {
            if (!med.getDog().getID().equals(dogId)) {
                continue;
            }
            if (!oldName.equals(med.getMedicationName())) {
                continue;
            }
            med.setMedicationName(newName);
            medicationRepository.save(med);
        }
    }

    private List<DogMedication> findMedicationGroupRecords(UUID userId, UUID dogId, String medicationName) {
        if (dogId == null || medicationName == null || medicationName.isBlank()) {
            return List.of();
        }
        return medicationRepository.findAllForRegularUser(userId).stream()
                .filter(m -> m.getDog().getID().equals(dogId))
                .filter(m -> medicationName.equals(m.getMedicationName()))
                .toList();
    }

    private DogMedication findLatestMedicationRecord(List<DogMedication> group) {
        return group.stream()
                .max(Comparator
                        .comparing(DogMedication::getAdministeredDate)
                        .thenComparing(DogMedication::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    private void propagateGroupNotificationSettings(UUID userId, DogMedication source) {
        if (source.getDog() == null || source.getMedicationName() == null) {
            return;
        }
        for (DogMedication med : findMedicationGroupRecords(
                userId,
                source.getDog().getID(),
                source.getMedicationName()
        )) {
            med.setNotificationEnabled(source.isNotificationEnabled());
            med.setRemindBeforeValue(source.getRemindBeforeValue());
            med.setRemindBeforeUnit(source.getRemindBeforeUnit());
            medicationRepository.save(med);
        }
    }

    /**
     * Ensures every medication group with active notifications has a home reminder.
     * Repairs gaps when reminders were deleted or never created after edits/history changes.
     */
    @Transactional
    public void reconcileAllMedicationRemindersForUser(UUID userId) {
        List<DogMedication> allMeds = medicationRepository.findAllForRegularUser(userId);
        Map<String, List<DogMedication>> groups = new HashMap<>();
        for (DogMedication med : allMeds) {
            if (med.getDog() == null || med.getDog().getID() == null) {
                continue;
            }
            String medicationName = med.getMedicationName();
            if (medicationName == null || medicationName.isBlank()) {
                continue;
            }
            String groupKey = med.getDog().getID() + "::" + medicationName.trim();
            groups.computeIfAbsent(groupKey, ignored -> new ArrayList<>()).add(med);
        }

        for (List<DogMedication> group : groups.values()) {
            DogMedication latest = findLatestMedicationRecord(group);
            if (latest == null) {
                continue;
            }

            deleteOrphanMedicationRemindersInGroup(userId, group, latest.getId());

            if (!latest.isNotificationEnabled() || latest.getNextDueDate() == null) {
                healthReminderSyncService.deleteMedicationReminder(latest.getId(), userId);
                continue;
            }

            if (!reminderService.hasActiveSystemReminder(
                    userId,
                    ReminderSourceType.MEDICATION,
                    latest.getId()
            )) {
                healthReminderSyncService.syncMedicationReminder(latest, userId);
            }
        }
    }

    private void deleteOrphanMedicationRemindersInGroup(
            UUID userId,
            List<DogMedication> group,
            UUID latestMedicationId
    ) {
        for (DogMedication med : group) {
            if (latestMedicationId == null || !latestMedicationId.equals(med.getId())) {
                healthReminderSyncService.deleteMedicationReminder(med.getId(), userId);
            }
        }
    }

    /**
     * Keeps a single home reminder per dog + medication name, tied to the latest history record.
     */
    private void syncMedicationRemindersForGroup(UUID userId, UUID dogId, String medicationName) {
        List<DogMedication> group = findMedicationGroupRecords(userId, dogId, medicationName);
        DogMedication latest = findLatestMedicationRecord(group);
        UUID latestId = latest != null ? latest.getId() : null;

        deleteOrphanMedicationRemindersInGroup(userId, group, latestId);

        if (latest != null && latest.isNotificationEnabled()) {
            healthReminderSyncService.syncMedicationReminder(latest, userId);
        } else if (latestId != null) {
            healthReminderSyncService.deleteMedicationReminder(latestId, userId);
        }
    }

    /**
     * Logs today's dose as a new history record and schedules the next cycle from the template interval.
     */
    @Transactional
    public MedicationDTO logDose(UUID userId, UUID medicationId) {
        LocalDateTime now = LocalDateTime.now();
        return logDoseAt(userId, medicationId, now.toLocalDate(), now.toLocalTime());
    }

    @Transactional
    public MedicationDTO logDoseAt(UUID userId, UUID medicationId, LocalDate administeredDate, LocalTime administeredTime) {
        DogMedication template = loadOwnedOrThrow(userId, medicationId);
        LocalDate doseDate = administeredDate != null ? administeredDate : LocalDate.now();
        LocalTime doseTime = administeredTime != null ? administeredTime : LocalTime.now();

        DogMedication entity = new DogMedication(
                null,
                template.getDog(),
                template.getMedicationName(),
                doseDate
        );
        entity.setAdministeredTime(doseTime);
        entity.setVetClinicName(template.getVetClinicName());
        entity.setDescription(template.getDescription());
        entity.setNextDueDate(HealthCycleScheduleHelper.computeNextDueAfterAdministration(
                template.getAdministeredDate(),
                template.getNextDueDate(),
                doseDate
        ));
        NotificationSettingsHelper.applyMedicationSettings(
                entity,
                template.isNotificationEnabled(),
                template.getRemindBeforeValue(),
                template.getRemindBeforeUnit(),
                template.getNextDueTime()
        );
        DogMedication saved = medicationRepository.save(entity);
        syncMedicationRemindersForGroup(userId, saved.getDog().getID(), saved.getMedicationName());
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
        syncMedicationRemindersForGroup(userId, m.getDog().getID(), m.getMedicationName());
    }
}
