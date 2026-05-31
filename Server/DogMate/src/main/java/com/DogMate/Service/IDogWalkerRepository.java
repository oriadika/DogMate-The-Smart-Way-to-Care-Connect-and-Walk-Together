package com.DogMate.Service;

import com.DogMate.Domain.DogWalkerUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface IDogWalkerRepository extends JpaRepository<DogWalkerUser, UUID> {

    /**
     * Dog walkers with at least one city offering; JOIN FETCH avoids N+1 when building API rows.
     */
    @Query("SELECT DISTINCT w FROM DogWalkerUser w JOIN FETCH w.cityOfferings")
    List<DogWalkerUser> findAllWithNonEmptyCityOfferings();
}
