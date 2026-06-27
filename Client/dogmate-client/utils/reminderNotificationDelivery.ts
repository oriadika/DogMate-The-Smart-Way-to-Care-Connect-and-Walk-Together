import { runReminderMaintenanceInBackground } from './reminderMaintenance';
import { markHomeDataDirty } from './homeDataCache';
import {
  markFoodInventoryDirty,
  markMedicationsDirty,
  markVaccinationsDirty,
} from './healthDataCache';
import { getOwnerSession } from './ownerSession';

/** After a reminder notification was delivered, sync server state and invalidate caches. */
export async function handleReminderNotificationDelivered(
  sourceType?: string
): Promise<void> {
  if (
    sourceType !== 'FOOD' &&
    sourceType !== 'VACCINATION' &&
    sourceType !== 'MEDICATION'
  ) {
    return;
  }

  const userId = getOwnerSession().userId;
  if (!userId) return;

  try {
    runReminderMaintenanceInBackground(userId);
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
