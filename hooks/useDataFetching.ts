import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';

interface UseDataFetchingOptions<T> {
  url: string;
  initialData?: T[];
  dependencies?: any[];
  silent?: boolean;
}

interface UseDataFetchingReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useDataFetching<T = any>({
  url,
  initialData = [],
  dependencies = [],
  silent = false
}: UseDataFetchingOptions<T>): UseDataFetchingReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isComponentMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async (silentFetch = false) => {
    console.log(`useDataFetching - fetchData called for ${url}, silent: ${silentFetch}`);
    
    if (!silentFetch) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      console.log(`useDataFetching - Making API call to: ${url}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`useDataFetching - API response for ${url}:`, result);

      if (!isComponentMounted.current) return;

      // Handle different response formats
      let responseData: T[] = [];
      if (Array.isArray(result)) {
        responseData = result;
      } else if (result.data && Array.isArray(result.data)) {
        responseData = result.data;
      } else if (result.success && Array.isArray(result.data)) {
        responseData = result.data;
      } else {
        console.warn(`useDataFetching - Unexpected response format for ${url}:`, result);
        responseData = [];
      }

      setData(responseData);
      setError(null);
      
      console.log(`useDataFetching - Data updated for ${url}:`, {
        dataLength: responseData.length,
        isLoading: false
      });

    } catch (err) {
      console.error(`useDataFetching - Error fetching ${url}:`, err);
      
      if (!isComponentMounted.current) return;
      
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData([]);
    } finally {
      if (!isComponentMounted.current) return;
      
      console.log(`useDataFetching - Setting isLoading to false for ${url}`);
      setIsLoading(false);
    }
  }, [url]);

  // Initial fetch
  useEffect(() => {
    console.log(`useDataFetching - Initial effect triggered for ${url}`);
    fetchData();
  }, [url]);

  // Refetch when dependencies change
  useEffect(() => {
    if (dependencies.length > 0) {
      console.log(`useDataFetching - Dependencies changed for ${url}, refetching...`);
      fetchData();
    }
  }, dependencies);

  const refetch = useCallback(() => {
    console.log(`useDataFetching - Manual refetch triggered for ${url}`);
    return fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    setData
  };
}
