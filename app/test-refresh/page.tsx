'use client';

import { useState } from 'react';
import { refreshAccessToken } from '@/lib/refreshToken';
import { getAccessToken, getRefreshToken } from '@/lib/auth';

export default function TestRefreshPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testRefresh = async () => {
    setLoading(true);
    setResult('');
    
    try {
      console.log('🔍 [TestPage] Starting refresh token test...');
      
      // Check current tokens
      const currentAccess = getAccessToken();
      const currentRefresh = getRefreshToken();
      
      console.log('🔍 [TestPage] Current tokens:', {
        hasAccess: !!currentAccess,
        hasRefresh: !!currentRefresh,
        accessPrefix: currentAccess?.substring(0, 20) + '...',
        refreshPrefix: currentRefresh?.substring(0, 20) + '...'
      });

      // Test refresh
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        setResult('✅ Refresh successful! New token received.');
        console.log('✅ [TestPage] Refresh successful');
      } else {
        setResult('❌ Refresh failed - no new token received');
        console.log('❌ [TestPage] Refresh failed');
      }
      
    } catch (error) {
      const errorMsg = `❌ Refresh error: ${error}`;
      setResult(errorMsg);
      console.error('❌ [TestPage] Refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTokens = () => {
    const access = getAccessToken();
    const refresh = getRefreshToken();
    
    const info = `
Access Token: ${access ? 'YES' : 'NO'} ${access ? `(${access.substring(0, 50)}...)` : ''}
Refresh Token: ${refresh ? 'YES' : 'NO'} ${refresh ? `(${refresh.substring(0, 50)}...)` : ''}
    `;
    
    setResult(info);
    console.log('🔍 [TestPage] Token check:', { access: !!access, refresh: !!refresh });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Refresh Token</h1>
      
      <div className="space-y-4">
        <button
          onClick={checkTokens}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check Current Tokens
        </button>
        
        <button
          onClick={testRefresh}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test Refresh Token'}
        </button>
      </div>
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-yellow-50 rounded">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Đăng nhập vào ứng dụng trước (để có tokens)</li>
          <li>Mở Developer Tools (F12) và xem Console tab</li>
          <li>Click "Check Current Tokens" để xem tokens hiện tại</li>
          <li>Click "Test Refresh Token" để test refresh</li>
          <li>Xem logs chi tiết trong Console</li>
        </ol>
      </div>
    </div>
  );
}
