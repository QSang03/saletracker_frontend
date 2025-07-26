"use client";

import { useEffect } from 'react';
import { useForceTokenRefresh } from '@/hooks/useForceTokenRefresh';
import { getAccessToken, getUserFromToken } from '@/lib/auth';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  const token = getAccessToken();
  const user = token ? getUserFromToken(token) : null;
  const { setCurrentUser } = useCurrentUser();

  const { socket } = useForceTokenRefresh({
    userId: user?.id,
    onRefreshSuccess: async () => {
      // Cập nhật user context sau khi refresh token thành công
      console.log('Token refresh successful, updating user context...');
      try {
        const newToken = getAccessToken();
        if (newToken) {
          const newUser = getUserFromToken(newToken);
          if (newUser) {
            // Fetch thông tin user mới nhất từ API
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
              {
                headers: {
                  Authorization: `Bearer ${newToken}`,
                  Accept: "application/json; charset=utf-8",
                },
              }
            );
            
            if (response.ok) {
              const userData = await response.json();
              setCurrentUser(userData);
              console.log('✅ [TokenRefreshProvider] User context updated successfully');
            }
          }
        }
      } catch (error) {
        console.error('❌ [TokenRefreshProvider] Failed to update user context:', error);
      }
    },
    onRefreshError: (error) => {
      console.error('Token refresh failed:', error);
    },
  });

  return <>{children}</>;
}
