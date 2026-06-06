import { dogAPI, reminderAPI, vaccinationAPI, medicationAPI, foodStockAPI } from '../services/api';
import type { MedicationRow, VaccinationRow } from '../services/api';
import {
  buildHomeDataSignature,
  clearHomeDirty,
  getHomeCache,
  setHomeCache,
} from './homeDataCache';
import {
  clearFoodInventoryDirty,
  clearMedicationsDirty,
  clearVaccinationsDirty,
  isHealthDataWarm,
  setFoodInventoryCache,
  setMedicationsCache,
  setVaccinationsCache,
  toDogOptions,
  transformFoodStocks,
} from './healthDataCache';
import { prefetchWalkersData, isWalkersDataWarm } from './walkersDataCache';
import { sortRemindersNearestFirst } from './daysDisplay';
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
    remindersResponse.success && remindersResponse.reminders ? remindersResponse.reminders : []
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

async function prefetchHealthSequential(userId: string): Promise<void> {
  const cachedDogs = getHomeCache(userId)?.dogs;
  const dogOptions =
    cachedDogs && cachedDogs.length > 0 ? toDogOptions(cachedDogs) : toDogOptions([]);

  const vaccinationsResponse = await withApiRetry(() => vaccinationAPI.list(userId));
  const vaccinationRows = Array.isArray(vaccinationsResponse.vaccinations)
    ? (vaccinationsResponse.vaccinations as VaccinationRow[])
    : [];
  setVaccinationsCache(userId, { rows: vaccinationRows, userDogs: dogOptions });
  clearVaccinationsDirty(userId);

  const medicationsResponse = await withApiRetry(() => medicationAPI.list(userId));
  const medicationRows = Array.isArray(medicationsResponse.medications)
    ? (medicationsResponse.medications as MedicationRow[])
    : [];
  setMedicationsCache(userId, { rows: medicationRows, userDogs: dogOptions });
  clearMedicationsDirty(userId);

  const foodResponse = await withApiRetry(() => foodStockAPI.getFoodStocksForUser(userId));
  const raw =
    foodResponse.success && foodResponse.foodStocks ? foodResponse.foodStocks : [];
  setFoodInventoryCache(userId, { items: transformFoodStocks(raw) });
  clearFoodInventoryDirty(userId);
}

async function executeOwnerPrefetch(
  userId: string,
  userName?: string,
  userLastName?: string,
  homeGate?: { resolve: () => void }
): Promise<void> {
  try {
    if (!getHomeCache(userId)) {
      await prefetchHomeSequential(userId, userName, userLastName);
    }
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Owner prefetch: home phase failed:', error);
    }
  } finally {
    homeGate?.resolve();
  }

  try {
    if (!isHealthDataWarm(userId)) {
      await prefetchHealthSequential(userId);
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
