import { api } from "./api";
import {
  Campaign,
  CampaignFormData,
  CampaignType,
  CampaignStatus,
  CampaignWithDetails,
} from "../types";

export interface CampaignFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  campaign_types?: CampaignType[];
  statuses?: CampaignStatus[];
  employees?: string[];
  departments?: string[];
  singleDate?: string;
}

export interface CampaignResponse {
  data: CampaignWithDetails[];
  total: number;
  stats: {
    totalCampaigns: number;
    draftCampaigns: number;
    runningCampaigns: number;
    completedCampaigns: number;
    scheduledCampaigns?: number;
    archivedCampaigns?: number;
  };
}

// ✅ LAZY LOADING CONFIG
const LAZY_LOADING_CONFIG = {
  // Tăng pageSize lên 1,000,000 để tải toàn bộ dữ liệu một lần
  MAX_PAGE_SIZE: 1000000,
  // Default page size cho các API khác
  DEFAULT_PAGE_SIZE: 50,
};

// Campaign API functions
export const campaignAPI = {
  // Get logs of a customer in a campaign
  getCustomerLogs: async (campaignId: string, customerId: string) => {
    const response = await api.get(
      `/campaigns/${campaignId}/customers/${customerId}/logs`
    );
    return response.data;
  },
  
  // Get all campaigns with filters
  getAll: async (filters: CampaignFilters = {}): Promise<CampaignResponse> => {
    const response = await api.get("/campaigns", { 
      params: filters,
      // ✅ FIX: Custom serialization để loại bỏ []
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          
          Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            
            if (Array.isArray(value)) {
              // ✅ Gửi multiple values với cùng key thay vì key[]
              value.forEach(item => {
                if (item !== undefined && item !== null && item !== '') {
                  searchParams.append(key, String(item));
                }
              });
            } else {
              searchParams.append(key, String(value));
            }
          });
          
          return searchParams.toString();
        }
      }
    });
    return response.data;
  },

  // ✅ UPDATED: Get customers of a campaign with LAZY LOADING support
  getCampaignCustomers: async (
    campaignId: string,
    params: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
      // ✅ NEW: Thêm flag để enable lazy loading
      enableLazyLoading?: boolean;
    } = {}
  ) => {
    // ✅ Nếu enable lazy loading, tự động set limit = 1,000,000
    const finalParams = {
      ...params,
      limit: params.enableLazyLoading 
        ? LAZY_LOADING_CONFIG.MAX_PAGE_SIZE 
        : (params.limit || LAZY_LOADING_CONFIG.DEFAULT_PAGE_SIZE),
      page: params.enableLazyLoading ? 1 : (params.page || 1),
    };

    const response = await api.get(`/campaigns/${campaignId}/customers`, {
      params: finalParams,
    });
    return response.data;
  },

  // ✅ NEW: Specialized method for lazy loading - tải toàn bộ dữ liệu
  getCampaignCustomersLazyLoad: async (
    campaignId: string,
    params: {
      search?: string;
      status?: string;
    } = {}
  ) => {
    const response = await api.get(`/campaigns/${campaignId}/customers`, {
      params: {
        ...params,
        page: 1,
        limit: LAZY_LOADING_CONFIG.MAX_PAGE_SIZE, // ✅ 1,000,000 records
      },
    });
    return response.data;
  },

  // Export customers of a campaign
  exportCampaignCustomers: async (
    campaignId: string,
    params: { search?: string; status?: string } = {}
  ) => {
    const response = await api.get(
      `/campaigns/${campaignId}/customers/export`,
      {
        params,
        responseType: "blob",
      }
    );
    return response.data;
  },

  // Get campaign statistics
  getStats: async () => {
    const response = await api.get("/campaigns/stats");
    return response.data;
  },

  // Get single campaign
  getById: async (id: string): Promise<Campaign> => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  // Create new campaign
  create: async (data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.post("/campaigns", data);
    return response.data;
  },

  // Update campaign
  update: async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.patch(`/campaigns/${id}`, data);
    return response.data;
  },

  // Update campaign status
  updateStatus: async (
    id: string,
    status: CampaignStatus
  ): Promise<Campaign> => {
    const response = await api.patch(`/campaigns/${id}/status`, { status });
    return response.data;
  },

  // Archive campaign
  archive: async (id: string): Promise<Campaign> => {
    const response = await api.patch(`/campaigns/${id}/archive`);
    return response.data;
  },

  // Delete campaign
  delete: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/${id}`);
  },

  getDepartmentsForFilter: async () => {
    const response = await api.get("/departments/for-filter");
    return response.data;
  },

  getUsersForFilter: async (departmentId?: string) => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await api.get("/users/for-filter", { params });
    return response.data;
  },

  getUsersWithEmail: async () => {
    const response = await api.get("/users/with-email");
    return response.data;
  },

  getAllUsersForFilter: async (): Promise<Array<{
    value: number;
    label: string;
    departmentIds: number[];
  }>> => {
    const response = await api.get("/users/all-for-filter");
    return response.data;
  },
};

// Campaign Customer API functions
export const campaignCustomerAPI = {
  // ✅ UPDATED: Get all customers with lazy loading support
  getAll: async (params: any = {}) => {
    // ✅ Tự động apply lazy loading nếu không có limit
    const finalParams = {
      ...params,
      limit: params.limit || LAZY_LOADING_CONFIG.DEFAULT_PAGE_SIZE,
    };
    
    const response = await api.get("/campaign-customers", { params: finalParams });
    return response.data;
  },

  // ✅ NEW: Lazy load all customers
  getAllLazyLoad: async (params: any = {}) => {
    const finalParams = {
      ...params,
      page: 1,
      limit: LAZY_LOADING_CONFIG.MAX_PAGE_SIZE, // ✅ 1,000,000 records
    };
    
    const response = await api.get("/campaign-customers", { params: finalParams });
    return response.data;
  },

  // Get customer by ID
  getById: async (id: string) => {
    const response = await api.get(`/campaign-customers/${id}`);
    return response.data;
  },

  // Create customer
  create: async (data: any) => {
    const response = await api.post("/campaign-customers", data);
    return response.data;
  },

  // Import customers from Excel
  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/campaign-customers/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Update customer
  update: async (id: string, data: any) => {
    const response = await api.patch(`/campaign-customers/${id}`, data);
    return response.data;
  },

  // Delete customer
  delete: async (id: string) => {
    await api.delete(`/campaign-customers/${id}`);
  },
};

// Campaign Schedule API functions
export const campaignScheduleAPI = {
  getByCampaign: async (campaignId: string) => {
    const response = await api.get(`/campaign-schedules/${campaignId}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post("/campaign-schedules", data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.patch(`/campaign-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/campaign-schedules/${id}`);
  },
};

