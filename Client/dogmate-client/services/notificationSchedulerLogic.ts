import type { NotificationSourceType, SchedulableNotification } from '../types/notifications';

export const shouldScheduleNotification = (
  globalEnabled: boolean,
  itemEnabled: boolean
): boolean => globalEnabled && itemEnabled;

export const buildNotificationIdentifier = (
  sourceType: NotificationSourceType,
  sourceId: string,
  triggerAt: string
): string => `${sourceType.toLowerCase()}-${sourceId}-${triggerAt}`;

/** Keep one scheduled push per source entity (nearest future trigger). */
export const dedupeSchedulableNotifications = (
  items: SchedulableNotification[]
): SchedulableNotification[] => {
  const byKey = new Map<string, SchedulableNotification>();

  for (const item of items) {
    const key = `${item.sourceType}-${item.sourceId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    if (new Date(item.triggerAt).getTime() < new Date(existing.triggerAt).getTime()) {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()];
};
