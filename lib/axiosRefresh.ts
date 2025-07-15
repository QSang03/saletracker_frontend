import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { refreshAccessToken } from './refreshToken';

export function setupAxiosInterceptors(instance: AxiosInstance) {
  // Chỉ setup nếu ở client-side
  if (typeof window === 'undefined') return;
  
  let isRefreshing = false;
  let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

  const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
      if (token) {
        prom.resolve(token);
      } else {
        prom.reject(error);
      }
    });
    failedQueue = [];
  };

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      // Chỉ xử lý 401 và không phải từ refresh endpoint
      if (error.response?.status === 401 && 
          !originalRequest._retry && 
          !originalRequest.url?.includes('/auth/refresh')) {
        
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) originalRequest.headers['Authorization'] = 'Bearer ' + token;
                resolve(instance(originalRequest));
              },
              reject: (err) => reject(err),
            });
          });
        }
        
        originalRequest._retry = true;
        isRefreshing = true;
        
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            processQueue(null, newToken);
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
            }
            return instance(originalRequest);
          } else {
            // Nếu refresh thất bại, xóa token và redirect về login
            const { clearAllTokens } = await import('./auth');
            clearAllTokens();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            throw error;
          }
        } catch (err) {
          processQueue(err, null);
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(error);
    }
  );
}
