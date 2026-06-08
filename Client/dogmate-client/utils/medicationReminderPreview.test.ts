import {
  buildMedicationReminderDescription,
  buildMedicationReminderTitle,
  computeNearestMedicationReminderAt,
  computeMedicationReminderAt,
} from './medicationReminderPreview';

describe('medicationReminderPreview', () => {
  it('builds medication reminder copy', () => {
    expect(buildMedicationReminderTitle('אמוקסיצילין')).toBe('תרופה: אמוקסיצילין');
    expect(buildMedicationReminderDescription('אמוקסיצילין', 'רex')).toBe(
      'הגיע הזמן לתת ל-רex את אמוקסיצילין'
    );
  });

  it('computes reminder days before next dose', () => {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 14);
    const trigger = computeMedicationReminderAt(nextDue, '09:00', 7, 'DAYS');
    expect(trigger).not.toBeNull();
    const nearest = computeNearestMedicationReminderAt(nextDue, '09:00', 7, 'DAYS');
    expect(nearest).not.toBeNull();
    expect(nearest!.getTime()).toBe(trigger!.getTime());
  });

  it('computes reminder hours before next dose', () => {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1);
    const trigger = computeMedicationReminderAt(nextDue, '14:00', 2, 'HOURS');
    expect(trigger).not.toBeNull();
    const dueAt = new Date(nextDue);
    dueAt.setHours(14, 0, 0, 0);
    expect(trigger!.getTime()).toBe(dueAt.getTime() - 2 * 60 * 60 * 1000);
  });

  it('returns immediate trigger when within lead window', () => {
    const nextDue = new Date();
    nextDue.setMinutes(nextDue.getMinutes() + 30);
    const time = `${String(nextDue.getHours()).padStart(2, '0')}:${String(nextDue.getMinutes()).padStart(2, '0')}`;
    const trigger = computeMedicationReminderAt(nextDue, time, 2, 'HOURS');
    expect(trigger).not.toBeNull();
    expect(trigger!.getTime()).toBeGreaterThan(Date.now());
    expect(trigger!.getTime()).toBeLessThan(Date.now() + 5 * 60_000);
  });
});
