package com.DogMate.Infrastructure;

import com.DogMate.Domain.DogRelationship;
import com.DogMate.Service.IDogRelationshipRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM DogRelationship r "
            + "WHERE r.regularUser.id = :ownerId AND r.dog.ID = :dogId")
    boolean existsLinkBetweenOwnerAndDog(@Param("ownerId") UUID ownerId, @Param("dogId") UUID dogId);
}


