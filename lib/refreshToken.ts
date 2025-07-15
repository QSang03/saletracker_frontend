import { setAccessToken, getRefreshToken, setRefreshToken, clearAllTokens } from './auth';

export async function refreshAccessToken(): Promise<string | null> {
  try {
    if (typeof document === 'undefined') return null;
    
    const refreshToken = getRefreshToken();
    console.log('🔍 [RefreshToken] Found refresh token:', refreshToken ? 'YES' : 'NO');
    console.log('🔍 [RefreshToken] Token value:', refreshToken?.substring(0, 50) + '...');
    
    if (!refreshToken) {
      console.warn('No refresh token found in cookies');
      return null;
    }
    
    // Tạo axios instance mới để tránh circular call với interceptor
    const { default: axios } = await import('axios');
    const refreshApi = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      withCredentials: true,
    });
    
    console.log('🔍 [RefreshToken] Calling refresh API with data:', { refreshToken: refreshToken?.substring(0, 50) + '...' });
    
    const res = await refreshApi.post('/auth/refresh', { refreshToken });
    if (res.data?.access_token) {
      console.log('✅ [RefreshToken] New access token received');
      setAccessToken(res.data.access_token);
      // Cập nhật refresh token mới nếu có
      if (res.data?.refresh_token) {
        console.log('✅ [RefreshToken] New refresh token received');
        setRefreshToken(res.data.refresh_token);
      }
      return res.data.access_token;
    }
    return null;
  } catch (e) {
    console.error('❌ [RefreshToken] Refresh token failed:', e);
    console.error('❌ [RefreshToken] Error details:', {
      status: (e as any)?.response?.status,
      data: (e as any)?.response?.data,
      message: (e as any)?.message
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
