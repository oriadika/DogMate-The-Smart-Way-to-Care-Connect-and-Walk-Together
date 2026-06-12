import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permissions for notifications
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

// Schedule a local notification for a reminder
export const scheduleReminderNotification = async (
  reminderId: string,
  title: string,
  description: string,
  triggerDate: Date
): Promise<string | null> => {
  try {
    // Cancel any existing notification for this reminder
    await cancelReminderNotification(reminderId);

    // Schedule the new notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: description || 'זמן לתזכורת!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#7FB069',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier: `reminder-${reminderId}`,
    });

    console.log(`Scheduled notification for reminder ${reminderId} at ${triggerDate}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Cancel a specific reminder notification
export const cancelReminderNotification = async (reminderId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(`reminder-${reminderId}`);
    console.log(`Cancelled notification for reminder ${reminderId}`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};

// Get all scheduled notifications
export const getScheduledNotifications = async () => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return scheduledNotifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

// Handle notification response (when user taps on notification)
export const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
  const notificationId = response.notification.request.identifier;
  console.log('Notification tapped:', notificationId);

  // You can add navigation logic here if needed
  // For example, navigate to a specific screen when notification is tapped
};

// Set up notification listeners
export const setupNotificationListeners = () => {
  // Handle notification when received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received while app is foregrounded:', notification);
  });

  // Handle notification response (tap)
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    handleNotificationResponse(response);
  });

  // Return cleanup function
  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
};