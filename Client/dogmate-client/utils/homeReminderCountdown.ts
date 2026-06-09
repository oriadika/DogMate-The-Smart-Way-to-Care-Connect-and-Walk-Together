import type { MedicationRow, VaccinationRow } from '../services/api';
import type { FoodInventoryItem } from './healthDataCache';
import {
  getFoodInventoryCache,
  getMedicationsCache,
  getVaccinationsCache,
} from './healthDataCache';
import { getReminderCountdown, type ReminderCountdown } from './daysDisplay';

export type HealthCountdownContext = {
  medicationsById: Map<string, MedicationRow>;
  vaccinationsById: Map<string, VaccinationRow>;
  foodById: Map<string, FoodInventoryItem>;
};

export type HomeReminderLike = {
  remindAt?: string;
  sourceType?: string;
  sourceId?: string;
  systemGenerated?: boolean;
};

export function getReminderSourceEmoji(sourceType?: string): string | null {
  switch (sourceType) {
    case 'MEDICATION':
      return '💊';
    case 'VACCINATION':
      return '💉';
    case 'FOOD':
      return '🍖';
    default:
      return '🔔';
  }
}

export function buildHealthCountdownContext(userId: string): HealthCountdownContext {
  const medications = getMedicationsCache(userId)?.rows ?? [];
  const vaccinations = getVaccinationsCache(userId)?.rows ?? [];
  const foodItems = getFoodInventoryCache(userId)?.items ?? [];

  return {
    medicationsById: new Map(medications.map((row) => [String(row.id), row])),
    vaccinationsById: new Map(vaccinations.map((row) => [String(row.id), row])),
    foodById: new Map(foodItems.map((row) => [String(row.id), row])),
  };
}

function withSourceEmoji(
  countdown: ReminderCountdown | null,
  emoji: string | null
): ReminderCountdown | null {
  if (!countdown) return null;
  return emoji ? { ...countdown, sourceEmoji: emoji } : countdown;
}

/**
 * Home reminder cards display `remindAt` as the event time — countdown must match
 * that datetime (including after the user edits the reminder on the home flow).
 */
export function getHomeReminderCountdown(
  reminder: HomeReminderLike
): ReminderCountdown | null {
  const emoji = getReminderSourceEmoji(reminder.sourceType);

  return withSourceEmoji(getReminderCountdown(reminder.remindAt), emoji);
}
