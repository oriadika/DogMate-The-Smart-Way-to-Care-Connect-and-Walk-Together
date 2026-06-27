const FLUSH_COOLDOWN_MS = 15_000;

let pendingReportsHint = false;
let flushInFlight: Promise<void> | null = null;
let lastFlushAttemptAt = 0;
let flushImpl: (() => Promise<void>) | null = null;

export function registerPendingErrorReportsFlush(impl: () => Promise<void>): void {
  flushImpl = impl;
}

export function markPendingErrorReportsQueued(): void {
  pendingReportsHint = true;
}

export function setPendingErrorReportsHint(hasPending: boolean): void {
  pendingReportsHint = hasPending;
}

export function hasPendingErrorReportsHint(): boolean {
  return pendingReportsHint;
}

export function isErrorReportFlushInFlight(): boolean {
  return flushInFlight != null;
}

/** Fire-and-forget flush when a normal API call proves the server is reachable. */
export function maybeFlushPendingErrorReportsOnConnectivity(): void {
  if (!pendingReportsHint || !flushImpl) return;
  if (flushInFlight) return;

  const now = Date.now();
  if (now - lastFlushAttemptAt < FLUSH_COOLDOWN_MS) return;

  flushInFlight = flushImpl().finally(() => {
    flushInFlight = null;
    lastFlushAttemptAt = Date.now();
  });
}
