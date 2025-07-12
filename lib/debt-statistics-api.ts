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

  async getOverview(filters: StatisticsFilters = {}): Promise<DebtStatsOverview> {
    const response = await api.get(`${this.baseUrl}/overview`, { params: filters });
    return response.data;
  }

  async getAgingAnalysis(filters: StatisticsFilters = {}): Promise<AgingData[]> {
    const response = await api.get(`${this.baseUrl}/aging`, { params: filters });
    return response.data;
  }

  async getTrends(filters: StatisticsFilters = {}): Promise<TrendData[]> {
    const response = await api.get(`${this.baseUrl}/trends`, { params: filters });
    return response.data;
  }

  async getEmployeePerformance(filters: StatisticsFilters = {}): Promise<EmployeePerformance[]> {
    const response = await api.get(`${this.baseUrl}/employee-performance`, { params: filters });
    return response.data;
  }

  async getDepartmentBreakdown(filters: StatisticsFilters = {}): Promise<DepartmentBreakdown[]> {
    const response = await api.get(`${this.baseUrl}/department-breakdown`, { params: filters });
    return response.data;
  }

  async getDebtsByStatus(
    status: 'paid' | 'promised' | 'no_info', 
    filters: DebtListFilters = {}
  ): Promise<DebtListResponse> {
    try {
      // Try the main debts endpoint with status filter first
      const response = await api.get('/debts', { 
        params: { 
          ...filters, 
          status,
          limit: filters.limit || 50
        } 
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        return response.data;
      }
      
      // If response doesn't have expected structure, try direct array
      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.data.length,
          page: 1,
          limit: filters.limit || 50,
          totalPages: 1
        };
      }
      
      console.warn('Unexpected response structure from debts endpoint:', response.data);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: filters.limit || 50,
        totalPages: 0
      };
      
    } catch (error) {
      console.error('Error fetching debts by status:', error);
      // Return empty result instead of throwing
      return {
        data: [],
        total: 0,
        page: 1,
        limit: filters.limit || 50,
        totalPages: 0
      };
    }
  }

  async getDetailedDebts(filters: DebtListFilters = {}): Promise<DebtListResponse> {
    const response = await api.get('/debts', { params: filters });
    console.log('Raw API response structure:', response);
    console.log('Response data:', response.data);
    
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
          limit: filters.limit || 50,
          totalPages: 1
        };
      }
    }
    
    return {
      data: [],
      total: 0,
      page: 1,
      limit: filters.limit || 50,
      totalPages: 0
    };
  }

  // Legacy stats endpoint
  async getBasicStats(filters: StatisticsFilters = {}) {
    const response = await api.get('/debts/stats', { params: filters });
    return response.data;
  }
}

export const debtStatisticsAPI = new DebtStatisticsAPI();
