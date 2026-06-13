import { OWNER_MAIN_TAB } from './ownerTabRoutes';
import { getOwnerSession } from '../utils/ownerSession';

/** Pop a root-stack health screen back to the owner tab navigator (Health tab). */
export function navigateBackToOwnerHealth(navigation: { canGoBack: () => boolean; goBack: () => void; navigate: (name: string, params?: object) => void }) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate('Home', { screen: OWNER_MAIN_TAB.Health });
}

/** Open owner dashboard from anywhere; preserves session even when route params were wiped. */
export function navigateToOwnerDashboard(
  navigation: { navigate: (name: string, params?: object) => void },
  options?: { refresh?: boolean }
) {
  const session = getOwnerSession();
  const params: Record<string, unknown> = {};
  if (session.userId) params.userId = session.userId;
  if (options?.refresh) params.refresh = true;

  navigation.navigate('Home', {
    screen: OWNER_MAIN_TAB.Dashboard,
    ...(Object.keys(params).length > 0 ? { params } : {}),
  });
}
