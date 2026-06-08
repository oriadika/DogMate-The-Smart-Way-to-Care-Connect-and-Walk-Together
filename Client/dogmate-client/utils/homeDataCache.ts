import { dogAPI, reminderAPI } from '../services/api';
import { sortRemindersNearestFirst, filterActiveReminders } from './daysDisplay';
import { isAbortError } from './isAbortError';

export type HomeCacheEntry = {
  userName: string;
  userLastName: string;
  dogs: any[];
  reminders: any[];
  signature: string;
};

const homeDataCache = new Map<string, HomeCacheEntry>();
const dirtyHomeDataUsers = new Set<string>();

const profileImageFingerprint = (url: unknown): string => {
  const s = typeof url === 'string' ? url : '';
  if (!s) return '0';
  const len = s.length;
  if (len <= 120) return `${len}:${s}`;
  return `${len}:${s.slice(0, 60)}:${s.slice(-60)}`;
};

export const buildHomeDataSignature = (dogsData: any[], remindersData: any[]): string => {
  const dogsPart = dogsData
    .map((d: any) =>
      [
        d?.id ?? '',
        d?.name ?? '',
        d?.breed ?? '',
        d?.birthdate ?? '',
        d?.gender ?? '',
        profileImageFingerprint(d?.profileImageUrl),
        d?.weightKg ?? '',
      ].join(':')
    )
    .join('|');
  const remindersPart = remindersData
    .map((r: any) => `${r?.id ?? ''}:${r?.title ?? ''}:${r?.remindAt ?? ''}:${r?.sent ?? ''}`)
    .join('|');
  return `${dogsData.length}#${remindersData.length}#${dogsPart}#${remindersPart}`;
};

export function getHomeCache(userId: string): HomeCacheEntry | undefined {
  return homeDataCache.get(userId);
}

export function setHomeCache(userId: string, entry: HomeCacheEntry): void {
  homeDataCache.set(userId, entry);
}

export function clearHomeCache(userId: string): void {
  homeDataCache.delete(userId);
}

export function markHomeDataDirty(userId: string): void {
  dirtyHomeDataUsers.add(userId);
}

export function consumeHomeDirty(userId: string): boolean {
  if (!dirtyHomeDataUsers.has(userId)) return false;
  dirtyHomeDataUsers.delete(userId);
  return true;
}

export function shouldForceHomeRefresh(userId: string, routeRefresh?: boolean): boolean {
  return routeRefresh === true || dirtyHomeDataUsers.has(userId);
}

export function clearHomeDirty(userId: string): void {
  dirtyHomeDataUsers.delete(userId);
}

export type HomeReminderRow = {
  id?: string;
  title?: string;
  description?: string;
  remindAt?: string;
  sourceType?: string;
  sourceId?: string;
  dogIds?: string[];
  systemGenerated?: boolean;
};

export const EDITABLE_HEALTH_REMINDER_TYPES = ['FOOD', 'VACCINATION', 'MEDICATION'] as const;

export function findSystemReminderForSource(
  reminders: HomeReminderRow[],
  sourceType: string,
  sourceId: string
): HomeReminderRow | null {
  const match = reminders.find(
    (r) => r.sourceType === sourceType && String(r.sourceId) === String(sourceId)
  );
  return match ?? null;
}

/** FOOD system reminder linked to a food-stock row, if one exists. */
export function findFoodReminderForStock(
  reminders: HomeReminderRow[],
  foodStockId: string
): HomeReminderRow | null {
  return findSystemReminderForSource(reminders, 'FOOD', foodStockId);
}

export function findVaccinationReminderForRecord(
  reminders: HomeReminderRow[],
  vaccinationId: string
): HomeReminderRow | null {
  return findSystemReminderForSource(reminders, 'VACCINATION', vaccinationId);
}

export function findMedicationReminderForRecord(
  reminders: HomeReminderRow[],
  medicationId: string
): HomeReminderRow | null {
  return findSystemReminderForSource(reminders, 'MEDICATION', medicationId);
}

/** Reload home reminders after food-inventory or FOOD-reminder edits. */
export async function refreshHomeRemindersFromServer(userId: string): Promise<HomeReminderRow[]> {
  const remindersResponse = await reminderAPI.getRemindersForUser(userId);
  const reminders = sortRemindersNearestFirst(
    filterActiveReminders(
      remindersResponse.success && remindersResponse.reminders ? remindersResponse.reminders : []
    )
  );

  const cached = getHomeCache(userId);
  const dogs = cached?.dogs ?? [];
  setHomeCache(userId, {
    userName: cached?.userName ?? 'חברים',
    userLastName: cached?.userLastName ?? '',
    dogs,
    reminders,
    signature: buildHomeDataSignature(dogs, reminders),
  });
  clearHomeDirty(userId);
  return reminders;
}

export function applyHomeCacheToState(
  cached: HomeCacheEntry,
  setters: {
    setUserName: (v: string) => void;
    setUserLastName: (v: string) => void;
    setDogs: (v: any[]) => void;
    setReminders: (v: any[]) => void;
  }
): void {
  setters.setUserName(cached.userName || 'חברים');
  setters.setUserLastName(cached.userLastName || '');
  setters.setDogs(cached.dogs || []);
  setters.setReminders(cached.reminders || []);
}

export function getInitialHomeState(userId: string | null | undefined, routeUserName?: string) {
  const cached = userId ? getHomeCache(userId) : undefined;
  return {
    userName: routeUserName || cached?.userName || '',
    userLastName: cached?.userLastName || '',
    dogs: cached?.dogs ?? [],
    reminders: cached?.reminders ?? [],
    loading: !cached,
  };
}

/** Warm the module cache before Home mounts (e.g. right after login). */
export async function prefetchHomeData(
  userId: string,
  userName?: string,
  userLastName?: string
): Promise<void> {
  try {
    const [dogsSettled, remindersSettled] = await Promise.allSettled([
      dogAPI.getDogsForUser(userId),
      reminderAPI.getRemindersForUser(userId),
    ]);

    let nextDogs: any[] = [];
    if (dogsSettled.status === 'fulfilled') {
      const dogsResponse = dogsSettled.value;
      nextDogs = dogsResponse.success && dogsResponse.dogs ? dogsResponse.dogs : [];
    } else {
      if (isAbortError(dogsSettled.reason)) return;
      return;
    }

    let nextReminders: any[] = [];
    if (remindersSettled.status === 'fulfilled') {
      const remindersResponse = remindersSettled.value;
      nextReminders = sortRemindersNearestFirst(
        filterActiveReminders(
          remindersResponse.success && remindersResponse.reminders ? remindersResponse.reminders : []
        )
      );
    } else {
      if (isAbortError(remindersSettled.reason)) return;
      return;
    }

    const nextUserName = userName || getHomeCache(userId)?.userName || 'חברים';
    const nextUserLastName = userLastName || getHomeCache(userId)?.userLastName || '';
    const signature = buildHomeDataSignature(nextDogs, nextReminders);

    setHomeCache(userId, {
      userName: nextUserName,
      userLastName: nextUserLastName,
      dogs: nextDogs,
      reminders: nextReminders,
      signature,
    });
    clearHomeDirty(userId);
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Home prefetch failed:', error);
    }
  }
}
