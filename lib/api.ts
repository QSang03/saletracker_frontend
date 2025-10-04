import axios from 'axios';
import { getAccessToken } from './auth';
import { 
  OrderInquiryPreset, 
  CreateOrderInquiryPresetDto, 
  UpdateOrderInquiryPresetDto, 
  FindOrderInquiryPresetDto 
} from '@/types';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// API function to get user roles with permissions
export const getUserRolesWithPermissions = async () => {
  try {
    const response = await api.get('/users/roles-with-permissions');
    return response.data;
  } catch (error) {
    console.error('Error fetching user roles with permissions:', error);
    throw error;
  }
};

// Order Inquiry Presets API functions
export const orderInquiryPresetsApi = {
  // Get all presets with filters
  getAll: async (params?: FindOrderInquiryPresetDto) => {
    const response = await api.get('/order-inquiry-presets', { params });
    return response.data;
  },

  // Get current user's presets
  getMyPresets: async () => {
    const response = await api.get('/order-inquiry-presets/my-presets');
    return response.data;
  },

  // Get single preset by ID
  getById: async (id: number) => {
    const response = await api.get(`/order-inquiry-presets/${id}`);
    return response.data;
  },

  // Create new preset
  create: async (data: CreateOrderInquiryPresetDto) => {
    const response = await api.post('/order-inquiry-presets', data);
    return response.data;
  },

  // Update preset
  update: async (id: number, data: UpdateOrderInquiryPresetDto) => {
    const response = await api.patch(`/order-inquiry-presets/${id}`, data);
    return response.data;
  },

  // Delete preset
  delete: async (id: number) => {
    const response = await api.delete(`/order-inquiry-presets/${id}`);
    return response.data;
  },
};

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Setup refresh interceptor chỉ khi ở client-side
if (typeof window !== 'undefined') {
  import('./axiosRefresh').then(({ setupAxiosInterceptors }) => {
    setupAxiosInterceptors(api);
  });
}

// NOTE: Avoid setting non-safelisted headers on GET to prevent CORS preflight
