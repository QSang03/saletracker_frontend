import { api } from '@/lib/api';
import { Debt } from '@/types';

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
  private baseUrl = '/debts/stats';
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
    status: 'paid' | 'promised' | 'no_info', 
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
    // For statistics, use large limit to get complete data
    const allFilters = {
      ...filters,
      limit: filters.limit || 10000, // Get all records for accurate statistics
      page: filters.page || 1
    };
    
    const response = await api.get('/debts', { params: allFilters });

    
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

  // Legacy stats endpoint
  async getBasicStats(filters: StatisticsFilters = {}) {
    const response = await api.get('/debts/stats', { params: filters });
    return response.data;
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
