package com.DogMate.Service;

import com.DogMate.Domain.WalkRequest;
import com.DogMate.Domain.WalkRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IWalkRequestRepository extends JpaRepository<WalkRequest, UUID> {

    @Query("SELECT w FROM WalkRequest w JOIN FETCH w.owner LEFT JOIN FETCH w.dog "
            + "WHERE w.walker.id = :walkerId AND w.status = :status ORDER BY w.scheduledStart ASC")
    List<WalkRequest> findForWalkerAndStatus(
            @Param("walkerId") UUID walkerId,
            @Param("status") WalkRequestStatus status);

    @Query("SELECT w FROM WalkRequest w JOIN FETCH w.owner LEFT JOIN FETCH w.dog "
            + "WHERE w.walker.id = :walkerId AND w.status = :status AND w.scheduledStart > :now "
            + "ORDER BY w.scheduledStart ASC")
    List<WalkRequest> findUpcomingConfirmedForWalker(
            @Param("walkerId") UUID walkerId,
            @Param("status") WalkRequestStatus status,
            @Param("now") Instant now);

    Optional<WalkRequest> findByIdAndWalker_Id(UUID id, UUID walkerId);
}
