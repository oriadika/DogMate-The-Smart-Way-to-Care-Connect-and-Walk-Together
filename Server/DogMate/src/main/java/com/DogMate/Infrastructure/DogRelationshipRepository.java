package com.DogMate.Infrastructure;

import com.DogMate.Domain.DogRelationship;
import com.DogMate.Service.IDogRelationshipRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

//@Repository
//public interface DogRelationshipRepository extends JpaRepository<DogRelationship, UUID>, IDogRelationshipRepository {
//
//    // IDogRelationshipRepository interface methods are automatically implemented by JpaRepository:
//    // - save() -> JpaRepository.save()
//    // - findById() -> JpaRepository.findById()
//    // - deleteById() -> JpaRepository.deleteById()
//    // - existsById() -> JpaRepository.existsById()
//}

@Repository
public interface DogRelationshipRepository
        extends JpaRepository<DogRelationship, UUID>, IDogRelationshipRepository {
}


