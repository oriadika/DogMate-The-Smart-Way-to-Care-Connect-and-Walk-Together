export type NotificationSourceType = 'REMINDER' | 'MEDICATION' | 'VACCINATION' | 'FOOD';

export type RemindBeforeUnit = 'DAYS' | 'HOURS' | 'MINUTES';

export interface NotificationPreferences {
  notificationsEnabled: boolean;
}

export interface MedicationNotificationSettings {
  notificationEnabled: boolean;
  /** Amount of time before next dose to show the home reminder. */
  remindBeforeValue: number | null;
  remindBeforeUnit: RemindBeforeUnit;
}

export interface VaccinationNotificationSettings {
  notificationEnabled: boolean;
  /** Days before vaccination date to show the home reminder. */
  remindDaysBefore: number | null;
}

export interface FoodNotificationSettings {
  notificationEnabled: boolean;
  lowStockThresholdDays: number | null;
}

export interface SchedulableNotification {
  sourceType: NotificationSourceType;
  sourceId: string;
  title: string;
  body: string;
  triggerAt: string;
}

export const DEFAULT_MEDICATION_NOTIFICATION: MedicationNotificationSettings = {
  notificationEnabled: false,
  remindBeforeValue: 7,
  remindBeforeUnit: 'DAYS',
};

export const DEFAULT_VACCINATION_NOTIFICATION: VaccinationNotificationSettings = {
  notificationEnabled: false,
  remindDaysBefore: 7,
};

export const DEFAULT_FOOD_NOTIFICATION: FoodNotificationSettings = {
  notificationEnabled: false,
  lowStockThresholdDays: 7,
};
