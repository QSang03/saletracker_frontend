import { api } from '@/lib/api';
import type { 
  Debt 
} from '@/types';

// Legacy interfaces kept for backward compatibility
export interface DebtStatsOverview {
  total: number;
  paid: number;
  payLater: number;
  noInfo: number;
  totalAmount: number;
  remainingAmount: number;
  collectedAmount: number;
  collectionRate: number;
  avgDebtAmount: number;
}

export interface AgingData {
  count: number;
  amount: number;
  label: string;
  range?: string; // Add range property from API
}

export interface PayLaterDelayItem {
  range: string;
  count: number;
  amount: number;
}

export interface ContactResponseItem {
  status: string;
  customers: number;
}

export interface AgingDailyItem {
  date: string;
  range: string; // '1-30' | '31-60' | '61-90' | '>90'
  count: number;
  amount: number;
}

export interface PayLaterDailyItem {
  date: string;
  range: string; // e.g. '1-7' | '8-14' | '15-30' | '>30'
  count: number;
  amount: number;
}

export interface ContactResponseDailyItem {
  date: string;
  status: string;
  customers: number;
}

export interface ContactDetailItem {
  customer_code: string;
  customer_name: string;
  employee_code_raw?: string;
  latest_time?: string | Date;
  send_at?: string | Date;
  first_remind_at?: string | Date;
  second_remind_at?: string | Date;
}

export interface TrendData {
  date: string;
  name: string;
  paid: number;
  pay_later: number;
  no_info: number;
  total: number;
  totalAmount: number;
  collectionRate: number;
}

export interface EmployeePerformance {
  employeeCode: string;
  totalAssigned: number;
  totalCollected: number;
  totalAmount: number;
  collectedAmount: number;
  collectionRate: number;
  avgDebtAmount: number;
}

export interface DepartmentBreakdown {
  department: string;
  total: number;
  paid: number;
  payLater: number;
  noInfo: number;
  totalAmount: number;
  collectedAmount: number;
  collectionRate: number;
}

export interface StatisticsFilters {
  from?: string;
  to?: string;
  singleDate?: string;
  status?: string;
  customerCode?: string;
  employeeCode?: string;
  saleCode?: string;
  search?: string;
}

export interface DebtListFilters extends StatisticsFilters {
  page?: number;
  limit?: number;
}

