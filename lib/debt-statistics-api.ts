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

export interface ContactDetailItem {
  customer_code: string;
  customer_name: string;
  employee_code_raw?: string;
  latest_time?: string | Date;
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

  async getOverview(filters: StatisticsFilters = {}): Promise<DebtStatsOverview> {
    const cacheKey = this.getCacheKey('overview', filters);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/overview`, { params: filters });
    this.setCacheData(cacheKey, response.data);
    return response.data;
  }

  async getAgingAnalysis(filters: StatisticsFilters = {}): Promise<AgingData[]> {
    const cacheKey = this.getCacheKey('aging', filters);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/aging`, { params: filters });
    this.setCacheData(cacheKey, response.data);
    return response.data;
  }

  async getTrends(filters: StatisticsFilters = {}): Promise<TrendData[]> {
    const cacheKey = this.getCacheKey('trends', filters);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/trends`, { params: filters });
    this.setCacheData(cacheKey, response.data);
    return response.data;
  }

  async getPayLaterDelay(filters: StatisticsFilters & { buckets?: string } = {}): Promise<PayLaterDelayItem[]> {
    const cacheKey = this.getCacheKey('pay-later-delay', filters);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/pay-later-delay`, { params: filters });
    this.setCacheData(cacheKey, response.data || []);
    return response.data || [];
  }

  async getContactResponses(filters: StatisticsFilters & { by?: 'customer' | 'invoice' } = {}): Promise<ContactResponseItem[]> {
    const params = { by: 'customer', ...filters };
    const cacheKey = this.getCacheKey('contact-responses', params);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/contact-responses`, { params });
    this.setCacheData(cacheKey, response.data || []);
    return response.data || [];
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

  async getEmployeePerformance(filters: StatisticsFilters = {}): Promise<EmployeePerformance[]> {
    const cacheKey = this.getCacheKey('employee-performance', filters);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/employee-performance`, { params: filters });
    this.setCacheData(cacheKey, response.data);
    return response.data;
  }

  async getDepartmentBreakdown(filters: StatisticsFilters = {}): Promise<DepartmentBreakdown[]> {
    const cacheKey = this.getCacheKey('department-breakdown', filters);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`${this.baseUrl}/department-breakdown`, { params: filters });
    this.setCacheData(cacheKey, response.data);
    return response.data;
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
