package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogRelationship;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.Reminder;
import com.DogMate.Domain.ReminderSourceType;
import com.DogMate.Infrastructure.DogRepository;
import com.DogMate.Infrastructure.ReminderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.DogVaccination;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    static final int MAX_DESCRIPTION_LENGTH = 200;

    private final IReminderRepository reminderRepo;
    private final IUserRepository userRepo;
    private final IDogRepository dogRepository;
    private final NotificationScheduleService notificationScheduleService;
    private final UserNotificationPreferencesService preferencesService;
    private final DogService dogService;
    private final VaccinationService vaccinationService;
    private final MedicationService medicationService;


    @Autowired
    public ReminderService(
            IReminderRepository reminderRepo,
            IUserRepository userRepo,
            IDogRepository dogRepository,
            NotificationScheduleService notificationScheduleService,
            UserNotificationPreferencesService preferencesService,
            @Lazy DogService dogService,
            @Lazy VaccinationService vaccinationService,
            @Lazy MedicationService medicationService
    ) {
        this.reminderRepo = reminderRepo;
        this.userRepo = userRepo;
        this.dogRepository = dogRepository;
        this.notificationScheduleService = notificationScheduleService;
        this.preferencesService = preferencesService;
        this.dogService = dogService;
        this.vaccinationService = vaccinationService;
        this.medicationService = medicationService;
    }

    private static boolean isEditableHealthSystemReminder(Reminder reminder) {
        if (!reminder.isSystemGenerated() || reminder.getSourceId() == null) {
            return false;
        }
        String type = reminder.getSourceType();
        return ReminderSourceType.FOOD.equals(type)
                || ReminderSourceType.VACCINATION.equals(type)
                || ReminderSourceType.MEDICATION.equals(type);
    }

    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public Reminder createReminder(UUID userId, LinkedList<UUID> dogIds, String title,
                                   LocalDateTime remindAt, String description) {
        if (userRepo.findById(userId).isEmpty()){
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        RegularUser user = (RegularUser) userRepo.findById(userId).get();

        Set<UUID> ownedDogIds = user.getDogRelationships().stream()
                .map(DogRelationship::getDogID)
                .collect(Collectors.toSet());

        for (UUID dogId : dogIds) {
            if (!ownedDogIds.contains(dogId)) {
                throw new IllegalArgumentException("אחד או יותר מהכלבים אינם משויכים למשתמש");
            }
        }

        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("חובה להזין כותרת");
        }

        if (remindAt == null || remindAt.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("מועד התזכורת חייב להיות בעתיד");
        }

        description = normalizeDescription(description);

        List<Dog> dogs = dogRepository.findAllById(dogIds);
        if (dogs.size() != dogIds.size()) {
            throw new IllegalArgumentException("אחד או יותר מהכלבים לא נמצאו במערכת");
        }

        Reminder r = new Reminder(user,
                new LinkedList<>(dogs), title, remindAt, description);

        return reminderRepo.save(r);
    }

    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public Reminder updateReminder(UUID userId, UUID reminderId, LinkedList<UUID> dogIds, String title,
                                   LocalDateTime remindAt, String description) {
        var reminderOpt = reminderRepo.findById(reminderId);
        if (reminderOpt.isEmpty()) {
            throw new IllegalArgumentException("התזכורת לא נמצאה");
        }

        Reminder reminder = reminderOpt.get();
        if (!reminder.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("אין הרשאה לערוך תזכורת זו");
        }
        if (reminder.isSystemGenerated() && !isEditableHealthSystemReminder(reminder)) {
            throw new IllegalArgumentException("לא ניתן לערוך תזכורת שנוצרה אוטומטית מהמערכת");
        }

        if (userRepo.findById(userId).isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }

        RegularUser user = (RegularUser) userRepo.findById(userId).get();

        Set<UUID> ownedDogIds = user.getDogRelationships().stream()
                .map(DogRelationship::getDogID)
                .collect(Collectors.toSet());

        for (UUID dogId : dogIds) {
            if (!ownedDogIds.contains(dogId)) {
                throw new IllegalArgumentException("אחד או יותר מהכלבים אינם משויכים למשתמש");
            }
        }

        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("חובה להזין כותרת");
        }

        if (remindAt == null || remindAt.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("מועד התזכורת חייב להיות בעתיד");
        }

        description = normalizeDescription(description);

        List<Dog> dogs = dogRepository.findAllById(dogIds);
        if (dogs.size() != dogIds.size()) {
            throw new IllegalArgumentException("אחד או יותר מהכלבים לא נמצאו במערכת");
        }

        reminder.setTitle(title);
        reminder.setDescription(description);
        reminder.setRemindAt(remindAt);
        reminder.setDogIds(new LinkedList<>(dogs));

        if (reminder.isSystemGenerated() && isEditableHealthSystemReminder(reminder)) {
            reminder.setNotificationEnabled(true);
        }

        Reminder saved = reminderRepo.save(reminder);

        if (saved.isSystemGenerated() && saved.getSourceId() != null) {
            if (ReminderSourceType.FOOD.equals(saved.getSourceType())) {
                dogService.syncFoodStockFromReminderEdit(saved.getSourceId(), dogIds, remindAt);
            } else if (ReminderSourceType.VACCINATION.equals(saved.getSourceType())) {
                vaccinationService.syncVaccinationFromReminderEdit(saved.getSourceId(), userId);
            } else if (ReminderSourceType.MEDICATION.equals(saved.getSourceType())) {
                medicationService.syncMedicationFromReminderEdit(saved.getSourceId(), userId);
            }
        }

        return saved;
    }

    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public boolean removeReminder(UUID userId, UUID reminderId) {
        var reminderOpt = reminderRepo.findById(reminderId);
        if (reminderOpt.isEmpty()) return false;

        Reminder r = reminderOpt.get();
        if (!r.getUser().getId().equals(userId)) return false;
        if (r.isSystemGenerated()) {
            throw new IllegalArgumentException("לא ניתן למחוק תזכורת שנוצרה אוטומטית מהמערכת");
        }

        reminderRepo.deleteById(reminderId);
        return true;
    }

    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public void processExpiredReminders(UUID userId) {
        processExpiredRemindersInternal(userId);
    }

    /**
     * Read-only list for GET /reminders — no maintenance side effects (fast home load).
     */
    @Transactional(readOnly = true)
    public List<Reminder> getRemindersForUser(UUID userId) {
        return listActiveRemindersForUser(userId);
    }

    private List<Reminder> listActiveRemindersForUser(UUID userId) {
        var userAcc = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId));

        if (!(userAcc instanceof RegularUser)) {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לצפות בתזכורות");
        }

        LocalDateTime now = LocalDateTime.now();
        return reminderRepo.findByRegularUserIdWithDogs(userId).stream()
                .filter(r -> r.getRemindAt() != null && r.getRemindAt().isAfter(now))
                .toList();
    }

    /**
     * Marks a reminder as completed from home: logs health actions for system reminders
     * (medication dose, vaccination, food acknowledgment) or deletes manual reminders.
     */
    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public void completeReminder(UUID userId, UUID reminderId) {
        completeReminder(userId, reminderId, null);
    }

    /**
     * Marks a reminder as completed. Vaccinations always log the planned due date.
     * Medications log now when on time; overdue doses require {@code administeredAtChoice}.
     */
    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public void completeReminder(UUID userId, UUID reminderId, LocalDateTime administeredAtChoice) {
        Reminder reminder = reminderRepo.findById(reminderId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצאה תזכורת"));

        if (!reminder.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("אין הרשאה לתזכורת זו");
        }

        if (reminder.isSystemGenerated()
                && reminder.getSourceType() != null
                && reminder.getSourceId() != null) {
            String sourceType = reminder.getSourceType();
            UUID sourceId = reminder.getSourceId();

            if (ReminderSourceType.MEDICATION.equals(sourceType)) {
                completeMedicationReminderFromReminder(userId, sourceId, administeredAtChoice);
            } else if (ReminderSourceType.VACCINATION.equals(sourceType)) {
                completeVaccinationReminderFromReminder(userId, sourceId);
            } else if (ReminderSourceType.FOOD.equals(sourceType)) {
                dogService.disableFoodStockReminderAfterFired(sourceId);
            } else {
                deleteSystemReminder(userId, sourceType, sourceId);
            }
            return;
        }

        reminderRepo.deleteById(reminderId);
    }

    private void completeMedicationReminderFromReminder(
            UUID userId,
            UUID medicationId,
            LocalDateTime administeredAtChoice
    ) {
        DogMedication template = medicationService.findOwnedMedication(userId, medicationId);
        LocalDateTime plannedDue = notificationScheduleService.resolveMedicationPlannedDueAt(template);
        LocalDateTime now = LocalDateTime.now();

        LocalDateTime administeredAt;
        if (administeredAtChoice != null) {
            administeredAt = administeredAtChoice;
        } else if (plannedDue == null || !plannedDue.isBefore(now)) {
            administeredAt = now;
        } else {
            throw new IllegalArgumentException("יש לבחור מתי ניתנה התרופה");
        }

        completeMedicationReminder(userId, medicationId, administeredAt);
    }

    private void completeVaccinationReminderFromReminder(UUID userId, UUID vaccinationId) {
        DogVaccination template = vaccinationService.findOwnedVaccination(userId, vaccinationId);
        LocalDateTime plannedDue = notificationScheduleService.resolveVaccinationPlannedDueAt(template);
        LocalDate administeredDate = plannedDue != null ? plannedDue.toLocalDate() : LocalDate.now();
        completeVaccinationReminder(userId, vaccinationId, administeredDate.atStartOfDay());
    }

    private void completeMedicationReminder(UUID userId, UUID medicationId, LocalDateTime administeredAt) {
        medicationService.logDoseAt(
                userId,
                medicationId,
                administeredAt.toLocalDate(),
                administeredAt.toLocalTime()
        );
        deleteSystemReminder(userId, ReminderSourceType.MEDICATION, medicationId);
    }

    private void completeVaccinationReminder(UUID userId, UUID vaccinationId, LocalDateTime administeredAt) {
        vaccinationService.logDoseAt(userId, vaccinationId, administeredAt.toLocalDate(), false);
        deleteSystemReminder(userId, ReminderSourceType.VACCINATION, vaccinationId);
    }

    private void processExpiredRemindersInternal(UUID userId) {
        LocalDateTime now = LocalDateTime.now();
        List<Reminder> expired = reminderRepo.findByRegularUserIdWithDogs(userId).stream()
                .filter(r -> r.getRemindAt() != null && !r.getRemindAt().isAfter(now))
                .toList();

        for (Reminder reminder : expired) {
            if (reminder.isSystemGenerated()
                    && ReminderSourceType.FOOD.equals(reminder.getSourceType())
                    && reminder.getSourceId() != null) {
                dogService.disableFoodStockReminderAfterFired(reminder.getSourceId());
            } else if (reminder.isSystemGenerated()
                    && ReminderSourceType.VACCINATION.equals(reminder.getSourceType())
                    && reminder.getSourceId() != null) {
                vaccinationService.resyncVaccinationReminderAfterFired(reminder.getSourceId(), userId);
            } else if (reminder.isSystemGenerated()
                    && ReminderSourceType.MEDICATION.equals(reminder.getSourceType())
                    && reminder.getSourceId() != null) {
                medicationService.resyncMedicationReminderAfterFired(reminder.getSourceId(), userId);
            } else if (reminder.isSystemGenerated()
                    && reminder.getSourceType() != null
                    && reminder.getSourceId() != null) {
                deleteSystemReminder(userId, reminder.getSourceType(), reminder.getSourceId());
            } else {
                reminderRepo.deleteById(reminder.getId());
            }
        }
    }

    @Transactional
    public List<Reminder> getSchedulableRemindersForUser(UUID userId) {
        boolean globalEnabled = preferencesService.isGlobalNotificationsEnabled(userId);
        LocalDateTime now = LocalDateTime.now();
        return getRemindersForUser(userId).stream()
                .filter(r -> notificationScheduleService.shouldSchedule(globalEnabled, r.isNotificationEnabled()))
                .filter(r -> r.getRemindAt() != null && r.getRemindAt().isAfter(now))
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    public void removeDogFromAllReminders(UUID dogId) {
        List<Reminder> affected = reminderRepo.findAllByDogIdWithDogs(dogId);
        List<UUID> remindersToDelete = new ArrayList<>();
        for (Reminder r : affected) {
            r.getDogIds().removeIf(dog -> dog.getID().equals(dogId));
            if (r.getDogIds().isEmpty()) {
                remindersToDelete.add(r.getId());
            } else {
                reminderRepo.save(r);
            }
        }
        for (UUID reminderId : remindersToDelete) {
            reminderRepo.deleteById(reminderId);
        }
    }

    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public Reminder upsertSystemReminder(
            UUID userId,
            String sourceType,
            UUID sourceId,
            List<UUID> dogIds,
            String title,
            String description,
            LocalDateTime remindAt,
            boolean notificationEnabled
    ) {
        if (!notificationEnabled || remindAt == null) {
            deleteSystemReminder(userId, sourceType, sourceId);
            return null;
        }

        if (userRepo.findById(userId).isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        RegularUser user = (RegularUser) userRepo.findById(userId).get();

        List<Dog> dogs = dogRepository.findAllById(dogIds);
        if (dogs.size() != dogIds.size()) {
            throw new IllegalArgumentException("אחד או יותר מהכלבים לא נמצאו במערכת");
        }

        Optional<Reminder> existing = reminderRepo.findBySourceTypeAndSourceIdWithDogs(sourceType, sourceId);
        if (existing.isPresent()) {
            Reminder reminder = existing.get();
            if (!reminder.getUser().getId().equals(userId)) {
                throw new IllegalArgumentException("תזכורת המערכת משויכת למשתמש אחר");
            }
            reminder.setTitle(title);
            reminder.setDescription(description);
            reminder.setRemindAt(remindAt);
            reminder.setDogIds(new LinkedList<>(dogs));
            reminder.setNotificationEnabled(notificationEnabled);
            return reminderRepo.save(reminder);
        }

        Reminder reminder = new Reminder(
                user,
                new LinkedList<>(dogs),
                title,
                remindAt,
                description
        );
        reminder.setSourceType(sourceType);
        reminder.setSourceId(sourceId);
        reminder.setSystemGenerated(true);
        reminder.setNotificationEnabled(notificationEnabled);
        return reminderRepo.save(reminder);
    }

    public boolean hasActiveSystemReminder(UUID userId, String sourceType, UUID sourceId) {
        if (userId == null || sourceType == null || sourceId == null) {
            return false;
        }
        return reminderRepo.findBySourceTypeAndSourceIdWithDogs(sourceType, sourceId)
                .filter(reminder -> reminder.getUser().getId().equals(userId))
                .map(Reminder::getRemindAt)
                .filter(remindAt -> remindAt.isAfter(LocalDateTime.now()))
                .isPresent();
    }

    public void deleteSystemReminder(UUID userId, String sourceType, UUID sourceId) {
        reminderRepo.findBySourceTypeAndSourceId(sourceType, sourceId)
                .filter(r -> r.getUser().getId().equals(userId))
                .ifPresent(r -> reminderRepo.deleteById(r.getId()));
    }

    @Transactional
    public void deleteSystemReminderBySource(String sourceType, UUID sourceId) {
        reminderRepo.findBySourceTypeAndSourceIdWithDogs(sourceType, sourceId).ifPresent(r -> {
            deleteSystemReminder(r.getUser().getId(), sourceType, sourceId);
        });
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        if (trimmed.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("תיאור התזכורת מוגבל ל-" + MAX_DESCRIPTION_LENGTH + " תווים");
        }
        return trimmed.isEmpty() ? null : trimmed;
    }
}
