import {
  dogWalkerAPI,
  userAPI,
  type ProfessionalProfileResponse,
} from '../services/api';
import { isAbortError } from './isAbortError';
import { withApiRetry } from './apiRetry';

export type FormattedLoggedUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  type: string;
  latitude?: number;
  longitude?: number;
};

type WalkersCacheEntry = {
  walkers: ProfessionalProfileResponse[];
};

const walkersCache = new Map<string, WalkersCacheEntry>();
const dirtyWalkersUsers = new Set<string>();

let loggedUsersCache: FormattedLoggedUser[] | null = null;
let loggedUsersCacheTime = 0;
const LOGGED_USERS_CACHE_TTL_MS = 4500;

export function filterWalkersForOwner(
  walkers: ProfessionalProfileResponse[],
  ownerId: string
): ProfessionalProfileResponse[] {
  return walkers.filter((w) => String(w.userId) !== String(ownerId));
}

export function getWalkersCache(ownerId: string): WalkersCacheEntry | undefined {
  return walkersCache.get(ownerId);
}

export function setWalkersCache(ownerId: string, walkers: ProfessionalProfileResponse[]): void {
  walkersCache.set(ownerId, { walkers });
}

export function markWalkersDirty(ownerId: string): void {
  dirtyWalkersUsers.add(ownerId);
}

export function clearWalkersDirty(ownerId: string): void {
  dirtyWalkersUsers.delete(ownerId);
}

export function shouldForceWalkersRefresh(ownerId: string): boolean {
  return dirtyWalkersUsers.has(ownerId);
}

export function getInitialWalkersState(ownerId: string | null | undefined) {
  const cached = ownerId ? getWalkersCache(ownerId) : undefined;
  return {
    walkers: cached?.walkers ?? [],
    loading: !cached,
    ownerId: ownerId ?? null,
  };
}

export function isWalkersDataWarm(ownerId: string): boolean {
  return Boolean(getWalkersCache(ownerId));
}

export function formatLoggedUsers(
  rawUsers: any[],
  excludeUserId?: string
): FormattedLoggedUser[] {
  return rawUsers
    .filter((user: any) => user.id !== excludeUserId)
    .map((user: any) => {
      const userObj: FormattedLoggedUser = {
        id: user.id,
        name:
          user.type === 'RegularUser' || user.type === 'DogWalkerUser'
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
            : `Admin: ${user.email}`,
        role:
          user.type === 'RegularUser'
            ? 'בעל כלב'
            : user.type === 'DogWalkerUser'
              ? 'דוגווקר'
              : `מנהל (רמה ${user.permissionLevel})`,
        email: user.email,
        type: user.type,
      };

      const canHaveLocation =
        (user.type === 'RegularUser' || user.type === 'DogWalkerUser') &&
        user.latitude != null &&
        user.longitude != null;
      if (canHaveLocation) {
        userObj.latitude = user.latitude;
        userObj.longitude = user.longitude;
      }

      return userObj;
    });
}

export function getLoggedUsersCache(): FormattedLoggedUser[] | null {
  if (loggedUsersCache && Date.now() - loggedUsersCacheTime < LOGGED_USERS_CACHE_TTL_MS) {
    return loggedUsersCache;
  }
  return null;
}

export function setLoggedUsersCache(users: FormattedLoggedUser[]): void {
  loggedUsersCache = users;
  loggedUsersCacheTime = Date.now();
}

export function getInitialLoggedUsersState(excludeUserId?: string) {
  const cached = getLoggedUsersCache();
  const users =
    cached && excludeUserId
      ? cached.filter((u) => u.id !== excludeUserId)
      : cached ?? [];
  return { users };
}

/** Warm walkers list (called after login or when cache is cold). */
export async function prefetchWalkersData(ownerId: string): Promise<void> {
  try {
    const data = await withApiRetry(() =>
      dogWalkerAPI.getWalkersWithProfessionalProfiles(ownerId)
    );
    const list = Array.isArray(data) ? data : [];
    setWalkersCache(ownerId, filterWalkersForOwner(list, ownerId));
    clearWalkersDirty(ownerId);
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Walkers prefetch failed:', error);
    }
  }
}

export async function fetchAndCacheLoggedUsers(excludeUserId?: string): Promise<FormattedLoggedUser[]> {
  const data = await userAPI.getLoggedUsers();
  if (!data.success || !data.users) {
    return getLoggedUsersCache()?.filter((u) => u.id !== excludeUserId) ?? [];
  }
  const formatted = formatLoggedUsers(data.users, excludeUserId);
  setLoggedUsersCache(formatted);
  return formatted;
}
