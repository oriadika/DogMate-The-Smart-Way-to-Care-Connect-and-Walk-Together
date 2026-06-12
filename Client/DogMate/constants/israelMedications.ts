/** Predefined medications / treatments common in Israeli veterinary care */
export const ISRAEL_MEDICATION_CUSTOM = '__custom__' as const;

export type IsraelMedicationKey =
  | 'antibiotics'
  | 'nsaid'
  | 'allergy'
  | 'supplements'
  | 'ear_eye'
  | typeof ISRAEL_MEDICATION_CUSTOM;

export type IsraelMedicationOption = {
  key: IsraelMedicationKey;
  label: string;
  /** Days to add to administered date for next dose / refill */
  nextDueDays: number | null;
};

export const ISRAEL_MEDICATION_OPTIONS: IsraelMedicationOption[] = [
  {
    key: 'antibiotics',
    label: 'אנטיביוטיקה',
    nextDueDays: 1,
  },
  {
    key: 'nsaid',
    label: 'נוגדי דלקת וכאב',
    nextDueDays: 1,
  },
  {
    key: 'allergy',
    label: 'טיפול באלרגיות וגירודים ',
    nextDueDays: 30,
  },
  {
    key: 'supplements',
    label: 'תוספי תזונה ומפרקים ',
    nextDueDays: 1,
  },
  {
    key: 'ear_eye',
    label: 'טיפול באוזניים / עיניים ',
    nextDueDays: 1,
  },
  { key: ISRAEL_MEDICATION_CUSTOM, label: 'אחר / כתיבה ידנית', nextDueDays: 1 },
];

export function findMedicationOptionByLabel(label: string): IsraelMedicationOption | undefined {
  const trimmed = label?.trim();
  if (!trimmed) return undefined;
  return ISRAEL_MEDICATION_OPTIONS.find((o) => o.label === trimmed);
}

export function resolveMedicationKeyFromName(name: string): IsraelMedicationKey {
  const match = findMedicationOptionByLabel(name);
  return match?.key ?? ISRAEL_MEDICATION_CUSTOM;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** Compute next dose / refill date from medication selection and start date */
export function computeNextDueDate(
  medicationKey: IsraelMedicationKey,
  administeredDate: Date
): Date | null {
  const option = ISRAEL_MEDICATION_OPTIONS.find((o) => o.key === medicationKey);
  if (!option || option.nextDueDays == null) return null;
  return addDays(administeredDate, option.nextDueDays);
}
