package com.DogMate.Infrastructure;

import com.DogMate.Domain.FoodStock;
import com.DogMate.Service.IFoodStockRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FoodStockRepository extends JpaRepository<FoodStock, UUID>, IFoodStockRepository {
    
    // IFoodStockRepository interface methods are automatically implemented by JpaRepository:
    // - save() -> JpaRepository.save()
    // - findById() -> JpaRepository.findById()
    // - deleteById() -> JpaRepository.deleteById()
    // - existsById() -> JpaRepository.existsById()
}
