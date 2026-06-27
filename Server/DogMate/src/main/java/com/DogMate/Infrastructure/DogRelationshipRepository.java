package com.DogMate.Infrastructure;

import com.DogMate.Domain.DogRelationship;
import com.DogMate.Service.IDogRelationshipRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
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

    List<DogRelationship> findByDog_ID(UUID dogId);

    @Query("""
        SELECT dr FROM DogRelationship dr
        JOIN FETCH dr.dog d
        WHERE dr.regularUser.id IN :userIds
        """)
    List<DogRelationship> findByRegularUserIdInWithDog(@Param("userIds") Collection<UUID> userIds);
}


