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
    
    // Tạo axios instance mới để tránh circular call với interceptor
    const { default: axios } = await import('axios');
    const refreshApi = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      withCredentials: true,
    });
    
    console.log('🔍 [RefreshToken] Calling refresh API...');
    console.log('🔍 [RefreshToken] API URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🔍 [RefreshToken] Token preview:', refreshToken.substring(0, 50) + '...');
    
    const res = await refreshApi.post('/auth/refresh', { refreshToken });
    
    console.log('✅ [RefreshToken] API call successful');
    console.log('🔍 [RefreshToken] Response status:', res.status);
    console.log('🔍 [RefreshToken] Response data keys:', Object.keys(res.data || {}));
    
    if (res.data?.access_token) {
      console.log('✅ [RefreshToken] New access token received, length:', res.data.access_token.length);
      console.log('🔍 [RefreshToken] Setting access token in cookies...');
      
      setAccessToken(res.data.access_token);
      
      // Verify token was set
      const verifyToken = getAccessToken();
      console.log('🔍 [RefreshToken] Access token verification:', verifyToken ? 'FOUND' : 'NOT FOUND');
      
      // Cập nhật refresh token mới nếu có
      if (res.data?.refresh_token) {
        console.log('✅ [RefreshToken] New refresh token received, updating...');
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
