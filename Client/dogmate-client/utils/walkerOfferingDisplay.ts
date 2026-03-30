/**
 * פענוח והצגה של שדות זמינות/תעריף שנשמרים כ-JSON מובנה
 * (אותו פורמט כמו ב-WalkerProfessionalProfileScreen).
 */
import type { CityOffering } from '../services/api';

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

type OfferingForm = {
  city: string;
  priceAmount: string;
  priceFor: string;
  days: number[];
  startTime: string;
  endTime: string;
  fallbackAvailabilityText?: string;
  fallbackPricingText?: string;
};

function parsePricingField(raw: string): Pick<OfferingForm, 'priceAmount' | 'priceFor' | 'fallbackPricingText'> {
  const t = raw.trim();
  if (!t) {
    return { priceAmount: '', priceFor: '' };
  }
  try {
    const p = JSON.parse(t);
    if (p && p.__pm === 1) {
      return {
        priceAmount: typeof p.a === 'string' ? p.a : '',
        priceFor: typeof p.f === 'string' ? p.f : '',
      };
    }
  } catch {
    /* legacy */
  }
  return { priceAmount: '', priceFor: '', fallbackPricingText: t };
}

function fromCityOffering(o: CityOffering): OfferingForm {
  const pricingParts = parsePricingField(o.pricing ?? '');
  const raw = (o.availability ?? '').trim();
  if (!raw) {
    return {
      city: o.city ?? '',
      days: [],
      startTime: '',
      endTime: '',
      priceAmount: pricingParts.priceAmount,
      priceFor: pricingParts.priceFor,
      fallbackPricingText: pricingParts.fallbackPricingText,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__dm === 1 && Array.isArray(parsed.d)) {
      return {
        city: o.city ?? '',
        days: parsed.d.filter((n: unknown) => typeof n === 'number' && n >= 0 && n <= 6),
        startTime: typeof parsed.s === 'string' ? parsed.s : '',
        endTime: typeof parsed.e === 'string' ? parsed.e : '',
        priceAmount: pricingParts.priceAmount,
        priceFor: pricingParts.priceFor,
        fallbackPricingText: pricingParts.fallbackPricingText,
      };
    }
  } catch {
    /* legacy text */
  }
  return {
    city: o.city ?? '',
    days: [],
    startTime: '',
    endTime: '',
    fallbackAvailabilityText: raw,
    priceAmount: pricingParts.priceAmount,
    priceFor: pricingParts.priceFor,
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

function formatPriceSummary(f: OfferingForm): string | null {
  if (f.fallbackPricingText && !f.priceAmount.trim() && !f.priceFor.trim()) {
    return f.fallbackPricingText;
  }
  if (f.priceAmount.trim() || f.priceFor.trim()) {
    const a = f.priceAmount.trim();
    const num = a ? parseInt(a.replace(/[^\d]/g, ''), 10) : NaN;
    const pricePart = a && Number.isFinite(num) ? `${num} ₪` : '—';
    return `${pricePart} עבור טיול של ${f.priceFor.trim() || '—'}`;
  }
  return null;
}

/** מחרוזת availability כפי שנשמרה ב-DB → טקסט קריא בעברית */
export function displayAvailabilityFromStored(raw: string | undefined | null): string {
  const form = fromCityOffering({ city: '', availability: raw ?? '', pricing: '' });
  const s = formatOfferingSummary(form);
  if (s) return s;
  if (form.fallbackAvailabilityText?.trim()) return form.fallbackAvailabilityText.trim();
  return '—';
}

/** מחרוזת pricing כפי שנשמרה ב-DB → טקסט קריא בעברית */
export function displayPricingFromStored(raw: string | undefined | null): string {
  const form = fromCityOffering({ city: '', availability: '', pricing: raw ?? '' });
  const s = formatPriceSummary(form);
  if (s) return s;
  if (form.fallbackPricingText?.trim()) return form.fallbackPricingText.trim();
  return '—';
}
