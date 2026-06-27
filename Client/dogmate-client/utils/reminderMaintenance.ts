import { reminderAPI } from '../services/dogmateApi';
import { isAbortError } from './isAbortError';

const inflightByUser = new Map<string, Promise<void>>();
const lastCompletedAtByUser = new Map<string, number>();
const lastFailedAtByUser = new Map<string, number>();

/** Avoid hammering the server on every Home focus / notification burst. */
const MAINTENANCE_COOLDOWN_MS = 90_000;
const MAINTENANCE_FAILURE_COOLDOWN_MS = 180_000;

/**
 * Fire-and-forget reminder maintenance (expired cleanup + medication reconcile).
 * At most one in-flight request per user; skipped when a recent run succeeded.
 */
export function runReminderMaintenanceInBackground(
  userId: string,
  options?: { force?: boolean }
): void {
  if (!userId) return;

  const force = options?.force === true;
  const now = Date.now();
  const lastCompleted = lastCompletedAtByUser.get(userId) ?? 0;
  const lastFailed = lastFailedAtByUser.get(userId) ?? 0;

  if (!force && now - lastCompleted < MAINTENANCE_COOLDOWN_MS) {
    return;
  }
  if (!force && now - lastFailed < MAINTENANCE_FAILURE_COOLDOWN_MS) {
    return;
  }
  if (inflightByUser.has(userId)) {
    return;
  }

  const job = reminderAPI
    .processExpiredReminders(userId)
    .then(() => {
      lastCompletedAtByUser.set(userId, Date.now());
      lastFailedAtByUser.delete(userId);
    })
    .catch((error) => {
      if (!isAbortError(error)) {
        lastFailedAtByUser.set(userId, Date.now());
        console.warn('Background reminder maintenance failed:', error);
      }
    })
    .finally(() => {
      if (inflightByUser.get(userId) === job) {
        inflightByUser.delete(userId);
      }
    });

  inflightByUser.set(userId, job);
}

/** Used after logout / account switch so the next login can run maintenance immediately. */
export function resetReminderMaintenanceState(userId?: string): void {
  if (userId) {
    inflightByUser.delete(userId);
    lastCompletedAtByUser.delete(userId);
    lastFailedAtByUser.delete(userId);
    return;
  }
  inflightByUser.clear();
  lastCompletedAtByUser.clear();
  lastFailedAtByUser.clear();
}
