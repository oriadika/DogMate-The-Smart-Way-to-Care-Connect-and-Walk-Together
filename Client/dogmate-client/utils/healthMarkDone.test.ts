import type { MedicationRow } from '../services/dogmateApi';
import {
  combineMedicationPlannedDue,
  formatMarkDoneChoiceLabel,
  isMedicationPlannedDueOverdue,
} from './healthMarkDone';

const baseMedication = (overrides: Partial<MedicationRow> = {}): MedicationRow => ({
  id: 'med-1',
  dogId: 'dog-1',
  dogName: 'רקס',
  medicationName: 'אנטיביוטיקה',
  administeredDate: '2026-06-01',
  nextDueDate: '2026-06-08',
  nextDueTime: '09:00',
  ...overrides,
});

describe('healthMarkDone', () => {
  it('detects overdue planned medication dose', () => {
    const medication = baseMedication();
    const now = new Date(2026, 5, 9, 10, 0, 0);
    expect(isMedicationPlannedDueOverdue(medication, now)).toBe(true);
  });

  it('treats on-time dose as not overdue', () => {
    const medication = baseMedication();
    const now = new Date(2026, 5, 8, 8, 30, 0);
    expect(isMedicationPlannedDueOverdue(medication, now)).toBe(false);
  });

  it('builds planned due datetime from medication row', () => {
    const due = combineMedicationPlannedDue(baseMedication());
    expect(due?.getFullYear()).toBe(2026);
    expect(due?.getMonth()).toBe(5);
    expect(due?.getDate()).toBe(8);
    expect(due?.getHours()).toBe(9);
    expect(due?.getMinutes()).toBe(0);
  });

  it('formats Hebrew choice labels', () => {
    const now = new Date(2026, 5, 9, 14, 30, 0);
    const planned = new Date(2026, 5, 8, 9, 0, 0);
    expect(formatMarkDoneChoiceLabel(planned, now)).toContain('אתמול');
    expect(formatMarkDoneChoiceLabel(now, now)).toContain('היום');
  });
});
