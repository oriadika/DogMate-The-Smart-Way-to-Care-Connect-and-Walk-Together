/** Owner identity persisted across nested navigations (survives partial `navigate('Home', …)` params). */
export type OwnerSession = {
  userId?: string;
  email?: string;
  userFirstName?: string;
  userLastName?: string;
  userRole?: string;
  phoneNumber?: string;
};

let ownerSession: OwnerSession = {};

export function setOwnerSession(partial: OwnerSession): void {
  for (const [key, value] of Object.entries(partial)) {
    if (key === 'refresh') continue;
    if (value !== undefined && value !== null && value !== '') {
      (ownerSession as Record<string, string>)[key] = String(value);
    }
  }
}

export function getOwnerSession(): Readonly<OwnerSession> {
  return ownerSession;
}

export function clearOwnerSession(): void {
  ownerSession = {};
}

export function resolveOwnerUserId(routeUserId?: string | null, stateUserId?: string | null): string | null {
  return routeUserId || stateUserId || ownerSession.userId || null;
}
