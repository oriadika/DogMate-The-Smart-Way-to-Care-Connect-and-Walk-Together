import {
  clampReminderDescription,
  REMINDER_DESCRIPTION_MAX_LENGTH,
} from './reminderConstants';

describe('reminderConstants', () => {
  it('clamps description to 200 characters', () => {
    const longText = 'א'.repeat(250);
    expect(clampReminderDescription(longText)).toHaveLength(REMINDER_DESCRIPTION_MAX_LENGTH);
    expect(clampReminderDescription('שלום')).toBe('שלום');
  });
});
