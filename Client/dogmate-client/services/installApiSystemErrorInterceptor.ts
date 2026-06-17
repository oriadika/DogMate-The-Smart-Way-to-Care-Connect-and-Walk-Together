import type { AxiosInstance, AxiosResponse } from 'axios';
import { handleAxiosSystemError, shouldSuppressSystemErrorUi } from '../utils/systemErrorReporting';
import { maybeFlushPendingErrorReportsOnConnectivity } from '../utils/errorReportFlushTrigger';

function shouldTriggerConnectivityFlush(response: AxiosResponse): boolean {
  const status = response.status;
  if (status !== 200 && status !== 201) return false;

  const url = String(response.config?.url ?? '').toLowerCase();
  if (url.includes('/support/report-error')) return false;

  return true;
}

export function installApiSystemErrorInterceptor(apiClient: AxiosInstance): void {
  apiClient.interceptors.response.use(
    (response) => {
      if (shouldTriggerConnectivityFlush(response)) {
        maybeFlushPendingErrorReportsOnConnectivity();
      }
      return response;
    },
    (error) => {
      if (!shouldSuppressSystemErrorUi(error.config)) {
        handleAxiosSystemError(error, apiClient);
      }
      return Promise.reject(error);
    }
  );
}
