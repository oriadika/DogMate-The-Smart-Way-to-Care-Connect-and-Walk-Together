package com.DogMate.Infrastructure;

import com.DogMate.Domain.Dog;
import com.DogMate.Service.IDogRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DogRepository extends JpaRepository<Dog, UUID>, IDogRepository {
    
    // IDogRepository interface methods are automatically implemented by JpaRepository:
    // - save() -> JpaRepository.save()
    // - findById() -> JpaRepository.findById()
    // - deleteById() -> JpaRepository.deleteById()
    // - existsById() -> JpaRepository.existsById()
}