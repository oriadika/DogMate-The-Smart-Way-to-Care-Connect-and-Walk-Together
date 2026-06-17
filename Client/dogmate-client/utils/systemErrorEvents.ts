export type SystemErrorSource = 'api_interceptor' | 'error_boundary';

export type SystemErrorIncident = {
  id: string;
  message: string;
  stackTrace?: string;
  httpStatus?: number;
  httpMethod?: string;
  requestUrl?: string;
  screen?: string;
  errorSource: SystemErrorSource;
  occurredAt: string;
  isCriticalFlow: boolean;
  retryAction?: () => Promise<void>;
};

type SystemErrorListener = (incident: SystemErrorIncident) => void;

const listeners = new Set<SystemErrorListener>();

let isSystemErrorModalActive = false;

export function isSystemErrorModalShowing(): boolean {
  return isSystemErrorModalActive;
}

export function setSystemErrorModalActive(active: boolean): void {
  isSystemErrorModalActive = active;
}

export function subscribeSystemErrors(listener: SystemErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSystemError(incident: SystemErrorIncident): void {
  if (isSystemErrorModalActive) {
    console.warn(
      '[DogMate] System error modal already visible; ignored duplicate:',
      incident.message,
      incident.requestUrl ?? ''
    );
    return;
  }

  if (listeners.size === 0) {
    console.warn('[DogMate] No system error listener registered; skipped modal:', incident.message);
    return;
  }

  isSystemErrorModalActive = true;

  for (const listener of listeners) {
    try {
      listener(incident);
    } catch (error) {
      console.warn('System error listener failed:', error);
      isSystemErrorModalActive = false;
    }
  }
}
