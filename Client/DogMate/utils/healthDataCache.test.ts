import {
  getInitialVaccinationsState,
  getVaccinationsCache,
  getFoodInventoryCache,
  isHealthDataWarm,
  removeFoodInventoryItem,
  setVaccinationsCache,
  setMedicationsCache,
  setFoodInventoryCache,
  toDogOptions,
  transformFoodStocks,
  upsertFoodInventoryItem,
} from './healthDataCache';

describe('healthDataCache', () => {
  const userId = 'user-health-1';

  it('returns instant initial vaccinations state when cache is warm', () => {
    setVaccinationsCache(userId, {
      rows: [{ id: 'v1', dogId: 'd1', dogName: 'רex', vaccineName: 'כלבת', administeredDate: '2026-01-01' }],
      userDogs: [{ id: 'd1', name: 'רex' }],
    });

    const initial = getInitialVaccinationsState(userId);
    expect(initial.loading).toBe(false);
    expect(initial.rows).toHaveLength(1);
    expect(initial.userDogs).toHaveLength(1);
  });

  it('reports health data warm when all health caches exist', () => {
    setVaccinationsCache(userId, { rows: [], userDogs: [] });
    setMedicationsCache(userId, { rows: [], userDogs: [] });
    setFoodInventoryCache(userId, { items: [] });

    expect(isHealthDataWarm(userId)).toBe(true);
    expect(getVaccinationsCache(userId)).toBeDefined();
  });

  it('transforms food stocks for display', () => {
    const items = transformFoodStocks([
      {
        id: 'f1',
        currentLevelInKg: 5,
        dailyConsumptionInGram: 200,
        bagSizeInKg: 12,
        brandName: 'מזון',
        notificationEnabled: true,
        lowStockThresholdDays: 10,
        dogs: [{ id: 'd1', name: 'רex', profileImageUrl: null }],
      },
    ]);
    expect(items[0].daysRemaining).toBe(25);
    expect(items[0].daysUntilReminder).toBe(15);
    expect(items[0].lowStockThresholdDays).toBe(10);
    expect(items[0].dogs[0].name).toBe('רex');
  });

  it('builds dog options from raw dogs', () => {
    expect(toDogOptions([{ id: '1', name: '  בBuddy  ' }])).toEqual([{ id: '1', name: 'בBuddy' }]);
  });

  it('removes and upserts food inventory cache entries', () => {
    const item = {
      id: 'f1',
      dogs: [{ id: 'd1', name: 'רex' }],
      daysRemaining: 10,
      daysUntilReminder: 3,
      notificationEnabled: true,
      lowStockThresholdDays: 7,
      dailyConsumption: '200',
      bagSize: '12',
      currentAmount: '5',
    };
    setFoodInventoryCache(userId, { items: [item] });

    const afterRemove = removeFoodInventoryItem(userId, 'f1');
    expect(afterRemove).toHaveLength(0);
    expect(getFoodInventoryCache(userId)?.items).toHaveLength(0);

    const afterUpsert = upsertFoodInventoryItem(userId, item);
    expect(afterUpsert).toHaveLength(1);
    expect(getFoodInventoryCache(userId)?.items[0].id).toBe('f1');
  });
});
