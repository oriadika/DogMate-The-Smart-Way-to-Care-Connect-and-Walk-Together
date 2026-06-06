import {
  dogAPI,
  foodStockAPI,
  medicationAPI,
  vaccinationAPI,
  type MedicationRow,
  type VaccinationRow,
} from '../services/api';
import { getHomeCache } from './homeDataCache';
import { runOwnerPrefetch } from './ownerPrefetchCoordinator';
import { isAbortError } from './isAbortError';
import { withApiRetry } from './apiRetry';

export type DogOption = { id: string; name: string };

export type FoodInventoryItem = {
  id: string;
  dogs: Array<{ id: string; name: string; imageUrl?: string }>;
  daysRemaining: number;
  dailyConsumption: string;
  bagSize: string;
  currentAmount: string;
  brandName?: string;
};

type VaccinationsCacheEntry = {
  rows: VaccinationRow[];
  userDogs: DogOption[];
};

type MedicationsCacheEntry = {
  rows: MedicationRow[];
  userDogs: DogOption[];
};

type FoodInventoryCacheEntry = {
  items: FoodInventoryItem[];
};

const vaccinationsCache = new Map<string, VaccinationsCacheEntry>();
const medicationsCache = new Map<string, MedicationsCacheEntry>();
const foodInventoryCache = new Map<string, FoodInventoryCacheEntry>();

const dirtyVaccinationsUsers = new Set<string>();
const dirtyMedicationsUsers = new Set<string>();
const dirtyFoodInventoryUsers = new Set<string>();

export function toDogOptions(dogs: Array<{ id?: string; name?: string }>): DogOption[] {
  return dogs.map((d) => ({
    id: String(d.id),
    name: String(d.name || 'כלב').trim() || 'כלב',
  }));
}

export function transformFoodStocks(rawStocks: any[]): FoodInventoryItem[] {
  return rawStocks.map((stock: any) => {
    const currentGrams = stock.currentLevelInKg * 1000;
    const daysRemaining =
      stock.dailyConsumptionInGram > 0
        ? Math.floor(currentGrams / stock.dailyConsumptionInGram)
        : 0;

    return {
      id: stock.id,
      dogs:
        stock.dogs?.map((dog: any) => ({
          id: dog.id,
          name: dog.name,
          imageUrl: dog.profileImageUrl,
        })) || [],
      daysRemaining,
      dailyConsumption: stock.dailyConsumptionInGram.toString(),
      bagSize: stock.bagSizeInKg.toString(),
      currentAmount: stock.currentLevelInKg.toString(),
      brandName: stock.brandName,
    };
  });
}

export function getVaccinationsCache(userId: string): VaccinationsCacheEntry | undefined {
  return vaccinationsCache.get(userId);
}

export function setVaccinationsCache(userId: string, entry: VaccinationsCacheEntry): void {
  vaccinationsCache.set(userId, entry);
}

export function getMedicationsCache(userId: string): MedicationsCacheEntry | undefined {
  return medicationsCache.get(userId);
}

export function setMedicationsCache(userId: string, entry: MedicationsCacheEntry): void {
  medicationsCache.set(userId, entry);
}

export function getFoodInventoryCache(userId: string): FoodInventoryCacheEntry | undefined {
  return foodInventoryCache.get(userId);
}

export function setFoodInventoryCache(userId: string, entry: FoodInventoryCacheEntry): void {
  foodInventoryCache.set(userId, entry);
}

export function markVaccinationsDirty(userId: string): void {
  dirtyVaccinationsUsers.add(userId);
}

export function markMedicationsDirty(userId: string): void {
  dirtyMedicationsUsers.add(userId);
}

export function markFoodInventoryDirty(userId: string): void {
  dirtyFoodInventoryUsers.add(userId);
}

export function shouldForceVaccinationsRefresh(userId: string): boolean {
  return dirtyVaccinationsUsers.has(userId);
}

export function shouldForceMedicationsRefresh(userId: string): boolean {
  return dirtyMedicationsUsers.has(userId);
}

export function shouldForceFoodInventoryRefresh(userId: string): boolean {
  return dirtyFoodInventoryUsers.has(userId);
}

export function clearVaccinationsDirty(userId: string): void {
  dirtyVaccinationsUsers.delete(userId);
}

export function clearMedicationsDirty(userId: string): void {
  dirtyMedicationsUsers.delete(userId);
}

export function clearFoodInventoryDirty(userId: string): void {
  dirtyFoodInventoryUsers.delete(userId);
}

export function getInitialVaccinationsState(userId: string | null | undefined) {
  const cached = userId ? getVaccinationsCache(userId) : undefined;
  return {
    rows: cached?.rows ?? [],
    userDogs: cached?.userDogs ?? [],
    loading: !cached,
    userId: userId ?? null,
  };
}

export function getInitialMedicationsState(userId: string | null | undefined) {
  const cached = userId ? getMedicationsCache(userId) : undefined;
  return {
    rows: cached?.rows ?? [],
    userDogs: cached?.userDogs ?? [],
    loading: !cached,
    userId: userId ?? null,
  };
}

export function getInitialFoodInventoryState(userId: string | null | undefined) {
  const cached = userId ? getFoodInventoryCache(userId) : undefined;
  return {
    items: cached?.items ?? [],
    loading: !cached,
    userId: userId ?? null,
  };
}

export function isHealthDataWarm(userId: string): boolean {
  return (
    Boolean(getVaccinationsCache(userId)) &&
    Boolean(getMedicationsCache(userId)) &&
    Boolean(getFoodInventoryCache(userId))
  );
}

/** Reuse dogs from home cache when available to skip an extra HTTP round-trip. */
export async function fetchDogOptionsForUser(userId: string): Promise<DogOption[]> {
  const fromHome = getHomeCache(userId)?.dogs;
  if (fromHome && fromHome.length > 0) {
    return toDogOptions(fromHome);
  }
  const dogsRes = await dogAPI.getDogsForUser(userId);
  const list = dogsRes.success && Array.isArray(dogsRes.dogs) ? dogsRes.dogs : [];
  return toDogOptions(list);
}

/** Warm health caches (called after login or when caches are cold). */
export async function prefetchHealthData(userId: string): Promise<void> {
  try {
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
    const raw = foodResponse.success && foodResponse.foodStocks ? foodResponse.foodStocks : [];
    setFoodInventoryCache(userId, { items: transformFoodStocks(raw) });
    clearFoodInventoryDirty(userId);
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Health prefetch failed:', error);
    }
  }
}

/** Fetch any owner caches that are still cold (e.g. missed login prefetch). */
export async function ensureOwnerDataPrefetched(
  userId: string,
  userName?: string,
  userLastName?: string
): Promise<void> {
  return runOwnerPrefetch(userId, userName, userLastName);
}
