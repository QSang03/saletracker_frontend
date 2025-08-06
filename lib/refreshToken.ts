import { setAccessToken, getRefreshToken, setRefreshToken, clearAllTokens, getAccessToken } from './auth';

export async function refreshAccessToken(): Promise<string | null> {
  try {
    if (typeof document === 'undefined') return null;
    
    const refreshToken = getRefreshToken();
    console.log('🔍 [RefreshToken] Found refresh token:', refreshToken ? 'YES' : 'NO');
    
    if (!refreshToken) {
      console.warn('❌ [RefreshToken] No refresh token found in cookies');
      return null;
    }
    
    // Clean the token (trim whitespace)
    const cleanRefreshToken = refreshToken.trim();
    console.log('🔍 [RefreshToken] Token length:', cleanRefreshToken.length);
    console.log('🔍 [RefreshToken] Token preview (first 50):', cleanRefreshToken.substring(0, 50));
    console.log('🔍 [RefreshToken] Token preview (last 20):', cleanRefreshToken.substring(-20));
    
    // Tạo axios instance mới để tránh circular call với interceptor
    const { default: axios } = await import('axios');
    const refreshApi = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      withCredentials: true,
    });
    
    console.log('🔍 [RefreshToken] Calling refresh API...');
    console.log('🔍 [RefreshToken] API URL:', process.env.NEXT_PUBLIC_API_URL);
    
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
