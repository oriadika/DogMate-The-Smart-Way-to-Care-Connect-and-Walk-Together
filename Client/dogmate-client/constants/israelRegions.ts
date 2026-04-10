/**
 * אזורים ברמת high-level בלבד — סדר מדרום לצפון.
 * הערך (value) נשמר בפרופיל ובסינון; ה-label להצגה בלבד.
 */

export type DistrictOption = { label: string; value: string };

/** 8 אזורים — רשימה אחת חלקה, ללא תתי־אזורים */
export const DISTRICT_OPTIONS: DistrictOption[] = [
  { label: 'אזור דרום', value: 'south_district' },
  { label: 'אזור ירושלים והסביבה', value: 'jerusalem_district' },
  { label: 'אזור יהודה ושומרון', value: 'yosh_district' },
  { label: 'אזור מרכז והשפלה', value: 'center_district' },
  { label: 'אזור גוש דן', value: 'gush_dan_district' },
  { label: 'אזור השרון', value: 'sharon_district' },
  { label: 'אזור חיפה והסביבה', value: 'haifa_district' },
  { label: 'אזור צפון ועמקים', value: 'north_district' },
];

const districtByValue = new Map(DISTRICT_OPTIONS.map((d) => [d.value, d]));

export function isKnownDistrict(value: string): boolean {
  return districtByValue.has(value.trim());
}

/** תצוגה בעברית לשמירה לפי value; אם אין התאמה — מחזיר את המחרוזת כפי שהיא (שמירות ישנות) */
export function formatDistrictValueForDisplay(stored: string): string {
  const v = stored.trim();
  const hit = districtByValue.get(v);
  if (hit) return hit.label;
  return v;
}

/**
 * רשימה לבורר: 8 האזורים; אם יש ערך שמור שלא ברשימה — מוצג ראשון לבחירה חוזרת
 */
export function districtOptionsWithLegacy(currentValue: string | undefined): DistrictOption[] {
  const v = currentValue?.trim() ?? '';
  if (!v || isKnownDistrict(v)) return DISTRICT_OPTIONS;
  return [{ label: v, value: v }, ...DISTRICT_OPTIONS];
}

export type RegionOption = { label: string; value: string };

/** @deprecated השתמשו ב־DISTRICT_OPTIONS */
export const ISRAEL_REGION_OPTIONS: RegionOption[] = [...DISTRICT_OPTIONS];

export function getAllSubRegionOptions(): RegionOption[] {
  return [...DISTRICT_OPTIONS];
}
