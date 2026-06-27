import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldIgnoreReportPayload } from './expoInternalWarningFilter';
import type { ReportErrorPayload } from './systemErrorReporting';

export const FAILED_REPORTS_STORAGE_KEY = '@dogmate_failed_reports';

export async function readPendingErrorReports(): Promise<ReportErrorPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(FAILED_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReportErrorPayload[]) : [];
  } catch (error) {
    console.warn('Failed to read pending error reports:', error);
    return [];
  }
}

export async function enqueuePendingErrorReport(payload: ReportErrorPayload): Promise<void> {
  if (shouldIgnoreReportPayload(payload)) return;

  const existing = await readPendingErrorReports();
  existing.push(payload);
  await AsyncStorage.setItem(FAILED_REPORTS_STORAGE_KEY, JSON.stringify(existing));
}

export async function writePendingErrorReports(reports: ReportErrorPayload[]): Promise<void> {
  if (reports.length === 0) {
    await AsyncStorage.removeItem(FAILED_REPORTS_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(FAILED_REPORTS_STORAGE_KEY, JSON.stringify(reports));
}

export async function clearPendingErrorReports(): Promise<void> {
  await AsyncStorage.removeItem(FAILED_REPORTS_STORAGE_KEY);
}
