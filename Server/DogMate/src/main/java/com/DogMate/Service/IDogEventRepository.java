package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogEvent;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IDogEventRepository {
    /**
     * Save a new dog event to the database
     * @param dogEvent The dog to save
     * @return The saved dog event with generated ID
     */
    DogEvent save(DogEvent dogEvent);

    /**
     * Find a dog event by ID
     * @param id The UUID of the dog event
     * @return Optional containing the dog event if found
     */
    Optional<DogEvent> findById(UUID id);

    /**
     * Delete a dog event by ID
     * @param id The UUID of the dog event to delete
     */
    void deleteById(UUID id);

    /**
     * Check if a dog event with the given ID exists
     * @param id The UUID of the dog event
     * @return true if dog event exists, false otherwise
     */
    boolean existsById(UUID id);

    /**
     * Find all dog events
     * @return List of all dog events
     */
    List<DogEvent> findAll();
}
