package com.DogMate.Service;

import com.DogMate.Domain.FoodStock;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Applies elapsed calendar-day consumption to food stock levels.
 */
@Service
public class FoodStockConsumptionService {

    private final IFoodStockRepository foodStockRepository;
    private final HealthReminderSyncService healthReminderSyncService;

    public FoodStockConsumptionService(
            IFoodStockRepository foodStockRepository,
            HealthReminderSyncService healthReminderSyncService
    ) {
        this.foodStockRepository = foodStockRepository;
        this.healthReminderSyncService = healthReminderSyncService;
    }

    @Transactional
    @CacheEvict(cacheNames = "foodStocksByUser", key = "#userId")
    public void applyElapsedConsumptionForUser(UUID userId) {
        List<FoodStock> stocks = foodStockRepository.findAllForRegularUserWithDogs(userId);
        for (FoodStock stock : stocks) {
            applyElapsedConsumption(stock);
        }
    }

    /**
     * @return true when stock level or baseline date was persisted
     */
    @Transactional
    boolean applyElapsedConsumption(FoodStock stock) {
        LocalDate anchor = stock.getLevelAdjustedAt();
        if (anchor == null) {
            stock.markLevelAdjustedToday();
            foodStockRepository.save(stock);
            return true;
        }

        LocalDate today = LocalDate.now();
        long elapsedDays = ChronoUnit.DAYS.between(anchor, today);
        if (elapsedDays <= 0 || stock.getDailyConsumptionInGram() <= 0) {
            return false;
        }

        double consumedKg = elapsedDays * stock.getDailyConsumptionInGram() / 1000.0;
        stock.decreaseCurrentLevel(consumedKg);
        stock.setLevelAdjustedAt(anchor.plusDays(elapsedDays));
        foodStockRepository.save(stock);

        if (stock.isNotificationEnabled()) {
            healthReminderSyncService.syncFoodStockReminder(stock);
        }
        return true;
    }
}
