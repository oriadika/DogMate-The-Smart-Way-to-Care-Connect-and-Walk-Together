import {
  filterWalkersForOwner,
  getInitialWalkersState,
  getWalkersCache,
  isWalkersDataWarm,
  setWalkersCache,
  formatLoggedUsers,
} from './walkersDataCache';
import type { ProfessionalProfileResponse } from '../services/dogmateApi';

describe('walkersDataCache', () => {
  const ownerId = 'owner-1';
  const walker: ProfessionalProfileResponse = {
    userId: 'walker-1',
    email: 'w@test.com',
    firstName: 'דוג',
    lastName: 'ווקר',
    cityOfferings: [],
    averageRating: 4.5,
    ratingsCount: 2,
    alreadyRatedByCurrentOwner: false,
    reviews: [],
  };

  it('returns instant initial state when cache is warm', () => {
    setWalkersCache(ownerId, [walker]);

    const initial = getInitialWalkersState(ownerId);
    expect(initial.loading).toBe(false);
    expect(initial.walkers).toHaveLength(1);
    expect(initial.walkers[0].userId).toBe('walker-1');
  });

  it('filters out the current owner from walker list', () => {
    const self: ProfessionalProfileResponse = { ...walker, userId: ownerId };
    const filtered = filterWalkersForOwner([walker, self], ownerId);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].userId).toBe('walker-1');
  });

  it('reports walkers data warm when cache exists', () => {
    setWalkersCache(ownerId, [walker]);
    expect(isWalkersDataWarm(ownerId)).toBe(true);
    expect(getWalkersCache(ownerId)?.walkers).toHaveLength(1);
  });

  it('formats logged users for distance display', () => {
    const formatted = formatLoggedUsers(
      [
        {
          id: ownerId,
          type: 'RegularUser',
          firstName: 'י',
          lastName: 'ש',
          email: 'o@test.com',
        },
        {
          id: 'walker-1',
          type: 'DogWalkerUser',
          firstName: 'ד',
          lastName: 'ו',
          email: 'w@test.com',
          latitude: 32.1,
          longitude: 34.8,
        },
      ],
      ownerId
    );
    expect(formatted).toHaveLength(1);
    expect(formatted[0].latitude).toBe(32.1);
    expect(formatted[0].role).toBe('דוגווקר');
  });
});
