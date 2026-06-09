package com.DogMate.Infrastructure;

import com.DogMate.Domain.FoodStock;
import com.DogMate.Service.IFoodStockRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FoodStockRepository extends JpaRepository<FoodStock, UUID>, IFoodStockRepository {

    @Query("""
        SELECT DISTINCT fs FROM FoodStock fs
        LEFT JOIN FETCH fs.dogs d
        INNER JOIN d.dogRelationships dr
        WHERE dr.regularUser.id = :userId
        """)
    List<FoodStock> findAllForRegularUserWithDogs(@Param("userId") UUID userId);

    @Query("""
        SELECT fs FROM FoodStock fs
        LEFT JOIN FETCH fs.dogs
        WHERE fs.id = :id
        """)
    Optional<FoodStock> findByIdWithDogs(@Param("id") UUID id);
}
