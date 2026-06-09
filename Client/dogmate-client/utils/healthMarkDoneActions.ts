import { medicationAPI } from '../services/api';
import { resyncAllNotificationsInBackground } from '../services/notificationScheduler';
import { markMedicationsDirty, refreshMedicationsFromServer } from './healthDataCache';
import { formatMedicationLogDosePayload } from './healthMarkDone';
import { markHomeDataDirty, refreshHomeRemindersFromServer } from './homeDataCache';

export async function logMedicationDoseForUser(
  userId: string,
  medicationId: string,
  administeredAt?: Date
): Promise<void> {
  if (administeredAt) {
    await medicationAPI.logDose(userId, medicationId, formatMedicationLogDosePayload(administeredAt));
  } else {
    await medicationAPI.logDose(userId, medicationId);
  }

  markHomeDataDirty(userId);
  markMedicationsDirty(userId);
  await Promise.all([
    refreshHomeRemindersFromServer(userId),
    refreshMedicationsFromServer(userId),
  ]);
  await resyncAllNotificationsInBackground(userId);
}
