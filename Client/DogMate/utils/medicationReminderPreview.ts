import type { RemindBeforeUnit } from '../types/notifications';
import { foodReminderCountdownSubtext, formatReminderDateTime } from './foodReminderPreview';
import { parseStoredNextDueTime } from './healthReminderSettings';

export { formatReminderDateTime, foodReminderCountdownSubtext };

function parseIsoLocalDate(iso: string): Date {
  const head = iso.split('T')[0];
  const parts = head.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? new Date() : t;
}

function leadToMs(value: number, unit: RemindBeforeUnit): number {
  switch (unit) {
    case 'HOURS':
      return value * 60 * 60 * 1000;
    case 'MINUTES':
      return value * 60 * 1000;
    case 'DAYS':
    default:
      return value * 24 * 60 * 60 * 1000;
  }
}

function buildDueAt(nextDueDate: Date | string, nextDueTime: string | null | undefined): Date {
  const due = typeof nextDueDate === 'string' ? parseIsoLocalDate(nextDueDate) : new Date(nextDueDate);
  const time = parseStoredNextDueTime(nextDueTime ?? undefined);
  const [hour, minute] = time.split(':').map((p) => parseInt(p, 10));
  due.setHours(hour, minute, 0, 0);
  return due;
}

/** Mirrors server NotificationScheduleService.computeMedicationReminderTrigger. */
export function computeMedicationReminderAt(
  nextDueDate: Date | string | null,
  nextDueTime: string | null | undefined,
  remindBeforeValue: number | null | undefined,
  remindBeforeUnit: RemindBeforeUnit
): Date | null {
  if (!nextDueDate || remindBeforeValue == null || remindBeforeValue <= 0) return null;
  const dueAt = buildDueAt(nextDueDate, nextDueTime);
  if (Number.isNaN(dueAt.getTime())) return null;

  const trigger = new Date(dueAt.getTime() - leadToMs(remindBeforeValue, remindBeforeUnit));
  if (trigger.getTime() <= Date.now()) {
    return new Date(Date.now() + 60_000);
  }
  return trigger;
}

export function computeNearestMedicationReminderAt(
  nextDueDate: Date | string | null,
  nextDueTime: string | null | undefined,
  remindBeforeValue: number | null | undefined,
  remindBeforeUnit: RemindBeforeUnit
): Date | null {
  const trigger = computeMedicationReminderAt(
    nextDueDate,
    nextDueTime,
    remindBeforeValue,
    remindBeforeUnit
  );
  if (!trigger || trigger.getTime() <= Date.now()) return null;
  return trigger;
}

export function buildMedicationReminderTitle(medicationName: string): string {
  return `תרופה: ${medicationName?.trim() || 'תרופה'}`;
}

export function buildMedicationReminderDescription(medicationName: string, dogName: string): string {
  const m = medicationName?.trim() || 'תרופה';
  const d = dogName?.trim() || 'כלב';
  return `הגיע הזמן לתת ל-${d} את ${m}`;
}

export const REMIND_BEFORE_UNIT_LABELS: Record<RemindBeforeUnit, string> = {
  DAYS: 'ימים',
  HOURS: 'שעות',
  MINUTES: 'דקות',
};
