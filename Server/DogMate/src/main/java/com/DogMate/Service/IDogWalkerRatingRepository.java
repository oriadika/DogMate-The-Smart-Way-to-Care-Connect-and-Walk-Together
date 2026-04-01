package com.DogMate.Service;

import com.DogMate.Domain.DogWalkerRating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface IDogWalkerRatingRepository extends JpaRepository<DogWalkerRating, UUID> {
    boolean existsByWalkerIdAndOwnerId(UUID walkerId, UUID ownerId);

    List<DogWalkerRating> findByWalkerIdOrderByCreatedAtDesc(UUID walkerId);
}
