package com.DogMate.Infrastructure;

import com.DogMate.Domain.DogMedication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DogMedicationRepository extends JpaRepository<DogMedication, UUID> {

    @Query("""
        SELECT DISTINCT m FROM DogMedication m
        JOIN FETCH m.dog d
        JOIN d.dogRelationships dr
        WHERE dr.regularUser.id = :userId
        ORDER BY m.administeredDate DESC
        """)
    List<DogMedication> findAllForRegularUser(@Param("userId") UUID userId);
}
