package com.DogMate.Service;

import com.DogMate.Domain.FoodStock;
import java.util.Optional;
import java.util.UUID;

public interface IFoodStockRepository {
    /**
     * Save a new food stock to the database
     * @param foodStock The food stock to save
     * @return The saved food stock with generated ID
     */
    FoodStock save(FoodStock foodStock);

    /**
     * Find a food stock by ID
     * @param id The UUID of the food stock
     * @return Optional containing the food stock if found
     */
    Optional<FoodStock> findById(UUID id);

    /**
     * Delete a food stock by ID
     * @param id The UUID of the food stock to delete
     */
    void deleteById(UUID id);

    /**
     * Check if a food stock with the given ID exists
     * @param id The UUID of the food stock
     * @return true if food stock exists, false otherwise
     */
    boolean existsById(UUID id);
}
