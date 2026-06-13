import type { RemindBeforeUnit } from '../types/notifications';

/** Parse API/storage value to a single "days before" number for vaccination UI. */
export function parseStoredRemindDaysBefore(raw: string | number | null | undefined): number {
  if (typeof raw === 'number' && raw > 0) return raw;
  if (raw == null || String(raw).trim() === '') return 7;
  const first = String(raw).split(',')[0].trim();
  const n = parseInt(first, 10);
  return Number.isNaN(n) || n <= 0 ? 7 : n;
}

export function remindDaysBeforeToApiString(days: number | null | undefined): string {
  return String(Math.max(1, days ?? 7));
}

export function parseRemindBeforeUnit(raw: string | null | undefined): RemindBeforeUnit {
  const upper = String(raw ?? 'DAYS').trim().toUpperCase();
  if (upper === 'HOURS' || upper === 'MINUTES') return upper;
  return 'DAYS';
}

export function parseStoredRemindBeforeValue(
  value: number | null | undefined,
  legacyDaysBefore?: number | null
): number {
  if (typeof value === 'number' && value > 0) return value;
  if (typeof legacyDaysBefore === 'number' && legacyDaysBefore > 0) return legacyDaysBefore;
  return 7;
}

export function parseStoredNextDueTime(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === '') return '09:00';
  const parts = raw.trim().split(':');
  if (parts.length < 2) return '09:00';
  const hour = Math.min(23, Math.max(0, parseInt(parts[0], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(parts[1], 10)));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return '09:00';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatTimeHe(time: string): string {
  const normalized = parseStoredNextDueTime(time);
  const [h, m] = normalized.split(':').map((p) => parseInt(p, 10));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
