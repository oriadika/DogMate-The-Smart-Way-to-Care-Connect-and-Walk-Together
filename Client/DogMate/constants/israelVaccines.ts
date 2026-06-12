/** Predefined vaccines / preventative treatments per Israeli veterinary protocols */
export const ISRAEL_VACCINE_CUSTOM = '__custom__' as const;

export type IsraelVaccineKey =
  | 'rabies'
  | 'sextuple'
  | 'spirocerca'
  | 'deworming'
  | 'flea_tick'
  | typeof ISRAEL_VACCINE_CUSTOM;

export type IsraelVaccineOption = {
  key: IsraelVaccineKey;
  label: string;
  /** Months to add to administered date for next due (null = no auto-calc) */
  nextDueMonths: number | null;
};

export const ISRAEL_VACCINE_OPTIONS: IsraelVaccineOption[] = [
  { key: 'rabies', label: 'חיסון כלבת', nextDueMonths: 24 },
  { key: 'sextuple', label: 'חיסון משושה', nextDueMonths: 12 },
  { key: 'spirocerca', label: 'טיפול מונע תולעת הפארק', nextDueMonths: 3 },
  { key: 'deworming', label: 'טיפול תילוע - תולעי מעיים', nextDueMonths: 6 },
  { key: 'flea_tick', label: 'טיפול נגד פרעושים וקרציות', nextDueMonths: 1 },
  { key: ISRAEL_VACCINE_CUSTOM, label: 'אחר / כתיבה ידנית', nextDueMonths: 12 },
];

export const ISRAEL_VACCINE_LABELS = ISRAEL_VACCINE_OPTIONS.filter(
  (o) => o.key !== ISRAEL_VACCINE_CUSTOM
).map((o) => o.label);

export function findVaccineOptionByLabel(label: string): IsraelVaccineOption | undefined {
  const trimmed = label?.trim();
  if (!trimmed) return undefined;
  return ISRAEL_VACCINE_OPTIONS.find((o) => o.label === trimmed);
}

export function resolveVaccineKeyFromName(name: string): IsraelVaccineKey {
  const match = findVaccineOptionByLabel(name);
  return match?.key ?? ISRAEL_VACCINE_CUSTOM;
}

export function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Compute next due date from vaccine selection and administered date */
export function computeNextDueDate(
  vaccineKey: IsraelVaccineKey,
  administeredDate: Date
): Date | null {
  const option = ISRAEL_VACCINE_OPTIONS.find((o) => o.key === vaccineKey);
  if (!option || option.nextDueMonths == null) return null;
  return addMonths(administeredDate, option.nextDueMonths);
}
