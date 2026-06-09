package com.DogMate.Service;

import com.DogMate.Domain.Reminder;
import com.DogMate.Domain.RegularUser;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IReminderRepository {
    Reminder save(Reminder reminder);

    Optional<Reminder> findById(UUID id);

    void deleteById(UUID id);

    boolean existsById(UUID id);

    List<Reminder> findAll();

    List<Reminder> findByRegularUser(RegularUser regularUser);

    List<Reminder> findByRegularUserIdWithDogs(UUID userId);

    Optional<Reminder> findBySourceTypeAndSourceId(String sourceType, UUID sourceId);

    Optional<Reminder> findBySourceTypeAndSourceIdWithDogs(String sourceType, UUID sourceId);

    List<Reminder> findAllByDogIdWithDogs(UUID dogId);
}
