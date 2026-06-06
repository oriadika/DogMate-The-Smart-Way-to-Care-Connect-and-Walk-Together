import { isAbortError } from './isAbortError';

const TRANSIENT_DB_PATTERNS = [
  /EntityManager/i,
  /could not open/i,
  /connection is not available/i,
  /connection refused/i,
  /timeout/i,
  /pool/i,
  /too many clients/i,
];

export function isTransientApiError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return TRANSIENT_DB_PATTERNS.some((pattern) => pattern.test(message));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry transient DB/pool errors with linear backoff. */
export async function withApiRetry<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number }
): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (isAbortError(error) || !isTransientApiError(error) || attempt === attempts - 1) {
        throw error;
      }
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}
