import { useCallback, useEffect, useRef } from 'react';

/** Push blur/unmount cleanup past the navigation animation frame. */
export const BLUR_CLEANUP_DELAY_MS = 50;

/**
 * Schedule cleanup outside the current navigation frame.
 * Never run stateful or heavy work synchronously in useFocusEffect cleanup.
 */
export function deferScreenCleanup(cleanup?: () => void): void {
  setTimeout(() => {
    cleanup?.();
  }, BLUR_CLEANUP_DELAY_MS);
}

/** Tracks mount state and invalidates in-flight async work on blur/unmount. */
export function useScreenLifecycleGuard() {
  const isMountedRef = useRef(false);
  const loadGenerationRef = useRef(0);

  const markMounted = useCallback(() => {
    isMountedRef.current = true;
  }, []);

  /** O(1) — immediately invalidates in-flight loads so they skip setState / heavy memos. */
  const cancelInflightAsyncWork = useCallback(() => {
    loadGenerationRef.current += 1;
  }, []);

  const markUnmounted = useCallback(() => {
    isMountedRef.current = false;
  }, []);

  const invalidateAsyncWork = useCallback(() => {
    cancelInflightAsyncWork();
    markUnmounted();
  }, [cancelInflightAsyncWork, markUnmounted]);

  const beginAsyncWork = useCallback(() => {
    loadGenerationRef.current += 1;
    return loadGenerationRef.current;
  }, []);

  const isAsyncWorkCurrent = useCallback((generation: number) => {
    return loadGenerationRef.current === generation;
  }, []);

  useEffect(() => {
    markMounted();
    return () => {
      cancelInflightAsyncWork();
      deferScreenCleanup(() => {
        markUnmounted();
      });
    };
  }, [cancelInflightAsyncWork, markMounted, markUnmounted]);

  /** Blur/unmount: cancel loads immediately, defer all other cleanup by 50ms. */
  const runDeferredBlurCleanup = useCallback((cleanup?: () => void) => {
    cancelInflightAsyncWork();
    deferScreenCleanup(() => {
      markUnmounted();
      cleanup?.();
    });
  }, [cancelInflightAsyncWork, markUnmounted]);

  return {
    isMountedRef,
    markMounted,
    markUnmounted,
    cancelInflightAsyncWork,
    invalidateAsyncWork,
    beginAsyncWork,
    isAsyncWorkCurrent,
    runDeferredBlurCleanup,
  };
}
