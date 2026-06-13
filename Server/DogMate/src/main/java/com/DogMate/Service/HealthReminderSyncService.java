package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.DogRelationship;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.MedicationFrequencyType;
import com.DogMate.Domain.ReminderSourceType;
import com.DogMate.Infrastructure.DogRelationshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class HealthReminderSyncService {

    private static final String FOOD_TITLE_PREFIX = "לקנות אוכל ל";

    private final ReminderService reminderService;
    private final NotificationScheduleService notificationScheduleService;
    private final DogRelationshipRepository dogRelationshipRepository;

    public HealthReminderSyncService(
            ReminderService reminderService,
            NotificationScheduleService notificationScheduleService,
            DogRelationshipRepository dogRelationshipRepository
    ) {
        this.reminderService = reminderService;
        this.notificationScheduleService = notificationScheduleService;
        this.dogRelationshipRepository = dogRelationshipRepository;
    }

    @Transactional
    public void syncFoodStockReminder(FoodStock stock) {
        if (stock == null || stock.getId() == null) {
            return;
        }

        UUID userId = resolveUserIdFromFoodStock(stock);
        if (userId == null) {
            return;
        }

        if (!stock.isNotificationEnabled()) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.FOOD, stock.getId());
            return;
        }

        LocalDateTime remindAt = notificationScheduleService.computeFoodLowStockTrigger(stock);
        if (remindAt == null) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.FOOD, stock.getId());
            return;
        }

        List<Dog> dogs = stock.getDogs();
        if (dogs == null || dogs.isEmpty()) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.FOOD, stock.getId());
            return;
        }

        List<UUID> dogIds = dogs.stream().map(Dog::getID).toList();
        String title = buildFoodReminderTitle(dogs);
        String description = buildFoodReminderDescription(dogs);

        reminderService.upsertSystemReminder(
                userId,
                ReminderSourceType.FOOD,
                stock.getId(),
                dogIds,
                title,
                description,
                remindAt,
                true
        );
    }

    static String buildFoodReminderTitle(List<Dog> dogs) {
        return FOOD_TITLE_PREFIX + formatDogNamesHebrew(dogs);
    }

    static String buildFoodReminderDescription(List<Dog> dogs) {
        return "מלאי המזון של " + formatDogNamesHebrew(dogs) + " עומד להיגמר בקרוב...";
    }

    static String formatDogNamesHebrew(List<Dog> dogs) {
        List<String> names = dogs.stream()
                .map(Dog::getName)
                .filter(name -> name != null && !name.isBlank())
                .map(String::trim)
                .toList();
        if (names.isEmpty()) {
            return "כלב";
        }
        if (names.size() == 1) {
            return names.get(0);
        }
        if (names.size() == 2) {
            return names.get(0) + " ו" + names.get(1);
        }
        String last = names.get(names.size() - 1);
        String rest = String.join(", ", names.subList(0, names.size() - 1));
        return rest + " ו" + last;
    }

    @Transactional
    public void deleteFoodStockReminder(UUID foodStockId) {
        reminderService.deleteSystemReminderBySource(ReminderSourceType.FOOD, foodStockId);
    }

    @Transactional
    public void syncVaccinationReminder(DogVaccination vaccination, UUID userId) {
        if (vaccination == null || vaccination.getId() == null || userId == null) {
            return;
        }

        if (!vaccination.isNotificationEnabled() || vaccination.getNextDueDate() == null) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.VACCINATION, vaccination.getId());
            return;
        }

        LocalDateTime nextTrigger = notificationScheduleService.computeVaccinationReminderTrigger(
                vaccination.getNextDueDate(),
                vaccination.getRemindDaysBefore()
        );
        if (nextTrigger == null || nextTrigger.isBefore(LocalDateTime.now())) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.VACCINATION, vaccination.getId());
            return;
        }

        Dog dog = vaccination.getDog();
        String dogName = dog != null && dog.getName() != null ? dog.getName() : "כלב";
        UUID dogId = dog != null ? dog.getID() : null;
        if (dogId == null) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.VACCINATION, vaccination.getId());
            return;
        }

        String vaccineName = vaccination.getVaccineName() != null ? vaccination.getVaccineName() : "חיסון";
        reminderService.upsertSystemReminder(
                userId,
                ReminderSourceType.VACCINATION,
                vaccination.getId(),
                List.of(dogId),
                "חיסון: " + vaccineName,
                "הגיע הזמן לתאם חיסון " + vaccineName + " עבור " + dogName,
                nextTrigger,
                true
        );
    }

    @Transactional
    public void deleteVaccinationReminder(UUID vaccinationId, UUID userId) {
        reminderService.deleteSystemReminder(userId, ReminderSourceType.VACCINATION, vaccinationId);
    }

    @Transactional
    public void syncMedicationReminder(DogMedication medication, UUID userId) {
        if (medication == null || medication.getId() == null || userId == null) {
            return;
        }

        if (!medication.isNotificationEnabled()) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.MEDICATION, medication.getId());
            return;
        }

        LocalDateTime remindAt = notificationScheduleService.computeMedicationReminderTrigger(medication);
        if (remindAt == null || remindAt.isBefore(LocalDateTime.now())) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.MEDICATION, medication.getId());
            return;
        }

        Dog dog = medication.getDog();
        String dogName = dog != null && dog.getName() != null ? dog.getName() : "כלב";
        UUID dogId = dog != null ? dog.getID() : null;
        if (dogId == null) {
            reminderService.deleteSystemReminder(userId, ReminderSourceType.MEDICATION, medication.getId());
            return;
        }

        String medName = medication.getMedicationName() != null ? medication.getMedicationName() : "תרופה";
        reminderService.upsertSystemReminder(
                userId,
                ReminderSourceType.MEDICATION,
                medication.getId(),
                List.of(dogId),
                "תרופה: " + medName,
                "הגיע הזמן לתת ל-" + dogName + " את " + medName,
                remindAt,
                true
        );
    }

    @Transactional
    public void deleteMedicationReminder(UUID medicationId, UUID userId) {
        reminderService.deleteSystemReminder(userId, ReminderSourceType.MEDICATION, medicationId);
    }

    private UUID resolveUserIdFromFoodStock(FoodStock stock) {
        if (stock.getDogs() == null || stock.getDogs().isEmpty()) {
            return null;
        }
        for (Dog dog : stock.getDogs()) {
            UUID userId = resolveUserIdFromDog(dog);
            if (userId != null) {
                return userId;
            }
        }
        return null;
    }

    private UUID resolveUserIdFromDog(Dog dog) {
        if (dog == null || dog.getID() == null) {
            return null;
        }
        List<DogRelationship> relationships = dogRelationshipRepository.findByDog_ID(dog.getID());
        if (relationships.isEmpty()) {
            return null;
        }
        return relationships.get(0).getUserID();
    }
}
