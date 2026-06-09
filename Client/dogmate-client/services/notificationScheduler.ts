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
  const now = new Date();

  const results = await Promise.all(
    items.map(async (item) => {
      const triggerDate = new Date(item.triggerAt);
      if (Number.isNaN(triggerDate.getTime()) || triggerDate <= now) {
        return null;
      }
      return scheduleHealthNotification({
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        title: item.title,
        body: item.body,
        triggerAt: triggerDate,
        globalEnabled,
        itemEnabled: true,
      });
    })
  );

  return results.filter(Boolean).length;
};

let pendingResyncUserId: string | null = null;
let resyncLoopPromise: Promise<void> | null = null;

/** Coalesced background resync — safe to call after every mutation without blocking UI. */
export function resyncAllNotificationsInBackground(userId: string): void {
  pendingResyncUserId = userId;
  if (resyncLoopPromise) return;

  resyncLoopPromise = (async () => {
    while (pendingResyncUserId) {
      const uid = pendingResyncUserId;
      pendingResyncUserId = null;
      try {
        await resyncAllNotifications(uid);
      } catch (error) {
        console.warn('Background notification resync failed:', error);
      }
    }
  })().finally(() => {
    resyncLoopPromise = null;
  });
}

export const scheduleItemNotifications = async (
  userId: string
): Promise<number> => resyncAllNotifications(userId);

export const cancelSourceNotifications = async (
  sourceType: NotificationSourceType,
  sourceId: string
): Promise<void> => {
  await cancelNotificationByIdentifier(`${sourceType.toLowerCase()}-${sourceId}`);
};
