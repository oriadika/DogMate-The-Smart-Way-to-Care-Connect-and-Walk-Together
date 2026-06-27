import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isAppInitializing } from './appInitContext';
import { getCurrentScreenName } from './currentScreenContext';
import { resetGlobalErrorBoundary } from './errorBoundaryControl';
import { shouldIgnoreErrorForReporting, shouldIgnoreReportPayload } from './expoInternalWarningFilter';
import { isAbortError } from './isAbortError';
import { getOwnerSession } from './ownerSession';
import { isErrorReportFlushInFlight } from './errorReportFlushTrigger';
import { isSilentErrorReportingScope } from './silentErrorReportingScope';
import {
  emitSystemError,
  type SystemErrorIncident,
  type SystemErrorSource,
} from './systemErrorEvents';

export type ReportErrorPayload = {
  message: string;
  stackTrace?: string;
  httpStatus?: number;
  httpMethod?: string;
  requestUrl?: string;
  screen?: string;
  errorSource: SystemErrorSource;
  userId?: string;
  userEmail?: string;
  appVersion?: string;
  platform?: string;
  occurredAt: string;
};

const DEDUPE_WINDOW_MS = 60_000;
const recentIncidentKeys = new Map<string, number>();

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipSystemErrorReporting?: boolean;
    silentBackgroundRequest?: boolean;
    isCriticalFlow?: boolean;
  }
}

export function shouldSkipSystemErrorReporting(config?: InternalAxiosRequestConfig): boolean {
  if (!config) return false;
  if (config.skipSystemErrorReporting) return true;
  if (config.silentBackgroundRequest) return true;

  const url = String(config.url ?? '').toLowerCase();
  return (
    url.includes('/support/report-error') ||
    url.includes('/reminders/process-expired') ||
    url.includes('/auth/logout-all') ||
    url.includes('/auth/logout')
  );
}

export function shouldSuppressSystemErrorUi(config?: InternalAxiosRequestConfig): boolean {
  if (isSilentErrorReportingScope() || isErrorReportFlushInFlight()) return true;
  return shouldSkipSystemErrorReporting(config);
}

function isBackgroundCleanupRequest(config?: InternalAxiosRequestConfig): boolean {
  const url = String(config?.url ?? '').toLowerCase();
  return url.includes('/auth/logout-all') || url.includes('/auth/logout');
}

export function isCriticalFlowRequest(config?: InternalAxiosRequestConfig): boolean {
  if (config?.isCriticalFlow === true) return true;
  if (config?.isCriticalFlow === false) return false;
  if (isBackgroundCleanupRequest(config)) return false;

  const url = String(config?.url ?? '').toLowerCase();
  const method = String(config?.method ?? 'get').toLowerCase();

  const isEssentialAuth = url.includes('/auth/') && !url.includes('logout');
  const isEssentialDataGet =
    method === 'get' &&
    (/\/users\/[^/]+\/dogs/.test(url) ||
      /\/users\/[^/]+\/reminders/.test(url) ||
      url.includes('/food-stock/') ||
      url.includes('users/logged') ||
      url.includes('/dog-walkers/'));

  if (isAppInitializing()) {
    return isEssentialAuth || isEssentialDataGet;
  }

  if (isEssentialAuth) return true;

  if (isEssentialDataGet) return true;

  return false;
}

export function isCriticalSystemError(error: unknown): error is AxiosError {
  if (!error || typeof error !== 'object') return false;

  const axiosError = error as AxiosError;
  if (shouldSuppressSystemErrorUi(axiosError.config)) return false;
  if (isAbortError(error)) return false;

  if (!axiosError.response) {
    const code = String(axiosError.code ?? '');
    const message = String(axiosError.message ?? '');
    if (code === 'ERR_CANCELED') return false;
    if (message === 'Network Error' || code === 'ERR_NETWORK') return true;
    if (/timeout/i.test(message) || code === 'ECONNABORTED') return true;
    return false;
  }

  const status = axiosError.response.status;
  return status >= 500 || status === 408;
}

