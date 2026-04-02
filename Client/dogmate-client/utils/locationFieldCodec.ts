/**
 * קידוד מיקום דוגווקר בשדה city יחיד (ללא migration בשרת):
 * עיר — הטקסט כפי שהוא; אזור — קידומת "אזור: " + שם האזור.
 */

export type LocationType = 'city' | 'region';

const REGION_PREFIX = 'אזור:';

export function parseLocationFromCityField(raw: string | undefined | null): {
  type: LocationType;
  value: string;
} {
  const t = (raw ?? '').trim();
  if (!t) {
    return { type: 'city', value: '' };
  }
  if (t.startsWith(REGION_PREFIX)) {
    return { type: 'region', value: t.slice(REGION_PREFIX.length).trim() };
  }
  return { type: 'city', value: t };
}

export function serializeLocationToCityField(type: LocationType, value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (type === 'region') {
    return `${REGION_PREFIX} ${v}`;
  }
  return v;
}

export function formatLocationLine(type: LocationType, value: string): { label: string; value: string } {
  const v = value.trim();
  if (!v) return { label: 'מיקום', value: '—' };
  if (type === 'region') return { label: 'אזור', value: v };
  return { label: 'עיר', value: v };
}

/** תווית + טקסט לשורת מיקום בפרופיל בעל כלב (מחרוזת city מהשרת) */
export function formatLocationLineForStoredCity(cityRaw: string | undefined | null): {
  label: string;
  value: string;
} {
  const { type, value } = parseLocationFromCityField(cityRaw);
  return formatLocationLine(type, value);
}
