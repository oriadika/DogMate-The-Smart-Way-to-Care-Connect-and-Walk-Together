package com.DogMate.Infrastructure;

import com.DogMate.Domain.UserNotificationPreferences;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, UUID> {
}
