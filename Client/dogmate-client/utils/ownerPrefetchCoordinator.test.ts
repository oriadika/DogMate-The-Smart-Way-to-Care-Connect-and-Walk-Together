import { runOwnerPrefetch, waitForOwnerPrefetchHome } from './ownerPrefetchCoordinator';
import { getHomeCache, setHomeCache } from './homeDataCache';

jest.mock('../services/api', () => ({
  dogAPI: { getDogsForUser: jest.fn() },
  reminderAPI: { getRemindersForUser: jest.fn() },
  vaccinationAPI: { list: jest.fn() },
  medicationAPI: { list: jest.fn() },
  foodStockAPI: { getFoodStocksForUser: jest.fn() },
  dogWalkerAPI: { getWalkersWithProfessionalProfiles: jest.fn() },
}));

jest.mock('./walkersDataCache', () => ({
  isWalkersDataWarm: jest.fn(() => true),
  prefetchWalkersData: jest.fn(),
}));

import { dogAPI, reminderAPI } from '../services/api';

describe('ownerPrefetchCoordinator', () => {
  const userId = 'prefetch-user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (dogAPI.getDogsForUser as jest.Mock).mockResolvedValue({
      success: true,
      dogs: [{ id: 'd1', name: 'רex' }],
    });
    (reminderAPI.getRemindersForUser as jest.Mock).mockResolvedValue({
      success: true,
      reminders: [],
    });
  });

  it('dedupes concurrent prefetch calls', async () => {
    const first = runOwnerPrefetch(userId, 'י', 'ש', { waitForHome: true });
    const second = runOwnerPrefetch(userId, 'י', 'ש', { waitForHome: true });
    await Promise.all([first, second]);
    expect(dogAPI.getDogsForUser).toHaveBeenCalledTimes(1);
  });

  it('resolves home gate after home cache is warm', async () => {
    await runOwnerPrefetch(userId, 'י', 'ש', { waitForHome: true });
    expect(getHomeCache(userId)?.dogs).toHaveLength(1);
    await expect(waitForOwnerPrefetchHome(userId)).resolves.toBeUndefined();
  });

  it('skips home fetch when cache already warm', async () => {
    setHomeCache(userId, {
      userName: 'י',
      userLastName: 'ש',
      dogs: [{ id: 'd1', name: 'cached' }],
      reminders: [],
      signature: 'sig',
    });
    await runOwnerPrefetch(userId, 'י', 'ש', { waitForHome: true });
    expect(dogAPI.getDogsForUser).not.toHaveBeenCalled();
  });
});
