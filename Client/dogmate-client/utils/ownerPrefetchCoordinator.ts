import { dogAPI, reminderAPI } from '../services/dogmateApi';
import {
  buildHomeDataSignature,
  clearHomeDirty,
  getHomeCache,
  setHomeCache,
} from './homeDataCache';
import { isHealthDataWarm, toDogOptions, warmHealthCountdownCache } from './healthDataCache';
import { prefetchWalkersData, isWalkersDataWarm } from './walkersDataCache';
import { sortRemindersNearestFirst, filterActiveReminders } from './daysDisplay';
import { isAbortError } from './isAbortError';
import { withApiRetry } from './apiRetry';

type PrefetchJob = {
  homeReady: Promise<void>;
  full: Promise<void>;
};

const inflightByUser = new Map<string, PrefetchJob>();

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Parallel dogs + reminders fetch (no waterfall). */
async function prefetchHomeParallel(
  userId: string,
  userName?: string,
  userLastName?: string
): Promise<void> {
  const [dogsSettled, remindersSettled] = await Promise.allSettled([
    withApiRetry(() => dogAPI.getDogsForUser(userId)),
    withApiRetry(() => reminderAPI.getRemindersForUser(userId)),
  ]);

  const nextDogs =
    dogsSettled.status === 'fulfilled' && dogsSettled.value.success && dogsSettled.value.dogs
      ? dogsSettled.value.dogs
      : [];

  const nextReminders =
    remindersSettled.status === 'fulfilled' &&
    remindersSettled.value.success &&
    remindersSettled.value.reminders
      ? sortRemindersNearestFirst(filterActiveReminders(remindersSettled.value.reminders))
      : [];

  setHomeCache(userId, {
    userName: userName || getHomeCache(userId)?.userName || 'חברים',
    userLastName: userLastName || getHomeCache(userId)?.userLastName || '',
    dogs: nextDogs,
    reminders: nextReminders,
    signature: buildHomeDataSignature(nextDogs, nextReminders),
  });
  clearHomeDirty(userId);
}

async function executeOwnerPrefetch(
  userId: string,
  userName?: string,
  userLastName?: string,
  homeGate?: { resolve: () => void }
): Promise<void> {
  try {
    if (!getHomeCache(userId)) {
      await prefetchHomeParallel(userId, userName, userLastName);
    }
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Owner prefetch: home phase failed:', error);
    }
  } finally {
    homeGate?.resolve();
  }

  void (async () => {
    try {
      if (!isHealthDataWarm(userId)) {
        const dogOptions = toDogOptions(getHomeCache(userId)?.dogs ?? []);
        await warmHealthCountdownCache(
          userId,
          dogOptions.length > 0 ? dogOptions : undefined
        );
      }
    } catch (error) {
      if (!isAbortError(error)) {
        console.warn('Owner prefetch: health phase failed:', error);
      }
    }

    try {
      if (!isWalkersDataWarm(userId)) {
        await prefetchWalkersData(userId);
      }
    } catch (error) {
      if (!isAbortError(error)) {
        console.warn('Owner prefetch: walkers phase failed:', error);
      }
    }
  })();
}

function getOrCreatePrefetchJob(
  userId: string,
  userName?: string,
  userLastName?: string
): PrefetchJob {
  const existing = inflightByUser.get(userId);
  if (existing) return existing;

  const homeGate = createDeferred();
  const full = executeOwnerPrefetch(userId, userName, userLastName, homeGate).finally(() => {
    if (inflightByUser.get(userId)?.full === full) {
      inflightByUser.delete(userId);
    }
  });

  const job: PrefetchJob = { homeReady: homeGate.promise, full };
  inflightByUser.set(userId, job);
  return job;
}

/** Deduplicated owner prefetch. Use waitForHome to block until dogs/reminders are cached. */
export function runOwnerPrefetch(
  userId: string,
  userName?: string,
  userLastName?: string,
  options?: { waitForHome?: boolean }
): Promise<void> {
  const job = getOrCreatePrefetchJob(userId, userName, userLastName);
  return options?.waitForHome ? job.homeReady : job.full;
}

/** Await in-flight home prefetch (e.g. HomeScreen cold start). */
export function waitForOwnerPrefetchHome(userId: string): Promise<void> {
  const job = inflightByUser.get(userId);
  return job?.homeReady ?? Promise.resolve();
}
