package com.DogMate.Service;

import com.DogMate.Domain.DogWalkerUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface IDogWalkerRepository extends JpaRepository<DogWalkerUser, UUID> {

    /**
     * Dog walkers who saved at least one professional offering (city / availability / pricing row).
     */
    @Query("SELECT DISTINCT w FROM DogWalkerUser w WHERE SIZE(w.cityOfferings) > 0")
    List<DogWalkerUser> findAllWithNonEmptyCityOfferings();
}
