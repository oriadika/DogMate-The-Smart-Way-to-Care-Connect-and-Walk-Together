import type { MedicationRow } from '../services/api';

/** Unique medication names previously recorded for a specific dog, sorted in Hebrew locale. */
export function getUniqueMedicationNamesForDog(
  rows: MedicationRow[],
  dogId: string | null | undefined
): string[] {
  if (!dogId) return [];
  const names = new Set<string>();
  for (const row of rows) {
    if (String(row.dogId) !== String(dogId)) continue;
    const trimmed = row.medicationName.trim();
    if (trimmed) names.add(trimmed);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'he'));
}

export function filterMedicationNameSuggestions(names: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return names;
  return names.filter((name) => name.toLowerCase().includes(q));
}
