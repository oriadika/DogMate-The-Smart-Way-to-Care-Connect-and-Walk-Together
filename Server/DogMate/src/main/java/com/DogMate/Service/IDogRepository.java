package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.UserAccount;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * Find dogs by primary keys (implemented by JpaRepository on {@code DogRepository}).
     */
    List<Dog> findAllById(Iterable<UUID> ids);

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

    @Query("""
        SELECT d FROM Dog d
        WHERE LOWER(d.name) LIKE LOWER(CONCAT('%', :text, '%'))
           OR LOWER(d.breed) LIKE LOWER(CONCAT('%', :text, '%'))
    """)
    List<Dog> searchDogs(@Param("text") String text);

    /**
     * Dogs linked to this regular user via {@code dog_relationships} — one query instead of
     * {@code findAll()} plus lazy N+1 loads (which timed out the mobile client on remote DB).
     */
    @Query("""
        SELECT DISTINCT d FROM Dog d
        INNER JOIN d.dogRelationships dr
        LEFT JOIN FETCH d.foodStock
        WHERE dr.regularUser.id = :userId
        """)
    List<Dog> findAllForRegularUser(@Param("userId") UUID userId);

}
