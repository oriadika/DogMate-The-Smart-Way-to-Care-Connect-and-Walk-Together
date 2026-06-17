let resetErrorBoundaryImpl: (() => void) | null = null;

export function registerErrorBoundaryReset(reset: () => void): () => void {
  resetErrorBoundaryImpl = reset;
  return () => {
    if (resetErrorBoundaryImpl === reset) {
      resetErrorBoundaryImpl = null;
    }
  };
}

export function resetGlobalErrorBoundary(): void {
  resetErrorBoundaryImpl?.();
}