// ✅ UPDATED: Campaign Interaction Log API functions with lazy loading
export const campaignLogAPI = {
  // ✅ UPDATED: Get all logs with lazy loading support
  getAll: async (filters: any = {}) => {
    const finalParams = {
      ...filters,
      limit: filters.limit || LAZY_LOADING_CONFIG.DEFAULT_PAGE_SIZE,
    };
    
    const response = await api.get("/campaign-interaction-logs", {
      params: finalParams,
    });
    return response.data;
  },

  // ✅ NEW: Lazy load all logs
  getAllLazyLoad: async (filters: any = {}) => {
    const finalParams = {
      ...filters,
      page: 1,
      limit: LAZY_LOADING_CONFIG.MAX_PAGE_SIZE, // ✅ 1,000,000 records
    };
    
    const response = await api.get("/campaign-interaction-logs", {
      params: finalParams,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/campaign-interaction-logs/${id}`);
    return response.data;
  },

  // ✅ UPDATED: Get logs by campaign with lazy loading
  getByCampaign: async (campaignId: string, enableLazyLoading = false) => {
    const params = enableLazyLoading 
      ? { 
          page: 1, 
          limit: LAZY_LOADING_CONFIG.MAX_PAGE_SIZE 
        }
      : {};
      
    const response = await api.get(
      `/campaign-interaction-logs/campaign/${campaignId}`,
      { params }
    );
    return response.data;
  },

  updateStatus: async (id: string, status: string, additionalData?: any) => {
    const response = await api.patch(
      `/campaign-interaction-logs/${id}/status`,
      {
        status,
        ...additionalData,
      }
    );
    return response.data;
  },
};

// ✅ NEW: Utility functions for lazy loading
export const lazyLoadingUtils = {
  // Check if lazy loading should be enabled based on expected data size
  shouldEnableLazyLoading: (expectedCount: number): boolean => {
    return expectedCount > 1000; // Enable lazy loading cho > 1000 records
  },

  // Get optimal page size based on data size
  getOptimalPageSize: (totalCount: number): number => {
    if (totalCount > 100000) return LAZY_LOADING_CONFIG.MAX_PAGE_SIZE;
    if (totalCount > 10000) return 1000;
    if (totalCount > 1000) return 500;
    return LAZY_LOADING_CONFIG.DEFAULT_PAGE_SIZE;
  },

  // Split large dataset into chunks for processing
  chunkArray: <T>(array: T[], chunkSize: number = 50): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  },

  // Virtual scrolling helper
  getVisibleRange: (
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number
  ): { start: number; end: number } => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, totalItems); // +5 for buffer
    
    return { start: Math.max(0, start - 5), end }; // -5 for buffer
  },
};

// ✅ Export config for use in components
export { LAZY_LOADING_CONFIG };