export interface DebtListResponse {
  data: Debt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class DebtStatisticsAPI {
  private baseUrl = '/debt-statistics';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  // Clear expired cache entries
  private clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  // Get cached data if available and not expired
  private getCachedData(key: string) {
    this.clearExpiredCache();
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  // Set cache data
  private setCacheData(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Generate cache key from filters
  private getCacheKey(endpoint: string, filters: any) {
    return `${endpoint}_${JSON.stringify(filters)}`;
  }

  // Generic fetch with cache fallback (handles 304 and empty bodies)
  private async fetchWithCacheFallback<T>(endpoint: string, params: any, defaultValue: T): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getCachedData(cacheKey) as T | null;
    try {
      // Add cache-buster on cold request to avoid 304 with empty body
      const finalParams = cached == null ? { ...(params || {}), _cb: Date.now() } : params;
      const response = await api.get(`${this.baseUrl}/${endpoint}`, { params: finalParams });
      const status: number | undefined = (response as any)?.status;
      const data = (response as any)?.data;
      console.log(`🔍 [API] ${endpoint} - Status: ${status}, Data:`, data);
      // If server responds 304 or empty body, reuse cached data
      if ((status === 304 || data == null) && cached != null) {
        return cached;
      }
      const result = (data == null ? defaultValue : data) as T;
      this.setCacheData(cacheKey, result as any);
      return result;
    } catch (_err) {
      console.error(`❌ [API] ${endpoint} - Error:`, _err);
      // On error, serve cached data if available, else default
      if (cached != null) return cached;
      return defaultValue;
    }
  }

  async getOverview(filters: StatisticsFilters = {}): Promise<DebtStatsOverview> {
    return this.fetchWithCacheFallback<DebtStatsOverview>('overview', filters, {
      total: 0,
      paid: 0,
      payLater: 0,
      noInfo: 0,
      totalAmount: 0,
      remainingAmount: 0,
      collectedAmount: 0,
      collectionRate: 0,
      avgDebtAmount: 0,
    });
  }

  async getAgingAnalysis(filters: StatisticsFilters = {}): Promise<AgingData[]> {
  return this.fetchWithCacheFallback<AgingData[]>('aging', filters, []);
  }

  async getTrends(filters: StatisticsFilters = {}): Promise<TrendData[]> {
  return this.fetchWithCacheFallback<TrendData[]>('trends', filters, []);
  }

  async getPayLaterDelay(filters: StatisticsFilters & { buckets?: string } = {}): Promise<PayLaterDelayItem[]> {
  return this.fetchWithCacheFallback<PayLaterDelayItem[]>('pay-later-delay', filters, []);
  }

  async getContactResponses(filters: StatisticsFilters & { by?: 'customer' | 'invoice' } = {}): Promise<ContactResponseItem[]> {
    const params = { by: 'customer', ...filters };
  return this.fetchWithCacheFallback<ContactResponseItem[]>('contact-responses', params, []);
  }

  async getContactDetails(params: { date?: string; from?: string; to?: string; responseStatus: string; page?: number; limit?: number; employeeCode?: string; customerCode?: string; mode?: 'events' | 'distribution'; }): Promise<{ data: ContactDetailItem[]; total: number; page: number; limit: number; totalPages: number; }> {
    const cacheKey = this.getCacheKey('contact-details', params);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/contact-details`, { params });
    const data = response.data || { data: [], total: 0, page: params.page || 1, limit: params.limit || 50, totalPages: 0 };
    this.setCacheData(cacheKey, data);
    return data;
  }

  // Daily series endpoints
  async getAgingDaily(filters: StatisticsFilters = {}): Promise<AgingDailyItem[]> {
  return this.fetchWithCacheFallback<AgingDailyItem[]>('aging-daily', filters, []);
  }

  async getPayLaterDelayDaily(filters: StatisticsFilters & { buckets?: string } = {}): Promise<PayLaterDailyItem[]> {
  return this.fetchWithCacheFallback<PayLaterDailyItem[]>('pay-later-delay-daily', filters, []);
  }

  async getContactResponsesDaily(filters: StatisticsFilters & { by?: 'customer' | 'invoice' } = {}): Promise<ContactResponseDailyItem[]> {
    const params = { by: 'customer', ...filters } as any;
  return this.fetchWithCacheFallback<ContactResponseDailyItem[]>('contact-responses-daily', params, []);
  }

  async getEmployeePerformance(filters: StatisticsFilters = {}): Promise<EmployeePerformance[]> {
  return this.fetchWithCacheFallback<EmployeePerformance[]>('employee-performance', filters, []);
  }

  async getDepartmentBreakdown(filters: StatisticsFilters = {}): Promise<DepartmentBreakdown[]> {
  return this.fetchWithCacheFallback<DepartmentBreakdown[]>('department-breakdown', filters, []);
  }

  async getDebtsByStatus(
    status: 'paid' | 'pay_later' | 'no_information_available', 
    filters: DebtListFilters = {}
  ): Promise<DebtListResponse> {
    try {
      // For statistics, we need ALL data, not paginated results
      const allFilters = {
        ...filters,
        status,
        limit: 10000, // Get all records for accurate statistics
        page: 1
      };
      
      const response = await api.get('/debts', { params: allFilters });
      
      if (response.data && Array.isArray(response.data.data)) {
        return response.data;
      }
      
      // If response doesn't have expected structure, try direct array
      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.data.length,
          page: 1,
          limit: response.data.length,
          totalPages: 1
        };
      }
      
      console.warn('Unexpected response structure from debts endpoint:', response.data);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0
      };
      
    } catch (error) {
      console.error('Error fetching debts by status:', error);
      // Return empty result instead of throwing
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0
      };
    }
  }

  async getDetailedDebts(filters: DebtListFilters = {}): Promise<DebtListResponse> {
    // Always use debt-statistics API for consistent filtering logic
    const allFilters = {
      ...filters,
      limit: filters.limit || 10000, // Get all records for accurate statistics
      page: filters.page || 1
    };
    
    // Use debt-statistics endpoint instead of debts
    const response = await api.get(`${this.baseUrl}/detailed`, { params: allFilters });

    
    // Handle different response structures
    if (response.data) {
      // Check if it's paginated response
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data;
      }
      // Check if it's direct array
      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.data.length,
          page: 1,
          limit: response.data.length,
          totalPages: 1
        };
      }
    }
    
    return {
      data: [],
      total: 0,
      page: 1,
      limit: allFilters.limit,
      totalPages: 0
    };
  }

  // Invalidate cache for specific patterns
  invalidateCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Force refresh - bypass cache
  async forceRefresh() {
    this.cache.clear();
  }

  // Capture debt statistics for a specific date
  async captureStatistics(date?: string) {
    const response = await api.post(`${this.baseUrl}/capture`, { date });
    return response.data;
  }
}

export const debtStatisticsAPI = new DebtStatisticsAPI();

// Helper function to get detailed debts by date and category
export async function getDetailedDebtsByDate(
  filters: DebtListFilters,
  category: string,
  date: Date
): Promise<DebtListResponse> {
  try {
    // Format date for API
    const dateStr = date.toISOString().split('T')[0];
    
    // Build API endpoint based on category
    let endpoint = '/debt-statistics/detailed';
    const params: any = {
      date: dateStr,
      page: filters.page || 1,
      limit: filters.limit || 1000
    };
    
    // Add status filter based on category
    if (category === 'pay_later') {
      params.status = 'pay_later';
    } else if (category === 'no_information_available') {
      params.status = 'no_information_available';
    } else if (category === 'paid') {
      params.status = 'paid';
    }
    
    const response = await api.get(endpoint, { params });
    
    return response.data;
  } catch (error) {
    console.error('❌ [getDetailedDebtsByDate] API error:', error);
    return {
      data: [],
      total: 0,
      page: 1,
      limit: filters.limit || 1000,
      totalPages: 0
    };
  }
}
