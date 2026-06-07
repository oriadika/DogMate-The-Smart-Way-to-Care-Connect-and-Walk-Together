import { reminderAPI } from '../services/api';
import { markHomeDataDirty } from './homeDataCache';
import { markFoodInventoryDirty } from './healthDataCache';
import { getOwnerSession } from './ownerSession';

/** After a reminder notification was delivered, sync server state and invalidate caches. */
export async function handleReminderNotificationDelivered(
  sourceType?: string
): Promise<void> {
  if (sourceType !== 'REMINDER' && sourceType !== 'FOOD') {
    return;
  }

  const userId = getOwnerSession().userId;
  if (!userId) return;

  try {
    await reminderAPI.processExpiredReminders(userId);
    markHomeDataDirty(userId);
    markFoodInventoryDirty(userId);
  } catch (error) {
    console.warn('Failed to process expired reminders after notification:', error);
  }
}
