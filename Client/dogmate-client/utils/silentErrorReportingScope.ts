let silentScopeDepth = 0;

export function isSilentErrorReportingScope(): boolean {
  return silentScopeDepth > 0;
}

export async function runInSilentErrorReportingScope<T>(fn: () => Promise<T>): Promise<T> {
  silentScopeDepth += 1;
  try {
    return await fn();
  } finally {
    silentScopeDepth -= 1;
  }
}
