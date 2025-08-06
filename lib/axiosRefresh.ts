import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { refreshAccessToken } from './refreshToken';

// Global state để tránh multiple refresh cùng lúc
let globalIsRefreshing = false;
let globalRefreshPromise: Promise<string | null> | null = null;
let globalFailedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

export function setupAxiosInterceptors(instance: AxiosInstance) {
  // Chỉ setup nếu ở client-side
  if (typeof window === 'undefined') return;

  const processQueue = (error: any, token: string | null = null) => {
    globalFailedQueue.forEach((prom: { resolve: (token: string) => void; reject: (err: any) => void }) => {
      if (token) {
        prom.resolve(token);
      } else {
        prom.reject(error);
      }
    });
    globalFailedQueue = [];
  };

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      // Chỉ xử lý 401 và không phải từ refresh endpoint
      if (error.response?.status === 401 && 
          !originalRequest._retry && 
          !originalRequest.url?.includes('/auth/refresh')) {
        
        if (globalIsRefreshing) {
          // Nếu đang refresh, thêm vào queue và chờ
          return new Promise((resolve, reject) => {
            globalFailedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) originalRequest.headers['Authorization'] = 'Bearer ' + token;
                resolve(instance(originalRequest));
              },
              reject: (err: any) => reject(err),
            });
          });
        }
        
        originalRequest._retry = true;
        globalIsRefreshing = true;
        
        try {
          // Sử dụng global promise để tránh multiple calls
          if (!globalRefreshPromise) {
            console.log('🔄 [AxiosInterceptor] Starting new refresh process...');
            globalRefreshPromise = refreshAccessToken();
          } else {
            console.log('🔄 [AxiosInterceptor] Using existing refresh promise...');
          }
          
          const newToken = await globalRefreshPromise;
          
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
          globalIsRefreshing = false;
          globalRefreshPromise = null;
        }
      }
      return Promise.reject(error);
    }
  );
}
