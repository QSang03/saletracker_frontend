import { getAccessToken } from './auth';

// Debug authentication
export function debugAuth() {
  console.log('=== DEBUG AUTH ===');
  
  // Check if we're in browser
  if (typeof document === 'undefined') {
    console.log('Running on server side');
    return;
  }
  
  // Check all cookies
  console.log('All cookies:', document.cookie);
  
  // Check access token specifically
  const token = getAccessToken();
  console.log('Access token:', token ? 'EXISTS' : 'MISSING');
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      console.log('Token expiry:', new Date(payload.exp * 1000));
      console.log('Token valid:', payload.exp > Date.now() / 1000);
      console.log('User roles:', payload.roles);
    } catch (err) {
      console.error('Token decode error:', err);
    }
  }
  
  console.log('=== END DEBUG ===');
}
