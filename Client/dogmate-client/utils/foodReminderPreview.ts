import { DUE_NOW_MESSAGE, getReminderCountdown } from './daysDisplay';

export const FOOD_REMINDER_HOUR = 9;

export function formatDogNamesHebrew(dogNames: string[]): string {
  const names = dogNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return 'כלב';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ו${names[1]}`;
  return `${names.slice(0, -1).join(', ')} ו${names[names.length - 1]}`;
}

export function buildFoodReminderTitle(dogNames: string[]): string {
  return `לקנות אוכל ל${formatDogNamesHebrew(dogNames)}`;
}

export function buildFoodReminderDescription(dogNames: string[]): string {
  return `מלאי המזון של ${formatDogNamesHebrew(dogNames)} עומד להיגמר בקרוב...`;
}

/** Whole days until the bag runs out at current consumption. */
export function computeFoodDaysRemaining(currentKg: number, dailyGrams: number): number {
  if (dailyGrams <= 0 || currentKg < 0) return 0;
  return Math.floor((currentKg * 1000) / dailyGrams);
}

/** Days from today until the low-stock reminder fires (matches server threshold math). */
export function computeDaysUntilFoodReminder(
  daysRemaining: number,
  thresholdDays: number | null | undefined
): number | null {
  if (thresholdDays == null || thresholdDays <= 0) return null;
  if (daysRemaining <= thresholdDays) return 0;
  return daysRemaining - thresholdDays;
}

/** Mirrors server NotificationScheduleService.computeFoodLowStockTrigger. */
export function computeFoodLowStockReminderAt(
  currentKg: number,
  dailyGrams: number,
  thresholdDays: number | null
): Date | null {
  if (thresholdDays == null || thresholdDays <= 0 || dailyGrams <= 0 || currentKg < 0) {
    return null;
  }

  const daysRemaining = computeFoodDaysRemaining(currentKg, dailyGrams);
  if (daysRemaining <= thresholdDays) {
    return new Date(Date.now() + 60_000);
  }

  const daysUntilReminder = daysRemaining - thresholdDays;
  const trigger = new Date();
  trigger.setHours(FOOD_REMINDER_HOUR, 0, 0, 0);
  trigger.setDate(trigger.getDate() + daysUntilReminder);
  return trigger;
}

export function formatReminderDateTime(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} בשעה ${hours}:${minutes}`;
}

const MS_MINUTE = 60_000;

export function foodReminderCountdownSubtext(triggerAt: Date): string {
  const diffMs = triggerAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return `(${DUE_NOW_MESSAGE})`;
  }
  const countdown = getReminderCountdown(triggerAt.toISOString());
  return countdown?.subtext ?? '(בקרוב)';
}
