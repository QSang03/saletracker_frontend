// hooks/useCachedApi.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCache } from '@/lib/cache';

interface CachedApiConfig<T> {
  ttl?: number; // milliseconds
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  onSettled?: () => void;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

interface CachedApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: any;
  isStale: boolean;
}

export function useCachedApi<T>(
  url: string,
  params?: Record<string, any>,
  config?: CachedApiConfig<T>
) {
  const [state, setState] = useState<CachedApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isStale: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const cacheKey = apiCache.generateKey(url, params);

  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    enabled = true,
    onSuccess,
    onError,
    onSettled,
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
    retryCount = 3,
    retryDelay = 1000,
  } = config || {};

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!enabled) return null;
    return apiCache.getResponse<T>(url, params);
  }, [url, params, enabled]);

  // Fetch data from API
  const fetchData = useCallback(
    async (signal?: AbortSignal): Promise<T> => {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
    [url]
  );

  // Main fetch function with retry logic
  const executeFetch = useCallback(
    async (signal?: AbortSignal): Promise<T> => {
      try {
        const data = await fetchData(signal);
        
        // Cache the response
        apiCache.setResponse(url, params, data, ttl);
        
        return data;
      } catch (error) {
        // Retry logic
        if (retryCountRef.current < retryCount && !signal?.aborted) {
          retryCountRef.current++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return executeFetch(signal);
        }
        throw error;
      }
    },
    [fetchData, url, params, ttl, retryCount, retryDelay]
  );

  // Main refetch function
  const refetch = useCallback(
    async (force = false) => {
      if (!enabled) return;

      // Check cache first (unless forced)
      if (!force) {
        const cachedData = getCachedData();
        if (cachedData) {
          setState(prev => ({
            ...prev,
            data: cachedData,
            isLoading: false,
            error: null,
            isStale: false,
          }));
          onSuccess?.(cachedData);
          return;
        }
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isStale: false,
      }));

      retryCountRef.current = 0;

      try {
        const data = await executeFetch(abortController.signal);
        
        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: null,
          isStale: false,
        }));

        onSuccess?.(data);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
          isStale: true,
        }));

        onError?.(error);
      } finally {
        abortControllerRef.current = null;
        onSettled?.();
      }
    },
    [enabled, getCachedData, executeFetch, onSuccess, onError, onSettled]
  );

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, refetch]);

  // Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect) return;

    const handleOnline = () => {
      refetch();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Invalidate cache
  const invalidate = useCallback(() => {
    apiCache.invalidatePattern(url);
  }, [url]);

  // Clear cache
  const clearCache = useCallback(() => {
    apiCache.invalidateAll();
  }, []);

  return {
    ...state,
    refetch,
    invalidate,
    clearCache,
  };
}

// Hook for POST/PUT/DELETE operations with cache invalidation
export function useCachedMutation<T, R>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
  config?: {
    onSuccess?: (data: R) => void;
    onError?: (error: any) => void;
    onSettled?: () => void;
    invalidatePatterns?: string[];
  }
) {
  const [state, setState] = useState<{
    isLoading: boolean;
    error: any;
  }>({
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const mutate = useCallback(
    async (data?: T): Promise<R> => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Invalidate cache patterns
        if (config?.invalidatePatterns) {
          config.invalidatePatterns.forEach(pattern => {
            apiCache.invalidatePattern(pattern);
          });
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
        }));

        config?.onSuccess?.(result);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
        }));

        config?.onError?.(error);
        throw error;
      } finally {
        abortControllerRef.current = null;
        config?.onSettled?.();
      }
    },
    [url, method, config]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    mutate,
  };
}

// Hook for batch API calls
export function useCachedBatchApi<T>(
  urls: string[],
  params?: Record<string, any>[],
  config?: CachedApiConfig<T[]>
) {
  const [state, setState] = useState<CachedApiState<T[]>>({
    data: null,
    isLoading: false,
    error: null,
    isStale: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBatch = useCallback(
    async (signal?: AbortSignal): Promise<T[]> => {
      const promises = urls.map((url, index) => {
        const urlParams = params?.[index];
        const cacheKey = apiCache.generateKey(url, urlParams);
        
        // Check cache first
        const cached = apiCache.getResponse<T>(url, urlParams);
        if (cached) {
          return Promise.resolve(cached);
        }

        // Fetch from API
        return fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal,
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        }).then(data => {
          // Cache the response
          apiCache.setResponse(url, urlParams, data, config?.ttl);
          return data;
        });
      });

      return Promise.all(promises);
    },
    [urls, params, config?.ttl]
  );

  const refetch = useCallback(
    async (force = false) => {
      if (!config?.enabled) return;

      // Check cache first (unless forced)
      if (!force) {
        const cachedData: T[] = [];
        let allCached = true;

        for (let i = 0; i < urls.length; i++) {
          const cached = apiCache.getResponse<T>(urls[i], params?.[i]);
          if (cached) {
            cachedData.push(cached);
          } else {
            allCached = false;
            break;
          }
        }

        if (allCached) {
          setState(prev => ({
            ...prev,
            data: cachedData,
            isLoading: false,
            error: null,
            isStale: false,
          }));
          config.onSuccess?.(cachedData);
          return;
        }
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isStale: false,
      }));

      try {
        const data = await fetchBatch(abortController.signal);
        
        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: null,
          isStale: false,
        }));

        config.onSuccess?.(data);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
          isStale: true,
        }));

        config.onError?.(error);
      } finally {
        abortControllerRef.current = null;
        config.onSettled?.();
      }
    },
    [config, fetchBatch]
  );

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refetch,
  };
}
