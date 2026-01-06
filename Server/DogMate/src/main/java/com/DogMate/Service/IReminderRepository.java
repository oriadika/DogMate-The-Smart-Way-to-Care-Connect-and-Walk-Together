package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.Reminder;
import com.DogMate.Domain.RegularUser;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IReminderRepository {
    Optional<Reminder> findById(UUID id);

    void deleteById(UUID id);

    boolean existsById(UUID id);

    List<Reminder> findAll();

    List<Reminder> findByRegularUser(RegularUser regularUser);
}
