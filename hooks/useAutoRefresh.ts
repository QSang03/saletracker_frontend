"use client";

import { useEffect, useRef, useCallback } from 'react';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onRefresh: () => void | Promise<void>;
  dependencies?: any[]; // Re-setup refresh when these change
}

export const useAutoRefresh = ({
  enabled = true,
  interval = 30000, // 30 seconds default
  onRefresh,
  dependencies = []
}: UseAutoRefreshOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isEnabledRef = useRef(enabled);
  const onRefreshRef = useRef(onRefresh);

  // Update refs when values change
  useEffect(() => {
    isEnabledRef.current = enabled;
    onRefreshRef.current = onRefresh;
  }, [enabled, onRefresh]);

  const startRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isEnabledRef.current) {
      intervalRef.current = setInterval(async () => {
        if (isEnabledRef.current) {
          try {
            await onRefreshRef.current();
          } catch (error) {
            console.error('Auto-refresh error:', error);
          }
        }
      }, interval);
    }
  }, [interval]);

  const stopRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restartRefresh = useCallback(() => {
    stopRefresh();
    startRefresh();
  }, [stopRefresh, startRefresh]);

  // Setup/cleanup auto-refresh
  useEffect(() => {
    startRefresh();
    return stopRefresh;
  }, [interval, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRefresh();
    };
  }, [stopRefresh]);

  return {
    startRefresh,
    stopRefresh,
    restartRefresh,
    isActive: intervalRef.current !== null
  };
};

// Hook for optimistic updates
export const useOptimisticUpdate = <T>(
  initialData: T[],
  updateFn: (id: string | number, data: Partial<T>) => void,
  revertDelay = 5000 // Revert after 5 seconds if no confirmation
) => {
  const originalDataRef = useRef<T[]>(initialData);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    originalDataRef.current = initialData;
  }, [initialData]);

  const performOptimisticUpdate = useCallback((
    id: string | number,
    updates: Partial<T>,
    onSuccess?: () => void,
    onError?: () => void
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Perform the optimistic update
    updateFn(id, updates);

    // Set up revert timeout
    timeoutRef.current = setTimeout(() => {
      // If no confirmation received, revert to original data
      if (onError) {
        onError();
      }
    }, revertDelay);

    return {
      confirm: () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (onSuccess) {
          onSuccess();
        }
      },
      revert: () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (onError) {
          onError();
        }
      }
    };
  }, [updateFn, revertDelay]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return performOptimisticUpdate;
};

// Hook for managing component lifecycle
export const useComponentLifecycle = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isMounted: () => isMountedRef.current,
    onlyIfMounted: <T>(fn: () => T): T | undefined => {
      if (isMountedRef.current) {
        return fn();
      }
      return undefined;
    }
  };
};
