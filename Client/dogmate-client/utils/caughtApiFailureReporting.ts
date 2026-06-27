import axios from 'axios';
import { getCurrentScreenName } from './currentScreenContext';
import { isAbortError } from './isAbortError';
import { isTransientApiError } from './apiRetry';
import { isErrorReportFlushInFlight } from './errorReportFlushTrigger';
import { isSilentErrorReportingScope } from './silentErrorReportingScope';
import { shouldIgnoreErrorForReporting } from './expoInternalWarningFilter';
import { handleAxiosSystemError, notifyCriticalSystemError } from './systemErrorReporting';

const NETWORK_MESSAGE_PATTERNS = [
  /^Network Error$/i,
  /ERR_NETWORK/i,
  /timeout/i,
  /ECONNABORTED/i,
];

export function isReportableCaughtFailure(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (axios.isAxiosError(error)) return true;

  const message = error instanceof Error ? error.message : String(error ?? '');
  if (!message) return false;

  return (
    NETWORK_MESSAGE_PATTERNS.some((pattern) => pattern.test(message)) ||
    isTransientApiError(error)
  );
}

export type CaughtApiFailureOptions = {
  context?: string;
  isCriticalFlow?: boolean;
  retryAction?: () => Promise<void>;
};

/** Report failures caught outside the axios interceptor (e.g. wrapped plain Errors). */
export function notifyCaughtApiFailure(
  error: unknown,
  options?: CaughtApiFailureOptions
): void {
  if (isSilentErrorReportingScope() || isErrorReportFlushInFlight()) return;
  if (shouldIgnoreErrorForReporting(error)) return;
  if (!isReportableCaughtFailure(error)) return;

  if (axios.isAxiosError(error)) {
    handleAxiosSystemError(error);
    return;
  }

  const baseMessage = error instanceof Error ? error.message : String(error ?? 'שגיאת מערכת');
  const message = options?.context ? `${options.context}: ${baseMessage}` : baseMessage;

  notifyCriticalSystemError({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    stackTrace: error instanceof Error ? error.stack : undefined,
    screen: getCurrentScreenName(),
    errorSource: 'api_interceptor',
    occurredAt: new Date().toISOString(),
    isCriticalFlow: options?.isCriticalFlow ?? false,
    retryAction: options?.retryAction,
  });
}
