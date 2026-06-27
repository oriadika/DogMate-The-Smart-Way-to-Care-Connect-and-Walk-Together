import type { AxiosError } from 'axios';
import axios from 'axios';
import { getApiBaseUrl } from '../services/config';
import { supportAPI } from '../services/dogmateApi';
import { isAbortError } from './isAbortError';
import {
  clearPendingErrorReports,
  enqueuePendingErrorReport,
  readPendingErrorReports,
  writePendingErrorReports,
} from './failedErrorReportsQueue';
import { shouldIgnoreReportPayload } from './expoInternalWarningFilter';
import {
  markPendingErrorReportsQueued,
  registerPendingErrorReportsFlush,
  setPendingErrorReportsHint,
} from './errorReportFlushTrigger';
import { runInSilentErrorReportingScope } from './silentErrorReportingScope';
import type { ReportErrorPayload } from './systemErrorReporting';

export function isReportSubmissionNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (isAbortError(error)) return false;

  const axiosError = error as AxiosError;
  if (!axiosError.response) {
    const code = String(axiosError.code ?? '');
    const message = String(axiosError.message ?? '');
    if (code === 'ERR_CANCELED') return false;
    if (message === 'Network Error' || code === 'ERR_NETWORK') return true;
    if (/timeout/i.test(message) || code === 'ECONNABORTED') return true;
    return true;
  }

  return axiosError.response.status >= 500 || axiosError.response.status === 408;
}

export async function submitErrorReport(
  payload: ReportErrorPayload
): Promise<'sent' | 'queued'> {
  if (shouldIgnoreReportPayload(payload)) {
    return 'sent';
  }

  try {
    await supportAPI.reportError(payload);
    return 'sent';
  } catch (error) {
    if (isReportSubmissionNetworkError(error)) {
      await enqueuePendingErrorReport(payload);
      markPendingErrorReportsQueued();
      return 'queued';
    }
    throw error;
  }
}

export async function checkServerConnectivity(): Promise<boolean> {
  try {
    await axios.get(`${getApiBaseUrl()}/`, { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

export async function syncPendingErrorReportsHintFromStorage(): Promise<void> {
  const pending = await readPendingErrorReports();
  setPendingErrorReportsHint(pending.length > 0);
}

/** Flush queued crash reports silently after connectivity is confirmed. */
export async function flushPendingErrorReportsSilently(): Promise<void> {
  await runInSilentErrorReportingScope(async () => {
    try {
      const pending = await readPendingErrorReports();
      if (pending.length === 0) {
        setPendingErrorReportsHint(false);
        return;
      }

      const remaining: ReportErrorPayload[] = [];
      let hitNetworkFailure = false;
      let sentCount = 0;

      for (const report of pending) {
        if (hitNetworkFailure) {
          remaining.push(report);
          continue;
        }

        try {
          await supportAPI.reportError(report);
          sentCount += 1;
        } catch (error) {
          if (isReportSubmissionNetworkError(error)) {
            remaining.push(report);
            hitNetworkFailure = true;
          } else {
            console.warn('Skipped invalid pending crash report during silent flush:', error);
          }
        }
      }

      if (remaining.length === 0) {
        await clearPendingErrorReports();
        setPendingErrorReportsHint(false);
        if (sentCount > 0) {
          console.log(
            `[DogMate] Silently flushed ${sentCount} pending error report${sentCount === 1 ? '' : 's'}.`
          );
        }
      } else {
        await writePendingErrorReports(remaining);
        setPendingErrorReportsHint(true);
        if (sentCount > 0) {
          console.log(
            `[DogMate] Silently sent ${sentCount} pending error report${sentCount === 1 ? '' : 's'}; ${remaining.length} remain queued.`
          );
        }
      }
    } catch (error) {
      console.warn('Silent error-report flush failed:', error);
    }
  });
}

registerPendingErrorReportsFlush(flushPendingErrorReportsSilently);
