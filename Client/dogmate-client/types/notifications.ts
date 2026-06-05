export type NotificationSourceType = 'REMINDER' | 'MEDICATION' | 'VACCINATION' | 'FOOD';

export type MedicationFrequencyType = 'HOURLY' | 'DAILY' | 'EVERY_X_DAYS';

export interface NotificationPreferences {
  notificationsEnabled: boolean;
}

export interface MedicationNotificationSettings {
  notificationEnabled: boolean;
  scheduleTimes: string;
  frequencyType: MedicationFrequencyType;
  frequencyInterval: number;
}

export interface VaccinationNotificationSettings {
  notificationEnabled: boolean;
  remindDaysBefore: string;
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
  scheduleTimes: '08:00',
  frequencyType: 'DAILY',
  frequencyInterval: 1,
};

export const DEFAULT_VACCINATION_NOTIFICATION: VaccinationNotificationSettings = {
  notificationEnabled: false,
  remindDaysBefore: '7,1',
};

export const DEFAULT_FOOD_NOTIFICATION: FoodNotificationSettings = {
  notificationEnabled: false,
  lowStockThresholdDays: 7,
};
