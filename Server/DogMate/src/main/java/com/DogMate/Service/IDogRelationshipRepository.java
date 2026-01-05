package com.DogMate.Service;

import com.DogMate.Domain.DogRelationship;
import java.util.Optional;
import java.util.UUID;

public interface IDogRelationshipRepository {
    /**
     * Save a new dog relationship to the database
     * @param dogRelationship The relationship to save
     * @return The saved relationship with generated ID
     */
    DogRelationship save(DogRelationship dogRelationship);

    /**
     * Find a relationship by ID
     * @param id The UUID of the relationship
     * @return Optional containing the relationship if found
     */
    Optional<DogRelationship> findById(UUID id);

    /**
     * Delete a relationship by ID
     * @param id The UUID of the relationship to delete
     */
    void deleteById(UUID id);

    /**
     * Check if a relationship with the given ID exists
     * @param id The UUID of the relationship
     * @return true if relationship exists, false otherwise
     */
    boolean existsById(UUID id);
}
