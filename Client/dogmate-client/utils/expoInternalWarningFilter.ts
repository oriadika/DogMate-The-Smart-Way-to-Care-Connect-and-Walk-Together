const EXPO_INTERNAL_WARNING_FRAGMENTS = [
  'Linking requires a build-time setting `scheme`',
  "Linking requires a build-time setting 'scheme'",
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications` functionality is not fully supported in Expo Go',
];

export function isExpoInternalWarningText(text: string): boolean {
  if (!text) return false;
  return EXPO_INTERNAL_WARNING_FRAGMENTS.some((fragment) => text.includes(fragment));
}

export function shouldIgnoreErrorForReporting(error: unknown): boolean {
  if (error == null) return false;

  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.stack) parts.push(error.stack);
  } else {
    parts.push(String(error));
  }

  return isExpoInternalWarningText(parts.join('\n'));
}

export function shouldIgnoreReportPayload(payload: {
  message?: string;
  stackTrace?: string;
}): boolean {
  const text = [payload.message, payload.stackTrace].filter(Boolean).join('\n');
  return isExpoInternalWarningText(text);
}

/** Patterns passed to LogBox.ignoreLogs so Expo dev warnings stay out of the UI. */
export const EXPO_INTERNAL_LOGBOX_IGNORE_PATTERNS = [
  'Linking requires a build-time setting',
  'expo-notifications: Android Push notifications',
  'expo-notifications` functionality is not fully supported in Expo Go',
];
