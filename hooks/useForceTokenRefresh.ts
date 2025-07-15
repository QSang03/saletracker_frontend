import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/refreshToken';
import { toast } from 'sonner';

interface UseForceTokenRefreshOptions {
  userId?: number;
  onRefreshSuccess?: () => void;
  onRefreshError?: (error: any) => void;
}

export function useForceTokenRefresh(options: UseForceTokenRefreshOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const { userId, onRefreshSuccess, onRefreshError } = options;

  useEffect(() => {
    if (!userId) return;

    const token = getAccessToken();
    if (!token) return;

    // Kết nối socket với auth
    const socket = io(process.env.NEXT_PUBLIC_API_URL || '', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Join room của user cụ thể
    socket.emit('join-user-room', userId);

    // Lắng nghe event force refresh token
    socket.on('force_token_refresh', async (data) => {
      console.log('🔄 [Force Token Refresh] Received request:', data);
      
      if (data.userId === userId && data.reason === 'zalo_link_error') {
        // Hiển thị thông báo cho user
        toast.warning('Cần làm mới phiên đăng nhập', {
          description: data.message || 'Phiên đăng nhập cần được làm mới do lỗi liên kết Zalo',
          duration: 5000,
        });

        try {
          // Thực hiện refresh token
          const newToken = await refreshAccessToken();
          
          if (newToken) {
            console.log('✅ [Force Token Refresh] Token refreshed successfully');
            toast.success('Phiên đăng nhập đã được làm mới thành công');
            onRefreshSuccess?.();
          } else {
            throw new Error('Failed to refresh token');
          }
        } catch (error) {
          console.error('❌ [Force Token Refresh] Failed to refresh token:', error);
          toast.error('Không thể làm mới phiên đăng nhập', {
            description: 'Vui lòng đăng nhập lại',
          });
          onRefreshError?.(error);
          
          // Redirect về login sau 3 giây
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        }
      }
    });

    // Cleanup
    return () => {
      socket.off('force_token_refresh');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, onRefreshSuccess, onRefreshError]);

  return {
    socket: socketRef.current,
  };
}
