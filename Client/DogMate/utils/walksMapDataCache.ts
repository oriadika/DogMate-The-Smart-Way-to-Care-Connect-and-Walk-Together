import { LocationService } from '../services/location';
import { fetchRawLoggedUsers } from './loggedUsersFetch';
import { isAbortError } from './isAbortError';

export type MapLoggedUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  type: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  mapDogProfileImageUrl?: string;
  mapDogName?: string;
  mapDogBreed?: string;
  mapDogAgeYears?: number;
  mapDogBirthdate?: string;
};

export type WalksMapCurrentUserProfile = {
  displayName: string;
  roleLabel: string;
  serverAccountType: string | null;
  dogImageUrl: string | null;
  myPingDog: {
    name: string | null;
    breed: string | null;
    ageLabel: string | null;
    imageUrl: string | null;
  };
};

type WalksMapCacheEntry = {
  loggedUsers: MapLoggedUser[];
  signature: string;
  currentUserProfile: WalksMapCurrentUserProfile | null;
};

const walksMapCache = new Map<string, WalksMapCacheEntry>();
const dirtyWalksMapUsers = new Set<string>();

export function formatDogAgeLine(user: any): string | null {
  const yearsRaw = user?.mapDogAgeYears;
  const years = Number(yearsRaw);
  if (Number.isFinite(years) && years > 0) {
    return `${Math.floor(years)} שנים`;
  }

  const birthdateRaw = user?.mapDogBirthdate;
  if (typeof birthdateRaw === 'string' && birthdateRaw.trim().length > 0) {
    const birth = new Date(birthdateRaw);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let months =
        (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      if (now.getDate() < birth.getDate()) {
        months -= 1;
      }
      months = Math.max(0, months);
      if (months < 12) {
        return months === 1 ? 'חודש' : `${months} חודשים`;
      }
      const computedYears = Math.floor(months / 12);
      return `${computedYears} שנים`;
    }
  }
  return null;
}

export function buildMapUsersSignature(users: MapLoggedUser[]): string {
  const usersPart = users
    .map(
      (u) =>
        `${u.id}:${u.latitude ?? ''}:${u.longitude ?? ''}:${u.name}:${u.mapDogProfileImageUrl ?? ''}:${u.mapDogName ?? ''}:${u.mapDogBreed ?? ''}:${u.mapDogAgeYears ?? ''}`
    )
    .join('|');
  return `${users.length}#${usersPart}`;
}

export function extractCurrentUserProfile(
  currentUser: any,
  fallbackFirstName?: string
): WalksMapCurrentUserProfile {
  const resolvedName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
  const dogImageUrl =
    typeof currentUser.mapDogProfileImageUrl === 'string' && currentUser.mapDogProfileImageUrl
      ? currentUser.mapDogProfileImageUrl
      : null;

  return {
    displayName:
      resolvedName || currentUser.email?.split('@')[0] || fallbackFirstName || 'משתמש',
    roleLabel:
      currentUser.type === 'RegularUser'
        ? 'בעל כלב'
        : currentUser.type === 'DogWalkerUser'
          ? 'דוגווקר'
          : 'מנהל',
    serverAccountType: currentUser.type ?? null,
    dogImageUrl,
    myPingDog: {
      name: typeof currentUser.mapDogName === 'string' ? currentUser.mapDogName : null,
      breed: typeof currentUser.mapDogBreed === 'string' ? currentUser.mapDogBreed : null,
      ageLabel: formatDogAgeLine(currentUser),
      imageUrl: dogImageUrl,
    },
  };
}

