package com.DogMate.Service;

import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.UserNotificationPreferences;
import com.DogMate.DTO.NotificationPreferencesDTO;
import com.DogMate.Infrastructure.UserNotificationPreferencesRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserNotificationPreferencesService {

    private final UserNotificationPreferencesRepository preferencesRepository;
    private final IUserRepository userRepository;
    private final EntityManager entityManager;

    public UserNotificationPreferencesService(
            UserNotificationPreferencesRepository preferencesRepository,
            IUserRepository userRepository,
            EntityManager entityManager
    ) {
        this.preferencesRepository = preferencesRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public NotificationPreferencesDTO getPreferences(UUID userId) {
        return preferencesRepository.findById(userId)
                .map(NotificationPreferencesDTO::fromEntity)
                .orElse(NotificationPreferencesDTO.defaults());
    }

    @Transactional
    public NotificationPreferencesDTO updatePreferences(UUID userId, boolean notificationsEnabled) {
        UserNotificationPreferences prefs = preferencesRepository.findById(userId)
                .orElseGet(() -> createDefaultPreferences(userId));
        prefs.setNotificationsEnabled(notificationsEnabled);
        return NotificationPreferencesDTO.fromEntity(preferencesRepository.save(prefs));
    }

    @Transactional(readOnly = true)
    public boolean isGlobalNotificationsEnabled(UUID userId) {
        return preferencesRepository.findById(userId)
                .map(UserNotificationPreferences::isNotificationsEnabled)
                .orElse(true);
    }

    private UserNotificationPreferences createDefaultPreferences(UUID userId) {
        if (userRepository.findById(userId).filter(RegularUser.class::isInstance).isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId);
        }
        RegularUser user = entityManager.getReference(RegularUser.class, userId);
        return new UserNotificationPreferences(user);
    }
}
