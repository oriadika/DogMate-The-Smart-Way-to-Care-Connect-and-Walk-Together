import { runOwnerPrefetch } from './ownerPrefetchCoordinator';

/**
 * Prefetch all owner tab data after login.
 * Serialized phases + deduped coordinator avoid Supabase pooler exhaustion.
 */
export async function prefetchOwnerData(
  userId: string,
  userName?: string,
  userLastName?: string,
  options?: { waitForHome?: boolean }
): Promise<void> {
  return runOwnerPrefetch(userId, userName, userLastName, options);
}
