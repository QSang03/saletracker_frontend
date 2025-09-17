"use client";

export interface HistoryState {
  filters: any;
  page: number;
  pageSize: number;
  timestamp: number;
  isCustomerSearch?: boolean;
  originalUrl?: string;
  previousFilters?: any;
  isReset?: boolean;
}

const HISTORY_STATE_KEY = 'orderManagementState';

/**
 * Push state to browser history
 */
export const pushToHistory = (state: Omit<HistoryState, 'timestamp'>, url?: string) => {
  if (typeof window === 'undefined') return;
  
  const historyState: HistoryState = {
    ...state,
    timestamp: Date.now(),
  };
  
  const currentUrl = url || window.location.pathname + window.location.search;
  
  try {
    window.history.pushState(historyState, '', currentUrl);
  } catch (error) {
    console.warn('❌ Failed to push browser history:', error);
  }
};

/**
 * Replace current history state
 */
export const replaceHistory = (state: Omit<HistoryState, 'timestamp'>, url?: string) => {
  if (typeof window === 'undefined') return;
  
  const historyState: HistoryState = {
    ...state,
    timestamp: Date.now(),
  };
  
  const currentUrl = url || window.location.pathname + window.location.search;
  
  try {
    window.history.replaceState(historyState, '', currentUrl);
  } catch (error) {
    console.warn('❌ Failed to replace browser history:', error);
  }
};

/**
 * Get current history state
 */
export const getCurrentHistoryState = (): HistoryState | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    return window.history.state as HistoryState || null;
  } catch (error) {
    console.warn('❌ Failed to get browser history state:', error);
    return null;
  }
};

/**
 * Build URL with query parameters
 */
export const buildUrlWithFilters = (filters: any, basePath?: string): string => {
  const params = new URLSearchParams();
  
  if (filters.page && filters.page > 1) {
    params.set('page', filters.page.toString());
  }
  
  if (filters.pageSize && filters.pageSize !== 10) {
    params.set('pageSize', filters.pageSize.toString());
  }
  
  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }
  
  if (filters.status?.trim()) {
    params.set('status', filters.status.trim());
  }
  
  if (filters.date?.trim()) {
    params.set('date', filters.date.trim());
  }
  
  if (filters.dateRange) {
    params.set('dateRange', JSON.stringify(filters.dateRange));
  }
  
  if (filters.employees?.trim()) {
    params.set('employees', filters.employees.trim());
  }
  
  if (filters.departments?.trim()) {
    params.set('departments', filters.departments.trim());
  }
  
  if (filters.products?.trim()) {
    params.set('products', filters.products.trim());
  }
  
  if (filters.warningLevel?.trim()) {
    params.set('warningLevel', filters.warningLevel.trim());
  }
  
  if (filters.conversationType?.trim()) {
    params.set('conversationType', filters.conversationType.trim());
  }
  
  if (filters.productCode?.trim()) {
    params.set('productCode', filters.productCode.trim());
  }
  
  if (typeof filters.quantity === 'number') {
    params.set('quantity', filters.quantity.toString());
  }
  
  if (filters.sortField) {
    params.set('sortField', filters.sortField);
  }
  
  if (filters.sortDirection) {
    params.set('sortDirection', filters.sortDirection);
  }
  
  const queryString = params.toString();
  
  // ✅ Sử dụng pathname hiện tại thay vì hardcode
  const currentPath = basePath || (typeof window !== 'undefined' ? window.location.pathname : '/dashboard/manager-order');
  
  return currentPath + (queryString ? `?${queryString}` : '');
};
