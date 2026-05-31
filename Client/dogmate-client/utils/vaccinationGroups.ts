import type { VaccinationRow } from '../services/api';
import type { VaccinationSortOption } from '../components/health/VaccinationSortModal';

export type VaccinationGroup = {
  key: string;
  dogId: string;
  dogName: string;
  vaccineName: string;
  lastAdministeredDate: string;
  nextDueDate: string | null;
  history: VaccinationRow[];
};

export function vaccinationGroupKey(dogId: string, vaccineName: string): string {
  return `${String(dogId)}::${vaccineName.trim()}`;
}

export function vaccinationAdministeredTime(iso: string): number {
  try {
    const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

function vaccinationCreatedTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  try {
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

/** Most recent vaccination record by administered date (then createdAt). */
export function compareVaccinationRecords(a: VaccinationRow, b: VaccinationRow): number {
  const dateDiff =
    vaccinationAdministeredTime(b.administeredDate) - vaccinationAdministeredTime(a.administeredDate);
  if (dateDiff !== 0) return dateDiff;
  return vaccinationCreatedTime(b.createdAt) - vaccinationCreatedTime(a.createdAt);
}

export function getLatestVaccinationRecord(history: VaccinationRow[]): VaccinationRow | null {
  if (history.length === 0) return null;
  return [...history].sort(compareVaccinationRecords)[0];
}

/** Next due date always from the latest administered vaccination record. */
export function getLatestNextDueDate(history: VaccinationRow[]): string | null {
  const latest = getLatestVaccinationRecord(history);
  return latest?.nextDueDate ?? null;
}

/** Group rows by dog + vaccine name; each group keeps full history sorted newest-first. */
export function groupVaccinations(rows: VaccinationRow[]): VaccinationGroup[] {
  const map = new Map<string, VaccinationRow[]>();

  for (const row of rows) {
    const key = vaccinationGroupKey(row.dogId, row.vaccineName);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }

  const groups: VaccinationGroup[] = [];

  for (const [key, history] of map.entries()) {
    history.sort(compareVaccinationRecords);
    const latest = history[0];
    const nextDueDate = latest.nextDueDate ?? null;
    groups.push({
      key,
      dogId: String(latest.dogId),
      dogName: (latest.dogName || 'כלב').trim() || 'כלב',
      vaccineName: latest.vaccineName.trim(),
      lastAdministeredDate: latest.administeredDate,
      nextDueDate,
      history,
    });
  }

  return groups;
}

export function sortVaccinationGroups(
  groups: VaccinationGroup[],
  sort: VaccinationSortOption
): VaccinationGroup[] {
  const arr = [...groups];
  arr.sort((a, b) => {
    const ta = vaccinationAdministeredTime(a.lastAdministeredDate);
    const tb = vaccinationAdministeredTime(b.lastAdministeredDate);
    return sort === 'date_desc' ? tb - ta : ta - tb;
  });
  return arr;
}
