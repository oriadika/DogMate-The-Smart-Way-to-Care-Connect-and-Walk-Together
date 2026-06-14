import type { MedicationRow } from '../services/dogmateApi';
import { getMedicationsCache, refreshMedicationsFromServer } from './healthDataCache';
import { formatTimeHe, parseStoredNextDueTime } from './healthReminderSettings';

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseIsoLocalDate(iso: string): Date {
  const head = iso.split('T')[0];
  const parts = head.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function combineMedicationPlannedDue(medication: MedicationRow): Date | null {
  if (!medication.nextDueDate) return null;
  const date = parseIsoLocalDate(medication.nextDueDate);
  const time = parseStoredNextDueTime(medication.nextDueTime);
  const [hour, minute] = time.split(':').map((part) => parseInt(part, 10));
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

export function isMedicationPlannedDueOverdue(medication: MedicationRow, now = new Date()): boolean {
  const plannedDue = combineMedicationPlannedDue(medication);
  return plannedDue != null && plannedDue.getTime() < now.getTime();
}

export function formatMarkDoneDayLabel(date: Date, now = new Date()): string {
  const dayDiff = Math.round(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / 86_400_000
  );
  if (dayDiff === 0) return 'היום';
  if (dayDiff === 1) return 'אתמול';
  if (dayDiff === -1) return 'מחר';
  return date.toLocaleDateString('he-IL', { weekday: 'long' });
}

export function formatMarkDoneDateShort(date: Date): string {
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

export function formatMarkDoneChoiceLabel(date: Date, now = new Date()): string {
  const dayLabel = formatMarkDoneDayLabel(date, now);
  const dateLabel = formatMarkDoneDateShort(date);
  const timeLabel = formatTimeHe(
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  );
  return `${dayLabel}, ${dateLabel} · ${timeLabel}`;
}

export function formatAdministeredAtForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatMedicationLogDosePayload(date: Date): {
  administeredDate: string;
  administeredTime: string;
} {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    administeredDate: `${year}-${month}-${day}`,
    administeredTime: formatTimeHe(
      `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    ),
  };
}

export async function findMedicationRowForUser(
  userId: string,
  medicationId: string
): Promise<MedicationRow | null> {
  const cached = getMedicationsCache(userId)?.rows.find((row) => String(row.id) === String(medicationId));
  if (cached) return cached;

  const rows = await refreshMedicationsFromServer(userId);
  return rows.find((row) => String(row.id) === String(medicationId)) ?? null;
}

