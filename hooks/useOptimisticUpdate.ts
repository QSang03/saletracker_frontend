// hooks/useOptimisticUpdate.ts
import { useState, useCallback, useRef } from 'react';
import { apiCache } from '@/lib/cache';

interface OptimisticUpdateConfig<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any, originalData: T) => void;
  onSettled?: () => void;
  cacheKey?: string;
  cacheParams?: Record<string, any>;
}

interface OptimisticUpdateState<T> {
  data: T | null;
  isUpdating: boolean;
  error: any;
  originalData: T | null;
}

export function useOptimisticUpdate<T>(
  initialData: T,
  config?: OptimisticUpdateConfig<T>
) {
  const [state, setState] = useState<OptimisticUpdateState<T>>({
    data: initialData,
    isUpdating: false,
    error: null,
    originalData: null,
  });

  const updateRef = useRef<{
    promise: Promise<T>;
    abortController: AbortController;
  } | null>(null);

  const updateOptimistically = useCallback(
    async (
      optimisticData: T,
      updateFn: () => Promise<T>,
      options?: {
        cacheKey?: string;
        cacheParams?: Record<string, any>;
      }
    ) => {
      // Store original data for rollback
      const originalData = state.data;
      
      // Immediately update UI with optimistic data
      setState(prev => ({
        ...prev,
        data: optimisticData,
        isUpdating: true,
        error: null,
        originalData,
      }));

      // Cache optimistic data
      if (options?.cacheKey) {
        apiCache.setResponse(
          options.cacheKey,
          options.cacheParams,
          optimisticData
        );
      }

      try {
        // Cancel previous update if still running
        if (updateRef.current) {
          updateRef.current.abortController.abort();
        }

        // Create new abort controller
        const abortController = new AbortController();
        
        // Execute actual update
        const updatePromise = updateFn();
        updateRef.current = { promise: updatePromise, abortController };

        const result = await updatePromise;

        // Update with real data
        setState(prev => ({
          ...prev,
          data: result,
          isUpdating: false,
          error: null,
          originalData: null,
        }));

        // Cache real data
        if (options?.cacheKey) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            result
          );
        }

        // Call success callback
        config?.onSuccess?.(result);

        return result;
      } catch (error) {
        // Check if it was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        // Rollback to original data
        setState(prev => ({
          ...prev,
          data: originalData,
          isUpdating: false,
          error,
          originalData: null,
        }));

        // Rollback cache
        if (options?.cacheKey && originalData) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            originalData
          );
        }

        // Call error callback
        config?.onError?.(error, originalData!);
        throw error;
      } finally {
        updateRef.current = null;
        config?.onSettled?.();
      }
    },
    [state.data, config]
  );

  const cancelUpdate = useCallback(() => {
    if (updateRef.current) {
      updateRef.current.abortController.abort();
      updateRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isUpdating: false,
      error: null,
      originalData: null,
    });
    cancelUpdate();
  }, [initialData, cancelUpdate]);

  return {
    data: state.data,
    isUpdating: state.isUpdating,
    error: state.error,
    updateOptimistically,
    cancelUpdate,
    reset,
  };
}

