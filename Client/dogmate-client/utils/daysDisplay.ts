import { parseStoredNextDueTime } from './healthReminderSettings';

/** Format day count as Hebrew text (ימים / שבועות / חודשים / שנים) */
export function formatDaysToText(days: number): string {
  const n = Math.abs(days);
  if (n < 7) {
    if (n === 1) return 'יום אחד';
    return `${n} ימים`;
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
  if (days >= 30) return '#28C76F';
  if (days >= 7) return '#FF9F43';
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

const MS_MINUTE = 1000 * 60;
const MS_HOUR = MS_MINUTE * 60;
const MS_DAY = MS_HOUR * 24;

export const DUE_NOW_MESSAGE = 'הגיע הזמן';

export type ReminderCountdown = {
  displayValue: number;
  /** When set, UI shows this text instead of the numeric displayValue. */
  displayText?: string;
  unit: 'days' | 'hours' | 'minutes';
  /** Full label, e.g. "שעות עד התזכורת:" */
  label: string;
  /** Unit word to bold in UI: "ימים" | "שעות" | "דקות" */
  labelUnit: string;
  subtext: string;
  urgencyColor: string;
  isPast: boolean;
  /** Shown beside the countdown for system health reminders */
  sourceEmoji?: string;
};

function parseIsoLocalDate(iso: string): Date {
  const head = iso.split('T')[0];
  const parts = head.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? new Date() : t;
}

export function combineIsoDateAndTime(
  dateIso: string | null | undefined,
  time?: string | null
): Date | null {
  if (!dateIso) return null;
  const due = parseIsoLocalDate(dateIso);
  if (Number.isNaN(due.getTime())) return null;
  const normalized = parseStoredNextDueTime(time ?? undefined);
  const [hour, minute] = normalized.split(':').map((p) => parseInt(p, 10));
  due.setHours(hour, minute, 0, 0);
  return due;
}

function countdownLabel(unitWord: string, eventName: string): { label: string; labelUnit: string } {
  return { labelUnit: unitWord, label: `${unitWord} עד ${eventName}:` };
}

function dueNowStatus(eventName: string): ReminderCountdown {
  return {
    displayValue: 0,
    displayText: DUE_NOW_MESSAGE,
    unit: 'minutes',
    labelUnit: 'סטטוס',
    label: 'סטטוס:',
    subtext: `(${DUE_NOW_MESSAGE})`,
    urgencyColor: '#EA5455',
    isPast: false,
  };
}

function daysUntilTarget(target: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / MS_DAY);
}

function buildCountdownFromTarget(
  target: Date,
  eventName: string
): ReminderCountdown | null {
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - Date.now();
  const calendarDays = daysUntilTarget(target);
  const urgencyColor = getDaysUrgencyColor(calendarDays <= 0 ? 0 : calendarDays);

  if (diffMs <= 0) {
    return dueNowStatus(eventName);
  }

  if (diffMs >= MS_DAY) {
    const days = Math.max(1, calendarDays);
    return {
      displayValue: days,
      unit: 'days',
      ...countdownLabel('ימים', eventName),
      subtext: `(${formatDaysToText(days)})`,
      urgencyColor,
      isPast: false,
    };
  }

  const minutesUntil = Math.ceil(diffMs / MS_MINUTE);
  if (diffMs >= MS_HOUR || minutesUntil >= 60) {
    const hours = Math.max(1, Math.ceil(diffMs / MS_HOUR));
    if (hours >= 24) {
      return {
        displayValue: 1,
        unit: 'days',
        ...countdownLabel('ימים', eventName),
        subtext: `(${formatDaysToText(1)})`,
        urgencyColor,
        isPast: false,
      };
    }
    const hoursText = hours === 1 ? 'שעה אחת' : `${hours} שעות`;
    return {
      displayValue: hours,
      unit: 'hours',
      ...countdownLabel('שעות', eventName),
      subtext: `(${hoursText})`,
      urgencyColor,
      isPast: false,
    };
  }

  const minutes = Math.max(1, minutesUntil);
  const minutesText = minutes === 1 ? 'דקה אחת' : `${minutes} דקות`;
  return {
    displayValue: minutes,
    unit: 'minutes',
    ...countdownLabel('דקות', eventName),
    subtext: `(${minutesText})`,
    urgencyColor: '#EA5455',
    isPast: false,
  };
}

/** Countdown until a dated health event (medication dose, vaccination, etc.). */
export function getDueEventCountdown(
  dueAt: Date | string | null | undefined,
  eventName = 'התזכורת'
): ReminderCountdown | null {
  if (dueAt == null) return null;
  const target = typeof dueAt === 'string' ? new Date(dueAt) : dueAt;
  return buildCountdownFromTarget(target, eventName);
}

export function getHealthHubCountdown(
  dueDateIso: string | null | undefined,
  dueTime: string | null | undefined,
  eventName: string
): ReminderCountdown | null {
  const dueAt = combineIsoDateAndTime(dueDateIso, dueTime);
  if (!dueAt) return null;
  return getDueEventCountdown(dueAt, eventName);
}

/** Day-based stock countdown (food inventory). */
export function getCalendarDaysCountdown(
  days: number | null | undefined,
  eventName: string
): ReminderCountdown | null {
  if (days == null) return null;

  if (days < 0) {
    return {
      displayValue: 0,
      unit: 'days',
      ...countdownLabel('ימים', eventName),
      subtext: `(באיחור ${formatDaysToText(Math.abs(days))})`,
      urgencyColor: '#EA5455',
      isPast: false,
    };
  }

  if (days === 0) {
    return dueNowStatus(eventName);
  }

  return {
    displayValue: days,
    unit: 'days',
    ...countdownLabel('ימים', eventName),
    subtext: `(${formatDaysToText(days)})`,
    urgencyColor: getDaysUrgencyColor(days),
    isPast: false,
  };
}

/** Days (or hours/minutes if under 24h) until a reminder datetime. */
export function getReminderCountdown(iso: string | null | undefined): ReminderCountdown | null {
  if (!iso) return null;
  return getDueEventCountdown(iso, 'התזכורת');
}

export function getCountdownPrimaryText(countdown: ReminderCountdown): string {
  return countdown.displayText ?? String(countdown.displayValue);
}

function reminderTimestamp(iso: unknown): number | null {
  if (!iso) return null;
  const t = new Date(String(iso)).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Closest to now first, then farthest. */
export function filterActiveReminders<T extends { remindAt?: unknown }>(items: T[]): T[] {
  const now = Date.now();
  return items.filter((item) => {
    if (!item.remindAt) return false;
    const t = new Date(String(item.remindAt)).getTime();
    return !Number.isNaN(t) && t > now;
  });
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
