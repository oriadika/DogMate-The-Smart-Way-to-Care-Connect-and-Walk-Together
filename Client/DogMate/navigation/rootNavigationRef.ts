import { createNavigationContainerRef } from '@react-navigation/native';

/** Root `NavigationContainer` ref — use from tab screens to open stack routes (e.g. VaccinationsHub). */
export const rootNavigationRef = createNavigationContainerRef();

export function navigateRoot(name: string, params?: Record<string, unknown>) {
  if (rootNavigationRef.isReady()) {
    (rootNavigationRef as { navigate: (n: string, p?: object) => void }).navigate(name, params);
  }
}
