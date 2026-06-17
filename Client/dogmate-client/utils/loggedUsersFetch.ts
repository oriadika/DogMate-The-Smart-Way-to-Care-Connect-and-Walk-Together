import { userAPI } from '../services/dogmateApi';
import { withApiRetry } from './apiRetry';
import { isAbortError } from './isAbortError';
import { notifyCaughtApiFailure } from './caughtApiFailureReporting';

const RAW_LOGGED_USERS_TTL_MS = 4500;

let rawLoggedUsers: any[] | null = null;
let rawLoggedUsersFetchedAt = 0;
let inflightFetch: Promise<any[]> | null = null;

export function getRawLoggedUsersCache(): any[] | null {
  if (rawLoggedUsers && Date.now() - rawLoggedUsersFetchedAt < RAW_LOGGED_USERS_TTL_MS) {
    return rawLoggedUsers;
  }
  return null;
}

export function setRawLoggedUsersCache(users: any[]): void {
  rawLoggedUsers = users;
  rawLoggedUsersFetchedAt = Date.now();
}

/** Deduped fetch of logged-in users for map + walker distances. */
export async function fetchRawLoggedUsers(options?: { force?: boolean }): Promise<any[]> {
  if (!options?.force) {
    const cached = getRawLoggedUsersCache();
    if (cached) return cached;
  }

  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    try {
      const data = await withApiRetry(() => userAPI.getLoggedUsers());
      const users = data.success && data.users ? data.users : [];
      setRawLoggedUsersCache(users);
      return users;
    } catch (error) {
      if (isAbortError(error)) {
        return getRawLoggedUsersCache() ?? [];
      }
      notifyCaughtApiFailure(error, {
        context: 'Failed to fetch logged users',
        retryAction: async () => {
          await fetchRawLoggedUsers({ force: true });
        },
      });
      throw error;
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}
