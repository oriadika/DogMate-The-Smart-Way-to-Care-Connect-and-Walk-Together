import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'dogmate:authToken';
const PERSISTED_SESSION_KEY = 'dogmate:persistedSession';
const APP_VERSION_KEY = 'dogmate:appVersion';

export type PersistedSession = {
  userId?: string;
  email?: string;
  userRole?: string;
  userFirstName?: string;
  userLastName?: string;
  phoneNumber?: string;
};

export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
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

export async function getSavedAppVersion(): Promise<string | null> {
  return AsyncStorage.getItem(APP_VERSION_KEY);
}

export async function setSavedAppVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(APP_VERSION_KEY, version);
}

/** Force re-login after an app update (production builds only). */
export function shouldForceReauth(previousVersion: string | null, currentVersion: string): boolean {
  if (!previousVersion) return false;
  return previousVersion !== currentVersion;
}
