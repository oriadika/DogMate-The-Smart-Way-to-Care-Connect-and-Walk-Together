import { DUE_NOW_MESSAGE } from './daysDisplay';
import {
  buildFoodReminderDescription,
  buildFoodReminderTitle,
  foodReminderCountdownSubtext,
  formatDogNamesHebrew,
} from './foodReminderPreview';

const MS_DAY = 24 * 60 * 60 * 1000;

describe('foodReminderPreview', () => {
  it('formats Hebrew dog names', () => {
    expect(formatDogNamesHebrew(['רex'])).toBe('רex');
    expect(formatDogNamesHebrew(['רex', 'מקס'])).toBe('רex ומקס');
    expect(formatDogNamesHebrew(['א', 'ב', 'ג'])).toBe('א, ב וג');
  });

  it('builds food reminder title and description', () => {
    expect(buildFoodReminderTitle(['רex'])).toBe('לקנות אוכל לרex');
    expect(buildFoodReminderDescription(['רex'])).toBe(
      'מלאי המזון של רex עומד להיגמר בקרוב...'
    );
  });

  it('shows hours in countdown subtext when between one and 23 hours remain', () => {
    const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000);
    expect(foodReminderCountdownSubtext(inThreeHours)).toBe('(3 שעות)');
  });

  it('shows one day (not 24 hours) when exactly 24 hours remain', () => {
    const inOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(foodReminderCountdownSubtext(inOneDay)).toBe('(יום אחד)');
  });

  it('shows one hour (not minutes) when exactly 60 minutes remain', () => {
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    expect(foodReminderCountdownSubtext(inOneHour)).toBe('(שעה אחת)');
  });

  it('shows one minute subtext when under one minute remains but time not reached', () => {
    const inThirtySeconds = new Date(Date.now() + 30 * 1000);
    expect(foodReminderCountdownSubtext(inThirtySeconds)).toBe('(דקה אחת)');
  });

  it('shows due-now message when reminder time has arrived', () => {
    const now = new Date(Date.now());
    expect(foodReminderCountdownSubtext(now)).toBe(`(${DUE_NOW_MESSAGE})`);
  });

  it('shows days in countdown subtext when at least one full day remains', () => {
    const inTwoDays = new Date(Date.now() + 2 * MS_DAY);
    expect(foodReminderCountdownSubtext(inTwoDays)).toBe('(2 ימים)');
  });
});
