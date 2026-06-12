import axios from 'axios';

/** CKAN DataStore (data.gov.il) */
const DATA_GOV_CKAN = 'https://data.gov.il/api/3/action/datastore_search';

/**
 * מאגר "טבלת ישובים" (למ"ס) — resource פעיל ב-data.gov.il.
 * ה-UUID מהתכנון המקורי (5c78ad88-…) אינו קיים יותר ב-API; נשתמש במאגר הרשמי המקביל.
 */
export const ISRAEL_SETTLEMENTS_RESOURCE_ID = 'b7cf8f14-64a2-4b33-8d4b-edb286fdbd37';

/** שם עמודת שם הישוב בעברית במאגר זה */
export const SETTLEMENT_NAME_FIELD = 'שם_ישוב';

export type CityDropdownItem = {
  label: string;
  value: string;
};

type CkanDatastoreResponse = {
  success: boolean;
  error?: { message?: string };
  result?: {
    records: Record<string, unknown>[];
    total?: number;
  };
};

function normalizeName(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).replace(/\s+/g, ' ').trim();
  return s.length > 0 ? s : null;
}

/**
 * מושך את כל רשומות הישובים (עם pagination אם נדרש), מנקה רווחים, מסיר כפילויות, ממיין לעברית.
 */
export async function fetchIsraelCities(): Promise<CityDropdownItem[]> {
  const resourceId = ISRAEL_SETTLEMENTS_RESOURCE_ID;
  const allRecords: Record<string, unknown>[] = [];
  let offset = 0;
  const pageLimit = 3200;
  let total = Number.POSITIVE_INFINITY;

  try {
    while (offset < total) {
      const { data } = await axios.get<CkanDatastoreResponse>(DATA_GOV_CKAN, {
        params: {
          resource_id: resourceId,
          limit: pageLimit,
          offset,
        },
        timeout: 20000,
        validateStatus: (s) => s >= 200 && s < 300,
      });

      if (!data.success || !data.result) {
        const msg = data.error?.message || 'השרת לא החזיר נתוני ישובים';
        throw new Error(msg);
      }

      const { records } = data.result;
      const t = data.result.total;

      allRecords.push(...records);

      if (typeof t === 'number') {
        total = t;
      } else if (records.length < pageLimit) {
        total = allRecords.length;
      }

      offset += records.length;

      if (records.length === 0) break;
      if (allRecords.length >= total) break;
    }
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      const body = e.response?.data as CkanDatastoreResponse | undefined;
      const msg =
        body?.error?.message ||
        e.message ||
        'בעיית רשת — נסה שוב מאוחר יותר';
      throw new Error(msg);
    }
    throw e;
  }

  const seen = new Set<string>();
  const items: CityDropdownItem[] = [];

  for (const rec of allRecords) {
    const name = normalizeName(rec[SETTLEMENT_NAME_FIELD]);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    items.push({ label: name, value: name });
  }

  items.sort((a, b) => a.label.localeCompare(b.label, 'he'));

  return items;
}
