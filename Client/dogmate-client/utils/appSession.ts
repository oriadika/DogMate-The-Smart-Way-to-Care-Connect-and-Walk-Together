import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_VERSION_KEY = 'dogmate:last-seen-app-version';
export const PERSISTED_SESSION_KEY = 'dogmate:persisted-session';
export const AUTH_TOKEN_KEY = 'dogmate:auth-token';

export type PersistedSession = {
  userId?: string;
  email?: string;
  userRole?: string;
  userFirstName?: string;
  userLastName?: string;
  phoneNumber?: string;
};

export function shouldForceReauth(savedVersion?: string | null, currentVersion?: string | null): boolean {
  return Boolean(savedVersion && currentVersion && savedVersion !== currentVersion);
}

export async function getSavedAppVersion(): Promise<string | null> {
  return AsyncStorage.getItem(APP_VERSION_KEY);
}

export async function setSavedAppVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(APP_VERSION_KEY, version);
}

export async function savePersistedSession(session: PersistedSession): Promise<void> {
  await AsyncStorage.setItem(PERSISTED_SESSION_KEY, JSON.stringify(session));
}

export async function getPersistedSession(): Promise<PersistedSession | null> {
  const raw = await AsyncStorage.getItem(PERSISTED_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

export async function clearPersistedSession(): Promise<void> {
  await AsyncStorage.removeItem(PERSISTED_SESSION_KEY);
}

export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}