// Hook for optimistic list updates
export function useOptimisticListUpdate<T>(
  initialData: T[],
  config?: OptimisticUpdateConfig<T[]>
) {
  const [state, setState] = useState<OptimisticUpdateState<T[]>>({
    data: initialData,
    isUpdating: false,
    error: null,
    originalData: null,
  });

  const updateRef = useRef<{
    promise: Promise<T[]>;
    abortController: AbortController;
  } | null>(null);

  const updateItemOptimistically = useCallback(
    async (
      itemId: string | number,
      optimisticItem: T,
      updateFn: () => Promise<T[]>,
      options?: {
        cacheKey?: string;
        cacheParams?: Record<string, any>;
        idField?: keyof T;
      }
    ) => {
      const idField = options?.idField || 'id';
      const originalData = state.data;
      
      if (!originalData) return;
      
      // Create optimistic list
      const optimisticData = originalData.map(item => 
        (item as any)[idField] === itemId ? optimisticItem : item
      );

      // Immediately update UI
      setState(prev => ({
        ...prev,
        data: optimisticData,
        isUpdating: true,
        error: null,
        originalData,
      }));

      // Cache optimistic data
      if (options?.cacheKey) {
        apiCache.setResponse(
          options.cacheKey,
          options.cacheParams,
          optimisticData
        );
      }

      try {
        // Cancel previous update
        if (updateRef.current) {
          updateRef.current.abortController.abort();
        }

        const abortController = new AbortController();
        const updatePromise = updateFn();
        updateRef.current = { promise: updatePromise, abortController };

        const result = await updatePromise;

        // Update with real data
        setState(prev => ({
          ...prev,
          data: result,
          isUpdating: false,
          error: null,
          originalData: null,
        }));

        // Cache real data
        if (options?.cacheKey) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            result
          );
        }

        config?.onSuccess?.(result);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        // Rollback
        setState(prev => ({
          ...prev,
          data: originalData,
          isUpdating: false,
          error,
          originalData: null,
        }));

        if (options?.cacheKey && originalData) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            originalData
          );
        }

        config?.onError?.(error, originalData!);
        throw error;
      } finally {
        updateRef.current = null;
        config?.onSettled?.();
      }
    },
    [state.data, config]
  );

  const addItemOptimistically = useCallback(
    async (
      optimisticItem: T,
      updateFn: () => Promise<T[]>,
      options?: {
        cacheKey?: string;
        cacheParams?: Record<string, any>;
      }
    ) => {
      const originalData = state.data;
      if (!originalData) return;
      const optimisticData = [...originalData, optimisticItem];

      setState(prev => ({
        ...prev,
        data: optimisticData,
        isUpdating: true,
        error: null,
        originalData,
      }));

      if (options?.cacheKey) {
        apiCache.setResponse(
          options.cacheKey,
          options.cacheParams,
          optimisticData
        );
      }

      try {
        if (updateRef.current) {
          updateRef.current.abortController.abort();
        }

        const abortController = new AbortController();
        const updatePromise = updateFn();
        updateRef.current = { promise: updatePromise, abortController };

        const result = await updatePromise;

        setState(prev => ({
          ...prev,
          data: result,
          isUpdating: false,
          error: null,
          originalData: null,
        }));

        if (options?.cacheKey) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            result
          );
        }

        config?.onSuccess?.(result);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState(prev => ({
          ...prev,
          data: originalData,
          isUpdating: false,
          error,
          originalData: null,
        }));

        if (options?.cacheKey && originalData) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            originalData
          );
        }

        config?.onError?.(error, originalData!);
        throw error;
      } finally {
        updateRef.current = null;
        config?.onSettled?.();
      }
    },
    [state.data, config]
  );

  const removeItemOptimistically = useCallback(
    async (
      itemId: string | number,
      updateFn: () => Promise<T[]>,
      options?: {
        cacheKey?: string;
        cacheParams?: Record<string, any>;
        idField?: keyof T;
      }
    ) => {
      const idField = options?.idField || 'id';
      const originalData = state.data;
      if (!originalData) return;
      const optimisticData = originalData.filter(item => (item as any)[idField] !== itemId);

      setState(prev => ({
        ...prev,
        data: optimisticData,
        isUpdating: true,
        error: null,
        originalData,
      }));

      if (options?.cacheKey) {
        apiCache.setResponse(
          options.cacheKey,
          options.cacheParams,
          optimisticData
        );
      }

      try {
        if (updateRef.current) {
          updateRef.current.abortController.abort();
        }

        const abortController = new AbortController();
        const updatePromise = updateFn();
        updateRef.current = { promise: updatePromise, abortController };

        const result = await updatePromise;

        setState(prev => ({
          ...prev,
          data: result,
          isUpdating: false,
          error: null,
          originalData: null,
        }));

        if (options?.cacheKey) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            result
          );
        }

        config?.onSuccess?.(result);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState(prev => ({
          ...prev,
          data: originalData,
          isUpdating: false,
          error,
          originalData: null,
        }));

        if (options?.cacheKey && originalData) {
          apiCache.setResponse(
            options.cacheKey,
            options.cacheParams,
            originalData
          );
        }

        config?.onError?.(error, originalData!);
        throw error;
      } finally {
        updateRef.current = null;
        config?.onSettled?.();
      }
    },
    [state.data, config]
  );

  const cancelUpdate = useCallback(() => {
    if (updateRef.current) {
      updateRef.current.abortController.abort();
      updateRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isUpdating: false,
      error: null,
      originalData: null,
    });
    cancelUpdate();
  }, [initialData, cancelUpdate]);

  return {
    data: state.data,
    isUpdating: state.isUpdating,
    error: state.error,
    updateItemOptimistically,
    addItemOptimistically,
    removeItemOptimistically,
    cancelUpdate,
    reset,
  };
}