function incidentKey(
  incident: Pick<SystemErrorIncident, 'message' | 'httpStatus' | 'requestUrl' | 'errorSource' | 'isCriticalFlow'>
): string {
  return [
    incident.errorSource,
    incident.isCriticalFlow ? 'critical' : 'non-critical',
    incident.httpStatus ?? 'no-status',
    incident.requestUrl ?? 'no-url',
    incident.message,
  ].join('|');
}

function shouldEmitIncident(incident: SystemErrorIncident): boolean {
  const key = incidentKey(incident);
  const now = Date.now();
  const lastSeen = recentIncidentKeys.get(key);
  if (lastSeen != null && now - lastSeen < DEDUPE_WINDOW_MS) {
    return false;
  }
  recentIncidentKeys.set(key, now);
  return true;
}

function buildRequestUrl(config?: InternalAxiosRequestConfig): string | undefined {
  if (!config) return undefined;
  return [config.baseURL, config.url]
    .filter(Boolean)
    .join('')
    .replace(/([^:]\/)\/+/g, '$1');
}

export function buildIncidentFromAxiosError(
  error: AxiosError,
  apiClient?: AxiosInstance
): SystemErrorIncident {
  const responseData = error.response?.data as { error?: string; message?: string } | undefined;
  const serverMessage =
    typeof responseData?.error === 'string'
      ? responseData.error
      : typeof responseData?.message === 'string'
        ? responseData.message
        : undefined;

  const isCriticalFlow = isCriticalFlowRequest(error.config);
  const requestConfig = error.config;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: serverMessage || error.message || 'שגיאת מערכת לא צפויה',
    stackTrace: error.stack,
    httpStatus: error.response?.status,
    httpMethod: requestConfig?.method?.toUpperCase(),
    requestUrl: buildRequestUrl(requestConfig),
    screen: getCurrentScreenName(),
    errorSource: 'api_interceptor',
    occurredAt: new Date().toISOString(),
    isCriticalFlow,
    retryAction:
      requestConfig && apiClient
        ? async () => {
            await apiClient.request(requestConfig);
          }
        : undefined,
  };
}

export function buildIncidentFromBoundary(error: Error, componentStack?: string | null): SystemErrorIncident {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: error.message || 'שגיאת תצוגה לא צפויה',
    stackTrace: [error.stack, componentStack].filter(Boolean).join('\n\nComponent stack:\n'),
    screen: getCurrentScreenName(),
    errorSource: 'error_boundary',
    occurredAt: new Date().toISOString(),
    isCriticalFlow: true,
    retryAction: async () => {
      resetGlobalErrorBoundary();
    },
  };
}

export function notifyCriticalSystemError(incident: SystemErrorIncident): void {
  if (isSilentErrorReportingScope() || isErrorReportFlushInFlight()) return;
  if (shouldIgnoreReportPayload(incident)) return;
  if (!shouldEmitIncident(incident)) return;
  emitSystemError(incident);
}

export function incidentToReportPayload(incident: SystemErrorIncident): ReportErrorPayload {
  const session = getOwnerSession();
  return {
    message: incident.message,
    stackTrace: incident.stackTrace,
    httpStatus: incident.httpStatus,
    httpMethod: incident.httpMethod,
    requestUrl: incident.requestUrl,
    screen: incident.screen,
    errorSource: incident.errorSource,
    userId: session.userId,
    userEmail: session.email,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
    occurredAt: incident.occurredAt,
  };
}

export function handleAxiosSystemError(error: AxiosError, apiClient?: AxiosInstance): void {
  if (shouldSuppressSystemErrorUi(error.config)) return;
  if (shouldIgnoreErrorForReporting(error)) return;
  if (!isCriticalSystemError(error)) return;
  notifyCriticalSystemError(buildIncidentFromAxiosError(error, apiClient));
}

export function handleBoundarySystemError(error: Error, componentStack?: string | null): void {
  if (!(error instanceof Error)) return;
  if (shouldIgnoreErrorForReporting(error)) return;
  notifyCriticalSystemError(buildIncidentFromBoundary(error, componentStack));
}
