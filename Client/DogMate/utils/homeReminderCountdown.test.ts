import {
  getHomeReminderCountdown,
  getReminderSourceEmoji,
} from './homeReminderCountdown';
import { setMedicationsCache } from './healthDataCache';

describe('homeReminderCountdown', () => {
  const userId = 'user-home-countdown';

  beforeEach(() => {
    setMedicationsCache(userId, {
      rows: [
        {
          id: 'med-1',
          dogId: 'dog-1',
          dogName: 'רקס',
          medicationName: 'אמוקסיצילין',
          administeredDate: '2026-06-07',
          nextDueDate: '2026-06-09',
        },
      ],
      userDogs: [{ id: 'dog-1', name: 'רקס' }],
    });
  });

  it('counts down to remindAt (not medication nextDueDate) for system medication reminders', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 8, 18, 0, 0));

    const countdown = getHomeReminderCountdown({
      systemGenerated: true,
      sourceType: 'MEDICATION',
      sourceId: 'med-1',
      remindAt: new Date(2026, 5, 8, 20, 0, 0).toISOString(),
    });

    expect(getReminderSourceEmoji('MEDICATION')).toBe('💊');
    expect(countdown?.sourceEmoji).toBe('💊');
    expect(countdown?.displayValue).toBe(2);
    expect(countdown?.unit).toBe('hours');

    jest.useRealTimers();
  });

  it('shows hours when remindAt is a few hours away after user edit', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 8, 10, 0, 0));

    const countdown = getHomeReminderCountdown({
      systemGenerated: true,
      sourceType: 'MEDICATION',
      sourceId: 'med-1',
      remindAt: new Date(2026, 5, 8, 14, 30, 0).toISOString(),
    });

    expect(countdown?.unit).toBe('hours');
    expect(countdown?.displayValue).toBe(5);

    jest.useRealTimers();
  });

  it('returns food emoji and countdown from remindAt', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 8, 9, 0, 0));

    const countdown = getHomeReminderCountdown({
      systemGenerated: true,
      sourceType: 'FOOD',
      sourceId: 'food-1',
      remindAt: new Date(2026, 5, 20, 9, 0, 0).toISOString(),
    });

    expect(getReminderSourceEmoji('FOOD')).toBe('🍖');
    expect(countdown?.sourceEmoji).toBe('🍖');
    expect(countdown?.unit).toBe('days');
    expect(countdown?.displayValue).toBe(12);

    jest.useRealTimers();
  });

  it('shows bell emoji for manual reminders', () => {
    const countdown = getHomeReminderCountdown({
      systemGenerated: false,
      sourceType: undefined,
      remindAt: new Date(2026, 5, 20, 9, 0, 0).toISOString(),
    });

    expect(getReminderSourceEmoji(undefined)).toBe('🔔');
    expect(countdown?.sourceEmoji).toBe('🔔');
  });
});
