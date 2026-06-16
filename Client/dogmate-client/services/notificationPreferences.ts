import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationPreferencesAPI } from './api';
import type { NotificationPreferences } from '../types/notifications';

const CACHE_KEY = 'dogmate:notification-preferences';
const FETCH_TTL_MS = 30_000;

const prefsByUser = new Map<string, NotificationPreferences>();
const lastFetchAtByUser = new Map<string, number>();

export const getCachedNotificationPreferences = (): NotificationPreferences | null => {
  const first = prefsByUser.values().next();
  return first.done ? null : first.value;
};

export const loadNotificationPreferences = async (
  userId: string,
  options?: { force?: boolean }
): Promise<NotificationPreferences> => {
  const force = options?.force ?? false;
  const cached = prefsByUser.get(userId);
  const lastFetch = lastFetchAtByUser.get(userId) ?? 0;

  if (!force && cached && Date.now() - lastFetch < FETCH_TTL_MS) {
    return cached;
  }

  try {
    const response = await notificationPreferencesAPI.get(userId);
    const prefs: NotificationPreferences = {
      notificationsEnabled: response.preferences?.notificationsEnabled ?? true,
    };
    prefsByUser.set(userId, prefs);
    lastFetchAtByUser.set(userId, Date.now());
    await AsyncStorage.setItem(`${CACHE_KEY}:${userId}`, JSON.stringify(prefs));
    return prefs;
  } catch {
    const stored = await AsyncStorage.getItem(`${CACHE_KEY}:${userId}`);
    if (stored) {
      const prefs = JSON.parse(stored) as NotificationPreferences;
      prefsByUser.set(userId, prefs);
      return prefs;
    }
    const fallback = { notificationsEnabled: true };
    prefsByUser.set(userId, fallback);
    return fallback;
  }
};

export const saveNotificationPreferences = async (
  userId: string,
  prefs: NotificationPreferences
): Promise<NotificationPreferences> => {
  try {
    const response = await notificationPreferencesAPI.update(userId, prefs);
    if (!response.success) {
      throw new Error('עדכון הגדרות ההתראות נכשל');
    }
    const saved: NotificationPreferences = {
      notificationsEnabled: response.preferences?.notificationsEnabled ?? prefs.notificationsEnabled,
    };
    prefsByUser.set(userId, saved);
    lastFetchAtByUser.set(userId, Date.now());
    await AsyncStorage.setItem(`${CACHE_KEY}:${userId}`, JSON.stringify(saved));
    return saved;
  } catch (error: any) {
    const serverMsg = error?.response?.data?.error;
    if (typeof serverMsg === 'string' && serverMsg.trim().length > 0) {
      throw new Error(serverMsg);
    }
    throw new Error(error?.message || 'עדכון הגדרות ההתראות נכשל');
  }
};

export const isGlobalNotificationsEnabled = (): boolean => {
  const cached = getCachedNotificationPreferences();
  return cached?.notificationsEnabled ?? true;
};
