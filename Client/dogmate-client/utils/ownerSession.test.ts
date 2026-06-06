import {
  clearOwnerSession,
  getOwnerSession,
  resolveOwnerUserId,
  setOwnerSession,
} from './ownerSession';

describe('ownerSession', () => {
  beforeEach(() => {
    clearOwnerSession();
  });

  it('persists owner identity across partial navigations', () => {
    setOwnerSession({
      userId: 'user-99',
      userFirstName: 'דנה',
      email: 'dana@example.com',
    });

    // Simulates navigate('Home', { screen: 'Health' }) flattening to {}
    setOwnerSession({});

    expect(getOwnerSession().userId).toBe('user-99');
    expect(getOwnerSession().userFirstName).toBe('דנה');
    expect(getOwnerSession().email).toBe('dana@example.com');
  });

  it('resolves userId from session when route params were wiped', () => {
    setOwnerSession({ userId: 'user-99' });
    expect(resolveOwnerUserId(undefined, null)).toBe('user-99');
    expect(resolveOwnerUserId(undefined, undefined)).toBe('user-99');
  });

  it('prefers explicit route userId over session', () => {
    setOwnerSession({ userId: 'session-id' });
    expect(resolveOwnerUserId('route-id', null)).toBe('route-id');
  });
});
