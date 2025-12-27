package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IDogRepository {
    /**
     * Save a new dog to the database
     * @param dog The dog to save
     * @return The saved dog with generated ID
     */
    Dog save(Dog dog);

    /**
     * Find a dog by ID
     * @param id The UUID of the dog
     * @return Optional containing the dog if found
     */
    Optional<Dog> findById(UUID id);

    /**
     * Delete a dog by ID
     * @param id The UUID of the dog to delete
     */
    void deleteById(UUID id);

    /**
     * Check if a dog with the given ID exists
     * @param id The UUID of the dog
     * @return true if dog exists, false otherwise
     */
    boolean existsById(UUID id);

    /**
     * Find all dogs
     * @return List of all dogs
     */
    List<Dog> findAll();
}
