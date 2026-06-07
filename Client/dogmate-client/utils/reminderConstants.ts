export const REMINDER_DESCRIPTION_MAX_LENGTH = 200;

export function clampReminderDescription(value: string): string {
  return value.slice(0, REMINDER_DESCRIPTION_MAX_LENGTH);
}
