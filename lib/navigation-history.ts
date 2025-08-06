/**
 * Navigation History System for Order Management
 * Handles browser back/forward navigation with localStorage state
 */

export interface NavigationHistoryEntry {
  filters: any; // Filters state snapshot
  timestamp: number;
  userAction: boolean; // True if user manually set these filters
  page?: number;
  pageSize?: number;
}

const NAVIGATION_HISTORY_KEY = 'orderNavigationHistory';
const MAX_HISTORY_ENTRIES = 5;

/**
 * Save current state to navigation history before performing customer search
 */
export const saveNavigationHistory = (entry: Omit<NavigationHistoryEntry, 'timestamp'>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getNavigationHistory();
    const newEntry: NavigationHistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    
    // Add new entry to end of history
    history.push(newEntry);
    
    // Keep only last MAX_HISTORY_ENTRIES
    const trimmedHistory = history.slice(-MAX_HISTORY_ENTRIES);
    
    localStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify(trimmedHistory));
    
    console.log('🏛️ Saved navigation history:', newEntry);
  } catch (error) {
    console.warn('❌ Failed to save navigation history:', error);
  }
};

/**
 * Get all navigation history entries
 */
export const getNavigationHistory = (): NavigationHistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(NAVIGATION_HISTORY_KEY);
    if (!saved) return [];
    
    const history = JSON.parse(saved);
    
    // Validate format
    if (!Array.isArray(history)) return [];
    
    // Filter out entries older than 1 hour to prevent stale data
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return history.filter((entry: any) => 
      entry && 
      typeof entry === 'object' && 
      entry.timestamp > oneHourAgo &&
      entry.filters
    );
  } catch (error) {
    console.warn('❌ Failed to get navigation history:', error);
    return [];
  }
};

/**
 * Pop the last navigation history entry (restore previous state)
 */
export const popNavigationHistory = (): NavigationHistoryEntry | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const history = getNavigationHistory();
    if (history.length === 0) return null;
    
    // Get last entry
    const lastEntry = history[history.length - 1];
    
    // Remove last entry from history
    const updatedHistory = history.slice(0, -1);
    
    if (updatedHistory.length > 0) {
      localStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify(updatedHistory));
    } else {
      localStorage.removeItem(NAVIGATION_HISTORY_KEY);
    }
    
    console.log('🔙 Restored navigation history:', lastEntry);
    return lastEntry;
  } catch (error) {
    console.warn('❌ Failed to pop navigation history:', error);
    return null;
  }
};

/**
 * Clear all navigation history
 */
export const clearNavigationHistory = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(NAVIGATION_HISTORY_KEY);
    console.log('🧹 Cleared navigation history');
  } catch (error) {
    console.warn('❌ Failed to clear navigation history:', error);
  }
};

/**
 * Check if we have any navigation history
 */
export const hasNavigationHistory = (): boolean => {
  return getNavigationHistory().length > 0;
};

/**
 * Get the most recent navigation entry without removing it
 */
export const peekNavigationHistory = (): NavigationHistoryEntry | null => {
  const history = getNavigationHistory();
  return history.length > 0 ? history[history.length - 1] : null;
};
