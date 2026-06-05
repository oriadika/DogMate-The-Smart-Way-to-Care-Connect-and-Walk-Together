import {
  cancelAllNotifications,
  cancelNotificationByIdentifier,
  scheduleHealthNotification,
} from './notifications';
import { notificationScheduleAPI } from './api';
import { isGlobalNotificationsEnabled } from './notificationPreferences';
import type { NotificationSourceType, SchedulableNotification } from '../types/notifications';
import {
  buildNotificationIdentifier,
  shouldScheduleNotification,
} from './notificationSchedulerLogic';

export { shouldScheduleNotification, buildNotificationIdentifier };

export const resyncAllNotifications = async (userId: string): Promise<number> => {
  const globalEnabled = isGlobalNotificationsEnabled();
  await cancelAllNotifications();

  if (!globalEnabled) {
    return 0;
  }

  const response = await notificationScheduleAPI.getSchedulable(userId);
  const items: SchedulableNotification[] = response.notifications ?? [];
  let scheduled = 0;

  for (const item of items) {
    const triggerDate = new Date(item.triggerAt);
    if (Number.isNaN(triggerDate.getTime()) || triggerDate <= new Date()) {
      continue;
    }
    const id = await scheduleHealthNotification({
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      title: item.title,
      body: item.body,
      triggerAt: triggerDate,
      globalEnabled,
      itemEnabled: true,
    });
    if (id) scheduled += 1;
  }

  return scheduled;
};

export const scheduleItemNotifications = async (
  userId: string
): Promise<number> => resyncAllNotifications(userId);

export const cancelSourceNotifications = async (
  sourceType: NotificationSourceType,
  sourceId: string
): Promise<void> => {
  await cancelNotificationByIdentifier(`${sourceType.toLowerCase()}-${sourceId}`);
};