export function formatMapLoggedUsers(
  rawUsers: any[],
  currentUserId: string,
  userLocation?: { latitude: number; longitude: number } | null
): MapLoggedUser[] {
  return rawUsers
    .filter((user: any) => user.id !== currentUserId)
    .map((user: any) => {
      const userObj: MapLoggedUser = {
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

      if (typeof user.mapDogProfileImageUrl === 'string' && user.mapDogProfileImageUrl) {
        userObj.mapDogProfileImageUrl = user.mapDogProfileImageUrl;
      }
      if (typeof user.mapDogName === 'string' && user.mapDogName) {
        userObj.mapDogName = user.mapDogName;
      }
      if (typeof user.mapDogBreed === 'string' && user.mapDogBreed) {
        userObj.mapDogBreed = user.mapDogBreed;
      }
      if (user.mapDogAgeYears != null) {
        userObj.mapDogAgeYears = user.mapDogAgeYears;
      }
      if (typeof user.mapDogBirthdate === 'string' && user.mapDogBirthdate) {
        userObj.mapDogBirthdate = user.mapDogBirthdate;
      }

      const canHaveLocation =
        (user.type === 'RegularUser' || user.type === 'DogWalkerUser') &&
        user.latitude != null &&
        user.longitude != null;
      if (canHaveLocation) {
        userObj.latitude = user.latitude;
        userObj.longitude = user.longitude;
        if (userLocation) {
          userObj.distance = LocationService.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            user.latitude,
            user.longitude
          );
        }
      }

      return userObj;
    });
}

export function applyMapUserDistances(
  users: MapLoggedUser[],
  userLocation: { latitude: number; longitude: number }
): MapLoggedUser[] {
  return users.map((user) => {
    if (user.latitude != null && user.longitude != null) {
      return {
        ...user,
        distance: LocationService.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          user.latitude,
          user.longitude
        ),
      };
    }
    return user;
  });
}

export function getWalksMapCache(userId: string): WalksMapCacheEntry | undefined {
  return walksMapCache.get(userId);
}

export function setWalksMapCache(userId: string, entry: WalksMapCacheEntry): void {
  walksMapCache.set(userId, entry);
}

export function markWalksMapDirty(userId: string): void {
  dirtyWalksMapUsers.add(userId);
}

export function clearWalksMapDirty(userId: string): void {
  dirtyWalksMapUsers.delete(userId);
}

export function shouldForceWalksMapRefresh(userId: string): boolean {
  return dirtyWalksMapUsers.has(userId);
}

export function isWalksMapDataWarm(userId: string): boolean {
  return Boolean(getWalksMapCache(userId));
}

export function getInitialWalksMapState(
  userId: string | null | undefined,
  fallbackFirstName?: string
) {
  const cached = userId ? getWalksMapCache(userId) : undefined;
  return {
    loggedUsers: cached?.loggedUsers ?? [],
    loading: !cached,
    currentUserProfile: cached?.currentUserProfile ?? null,
    fallbackFirstName: fallbackFirstName ?? 'משתמש',
    userId: userId ?? null,
  };
}

export async function prefetchWalksMapData(
  userId: string,
  fallbackFirstName?: string
): Promise<void> {
  try {
    const rawUsers = await fetchRawLoggedUsers();
    const currentUser = rawUsers.find((user: any) => user.id === userId);
    const loggedUsers = formatMapLoggedUsers(rawUsers, userId);
    const currentUserProfile = currentUser
      ? extractCurrentUserProfile(currentUser, fallbackFirstName)
      : null;

    setWalksMapCache(userId, {
      loggedUsers,
      signature: buildMapUsersSignature(loggedUsers),
      currentUserProfile,
    });
    clearWalksMapDirty(userId);
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Walks map prefetch failed:', error);
    }
  }
}

/** Build cache entry from a fresh API response (ProfileScreen refresh). */
export function buildWalksMapCacheFromRaw(
  rawUsers: any[],
  userId: string,
  userLocation?: { latitude: number; longitude: number } | null,
  fallbackFirstName?: string
): WalksMapCacheEntry {
  const currentUser = rawUsers.find((user: any) => user.id === userId);
  const loggedUsers = formatMapLoggedUsers(rawUsers, userId, userLocation);
  return {
    loggedUsers,
    signature: buildMapUsersSignature(loggedUsers),
    currentUserProfile: currentUser
      ? extractCurrentUserProfile(currentUser, fallbackFirstName)
      : null,
  };
}
