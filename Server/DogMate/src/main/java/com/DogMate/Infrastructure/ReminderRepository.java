package com.DogMate.Infrastructure;

import com.DogMate.Domain.Reminder;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Service.IReminderRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReminderRepository extends JpaRepository<Reminder, UUID>, IReminderRepository {

    @Query("""
        SELECT DISTINCT r FROM Reminder r
        LEFT JOIN FETCH r.dogs
        WHERE r.regularUser.id = :userId
        """)
    List<Reminder> findByRegularUserIdWithDogs(@Param("userId") UUID userId);

    @Query("""
        SELECT r FROM Reminder r
        LEFT JOIN FETCH r.dogs
        WHERE r.sourceType = :sourceType AND r.sourceId = :sourceId
        """)
    Optional<Reminder> findBySourceTypeAndSourceIdWithDogs(
            @Param("sourceType") String sourceType,
            @Param("sourceId") UUID sourceId
    );

    @Query("""
        SELECT DISTINCT r FROM Reminder r
        LEFT JOIN FETCH r.dogs
        JOIN r.dogs d
        WHERE d.id = :dogId
        """)
    List<Reminder> findAllByDogIdWithDogs(@Param("dogId") UUID dogId);

    List<Reminder> findByRegularUser(RegularUser regularUser);

    Optional<Reminder> findBySourceTypeAndSourceId(String sourceType, UUID sourceId);
}
