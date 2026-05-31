import type { MedicationRow } from '../services/api';
import type { MedicationSortOption } from '../components/health/MedicationSortModal';

export type MedicationGroup = {
  key: string;
  dogId: string;
  dogName: string;
  medicationName: string;
  lastAdministeredDate: string;
  nextDueDate: string | null;
  history: MedicationRow[];
};

export function medicationGroupKey(dogId: string, medicationName: string): string {
  return `${String(dogId)}::${medicationName.trim()}`;
}

export function medicationAdministeredTime(iso: string): number {
  try {
    const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

function medicationCreatedTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  try {
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

export function compareMedicationRecords(a: MedicationRow, b: MedicationRow): number {
  const dateDiff =
    medicationAdministeredTime(b.administeredDate) - medicationAdministeredTime(a.administeredDate);
  if (dateDiff !== 0) return dateDiff;
  return medicationCreatedTime(b.createdAt) - medicationCreatedTime(a.createdAt);
}

export function getLatestMedicationRecord(history: MedicationRow[]): MedicationRow | null {
  if (history.length === 0) return null;
  return [...history].sort(compareMedicationRecords)[0];
}

export function getLatestNextDueDate(history: MedicationRow[]): string | null {
  const latest = getLatestMedicationRecord(history);
  return latest?.nextDueDate ?? null;
}

export function groupMedications(rows: MedicationRow[]): MedicationGroup[] {
  const map = new Map<string, MedicationRow[]>();

  for (const row of rows) {
    const key = medicationGroupKey(row.dogId, row.medicationName);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }

  const groups: MedicationGroup[] = [];

  for (const [key, history] of map.entries()) {
    history.sort(compareMedicationRecords);
    const latest = history[0];
    groups.push({
      key,
      dogId: String(latest.dogId),
      dogName: (latest.dogName || 'כלב').trim() || 'כלב',
      medicationName: latest.medicationName.trim(),
      lastAdministeredDate: latest.administeredDate,
      nextDueDate: latest.nextDueDate ?? null,
      history,
    });
  }

  return groups;
}

export function sortMedicationGroups(
  groups: MedicationGroup[],
  sort: MedicationSortOption
): MedicationGroup[] {
  const arr = [...groups];
  arr.sort((a, b) => {
    const ta = medicationAdministeredTime(a.lastAdministeredDate);
    const tb = medicationAdministeredTime(b.lastAdministeredDate);
    return sort === 'date_desc' ? tb - ta : ta - tb;
  });
  return arr;
}
