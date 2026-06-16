package com.DogMate.Service;

import com.DogMate.Domain.FoodStock;
import com.DogMate.DTO.SchedulableNotificationDTO;
import com.DogMate.Infrastructure.DogMedicationRepository;
import com.DogMate.Infrastructure.DogVaccinationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationResyncService {

    private final UserNotificationPreferencesService preferencesService;
    private final ReminderService reminderService;
    private final DogMedicationRepository medicationRepository;
    private final DogVaccinationRepository vaccinationRepository;
    private final DogService dogService;
    private final NotificationScheduleService scheduleService;

    public NotificationResyncService(
            UserNotificationPreferencesService preferencesService,
            ReminderService reminderService,
            DogMedicationRepository medicationRepository,
            DogVaccinationRepository vaccinationRepository,
            DogService dogService,
            NotificationScheduleService scheduleService
    ) {
        this.preferencesService = preferencesService;
        this.reminderService = reminderService;
        this.medicationRepository = medicationRepository;
        this.vaccinationRepository = vaccinationRepository;
        this.dogService = dogService;
        this.scheduleService = scheduleService;
    }

    @Transactional(readOnly = true)
    public List<SchedulableNotificationDTO> getSchedulableNotifications(UUID userId) {
        boolean globalEnabled = preferencesService.isGlobalNotificationsEnabled(userId);

        // System health reminders (medication / vaccination / food) are scheduled via the
        // entity-specific builders below — exclude them from manual to avoid duplicate push.
        List<SchedulableNotificationDTO> manual = scheduleService.buildManualReminderTriggers(
                reminderService.getRemindersForUser(userId).stream()
                        .filter(r -> !r.isSystemGenerated())
                        .toList(),
                globalEnabled
        );
        List<SchedulableNotificationDTO> medications = scheduleService.buildMedicationTriggers(
                medicationRepository.findAllForRegularUser(userId),
                globalEnabled
        );
        List<SchedulableNotificationDTO> vaccinations = scheduleService.buildVaccinationTriggers(
                vaccinationRepository.findAllForRegularUser(userId),
                globalEnabled
        );

        List<FoodStock> foodStocks = dogService.getUserFoodStockEntities(userId);

        List<SchedulableNotificationDTO> food = scheduleService.buildFoodStockTriggers(foodStocks, globalEnabled);

        return scheduleService.mergeTriggers(manual, medications, vaccinations, food);
    }
}
