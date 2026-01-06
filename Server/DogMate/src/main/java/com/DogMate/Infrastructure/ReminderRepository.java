package com.DogMate.Infrastructure;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.Reminder;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Service.IDogRepository;
import com.DogMate.Service.IReminderRepository;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReminderRepository extends JpaRepository<Reminder, UUID>, IReminderRepository {
    List<Reminder> findByRegularUser(RegularUser regularUser);
}
