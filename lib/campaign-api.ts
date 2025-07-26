import { api } from './api';
import { Campaign, CampaignFormData, CampaignType, CampaignStatus } from '../types';

export interface CampaignFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  campaignTypes?: CampaignType[];
  statuses?: CampaignStatus[];
  createdBy?: string[];
}

export interface CampaignResponse {
  data: Campaign[];
  total: number;
  stats: {
    totalCampaigns: number;
    draftCampaigns: number;
    runningCampaigns: number;
    completedCampaigns: number;
  };
}

// Campaign API functions
export const campaignAPI = {
  // Get all campaigns with filters
  getAll: async (filters: CampaignFilters = {}): Promise<CampaignResponse> => {
    const response = await api.get('/campaigns', { params: filters });
    return response.data;
  },

  // Get campaign statistics
  getStats: async () => {
    const response = await api.get('/campaigns/stats');
    return response.data;
  },

  // Get single campaign
  getById: async (id: string): Promise<Campaign> => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  // Create new campaign
  create: async (data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.post('/campaigns', data);
    return response.data;
  },

  // Update campaign
  update: async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.patch(`/campaigns/${id}`, data);
    return response.data;
  },

  // Update campaign status
  updateStatus: async (id: string, status: CampaignStatus): Promise<Campaign> => {
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
};

// Campaign Customer API functions
export const campaignCustomerAPI = {
  // Get all customers
  getAll: async (params: any = {}) => {
    const response = await api.get('/campaign-customers', { params });
    return response.data;
  },

  // Get customer by ID
  getById: async (id: string) => {
    const response = await api.get(`/campaign-customers/${id}`);
    return response.data;
  },

  // Create customer
  create: async (data: any) => {
    const response = await api.post('/campaign-customers', data);
    return response.data;
  },

  // Import customers from Excel
  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/campaign-customers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
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
    const response = await api.post('/campaign-schedules', data);
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
    const response = await api.get('/campaign-interaction-logs', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/campaign-interaction-logs/${id}`);
    return response.data;
  },

  getByCampaign: async (campaignId: string) => {
    const response = await api.get(`/campaign-interaction-logs/campaign/${campaignId}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string, additionalData?: any) => {
    const response = await api.patch(`/campaign-interaction-logs/${id}/status`, {
      status,
      ...additionalData,
    });
    return response.data;
  },
};
