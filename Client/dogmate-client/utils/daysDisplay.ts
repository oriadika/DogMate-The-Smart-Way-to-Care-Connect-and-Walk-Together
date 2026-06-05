/** Format day count as Hebrew text (ימים / שבועות / חודשים / שנים) */
export function formatDaysToText(days: number): string {
  const n = Math.abs(days);
  if (n < 7) {
    return `${n} ${n === 1 ? 'יום' : 'ימים'}`;
  }

  if (n < 30) {
    const weeks = Math.floor(n / 7);
    const remainingDays = n % 7;

    if (remainingDays === 0) {
      if (weeks === 1) return 'שבוע';
      if (weeks === 2) return 'שבועיים';
      return `${weeks} שבועות`;
    }

    const weeksText = weeks === 1 ? 'שבוע' : weeks === 2 ? 'שבועיים' : `${weeks} שבועות`;
    const daysText = remainingDays === 1 ? 'יום' : `${remainingDays} ימים`;
    return `${weeksText} ו-${daysText}`;
  }

  const months = Math.floor(n / 30);

  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    if (remMonths === 0) {
      if (years === 1) return 'שנה';
      if (years === 2) return 'שנתיים';
      return `${years} שנים`;
    }

    const yearsText = years === 1 ? 'שנה' : years === 2 ? 'שנתיים' : `${years} שנים`;
    const monthsText = remMonths === 1 ? 'חודש' : `${remMonths} חודשים`;
    return `${yearsText} ו-${monthsText}`;
  }

  const remainingDays = n % 30;

  if (remainingDays === 0) {
    return months === 1 ? 'חודש' : `${months} חודשים`;
  }

  const monthsText = months === 1 ? 'חודש' : `${months} חודשים`;
  const daysText = remainingDays === 1 ? 'יום' : `${remainingDays} ימים`;
  return `${monthsText} ו-${daysText}`;
}

export function getDaysUrgencyColor(days: number): string {
  if (days > 30) return '#28C76F';
  if (days > 10) return '#FF9F43';
  return '#EA5455';
}

export function daysUntilIsoDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const head = iso.split('T')[0];
  const parts = head.split('-');
  if (parts.length !== 3) return null;
  const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const MS_HOUR = 1000 * 60 * 60;
const MS_DAY = MS_HOUR * 24;

export type ReminderCountdown = {
  displayValue: number;
  unit: 'days' | 'hours';
  label: string;
  subtext: string;
  urgencyColor: string;
  isPast: boolean;
};

function urgencyColorForHours(hours: number): string {
  if (hours <= 6) return '#EA5455';
  if (hours <= 12) return '#FF9F43';
  return '#28C76F';
}

/** Days (or hours if under 24h) until a reminder datetime. */
export function getReminderCountdown(iso: string | null | undefined): ReminderCountdown | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return {
      displayValue: 0,
      unit: 'hours',
      label: 'שעות עד התזכורת:',
      subtext: '(עבר הזמן)',
      urgencyColor: '#EA5455',
      isPast: true,
    };
  }

  if (diffMs < MS_DAY) {
    const hours = Math.max(1, Math.ceil(diffMs / MS_HOUR));
    const hoursText = hours === 1 ? 'שעה' : `${hours} שעות`;
    return {
      displayValue: hours,
      unit: 'hours',
      label: 'שעות עד התזכורת:',
      subtext: `(${hoursText})`,
      urgencyColor: urgencyColorForHours(hours),
      isPast: false,
    };
  }

  const days = Math.floor(diffMs / MS_DAY);
  return {
    displayValue: days,
    unit: 'days',
    label: 'ימים עד התזכורת:',
    subtext: `(${formatDaysToText(days)})`,
    urgencyColor: getDaysUrgencyColor(days),
    isPast: false,
  };
}

function reminderTimestamp(iso: unknown): number | null {
  if (!iso) return null;
  const t = new Date(String(iso)).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Closest to now first, then farthest. */
export function sortRemindersNearestFirst<T extends { remindAt?: unknown }>(items: T[]): T[] {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const ta = reminderTimestamp(a.remindAt);
    const tb = reminderTimestamp(b.remindAt);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;

    const da = Math.abs(ta - now);
    const db = Math.abs(tb - now);
    if (da !== db) return da - db;

    const aFuture = ta >= now;
    const bFuture = tb >= now;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;

    return ta - tb;
  });
}
