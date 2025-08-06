'use client';

import { useState } from 'react';
import { refreshAccessToken } from '@/lib/refreshToken';
import { getAccessToken, getRefreshToken } from '@/lib/auth';

export default function RefreshTokenDebugger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testRefreshToken = async () => {
    setIsLoading(true);
    clearLogs();
    
    try {
      addLog('🧪 Starting refresh token test...');
      
      // Check current tokens
      const currentAccess = getAccessToken();
      const currentRefresh = getRefreshToken();
      
      addLog(`📋 Current access token: ${currentAccess ? 'FOUND' : 'NOT FOUND'}`);
      addLog(`📋 Current refresh token: ${currentRefresh ? 'FOUND' : 'NOT FOUND'}`);
      
      if (!currentRefresh) {
        addLog('❌ No refresh token available for testing');
        return;
      }
      
      // Test refresh
      addLog('🔄 Calling refreshAccessToken()...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        addLog('✅ Refresh successful!');
        addLog(`📄 New token length: ${newToken.length}`);
        
        // Verify token was set
        const verifyToken = getAccessToken();
        addLog(`🔍 Token verification: ${verifyToken ? 'FOUND' : 'NOT FOUND'}`);
        
        if (verifyToken) {
          addLog(`✅ Token successfully set in cookies`);
        } else {
          addLog(`❌ Token NOT found in cookies after setting`);
        }
      } else {
        addLog('❌ Refresh failed - no token returned');
      }
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCookies = () => {
    clearLogs();
    addLog('🍪 Checking current cookies...');
    
    // Manual cookie check
    const cookies = document.cookie.split(';');
    let foundAccess = false;
    let foundRefresh = false;
    
    cookies.forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name === 'access_token') {
        foundAccess = true;
        addLog(`📄 Access token: ${value ? value.substring(0, 50) + '...' : 'EMPTY'}`);
      }
      if (name === 'refresh_token') {
        foundRefresh = true;
        addLog(`🔄 Refresh token: ${value ? value.substring(0, 50) + '...' : 'EMPTY'}`);
      }
    });
    
    if (!foundAccess) addLog('❌ No access_token cookie found');
    if (!foundRefresh) addLog('❌ No refresh_token cookie found');
    
    // Test functions
    const accessFromFunc = getAccessToken();
    const refreshFromFunc = getRefreshToken();
    
    addLog(`🔍 getAccessToken(): ${accessFromFunc ? 'FOUND' : 'NOT FOUND'}`);
    addLog(`🔍 getRefreshToken(): ${refreshFromFunc ? 'FOUND' : 'NOT FOUND'}`);
  };

  const testDirectAPI = async () => {
    setIsLoading(true);
    clearLogs();
    
    try {
      addLog('🌐 Testing direct API call...');
      
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        addLog('❌ No refresh token for API test');
        return;
      }
      
      addLog('📤 Making API request...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      addLog(`📥 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog(`📊 Response keys: ${Object.keys(data).join(', ')}`);
        addLog(`✅ Has access_token: ${!!data.access_token}`);
        addLog(`✅ Has refresh_token: ${!!data.refresh_token}`);
        
        if (data.access_token) {
          addLog(`📏 Access token length: ${data.access_token.length}`);
        }
      } else {
        const errorText = await response.text();
        addLog(`❌ API Error: ${errorText}`);
      }
      
    } catch (error) {
      addLog(`❌ API Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🧪 Refresh Token Debugger</h2>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={checkCookies}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Check Cookies
        </button>
        
        <button
          onClick={testDirectAPI}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Direct API
        </button>
        
        <button
          onClick={testRefreshToken}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Refresh Function
        </button>
        
        <button
          onClick={clearLogs}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Clear Logs
        </button>
      </div>
      
      {isLoading && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 rounded">
          🔄 Testing in progress...
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded-lg h-96 overflow-y-auto">
        <h3 className="font-semibold mb-2">Debug Logs:</h3>
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs yet. Click a button to start testing.</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="font-mono text-sm">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
