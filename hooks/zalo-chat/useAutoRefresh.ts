import { useCallback, useEffect, useRef } from 'react';
import { useSystemConfig } from '@/hooks/useSystemConfig';

export interface UseAutoRefreshOptions {
  /**
   * Callback function to execute on each refresh
   */
  onRefresh: () => void;
  
  /**
   * Whether the auto-refresh is enabled
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Default interval in seconds if system config is not available
   * @default 30
   */
  defaultInterval?: number;
  
  /**
   * System config name to fetch the interval from
   * @default 'zalo_chat_auto_refresh_interval'
   */
  configName?: string;
}

export interface UseAutoRefreshReturn {
  /**
   * Manually trigger a refresh and reset the timer
   */
  triggerRefresh: () => void;
  
  /**
   * Reset the timer without triggering a refresh
   */
  resetTimer: () => void;
}

/**
 * Hook that automatically refreshes data at a configurable interval from system_config
 * without disrupting user interaction
 * 
 * @param options - Configuration options for auto-refresh
 * @returns Object with triggerRefresh function
 */
export function useAutoRefresh({
  onRefresh,
  enabled = true,
  defaultInterval = 30,
  configName = 'zalo_chat_auto_refresh_interval',
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onRefreshRef = useRef(onRefresh);
  
  // Always update the ref to the latest callback
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);
  
  // Fetch the refresh interval from system config
  const { value: configValue } = useSystemConfig(enabled ? configName : null);
  
  // Parse the interval from config or use default
  const intervalSeconds = configValue ? parseInt(configValue, 10) : defaultInterval;
  const intervalMs = intervalSeconds * 1000;
  
  // Function to start/restart the interval
  const startInterval = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Don't set up interval if disabled or interval is invalid
    if (!enabled || intervalSeconds <= 0 || isNaN(intervalSeconds)) {
      return;
    }
    
    // Set up the auto-refresh interval
    intervalRef.current = setInterval(() => {
      onRefreshRef.current();
    }, intervalMs);
  }, [enabled, intervalMs, intervalSeconds]);
  
  // Manual trigger function - executes refresh and resets timer
  const triggerRefresh = useCallback(() => {
    // Execute refresh immediately
    onRefreshRef.current();
    
    // Reset the timer
    startInterval();
  }, [startInterval]);
  
  // Reset timer only (without triggering refresh)
  const resetTimer = useCallback(() => {
    startInterval();
  }, [startInterval]);
  
  useEffect(() => {
    startInterval();
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startInterval]);
  
  return { triggerRefresh, resetTimer };
}

