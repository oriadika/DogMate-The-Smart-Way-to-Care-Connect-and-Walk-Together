/**
 * Simulates HomeScreen focus logic for the Health → feature → Home navigation path.
 * Ensures cached data is shown instantly without a loading spinner.
 */
import {
  applyHomeCacheToState,
  getHomeCache,
  getInitialHomeState,
  setHomeCache,
} from './homeDataCache';
import { resolveOwnerUserId, setOwnerSession, clearOwnerSession } from './ownerSession';

describe('Home navigation return scenario', () => {
  const userId = 'owner-42';
  const cachedDogs = [{ id: 'd1', name: 'Buddy', breed: 'labrador' }];
  const cachedReminders = [{ id: 'r1', title: 'חיסון', remindAt: '2026-06-10T10:00:00' }];

  beforeEach(() => {
    clearOwnerSession();
    setOwnerSession({ userId, userFirstName: 'דנה' });
    setHomeCache(userId, {
      userName: 'דנה',
      userLastName: 'לוי',
      dogs: cachedDogs,
      reminders: cachedReminders,
      signature: 'cached',
    });
  });

  it('shows data instantly when returning to Home after visiting Health', () => {
    const initial = getInitialHomeState(userId, 'דנה');
    expect(initial.loading).toBe(false);
    expect(initial.dogs).toEqual(cachedDogs);
    expect(initial.reminders).toEqual(cachedReminders);

    const state = {
      userName: '',
      userLastName: '',
      dogs: [] as any[],
      reminders: [] as any[],
      loading: true,
    };

    const cached = getHomeCache(userId);
    const dogsRef = { current: state.dogs };
    const remindersRef = { current: state.reminders };
    const hasVisibleData =
      Boolean(cached) || dogsRef.current.length > 0 || remindersRef.current.length > 0;

    expect(hasVisibleData).toBe(true);

    if (cached) {
      applyHomeCacheToState(cached, {
        setUserName: (v) => { state.userName = v; },
        setUserLastName: (v) => { state.userLastName = v; },
        setDogs: (v) => { state.dogs = v; },
        setReminders: (v) => { state.reminders = v; },
      });
    }
    state.loading = !hasVisibleData;

    expect(state.loading).toBe(false);
    expect(state.dogs).toHaveLength(1);
    expect(state.reminders).toHaveLength(1);
    expect(state.userName).toBe('דנה');
  });

  it('still loads after health hub wiped route params', () => {
    // After VaccinationsHub -> navigate('Home', { screen: 'Health' })
    const resolvedUserId = resolveOwnerUserId(undefined, null);
    expect(resolvedUserId).toBe(userId);

    const shouldLoad = Boolean(resolvedUserId);
    expect(shouldLoad).toBe(true);

    const cached = getHomeCache(resolvedUserId!);
    expect(cached?.dogs).toHaveLength(1);
  });
});
