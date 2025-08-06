import { setAccessToken, getRefreshToken, setRefreshToken, clearAllTokens, getAccessToken } from './auth';

// Global singleton để tránh multiple refresh calls
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  // Nếu đã có process đang chạy, return existing promise
  if (refreshPromise) {
    return refreshPromise;
  }
  
  // Tạo new promise và cache nó
  refreshPromise = performRefresh();
  
  try {
    const result = await refreshPromise;
    return result;
  } finally {
    // Clear promise sau khi hoàn thành (thành công hoặc thất bại)
    refreshPromise = null;
  }
}

async function performRefresh(): Promise<string | null> {
  try {
    if (typeof document === 'undefined') return null;
    
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      console.warn('❌ [RefreshToken] No refresh token found in cookies');
      return null;
    }
    
    // Clean the token (trim whitespace)
    const cleanRefreshToken = refreshToken.trim();
    
    // Tạo axios instance mới để tránh circular call với interceptor
    const { default: axios } = await import('axios');
    const refreshApi = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      withCredentials: true,
    });
    
    const res = await refreshApi.post('/auth/refresh', { refreshToken: cleanRefreshToken });
    
    if (res.data?.access_token) {
      
      setAccessToken(res.data.access_token);
      
      // Verify token was set
      const verifyToken = getAccessToken();
      
      // Cập nhật refresh token mới nếu có
      if (res.data?.refresh_token) {
        setRefreshToken(res.data.refresh_token);
      }
      
      return res.data.access_token;
    } else {
      console.error('❌ [RefreshToken] No access_token in response');
      console.error('❌ [RefreshToken] Full response:', res.data);
      return null;
    }
  } catch (e) {
    console.error('❌ [RefreshToken] Refresh token failed:', e);
    console.error('❌ [RefreshToken] Error details:', {
      status: (e as any)?.response?.status,
      statusText: (e as any)?.response?.statusText,
      data: (e as any)?.response?.data,
      message: (e as any)?.message,
      url: (e as any)?.config?.url,
    });
    
    // Clear tất cả tokens nếu refresh thất bại
    clearAllTokens();
    return null;
  }
}

// Deprecated functions for backward compatibility
export function setRefreshTokenLocal(token: string) {
  console.warn('setRefreshTokenLocal is deprecated, use setRefreshToken from auth.ts instead');
  setRefreshToken(token);
}

export function clearRefreshTokenLocal() {
  console.warn('clearRefreshTokenLocal is deprecated, use clearRefreshToken from auth.ts instead');
  if (typeof document !== 'undefined') {
    localStorage.removeItem('refresh_token');
  }
}
