import { useState, useCallback, useRef, useEffect } from 'react';

interface UseApiStateOptions {
  initialLoading?: boolean;
  autoRefreshInterval?: number;
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
  const { initialLoading = false, autoRefreshInterval } = options;
  
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const isMounted = useRef(true);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Main fetch effect that runs when fetchFunction or refreshTrigger changes
  useEffect(() => {
    let cancelled = false;
    
    const doFetch = async () => {
      if (!isMounted.current || cancelled) return;
      
      // Only show loading on first load or manual refresh
      if (!isInitialized.current || refreshTrigger > 0) {
        console.log('useApiState: Setting loading to true');
        setIsLoading(true);
      }
      setError(null);
      
      try {
        console.log('useApiState: Starting fetch...');
        const result = await fetchFunction();
        
        if (!isMounted.current || cancelled) return;
        
        console.log('useApiState: Fetch successful, updating data');
        setData(result);
        
        // Mark as initialized and set up auto-refresh if needed
        if (!isInitialized.current) {
          isInitialized.current = true;
          console.log('useApiState: Marked as initialized');
          
          // Set up auto-refresh now that we're initialized
          if (autoRefreshInterval && autoRefreshInterval > 0) {
            console.log('useApiState: Setting up auto-refresh interval:', autoRefreshInterval);
            refreshInterval.current = setInterval(() => {
              if (isMounted.current) {
                console.log('useApiState: Auto-refresh triggered - silent refresh');
                setRefreshTrigger(prev => prev + 1);
              }
            }, autoRefreshInterval);
          }
        }
      } catch (err) {
        console.error('useApiState: Fetch error:', err);
        if (!isMounted.current || cancelled) return;
        
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (isMounted.current && !cancelled) {
          console.log('useApiState: Setting loading to false');
          setIsLoading(false);
        }
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchFunction, refreshTrigger, autoRefreshInterval]);

  // Auto-refresh cleanup only
  useEffect(() => {
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  const refetch = useCallback(() => {
    console.log('useApiState: Manual refetch triggered');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const forceUpdate = useCallback(() => {
    console.log('useApiState: Force update triggered');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    console.log('useApiState: Manual setLoading to:', loading);
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
