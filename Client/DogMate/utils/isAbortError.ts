export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; code?: string; message?: string };
  if (e.name === 'AbortError' || e.name === 'CanceledError' || e.code === 'ERR_CANCELED') {
    return true;
  }
  const msg = String(e.message ?? '').toLowerCase();
  return msg === 'canceled' || msg === 'cancelled';
}
