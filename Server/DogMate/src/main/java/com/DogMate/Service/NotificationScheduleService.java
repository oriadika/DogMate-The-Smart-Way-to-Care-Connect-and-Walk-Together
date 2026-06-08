package com.DogMate.Service;

import com.DogMate.Domain.DogMedication;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.Domain.FoodStock;
import com.DogMate.Domain.MedicationFrequencyType;
import com.DogMate.Domain.RemindBeforeUnit;
import com.DogMate.Domain.Reminder;
import com.DogMate.DTO.SchedulableNotificationDTO;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationScheduleService {

    static final LocalTime DEFAULT_NOTIFICATION_TIME = LocalTime.of(9, 0);
    static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int MAX_MEDICATION_TRIGGERS = 48;
    static final int SCHEDULE_HORIZON_DAYS = 30;

    public boolean shouldSchedule(boolean globalEnabled, boolean itemEnabled) {
        return globalEnabled && itemEnabled;
    }

    public List<LocalTime> parseScheduleTimes(String scheduleTimes) {
        if (scheduleTimes == null || scheduleTimes.isBlank()) {
            return List.of(DEFAULT_NOTIFICATION_TIME);
        }
        List<LocalTime> parsed = Arrays.stream(scheduleTimes.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(this::parseTime)
                .sorted()
                .toList();
        return parsed.isEmpty() ? List.of(DEFAULT_NOTIFICATION_TIME) : parsed;
    }

    public List<Integer> parseRemindDaysBefore(String remindDaysBefore) {
        if (remindDaysBefore == null || remindDaysBefore.isBlank()) {
            return List.of(7);
        }
        List<Integer> days = Arrays.stream(remindDaysBefore.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Integer.parseInt(s);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                })
                .filter(d -> d != null && d > 0)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .toList();
        return days.isEmpty() ? List.of(7) : days;
    }

    public List<LocalDateTime> computeMedicationTriggers(
            String scheduleTimes,
            MedicationFrequencyType frequencyType,
            int frequencyInterval,
            LocalDateTime from,
            LocalDateTime until
    ) {
        List<LocalTime> times = parseScheduleTimes(scheduleTimes);
        int interval = Math.max(1, frequencyInterval);
        Set<LocalDateTime> triggers = new LinkedHashSet<>();

        switch (frequencyType) {
            case HOURLY -> {
                LocalTime anchor = times.get(0);
                LocalDateTime cursor = from.toLocalDate().atTime(anchor);
                if (cursor.isBefore(from)) {
                    long hoursToAdd = interval - ((from.toLocalTime().toSecondOfDay() - anchor.toSecondOfDay()) / 3600) % interval;
                    if (hoursToAdd == interval && !cursor.isBefore(from)) {
                        hoursToAdd = 0;
                    }
                    cursor = from.plusHours(hoursToAdd == interval ? 0 : hoursToAdd);
                    if (cursor.isBefore(from)) {
                        cursor = cursor.plusHours(interval);
                    }
                }
                while (!cursor.isAfter(until) && triggers.size() < MAX_MEDICATION_TRIGGERS) {
                    if (!cursor.isBefore(from)) {
                        triggers.add(cursor);
                    }
                    cursor = cursor.plusHours(interval);
                }
            }
            case EVERY_X_DAYS -> {
                LocalTime time = times.get(0);
                LocalDate day = from.toLocalDate();
                LocalDateTime candidate = day.atTime(time);
                if (candidate.isBefore(from)) {
                    day = day.plusDays(interval);
                    candidate = day.atTime(time);
                }
                while (!candidate.isAfter(until) && triggers.size() < MAX_MEDICATION_TRIGGERS) {
                    triggers.add(candidate);
                    candidate = candidate.plusDays(interval);
                }
            }
            case DAILY -> {
                LocalDate day = from.toLocalDate();
                LocalDate endDay = until.toLocalDate();
                while (!day.isAfter(endDay) && triggers.size() < MAX_MEDICATION_TRIGGERS) {
                    for (LocalTime time : times) {
                        LocalDateTime candidate = day.atTime(time);
                        if (!candidate.isBefore(from) && !candidate.isAfter(until)) {
                            triggers.add(candidate);
                        }
                    }
                    day = day.plusDays(1);
                }
            }
        }

        return triggers.stream().sorted().limit(MAX_MEDICATION_TRIGGERS).toList();
    }

    public int resolveRemindDaysBefore(String remindDaysBefore) {
        List<Integer> parsed = parseRemindDaysBefore(remindDaysBefore);
        return parsed.isEmpty() ? 7 : parsed.get(0);
    }

    /** Single home/push trigger: N days before vaccination (mirrors food low-stock math). */
    public LocalDateTime computeVaccinationReminderTrigger(LocalDate nextDueDate, String remindDaysBefore) {
        if (nextDueDate == null) {
            return null;
        }
        int daysBefore = resolveRemindDaysBefore(remindDaysBefore);
        if (daysBefore <= 0) {
            return null;
        }
        long daysUntilDue = ChronoUnit.DAYS.between(LocalDate.now(), nextDueDate);
        if (daysUntilDue <= daysBefore) {
            return LocalDateTime.now().plusMinutes(1);
        }
        long daysUntilReminder = daysUntilDue - daysBefore;
        return LocalDate.now().plusDays(daysUntilReminder).atTime(DEFAULT_NOTIFICATION_TIME);
    }

    public List<LocalDateTime> computeVaccinationTriggers(LocalDate nextDueDate, String remindDaysBefore) {
        LocalDateTime trigger = computeVaccinationReminderTrigger(nextDueDate, remindDaysBefore);
        if (trigger == null || trigger.isBefore(LocalDateTime.now())) {
            return List.of();
        }
        return List.of(trigger);
    }

    /** Single home/push trigger: lead time before next medication dose date + time. */
    public LocalDateTime computeMedicationReminderTrigger(DogMedication medication) {
        if (medication == null || medication.getNextDueDate() == null) {
            return null;
        }
        Integer leadValue = medication.getRemindBeforeValue();
        if (leadValue == null || leadValue <= 0) {
            return null;
        }
        LocalTime dueTime = medication.getNextDueTime() != null
                ? medication.getNextDueTime()
                : DEFAULT_NOTIFICATION_TIME;
        LocalDateTime dueAt = medication.getNextDueDate().atTime(dueTime);
        Duration lead = toLeadDuration(medication.getRemindBeforeUnit(), leadValue);
        LocalDateTime trigger = dueAt.minus(lead);
        LocalDateTime now = LocalDateTime.now();
        if (!trigger.isAfter(now)) {
            return now.plusMinutes(1);
        }
        return trigger;
    }

    static Duration toLeadDuration(RemindBeforeUnit unit, int value) {
        return switch (unit != null ? unit : RemindBeforeUnit.DAYS) {
            case HOURS -> Duration.ofHours(value);
            case MINUTES -> Duration.ofMinutes(value);
            case DAYS -> Duration.ofDays(value);
        };
    }

    public LocalDateTime computeFoodLowStockTrigger(FoodStock stock) {
        Integer thresholdDays = stock.getLowStockThresholdDays();
        if (thresholdDays == null || thresholdDays <= 0) {
            return null;
        }
        if (stock.getDailyConsumptionInGram() <= 0) {
            return null;
        }

        long daysRemaining = stock.computeDaysRemaining();
        if (daysRemaining <= thresholdDays) {
            return LocalDateTime.now().plusMinutes(1);
        }

        long daysUntilReminder = daysRemaining - thresholdDays;
        return LocalDate.now().plusDays(daysUntilReminder).atTime(DEFAULT_NOTIFICATION_TIME);
    }

    public List<SchedulableNotificationDTO> buildManualReminderTriggers(
            List<Reminder> reminders,
            boolean globalEnabled
    ) {
        LocalDateTime now = LocalDateTime.now();
        return reminders.stream()
                .filter(r -> shouldSchedule(globalEnabled, r.isNotificationEnabled()))
                .filter(r -> r.getRemindAt() != null && r.getRemindAt().isAfter(now))
                .map(r -> new SchedulableNotificationDTO(
                        "REMINDER",
                        r.getId(),
                        r.getTitle(),
                        r.getDescription() != null ? r.getDescription() : "זמן לתזכורת!",
                        r.getRemindAt().format(ISO_FORMATTER)
                ))
                .toList();
    }

    public List<SchedulableNotificationDTO> buildMedicationTriggers(
            List<DogMedication> medications,
            boolean globalEnabled
    ) {
        List<SchedulableNotificationDTO> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (DogMedication med : medications) {
            if (!shouldSchedule(globalEnabled, med.isNotificationEnabled())) {
                continue;
            }
            LocalDateTime trigger = computeMedicationReminderTrigger(med);
            if (trigger == null || trigger.isBefore(now)) {
                continue;
            }
            String dogName = med.getDog() != null ? med.getDog().getName() : "כלב";
            result.add(new SchedulableNotificationDTO(
                    "MEDICATION",
                    med.getId(),
                    "תזכורת תרופה: " + med.getMedicationName(),
                    "הגיע הזמן לתת ל-" + dogName + " את " + med.getMedicationName(),
                    trigger.format(ISO_FORMATTER)
            ));
        }
        return result;
    }

    public List<SchedulableNotificationDTO> buildVaccinationTriggers(
            List<DogVaccination> vaccinations,
            boolean globalEnabled
    ) {
        List<SchedulableNotificationDTO> result = new ArrayList<>();
        for (DogVaccination v : vaccinations) {
            if (!shouldSchedule(globalEnabled, v.isNotificationEnabled())) {
                continue;
            }
            String dogName = v.getDog() != null ? v.getDog().getName() : "כלב";
            for (LocalDateTime trigger : computeVaccinationTriggers(v.getNextDueDate(), v.getRemindDaysBefore())) {
                result.add(new SchedulableNotificationDTO(
                        "VACCINATION",
                        v.getId(),
                        "תזכורת חיסון: " + v.getVaccineName(),
                        "חיסון " + v.getVaccineName() + " עבור " + dogName + " מתקרב",
                        trigger.format(ISO_FORMATTER)
                ));
            }
        }
        return result;
    }

    public List<SchedulableNotificationDTO> buildFoodStockTriggers(
            List<FoodStock> stocks,
            boolean globalEnabled
    ) {
        List<SchedulableNotificationDTO> result = new ArrayList<>();
        for (FoodStock stock : stocks) {
            if (!shouldSchedule(globalEnabled, stock.isNotificationEnabled())) {
                continue;
            }
            LocalDateTime trigger = computeFoodLowStockTrigger(stock);
            if (trigger == null || trigger.isBefore(LocalDateTime.now())) {
                continue;
            }
            Integer thresholdDays = stock.getLowStockThresholdDays();
            String brand = stock.getBrandName() != null ? stock.getBrandName() : "מזון";
            result.add(new SchedulableNotificationDTO(
                    "FOOD",
                    stock.getId(),
                    "מלאי מזון נמוך",
                    "לשק " + brand + " נשארו כ-" + thresholdDays + " ימים",
                    trigger.format(ISO_FORMATTER)
            ));
        }
        return result;
    }

    public List<SchedulableNotificationDTO> mergeTriggers(List<SchedulableNotificationDTO>... lists) {
        return Arrays.stream(lists)
                .flatMap(List::stream)
                .sorted(Comparator.comparing(SchedulableNotificationDTO::triggerAt))
                .collect(Collectors.toList());
    }

    private LocalTime parseTime(String raw) {
        String[] parts = raw.split(":");
        int hour = Integer.parseInt(parts[0].trim());
        int minute = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 0;
        return LocalTime.of(hour, minute);
    }
}
