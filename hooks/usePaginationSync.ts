import { useCallback, useEffect, useRef, useState } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  filters: Record<string, any>;
}

export interface UsePaginationSyncProps {
  initialPage?: number;
  initialPageSize?: number;
  initialFilters?: Record<string, any>;
  onStateChange?: (state: PaginationState) => void;
  debounceMs?: number;
}

/**
 * Custom hook để đồng bộ hóa pagination state
 * Giải quyết vấn đề race condition và state mismatch
 */
export function usePaginationSync({
  initialPage = 1,
  initialPageSize = 10,
  initialFilters = {},
  onStateChange,
  debounceMs = 300
}: UsePaginationSyncProps) {
  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    filters: initialFilters
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Debounced state change callback
  const debouncedStateChange = useCallback((newState: PaginationState) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (onStateChange) {
        onStateChange(newState);
      }
    }, debounceMs);
  }, [onStateChange, debounceMs]);

  // Update page
  const setPage = useCallback((page: number) => {
    setState(prev => {
      const newState = { ...prev, page };
      debouncedStateChange(newState);
      return newState;
    });
  }, [debouncedStateChange]);

  // Update page size (resets page to 1)
  const setPageSize = useCallback((pageSize: number) => {
    setState(prev => {
      const newState = { ...prev, pageSize, page: 1 };
      debouncedStateChange(newState);
      return newState;
    });
  }, [debouncedStateChange]);

  // Update filters (resets page to 1)
  const setFilters = useCallback((filters: Record<string, any>) => {
    setState(prev => {
      const newState = { ...prev, filters, page: 1 };
      debouncedStateChange(newState);
      return newState;
    });
  }, [debouncedStateChange]);

  // Reset all to initial values
  const reset = useCallback(() => {
    const newState = {
      page: initialPage,
      pageSize: initialPageSize,
      filters: initialFilters
    };
    setState(newState);
    
    // ✅ THÊM: Immediate callback cho reset (không debounce)
    if (onStateChange) {
      onStateChange(newState);
    }
    
    // ✅ VẪN GỌI: Debounced callback cho consistency
    debouncedStateChange(newState);
  }, [initialPage, initialPageSize, initialFilters, onStateChange, debouncedStateChange]);

  // Sync initial state once
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      if (onStateChange) {
        onStateChange(state);
      }
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    setPage,
    setPageSize,
    setFilters,
    reset,
    // Convenient getters
    page: state.page,
    pageSize: state.pageSize,
    filters: state.filters
  };
}
