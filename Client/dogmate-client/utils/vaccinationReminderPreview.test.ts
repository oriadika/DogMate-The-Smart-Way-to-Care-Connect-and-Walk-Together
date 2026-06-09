import {
  buildVaccinationReminderDescription,
  buildVaccinationReminderTitle,
  computeNearestVaccinationReminderAt,
  computeVaccinationReminderAt,
} from './vaccinationReminderPreview';

describe('vaccinationReminderPreview', () => {
  it('builds vaccination reminder copy', () => {
    expect(buildVaccinationReminderTitle('כלבח')).toBe('חיסון: כלבח');
    expect(buildVaccinationReminderDescription('כלבח', 'רex')).toBe(
      'הגיע הזמן לתאם חיסון כלבח עבור רex'
    );
  });

  it('computes reminder N days before vaccination date', () => {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30);
    const trigger = computeVaccinationReminderAt(nextDue, 7);
    expect(trigger).not.toBeNull();
    const nearest = computeNearestVaccinationReminderAt(nextDue, 7);
    expect(nearest).not.toBeNull();
    expect(nearest!.getTime()).toBe(trigger!.getTime());
    expect(nearest!.getHours()).toBe(9);
  });

  it('returns immediate trigger when within lead window', () => {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 3);
    const trigger = computeVaccinationReminderAt(nextDue, 7);
    expect(trigger).not.toBeNull();
    expect(trigger!.getTime()).toBeGreaterThan(Date.now());
    expect(trigger!.getTime()).toBeLessThan(Date.now() + 5 * 60_000);
  });
});
