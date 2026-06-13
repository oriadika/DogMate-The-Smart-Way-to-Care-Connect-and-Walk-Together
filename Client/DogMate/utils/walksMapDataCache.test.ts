import {
  formatMapLoggedUsers,
  getInitialWalksMapState,
  isWalksMapDataWarm,
  setWalksMapCache,
  buildMapUsersSignature,
} from './walksMapDataCache';

describe('walksMapDataCache', () => {
  const userId = 'owner-map-1';

  it('returns instant initial state when cache is warm', () => {
    setWalksMapCache(userId, {
      loggedUsers: [{ id: 'u2', name: 'דני', role: 'דוגווקר', email: 'd@test.com', type: 'DogWalkerUser' }],
      signature: 'sig',
      currentUserProfile: {
        displayName: 'יובל',
        roleLabel: 'בעל כלב',
        serverAccountType: 'RegularUser',
        dogImageUrl: null,
        myPingDog: { name: null, breed: null, ageLabel: null, imageUrl: null },
      },
    });

    const initial = getInitialWalksMapState(userId);
    expect(initial.loading).toBe(false);
    expect(initial.loggedUsers).toHaveLength(1);
    expect(initial.currentUserProfile?.displayName).toBe('יובל');
  });

  it('formats map users excluding current owner', () => {
    const users = formatMapLoggedUsers(
      [
        { id: userId, type: 'RegularUser', firstName: 'י', lastName: 'ש', email: 'o@test.com' },
        {
          id: 'walker-1',
          type: 'DogWalkerUser',
          firstName: 'ד',
          lastName: 'ו',
          email: 'w@test.com',
          latitude: 32.1,
          longitude: 34.8,
          mapDogName: 'רex',
        },
      ],
      userId
    );
    expect(users).toHaveLength(1);
    expect(users[0].mapDogName).toBe('רex');
    expect(users[0].latitude).toBe(32.1);
  });

  it('reports walks map warm when cache exists', () => {
    setWalksMapCache(userId, {
      loggedUsers: [],
      signature: buildMapUsersSignature([]),
      currentUserProfile: null,
    });
    expect(isWalksMapDataWarm(userId)).toBe(true);
  });
});
