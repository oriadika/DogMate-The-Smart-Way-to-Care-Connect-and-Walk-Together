package com.DogMate.Service;

import com.DogMate.Domain.RegularUser;
import com.DogMate.DTO.NotificationPreferencesDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class UserNotificationPreferencesIntegrationTest {

    @Autowired
    private UserNotificationPreferencesService preferencesService;

    @Autowired
    private UserService userService;

    @Test
    void updatePreferences_createsRowWhenMissing_andTogglesEnabled() {
        RegularUser user = userService.registerUser(
                "notif-prefs-" + UUID.randomUUID() + "@test.com",
                "password123",
                "Test",
                "User"
        );

        NotificationPreferencesDTO defaults = preferencesService.getPreferences(user.getId());
        assertTrue(defaults.notificationsEnabled());

        NotificationPreferencesDTO disabled =
                preferencesService.updatePreferences(user.getId(), false);
        assertFalse(disabled.notificationsEnabled());
        assertFalse(preferencesService.isGlobalNotificationsEnabled(user.getId()));

        NotificationPreferencesDTO enabled =
                preferencesService.updatePreferences(user.getId(), true);
        assertTrue(enabled.notificationsEnabled());
        assertTrue(preferencesService.isGlobalNotificationsEnabled(user.getId()));
    }
}
