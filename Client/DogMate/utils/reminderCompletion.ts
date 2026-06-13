import { reminderAPI, type ReminderRow } from '../services/dogmateApi';
import { cancelReminderNotification } from '../services/notifications';
import { resyncAllNotificationsInBackground } from '../services/notificationScheduler';
import { markHomeDataDirty, refreshHomeRemindersFromServer } from './homeDataCache';
import {
  markFoodInventoryDirty,
  markMedicationsDirty,
  markVaccinationsDirty,
  refreshFoodInventoryFromServer,
  refreshMedicationsFromServer,
  refreshVaccinationsFromServer,
} from './healthDataCache';
import { getOwnerSession } from './ownerSession';

/** After a reminder notification was delivered, sync server state and invalidate caches. */
export async function handleReminderNotificationDelivered(
  sourceType?: string
): Promise<void> {
  if (
    sourceType !== 'REMINDER' &&
    sourceType !== 'FOOD' &&
    sourceType !== 'VACCINATION' &&
    sourceType !== 'MEDICATION'
  ) {
    return;
  }

  const userId = getOwnerSession().userId;
  if (!userId) return;

  try {
    await reminderAPI.processExpiredReminders(userId);
    markHomeDataDirty(userId);
    if (sourceType === 'FOOD') {
      markFoodInventoryDirty(userId);
    }
    if (sourceType === 'VACCINATION') {
      markVaccinationsDirty(userId);
    }
    if (sourceType === 'MEDICATION') {
      markMedicationsDirty(userId);
    }
  } catch (error) {
    console.warn('Failed to process expired reminders after notification:', error);
  }
}

/** Mark a home reminder as done and refresh related health/home data. */
export async function completeReminderFromHome(
  userId: string,
  reminder: ReminderRow,
  administeredAt?: string
): Promise<void> {
  await cancelReminderNotification(reminder.id);
  await reminderAPI.completeReminder(
    userId,
    reminder.id,
    administeredAt ? { administeredAt } : undefined
  );

  markHomeDataDirty(userId);
  const refreshTasks: Promise<unknown>[] = [refreshHomeRemindersFromServer(userId)];

  if (reminder.sourceType === 'FOOD') {
    markFoodInventoryDirty(userId);
    refreshTasks.push(refreshFoodInventoryFromServer(userId));
  } else if (reminder.sourceType === 'VACCINATION') {
    markVaccinationsDirty(userId);
    refreshTasks.push(refreshVaccinationsFromServer(userId));
  } else if (reminder.sourceType === 'MEDICATION') {
    markMedicationsDirty(userId);
    refreshTasks.push(refreshMedicationsFromServer(userId));
  }

  await Promise.all(refreshTasks);
  await resyncAllNotificationsInBackground(userId);
}
