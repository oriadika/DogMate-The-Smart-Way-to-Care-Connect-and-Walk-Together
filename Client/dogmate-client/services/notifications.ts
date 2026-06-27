import * as Notifications from 'expo-notifications';
import type { NotificationSourceType } from '../types/notifications';
import { isGlobalNotificationsEnabled } from './notificationPreferences';
import { shouldScheduleNotification } from './notificationSchedulerLogic';
import { handleReminderNotificationDelivered } from '../utils/reminderNotificationDelivery';

const hiddenNotificationPresentation = {
  shouldShowAlert: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
  shouldShowBanner: false,
  shouldShowList: false,
} as const;

const visibleNotificationPresentation = {
  shouldShowAlert: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
  shouldShowBanner: true,
  shouldShowList: true,
} as const;

Notifications.setNotificationHandler({
  handleNotification: async () =>
    isGlobalNotificationsEnabled()
      ? visibleNotificationPresentation
      : hiddenNotificationPresentation,
});

export interface ScheduleHealthNotificationParams {
  sourceType: NotificationSourceType;
  sourceId: string;
  title: string;
  body: string;
  triggerAt: Date;
  globalEnabled: boolean;
  itemEnabled: boolean;
}

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

const buildIdentifier = (sourceType: NotificationSourceType, sourceId: string, triggerAt: Date): string => {
  const stamp = triggerAt.toISOString().slice(0, 19);
  return `${sourceType.toLowerCase()}-${sourceId}-${stamp}`;
};

export const scheduleHealthNotification = async (
  params: ScheduleHealthNotificationParams
): Promise<string | null> => {
  if (!shouldScheduleNotification(params.globalEnabled, params.itemEnabled)) {
    return null;
  }
  if (params.triggerAt <= new Date()) {
    return null;
  }

  const identifier = buildIdentifier(params.sourceType, params.sourceId, params.triggerAt);

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body || 'זמן לתזכורת!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#7FB069',
        data: {
          sourceType: params.sourceType,
          sourceId: params.sourceId,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: params.triggerAt,
      },
      identifier,
    });
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const scheduleReminderNotification = async (
  reminderId: string,
  title: string,
  description: string,
  triggerDate: Date,
  options?: { globalEnabled?: boolean; itemEnabled?: boolean }
): Promise<string | null> => {
  return scheduleHealthNotification({
    sourceType: 'REMINDER',
    sourceId: reminderId,
    title,
    body: description || 'זמן לתזכורת!',
    triggerAt: triggerDate,
    globalEnabled: options?.globalEnabled ?? true,
    itemEnabled: options?.itemEnabled ?? true,
  });
};

export const cancelNotificationByIdentifier = async (identifierPrefix: string): Promise<void> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matches = scheduled.filter((n) => n.identifier.startsWith(identifierPrefix));
    await Promise.all(matches.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch (error) {
    console.error('Error cancelling notifications by prefix:', error);
  }
};

export const cancelReminderNotification = async (reminderId: string): Promise<void> => {
  await cancelNotificationByIdentifier(`reminder-${reminderId}`);
};

export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};

export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

export const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
  const notificationId = response.notification.request.identifier;
  console.log('Notification tapped:', notificationId);
};

export const setupNotificationListeners = () => {
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as { sourceType?: NotificationSourceType };
    void handleReminderNotificationDelivered(data?.sourceType);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response);
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
};
