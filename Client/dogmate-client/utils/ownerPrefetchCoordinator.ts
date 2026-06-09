import { dogAPI, reminderAPI } from '../services/api';
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

async function prefetchHomeSequential(
  userId: string,
  userName?: string,
  userLastName?: string
): Promise<void> {
  const dogsResponse = await withApiRetry(() => dogAPI.getDogsForUser(userId));
  const nextDogs =
    dogsResponse.success && dogsResponse.dogs ? dogsResponse.dogs : [];

  const remindersResponse = await withApiRetry(() => reminderAPI.getRemindersForUser(userId));
  const nextReminders = sortRemindersNearestFirst(
    filterActiveReminders(
      remindersResponse.success && remindersResponse.reminders ? remindersResponse.reminders : []
    )
  );

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
    const homeNeeded = !getHomeCache(userId);
    const healthNeeded = !isHealthDataWarm(userId);

    if (homeNeeded && healthNeeded) {
      await Promise.all([
        prefetchHomeSequential(userId, userName, userLastName),
        warmHealthCountdownCache(userId, []),
      ]);
    } else if (homeNeeded) {
      await prefetchHomeSequential(userId, userName, userLastName);
    } else if (healthNeeded) {
      const dogOptions = toDogOptions(getHomeCache(userId)?.dogs ?? []);
      await warmHealthCountdownCache(userId, dogOptions);
    }
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Owner prefetch: home/health phase failed:', error);
    }
  } finally {
    homeGate?.resolve();
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
