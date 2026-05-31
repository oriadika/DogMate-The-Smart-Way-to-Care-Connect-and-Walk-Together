package com.DogMate.Infrastructure;

import com.DogMate.Domain.DogVaccination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DogVaccinationRepository extends JpaRepository<DogVaccination, UUID> {

    @Query("""
        SELECT DISTINCT v FROM DogVaccination v
        JOIN FETCH v.dog d
        JOIN d.dogRelationships dr
        WHERE dr.regularUser.id = :userId
        ORDER BY v.administeredDate DESC
        """)
    List<DogVaccination> findAllForRegularUser(@Param("userId") UUID userId);
}
