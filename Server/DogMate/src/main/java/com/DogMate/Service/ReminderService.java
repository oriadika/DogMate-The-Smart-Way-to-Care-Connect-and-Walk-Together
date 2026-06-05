package com.DogMate.Service;

import com.DogMate.Domain.*;
import com.DogMate.Infrastructure.DogRepository;
import com.DogMate.Infrastructure.ReminderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    private final IReminderRepository reminderRepo;
    private final IUserRepository userRepo;
    private final IDogRepository dogRepository;
    private final NotificationScheduleService notificationScheduleService;
    private final UserNotificationPreferencesService preferencesService;


    @Autowired
    public ReminderService(
            IReminderRepository reminderRepo,
            IUserRepository userRepo,
            IDogRepository dogRepository,
            NotificationScheduleService notificationScheduleService,
            UserNotificationPreferencesService preferencesService
    ) {
        this.reminderRepo = reminderRepo;
        this.userRepo = userRepo;
        this.dogRepository = dogRepository;
        this.notificationScheduleService = notificationScheduleService;
        this.preferencesService = preferencesService;
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
        if (reminder.isSystemGenerated()) {
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

        List<Dog> dogs = dogRepository.findAllById(dogIds);
        if (dogs.size() != dogIds.size()) {
            throw new IllegalArgumentException("אחד או יותר מהכלבים לא נמצאו במערכת");
        }

        reminder.setTitle(title);
        reminder.setDescription(description);
        reminder.setRemindAt(remindAt);
        reminder.setDogIds(new LinkedList<>(dogs));

        return reminderRepo.save(reminder);
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

    @Transactional(readOnly = true)
    public List<Reminder> getSchedulableRemindersForUser(UUID userId) {
        boolean globalEnabled = preferencesService.isGlobalNotificationsEnabled(userId);
        LocalDateTime now = LocalDateTime.now();
        return getRemindersForUser(userId).stream()
                .filter(r -> notificationScheduleService.shouldSchedule(globalEnabled, r.isNotificationEnabled()))
                .filter(r -> r.getRemindAt() != null && r.getRemindAt().isAfter(now))
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "remindersByUser", key = "#userId")
    public List<Reminder> getRemindersForUser(UUID userId) {
        var userAcc = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId));

        if (!(userAcc instanceof RegularUser)) {
            throw new IllegalArgumentException("רק משתמשים מסוג בעל כלב יכולים לצפות בתזכורות");
        }

        RegularUser regularUser = (RegularUser) userAcc;
        return reminderRepo.findByRegularUserIdWithDogs(userId);
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

    @Transactional
    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
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
}
