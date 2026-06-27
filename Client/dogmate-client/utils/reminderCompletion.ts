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
