"use client";

import { useEffect } from 'react';
import { useForceTokenRefresh } from '@/hooks/useForceTokenRefresh';
import { getAccessToken, getUserFromToken } from '@/lib/auth';

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  const token = getAccessToken();
  const user = token ? getUserFromToken(token) : null;

  const { socket } = useForceTokenRefresh({
    userId: user?.id,
    onRefreshSuccess: () => {
      // Có thể reload lại trang hoặc update context nếu cần
      console.log('Token refresh successful, updating user context...');
    },
    onRefreshError: (error) => {
      console.error('Token refresh failed:', error);
    },
  });

  return <>{children}</>;
}
