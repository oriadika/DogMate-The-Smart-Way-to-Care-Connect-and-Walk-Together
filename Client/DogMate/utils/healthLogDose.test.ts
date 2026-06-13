import { isAdministeredToday } from './healthLogDose';

describe('healthLogDose', () => {
  it('detects administered date as today', () => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(isAdministeredToday(iso)).toBe(true);
    expect(isAdministeredToday('2000-01-01')).toBe(false);
  });
});
