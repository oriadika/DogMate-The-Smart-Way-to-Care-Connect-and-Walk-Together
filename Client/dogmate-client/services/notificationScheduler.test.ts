import {
  buildNotificationIdentifier,
  shouldScheduleNotification,
} from './notificationSchedulerLogic';

describe('notificationSchedulerLogic', () => {
  describe('shouldScheduleNotification', () => {
    it('schedules only when global and item toggles are on', () => {
      expect(shouldScheduleNotification(true, true)).toBe(true);
      expect(shouldScheduleNotification(true, false)).toBe(false);
      expect(shouldScheduleNotification(false, true)).toBe(false);
      expect(shouldScheduleNotification(false, false)).toBe(false);
    });
  });

  describe('buildNotificationIdentifier', () => {
    it('builds stable identifiers per source and trigger', () => {
      expect(
        buildNotificationIdentifier('MEDICATION', 'abc-123', '2026-06-05T08:00:00')
      ).toBe('medication-abc-123-2026-06-05T08:00:00');
    });
  });
});
