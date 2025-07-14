import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';

interface UseDataFetchingOptions<T> {
  url: string;
  initialData?: T[];
  dependencies?: any[];
  silent?: boolean;
}

interface UseDataFetchingResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDataFetching = <T = any>(
  options: UseDataFetchingOptions<T>
): UseDataFetchingResult<T> => {
  const { url, initialData = [], dependencies = [], silent = false } = options;
  
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(!silent);
  const [error, setError] = useState<string | null>(null);
  
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (silentFetch = false) => {
    if (!url || fetchingRef.current) return;

    fetchingRef.current = true;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (!silentFetch) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      let newData: T[] = [];
      if (Array.isArray(result)) {
        newData = result;
      } else if (result.data && Array.isArray(result.data)) {
        newData = result.data;
      } else if (typeof result === 'object' && result !== null) {
        newData = [result] as T[];
      }

      setData(newData);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred while fetching data');
      }
    } finally {
      fetchingRef.current = false;
      if (!silentFetch) {
        setIsLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (dependencies.length > 0) {
      fetchData();
    }
  }, dependencies);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};
