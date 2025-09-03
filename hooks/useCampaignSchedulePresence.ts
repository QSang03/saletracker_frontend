import { useEffect, useState, useCallback } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

interface CampaignScheduleUser {
  userId: string;
  userName: string;
  joinedAt: Date;
}

export const useCampaignSchedulePresence = () => {
  const { subscribe, unsubscribe, emit, isConnected } = useWebSocketContext();
  const { user } = useContext(AuthContext);
  const [currentUsers, setCurrentUsers] = useState<CampaignScheduleUser[]>([]);
  const [isJoined, setIsJoined] = useState(false);

  // Join campaign schedule page
  const joinPage = useCallback(() => {
    if (!user?.fullName || !isConnected) return;
    
    emit('campaign:schedule:join', { userName: user.fullName });
    setIsJoined(true);
  }, [user?.fullName, isConnected, emit]);

  // Leave campaign schedule page
  const leavePage = useCallback(() => {
    if (!isConnected) return;
    
    emit('campaign:schedule:leave', {});
    setIsJoined(false);
    setCurrentUsers([]);
  }, [isConnected, emit]);

  // Get current users
  const getCurrentUsers = useCallback(() => {
    if (!isConnected) return;
    
    emit('campaign:schedule:get-users', {});
  }, [isConnected, emit]);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to current users list
    const handleCurrentUsers = (users: CampaignScheduleUser[]) => {
      setCurrentUsers(users);
    };

    // Subscribe to user joined
    const handleUserJoined = (user: CampaignScheduleUser) => {
      setCurrentUsers(prev => [...prev, user]);
    };

    // Subscribe to user left
    const handleUserLeft = (data: { userId: string; userName: string }) => {
      setCurrentUsers(prev => prev.filter(user => user.userId !== data.userId));
    };

    subscribe('campaign:schedule:current-users', handleCurrentUsers);
    subscribe('campaign:schedule:user-joined', handleUserJoined);
    subscribe('campaign:schedule:user-left', handleUserLeft);

    return () => {
      unsubscribe('campaign:schedule:current-users', handleCurrentUsers);
      unsubscribe('campaign:schedule:user-joined', handleUserJoined);
      unsubscribe('campaign:schedule:user-left', handleUserLeft);
    };
  }, [isConnected, subscribe, unsubscribe]);

  // Auto-join when connected
  useEffect(() => {
    if (isConnected && user?.fullName) {
      // Always join when connected, regardless of isJoined state
      // This handles reconnection after reload
      joinPage();
    }
  }, [isConnected, user?.fullName, joinPage]);

  // Auto-leave when disconnected
  useEffect(() => {
    if (!isConnected && isJoined) {
      setIsJoined(false);
      setCurrentUsers([]);
    }
  }, [isConnected, isJoined]);

  // Handle page visibility changes (tab switching, minimize, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (user switched tab or minimized)
        if (isJoined) {
          leavePage();
        }
      } else {
        // Page is visible again
        if (isConnected && user?.fullName && !isJoined) {
          joinPage();
        }
      }
    };

    const handleBeforeUnload = () => {
      // User is about to leave the page (reload, close tab, etc.)
      if (isJoined) {
        leavePage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isConnected, user?.fullName, isJoined, joinPage, leavePage]);

  return {
    currentUsers,
    isJoined,
    joinPage,
    leavePage,
    getCurrentUsers,
  };
};
