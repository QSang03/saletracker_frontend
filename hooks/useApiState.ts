import { useState, useCallback, useRef, useEffect } from 'react';

interface UseApiStateOptions {
  initialLoading?: boolean;
}

interface UseApiStateReturn<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  setData: (data: T) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refetch: () => void;
  forceUpdate: () => void;
}

export function useApiState<T>(
  fetchFunction: () => Promise<T>,
  initialData: T,
  options: UseApiStateOptions = {}
): UseApiStateReturn<T> {
  const { initialLoading = false } = options;
  
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const isMounted = useRef(true);
  const isInitialized = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Main fetch effect that runs when fetchFunction or refreshTrigger changes
  useEffect(() => {
    let cancelled = false;
    
    const doFetch = async () => {
      if (!isMounted.current || cancelled) return;
      
      // Only show loading on first load or manual refresh
      if (!isInitialized.current || refreshTrigger > 0) {
        setIsLoading(true);
      }
      setError(null);
      
      try {
        const result = await fetchFunction();
        
        if (!isMounted.current || cancelled) return;
        
        setData(result);
        
        // Mark as initialized
        if (!isInitialized.current) {
          isInitialized.current = true;
        }
      } catch (err) {
        if (!isMounted.current || cancelled) return;
        
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (isMounted.current && !cancelled) {
          setIsLoading(false);
        }
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchFunction, refreshTrigger]);

  const refetch = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const forceUpdate = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    data,
    isLoading,
    error,
    setData,
    setLoading,
    setError,
    refetch,
    forceUpdate
  };
}
