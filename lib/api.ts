import axios from 'axios';
import { getAccessToken } from './auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

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
