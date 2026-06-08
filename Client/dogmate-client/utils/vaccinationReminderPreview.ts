import { foodReminderCountdownSubtext, formatReminderDateTime } from './foodReminderPreview';
import { remindDaysBeforeToApiString } from './healthReminderSettings';

export const VACCINATION_REMINDER_HOUR = 9;

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

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/** Mirrors server NotificationScheduleService.computeVaccinationReminderTrigger. */
export function computeVaccinationReminderAt(
  nextDueDate: Date | string | null,
  remindDaysBefore: number | null | undefined
): Date | null {
  if (!nextDueDate || remindDaysBefore == null || remindDaysBefore <= 0) return null;
  const due = typeof nextDueDate === 'string' ? parseIsoLocalDate(nextDueDate) : nextDueDate;
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  const daysUntilDue = daysBetween(today, due);
  if (daysUntilDue <= remindDaysBefore) {
    return new Date(Date.now() + 60_000);
  }

  const daysUntilReminder = daysUntilDue - remindDaysBefore;
  const trigger = new Date();
  trigger.setHours(VACCINATION_REMINDER_HOUR, 0, 0, 0);
  trigger.setDate(trigger.getDate() + daysUntilReminder);
  return trigger;
}

export function computeNearestVaccinationReminderAt(
  nextDueDate: Date | string | null,
  remindDaysBefore: number | null | undefined
): Date | null {
  const trigger = computeVaccinationReminderAt(nextDueDate, remindDaysBefore);
  if (!trigger || trigger.getTime() <= Date.now()) return null;
  return trigger;
}

/** @deprecated use number remindDaysBefore — kept for API string conversion */
export function remindDaysBeforeForApi(days: number | null | undefined): string {
  return remindDaysBeforeToApiString(days);
}

export function buildVaccinationReminderTitle(vaccineName: string): string {
  return `חיסון: ${vaccineName?.trim() || 'חיסון'}`;
}

export function buildVaccinationReminderDescription(vaccineName: string, dogName: string): string {
  const v = vaccineName?.trim() || 'חיסון';
  const d = dogName?.trim() || 'כלב';
  return `הגיע הזמן לתאם חיסון ${v} עבור ${d}`;
}
