/**
 * סינון ומיון לרשימת דוג-ווקרים (לוגיקה טהורה).
 */
import type { CityOffering, ProfessionalProfileResponse } from '../services/api';
import { parseLocationFromCityField } from './locationFieldCodec';
import { parseWalkerCityOffering } from './walkerOfferingDisplay';

export type WalkerListFilters = {
  /** ריק = כל הערים */
  cityName: string;
  minPrice: number | null;
  maxPrice: number | null;
  availableNowOnly: boolean;
  /** 0–6 כמו במסך הפרופיל (א׳=0); ריק = כל הימים */
  selectedWeekdays: number[];
};

export const DEFAULT_WALKER_LIST_FILTERS: WalkerListFilters = {
  cityName: '',
  minPrice: null,
  maxPrice: null,
  availableNowOnly: false,
  selectedWeekdays: [],
};

export type WalkerSortOption = 'price_asc' | 'price_desc' | 'rating_desc' | 'distance_asc';

export const DEFAULT_WALKER_SORT: WalkerSortOption = 'rating_desc';

const WD_EN_TO_0_SUN: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** יום בשבוע (0=ראשון) ודקות מחצות בזמן ישראל */
function getIsraelWeekdayAndMinutes(at: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  }).formatToParts(at);
  const wdStr = parts.find((p) => p.type === 'weekday')?.value;
  const weekday = wdStr != null && WD_EN_TO_0_SUN[wdStr] !== undefined ? WD_EN_TO_0_SUN[wdStr] : at.getDay();
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return { weekday, minutes: hour * 60 + minute };
}

function minutesFromHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

export function getMinPriceNisFromProfile(w: ProfessionalProfileResponse): number | null {
  let m = Number.POSITIVE_INFINITY;
  for (const o of w.cityOfferings ?? []) {
    const form = parseWalkerCityOffering(o);
    for (const t of form.priceTiers) {
      const a = t.priceAmount.trim();
      if (!a) continue;
      const num = parseInt(a.replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(num)) m = Math.min(m, num);
    }
  }
  return m === Number.POSITIVE_INFINITY ? null : m;
}

function profileMatchesCity(w: ProfessionalProfileResponse, cityName: string): boolean {
  const t = cityName.trim();
  if (!t) return true;
  for (const o of w.cityOfferings ?? []) {
    const loc = parseLocationFromCityField(o.city ?? '');
    if (loc.type === 'city' && loc.value.trim() === t) return true;
  }
  return false;
}

function profileMatchesPriceRange(
  w: ProfessionalProfileResponse,
  minP: number | null,
  maxP: number | null,
): boolean {
  if (minP == null && maxP == null) return true;
  for (const o of w.cityOfferings ?? []) {
    const form = parseWalkerCityOffering(o);
    for (const t of form.priceTiers) {
      const a = t.priceAmount.trim();
      if (!a) continue;
      const num = parseInt(a.replace(/[^\d]/g, ''), 10);
      if (!Number.isFinite(num)) continue;
      if (minP != null && num < minP) continue;
      if (maxP != null && num > maxP) continue;
      return true;
    }
  }
  return false;
}

function profileMatchesWeekdays(w: ProfessionalProfileResponse, days: number[]): boolean {
  if (days.length === 0) return true;
  for (const o of w.cityOfferings ?? []) {
    const form = parseWalkerCityOffering(o);
    if (form.days.some((d) => days.includes(d))) return true;
  }
  return false;
}

function offeringAvailableNow(o: CityOffering, at: Date): boolean {
  const form = parseWalkerCityOffering(o);
  if (form.days.length === 0 || !form.startTime?.trim() || !form.endTime?.trim()) return false;
  const { weekday, minutes } = getIsraelWeekdayAndMinutes(at);
  if (!form.days.includes(weekday)) return false;
  const st = minutesFromHm(form.startTime);
  const et = minutesFromHm(form.endTime);
  if (st == null || et == null) return false;
  if (et > st) return minutes >= st && minutes <= et;
  return false;
}

export function applyWalkerListFilters(
  walkers: ProfessionalProfileResponse[],
  f: WalkerListFilters,
  now = new Date(),
): ProfessionalProfileResponse[] {
  return walkers.filter((w) => {
    if (!profileMatchesCity(w, f.cityName)) return false;
    if (!profileMatchesPriceRange(w, f.minPrice, f.maxPrice)) return false;
    if (!profileMatchesWeekdays(w, f.selectedWeekdays)) return false;
    if (f.availableNowOnly) {
      const ok = (w.cityOfferings ?? []).some((o) => offeringAvailableNow(o, now));
      if (!ok) return false;
    }
    return true;
  });
}

export function sortWalkers(
  walkers: ProfessionalProfileResponse[],
  sort: WalkerSortOption,
  distanceByUserId: Record<string, number | null | undefined>,
): ProfessionalProfileResponse[] {
  const arr = [...walkers];
  const priceKey = (w: ProfessionalProfileResponse) => getMinPriceNisFromProfile(w) ?? Number.POSITIVE_INFINITY;
  const ratingKey = (w: ProfessionalProfileResponse) => Number(w.averageRating ?? 0);
  const distKey = (w: ProfessionalProfileResponse) => {
    const d = distanceByUserId[String(w.userId)];
    return d == null || !Number.isFinite(d) ? Number.POSITIVE_INFINITY : d;
  };

  arr.sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return priceKey(a) - priceKey(b);
      case 'price_desc':
        return priceKey(b) - priceKey(a);
      case 'rating_desc':
        return ratingKey(b) - ratingKey(a);
      case 'distance_asc':
        return distKey(a) - distKey(b);
      default:
        return 0;
    }
  });
  return arr;
}

export function buildWalkerListView(
  walkers: ProfessionalProfileResponse[],
  filters: WalkerListFilters,
  sort: WalkerSortOption,
  distanceByUserId: Record<string, number | null | undefined>,
  now = new Date(),
): ProfessionalProfileResponse[] {
  const filtered = applyWalkerListFilters(walkers, filters, now);
  return sortWalkers(filtered, sort, distanceByUserId);
}

export function hasActiveFilters(f: WalkerListFilters): boolean {
  return (
    f.cityName.trim().length > 0 ||
    f.minPrice != null ||
    f.maxPrice != null ||
    f.availableNowOnly ||
    f.selectedWeekdays.length > 0
  );
}
