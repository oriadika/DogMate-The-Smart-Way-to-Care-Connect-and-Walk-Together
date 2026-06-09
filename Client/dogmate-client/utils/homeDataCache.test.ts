import {
  buildHomeDataSignature,
  clearHomeCache,
  getHomeCache,
  getInitialHomeState,
  markHomeDataDirty,
  setHomeCache,
  shouldForceHomeRefresh,
} from './homeDataCache';

describe('homeDataCache', () => {
  const userId = 'user-1';

  beforeEach(() => {
    clearHomeCache(userId);
  });

  it('returns instant initial state when cache is warm', () => {
    setHomeCache(userId, {
      userName: 'יוסי',
      userLastName: 'כהן',
      dogs: [{ id: 'd1', name: 'רex' }],
      reminders: [{ id: 'r1', title: 'חיסון' }],
      signature: 'sig',
    });

    const initial = getInitialHomeState(userId, 'יוסי');
    expect(initial.loading).toBe(false);
    expect(initial.dogs).toHaveLength(1);
    expect(initial.reminders).toHaveLength(1);
    expect(initial.userName).toBe('יוסי');
  });

  it('requires loading on cold start', () => {
    const initial = getInitialHomeState(userId);
    expect(initial.loading).toBe(true);
    expect(initial.dogs).toEqual([]);
  });

  it('detects signature changes', () => {
    const dogsA = [{ id: 'd1', name: 'A', breed: 'mix' }];
    const dogsB = [{ id: 'd1', name: 'B', breed: 'mix' }];
    expect(buildHomeDataSignature(dogsA, [])).not.toBe(buildHomeDataSignature(dogsB, []));
  });

  it('forces refresh when dirty flag is set', () => {
    setHomeCache(userId, {
      userName: 'יוסי',
      userLastName: '',
      dogs: [],
      reminders: [],
      signature: 'sig',
    });
    markHomeDataDirty(userId);
    expect(shouldForceHomeRefresh(userId)).toBe(true);
    expect(getHomeCache(userId)).toBeDefined();
  });
});
