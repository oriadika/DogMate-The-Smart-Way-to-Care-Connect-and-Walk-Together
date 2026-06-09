import {
  DUE_NOW_MESSAGE,
  formatDaysToText,
  getCalendarDaysCountdown,
  getCountdownPrimaryText,
  getDaysUrgencyColor,
  getReminderCountdown,
  filterActiveReminders,
} from './daysDisplay';

describe('daysDisplay singular countdown text', () => {
  it('formats exactly one day, hour, or minute in Hebrew singular form', () => {
    expect(formatDaysToText(1)).toBe('יום אחד');
    expect(formatDaysToText(2)).toBe('2 ימים');

    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    expect(getReminderCountdown(inOneHour.toISOString())?.subtext).toBe('(שעה אחת)');

    const inOneMinute = new Date(Date.now() + 60 * 1000);
    expect(getReminderCountdown(inOneMinute.toISOString())?.subtext).toBe('(דקה אחת)');
  });
});

describe('daysDisplay urgency colors', () => {
  it('colors days by urgency thresholds', () => {
    expect(getDaysUrgencyColor(3)).toBe('#EA5455');
    expect(getDaysUrgencyColor(6)).toBe('#EA5455');
    expect(getDaysUrgencyColor(7)).toBe('#FF9F43');
    expect(getDaysUrgencyColor(29)).toBe('#FF9F43');
    expect(getDaysUrgencyColor(30)).toBe('#28C76F');
    expect(getDaysUrgencyColor(45)).toBe('#28C76F');
  });

  it('uses calendar-day urgency for reminders under 24 hours but over 1 hour', () => {
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);

    const countdown = getReminderCountdown(tomorrowMorning.toISOString());
    expect(countdown?.unit).toBe('hours');
    expect(countdown?.urgencyColor).toBe('#EA5455');
  });

  it('shows minutes in red when under one hour remains', () => {
    const inTwoMinutes = new Date(Date.now() + 2 * 60 * 1000);

    const countdown = getReminderCountdown(inTwoMinutes.toISOString());
    expect(countdown?.unit).toBe('minutes');
    expect(countdown?.label).toBe('דקות עד התזכורת:');
    expect(countdown?.displayValue).toBe(2);
    expect(countdown?.urgencyColor).toBe('#EA5455');
  });

  it('shows one hour (not minutes) when exactly 60 minutes remain', () => {
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);

    const countdown = getReminderCountdown(inOneHour.toISOString());
    expect(countdown?.unit).toBe('hours');
    expect(countdown?.label).toBe('שעות עד התזכורת:');
    expect(countdown?.displayValue).toBe(1);
  });

  it('shows one day (not hours) when exactly 24 hours remain', () => {
    const inOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const countdown = getReminderCountdown(inOneDay.toISOString());
    expect(countdown?.unit).toBe('days');
    expect(countdown?.label).toBe('ימים עד התזכורת:');
    expect(countdown?.labelUnit).toBe('ימים');
    expect(countdown?.displayValue).toBe(1);
  });

  it('shows one day (not 24 hours) when just under 24 hours remain', () => {
    const almostOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000 - 60 * 1000);

    const countdown = getReminderCountdown(almostOneDay.toISOString());
    expect(countdown?.unit).toBe('days');
    expect(countdown?.displayValue).toBe(1);
    expect(countdown?.labelUnit).toBe('ימים');
  });

  it('shows 23 hours (not days) when 23 hours remain', () => {
    const in23Hours = new Date(Date.now() + 23 * 60 * 60 * 1000);

    const countdown = getReminderCountdown(in23Hours.toISOString());
    expect(countdown?.unit).toBe('hours');
    expect(countdown?.displayValue).toBe(23);
    expect(countdown?.labelUnit).toBe('שעות');
  });

  it('uses orange for reminders about two weeks away', () => {
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    inTwoWeeks.setHours(9, 0, 0, 0);

    const countdown = getReminderCountdown(inTwoWeeks.toISOString());
    expect(countdown?.unit).toBe('days');
    expect(countdown?.displayValue).toBe(14);
    expect(countdown?.urgencyColor).toBe('#FF9F43');
  });

  it('shows hours instead of 0 days when under 24 hours remain', () => {
    const inFiveHours = new Date(Date.now() + 5 * 60 * 60 * 1000);

    const countdown = getReminderCountdown(inFiveHours.toISOString());
    expect(countdown?.unit).toBe('hours');
    expect(countdown?.displayValue).toBe(5);
    expect(getCountdownPrimaryText(countdown!)).toBe('5');
  });

  it('shows one minute until the exact reminder minute (not due-now early)', () => {
    const inThirtySeconds = new Date(Date.now() + 30 * 1000);

    const countdown = getReminderCountdown(inThirtySeconds.toISOString());
    expect(countdown?.unit).toBe('minutes');
    expect(countdown?.displayValue).toBe(1);
    expect(countdown?.displayText).toBeUndefined();
    expect(countdown?.subtext).toBe('(דקה אחת)');
  });

  it('shows due-now only when reminder time has arrived', () => {
    const now = new Date(Date.now());

    const countdown = getReminderCountdown(now.toISOString());
    expect(countdown?.displayText).toBe(DUE_NOW_MESSAGE);
    expect(getCountdownPrimaryText(countdown!)).toBe(DUE_NOW_MESSAGE);
    expect(countdown?.label).toBe('סטטוס:');
  });

  it('shows due-now for zero calendar days on food stock countdown', () => {
    const countdown = getCalendarDaysCountdown(0, 'סיום השק');
    expect(countdown?.displayText).toBe(DUE_NOW_MESSAGE);
    expect(getCountdownPrimaryText(countdown!)).toBe(DUE_NOW_MESSAGE);
  });

  it('filters out past reminders', () => {
    const items = filterActiveReminders([
      { id: '1', remindAt: new Date(Date.now() + 86400000).toISOString() },
      { id: '2', remindAt: new Date(Date.now() - 86400000).toISOString() },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('1');
  });
});
