import {
  getInitialVaccinationsState,
  getVaccinationsCache,
  isHealthDataWarm,
  setVaccinationsCache,
  setMedicationsCache,
  setFoodInventoryCache,
  toDogOptions,
  transformFoodStocks,
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
        dogs: [{ id: 'd1', name: 'רex', profileImageUrl: null }],
      },
    ]);
    expect(items[0].daysRemaining).toBe(25);
    expect(items[0].dogs[0].name).toBe('רex');
  });

  it('builds dog options from raw dogs', () => {
    expect(toDogOptions([{ id: '1', name: '  בBuddy  ' }])).toEqual([{ id: '1', name: 'בBuddy' }]);
  });
});
