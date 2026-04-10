/**
 * פענוח והצגה של שדות זמינות/תעריף שנשמרים כ-JSON מובנה
 * (אותו פורמט כמו ב-WalkerProfessionalProfileScreen).
 */
import type { CityOffering } from '../services/api';
import { parseLocationFromCityField, type LocationType } from './locationFieldCodec';

/** ימי השבוע מימין לשמאל: א׳ = ראשון — חייב להיות זהה למסך הפרופיל המקצועי */
const WEEKDAYS: { id: number; label: string }[] = [
  { id: 0, label: 'א׳' },
  { id: 1, label: 'ב׳' },
  { id: 2, label: 'ג׳' },
  { id: 3, label: 'ד׳' },
  { id: 4, label: 'ה׳' },
  { id: 5, label: 'ו׳' },
  { id: 6, label: 'ש׳' },
];

type PriceTier = { priceAmount: string; priceFor: string };

type OfferingForm = {
  locationType: LocationType;
  locationValue: string;
  priceTiers: PriceTier[];
  days: number[];
  startTime: string;
  endTime: string;
  fallbackAvailabilityText?: string;
  fallbackPricingText?: string;
};

export type WalkerOfferingForm = OfferingForm;

function parsePricingField(raw: string): Pick<OfferingForm, 'priceTiers' | 'fallbackPricingText'> {
  const t = raw.trim();
  if (!t) {
    return { priceTiers: [{ priceAmount: '', priceFor: '' }] };
  }
  try {
    const p = JSON.parse(t);
    if (p && p.__pm === 2 && Array.isArray(p.tiers)) {
      const tiers = p.tiers
        .map((x: any) => ({
          priceAmount: typeof x.a === 'string' ? x.a : '',
          priceFor: typeof x.f === 'string' ? x.f : '',
        }))
        .filter((x: PriceTier) => x.priceAmount.trim() || x.priceFor.trim());
      if (tiers.length > 0) return { priceTiers: tiers };
    }
    if (p && p.__pm === 1) {
      return {
        priceTiers: [
          {
            priceAmount: typeof p.a === 'string' ? p.a : '',
            priceFor: typeof p.f === 'string' ? p.f : '',
          },
        ],
      };
    }
  } catch {
    /* legacy */
  }
  return { priceTiers: [{ priceAmount: '', priceFor: '' }], fallbackPricingText: t };
}

/** פענוח הצעה לטופס פנימי — לסינון/מיון ברשימת דוגווקרים */
export function parseWalkerCityOffering(o: CityOffering): OfferingForm {
  const loc = parseLocationFromCityField(o.city ?? '');
  const pricingParts = parsePricingField(o.pricing ?? '');
  const raw = (o.availability ?? '').trim();
  if (!raw) {
    return {
      locationType: loc.type,
      locationValue: loc.value,
      days: [],
      startTime: '',
      endTime: '',
      priceTiers: pricingParts.priceTiers,
      fallbackPricingText: pricingParts.fallbackPricingText,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__dm === 1 && Array.isArray(parsed.d)) {
      return {
        locationType: loc.type,
        locationValue: loc.value,
        days: parsed.d.filter((n: unknown) => typeof n === 'number' && n >= 0 && n <= 6),
        startTime: typeof parsed.s === 'string' ? parsed.s : '',
        endTime: typeof parsed.e === 'string' ? parsed.e : '',
        priceTiers: pricingParts.priceTiers,
        fallbackPricingText: pricingParts.fallbackPricingText,
      };
    }
  } catch {
    /* legacy text */
  }
  return {
    locationType: loc.type,
    locationValue: loc.value,
    days: [],
    startTime: '',
    endTime: '',
    fallbackAvailabilityText: raw,
    priceTiers: pricingParts.priceTiers,
    fallbackPricingText: pricingParts.fallbackPricingText,
  };
}

function formatOfferingSummary(f: OfferingForm): string | null {
  if (f.fallbackAvailabilityText && f.days.length === 0 && !f.startTime && !f.endTime) {
    return f.fallbackAvailabilityText;
  }
  const parts: string[] = [];
  if (f.days.length > 0) {
    parts.push(f.days.map((id) => WEEKDAYS.find((w) => w.id === id)?.label).filter(Boolean).join(', '));
  }
  if (f.startTime || f.endTime) {
    parts.push(`מ-${f.startTime || '—'} עד ${f.endTime || '—'}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

function tierSortKey(tier: PriceTier): number {
  const a = tier.priceAmount.trim();
  const num = a ? parseInt(a.replace(/[^\d]/g, ''), 10) : NaN;
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
}

/** שורות תצוגה לתעריף, מהזול ליקר */
function formatPriceLinesSorted(f: OfferingForm): string[] {
  const hasTier = f.priceTiers.some((t) => t.priceAmount.trim() || t.priceFor.trim());
  if (f.fallbackPricingText && !hasTier) {
    return [f.fallbackPricingText.trim()];
  }
  const items: { key: number; line: string }[] = [];
  for (const tier of f.priceTiers) {
    if (!tier.priceAmount.trim() && !tier.priceFor.trim()) continue;
    const a = tier.priceAmount.trim();
    const num = a ? parseInt(a.replace(/[^\d]/g, ''), 10) : NaN;
    const pricePart = a && Number.isFinite(num) ? `${num} ₪` : '—';
    const line = `${pricePart} עבור טיול של ${tier.priceFor.trim() || '—'}`;
    items.push({ key: tierSortKey(tier), line });
  }
  items.sort((x, y) => x.key - y.key);
  return items.map((x) => x.line);
}

/** מחרוזת availability כפי שנשמרה ב-DB → טקסט קריא בעברית */
export function displayAvailabilityFromStored(raw: string | undefined | null): string {
  const form = parseWalkerCityOffering({ city: '', availability: raw ?? '', pricing: '' });
  const s = formatOfferingSummary(form);
  if (s) return s;
  if (form.fallbackAvailabilityText?.trim()) return form.fallbackAvailabilityText.trim();
  return '—';
}

/** מחרוזת pricing כפי שנשמרה ב-DB → טקסט קריא בעברית (שורה אחת, ממוין לפי מחיר) */
export function displayPricingFromStored(raw: string | undefined | null): string {
  const form = parseWalkerCityOffering({ city: '', availability: '', pricing: raw ?? '' });
  const lines = formatPriceLinesSorted(form);
  if (lines.length > 0) return lines.join(' · ');
  if (form.fallbackPricingText?.trim()) return form.fallbackPricingText.trim();
  return '—';
}

/** שורות תעריף נפרדות, מהזול ליקר — לתצוגה אנכית */
export function getPricingDisplayLinesFromStored(raw: string | undefined | null): string[] {
  const form = parseWalkerCityOffering({ city: '', availability: '', pricing: raw ?? '' });
  const lines = formatPriceLinesSorted(form);
  if (lines.length > 0) return lines;
  if (form.fallbackPricingText?.trim()) return [form.fallbackPricingText.trim()];
  return ['—'];
}
