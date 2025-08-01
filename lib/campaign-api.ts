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

// Campaign API functions
export const campaignAPI = {
  // Get logs of a customer in a campaign
  // getCustomerLogs: async (campaignId: string, customerId: string) => {
  //   const response = await api.get(
  //     `/campaigns/${campaignId}/customers/${customerId}/logs`
  //   );
  //   return response.data;
  // },

  getCustomerLogs: async (
    campaignId: string,
    customerId: string,
    sentDate?: string
  ) => {
    const params: any = {};
    if (sentDate) {
      params.sent_date = sentDate; // Format: YYYY-MM-DD
    }

    const response = await api.get(
      `/campaigns/${campaignId}/customers/${customerId}/logs`,
      { params }
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
              value.forEach((item) => {
                if (item !== undefined && item !== null && item !== "") {
                  searchParams.append(key, String(item));
                }
              });
            } else {
              searchParams.append(key, String(value));
            }
          });

          return searchParams.toString();
        },
      },
    });
    return response.data;
  },

  // Get customers of a campaign with filters
  getCampaignCustomers: async (
    campaignId: string,
    params: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ) => {
    const response = await api.get(`/campaigns/${campaignId}/customers`, {
      params,
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

  getAllUsersForFilter: async (): Promise<
    Array<{
      value: number;
      label: string;
      departmentIds: number[];
    }>
  > => {
    const response = await api.get("/users/all-for-filter");
    return response.data;
  },
};

// Campaign Customer API functions
export const campaignCustomerAPI = {
  // Get all customers
  getAll: async (params: any = {}) => {
    const response = await api.get("/campaign-customers", { params });
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

// Campaign Interaction Log API functions
export const campaignLogAPI = {
  getAll: async (filters: any = {}) => {
    const response = await api.get("/campaign-interaction-logs", {
      params: filters,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/campaign-interaction-logs/${id}`);
    return response.data;
  },

  getByCampaign: async (campaignId: string) => {
    const response = await api.get(
      `/campaign-interaction-logs/campaign/${campaignId}`
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
