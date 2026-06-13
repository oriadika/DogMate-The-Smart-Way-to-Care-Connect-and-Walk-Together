import type { NotificationSourceType } from '../types/notifications';

export const shouldScheduleNotification = (
  globalEnabled: boolean,
  itemEnabled: boolean
): boolean => globalEnabled && itemEnabled;

export const buildNotificationIdentifier = (
  sourceType: NotificationSourceType,
  sourceId: string,
  triggerAt: string
): string => `${sourceType.toLowerCase()}-${sourceId}-${triggerAt}`;
