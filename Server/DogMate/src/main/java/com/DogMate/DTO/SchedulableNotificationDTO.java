package com.DogMate.DTO;

import java.util.UUID;

/**
 * A single local-notification trigger the client should schedule.
 */
public record SchedulableNotificationDTO(
        String sourceType,
        UUID sourceId,
        String title,
        String body,
        String triggerAt
) {
}
