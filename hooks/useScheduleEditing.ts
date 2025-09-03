import { useEffect, useState, useCallback } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

interface EditingUser {
  userId: string;
  userName: string;
  cellId: string;
  startedAt: Date;
}

export const useScheduleEditing = () => {
  const { subscribe, unsubscribe, emit, isConnected } = useWebSocketContext();
  const [editingUsers, setEditingUsers] = useState<EditingUser[]>([]);
  const [myEditingCell, setMyEditingCell] = useState<string | null>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      return localStorage.getItem('schedule:editing-cell');
    }
    return null;
  });

  // Auto-join campaign schedule when connected
  useEffect(() => {
    if (isConnected) {
      console.log('[useScheduleEditing] Auto-joining campaign schedule');
      emit('campaign:schedule:join', { userName: 'Current User' });
    }
  }, [isConnected, emit]);

  // Force join when component mounts (for page reloads)
  useEffect(() => {
    if (isConnected) {
      console.log('[useScheduleEditing] Force joining campaign schedule on mount');
      emit('campaign:schedule:join', { userName: 'Current User' });
    }
  }, [isConnected, emit]);

  // Start editing a cell
  const startEditing = useCallback((cellId: string) => {
    if (!isConnected) return;
    
    emit('schedule:edit:start', { cellId });
    setMyEditingCell(cellId);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('schedule:editing-cell', cellId);
    }
  }, [isConnected, emit]);

  // Stop editing a cell
  const stopEditing = useCallback((cellId: string) => {
    if (!isConnected) return;
    
    emit('schedule:edit:stop', { cellId });
    setMyEditingCell(null);
    
    // Remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('schedule:editing-cell');
    }
  }, [isConnected, emit]);

  // Get current editing users
  const getEditingUsers = useCallback(() => {
    if (!isConnected) return;
    
    emit('schedule:get-editing-users', {});
  }, [isConnected, emit]);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to current editing users list
    const handleCurrentEditingUsers = (users: EditingUser[]) => {
      setEditingUsers(users);
    };

    // Subscribe to edit start
    const handleEditStart = (data: { userId: string; userName: string; cellId: string }) => {
      setEditingUsers(prev => [...prev, {
        userId: data.userId,
        userName: data.userName,
        cellId: data.cellId,
        startedAt: new Date()
      }]);
    };

    // Subscribe to edit stop
    const handleEditStop = (data: { userId: string; cellId: string }) => {
      setEditingUsers(prev => prev.filter(user => user.userId !== data.userId));
    };

    subscribe('schedule:current-editing-users', handleCurrentEditingUsers);
    subscribe('schedule:edit:start', handleEditStart);
    subscribe('schedule:edit:stop', handleEditStop);

    return () => {
      unsubscribe('schedule:current-editing-users', handleCurrentEditingUsers);
      unsubscribe('schedule:edit:start', handleEditStart);
      unsubscribe('schedule:edit:stop', handleEditStop);
    };
  }, [isConnected, subscribe, unsubscribe]);

  // Auto-get editing users when connected
  useEffect(() => {
    if (isConnected) {
      getEditingUsers();
      
      // If user was editing before disconnect, restore editing state
      if (myEditingCell) {
        console.log('[useScheduleEditing] Restoring editing state for cell:', myEditingCell);
        // First join campaign schedule, then restore editing state
        emit('campaign:schedule:join', { userName: 'Current User' });
        setTimeout(() => {
          emit('schedule:restore-editing-state', { cellId: myEditingCell });
        }, 100);
      }

    }
  }, [isConnected, getEditingUsers, myEditingCell, emit]);

  // Auto-restore editing state when localStorage changes
  useEffect(() => {
    if (isConnected && myEditingCell) {
      console.log('[useScheduleEditing] Auto-restoring editing state from localStorage:', myEditingCell);
      // Ensure we're in campaign schedule before restoring
      emit('campaign:schedule:join', { userName: 'Current User' });
      setTimeout(() => {
        emit('schedule:restore-editing-state', { cellId: myEditingCell });
      }, 200);
    }
  }, [isConnected, myEditingCell, emit]);

  // Force restore editing state (for debugging)
  const forceRestoreEditing = useCallback(() => {
    if (isConnected && myEditingCell) {
      console.log('[useScheduleEditing] Force restoring editing state for cell:', myEditingCell);
      // First join campaign schedule, then restore editing state
      emit('campaign:schedule:join', { userName: 'Current User' });
      setTimeout(() => {
        emit('schedule:restore-editing-state', { cellId: myEditingCell });
      }, 100);
    }
  }, [isConnected, myEditingCell, emit]);

  // Force join campaign schedule and restore editing state
  const forceJoinAndRestore = useCallback(() => {
    if (isConnected) {
      console.log('[useScheduleEditing] Force joining campaign schedule and restoring editing state');
      emit('campaign:schedule:join', { userName: 'Current User' });
      if (myEditingCell) {
        setTimeout(() => {
          emit('schedule:restore-editing-state', { cellId: myEditingCell });
        }, 200);
      }
    }
  }, [isConnected, myEditingCell, emit]);

  // Force refresh editing users list
  const forceRefreshEditingUsers = useCallback(() => {
    if (isConnected) {
      console.log('[useScheduleEditing] Force refreshing editing users list');
      emit('campaign:schedule:join', { userName: 'Current User' });
      setTimeout(() => {
        getEditingUsers();
      }, 100);
    }
  }, [isConnected, emit, getEditingUsers]);

  return {
    editingUsers,
    myEditingCell,
    startEditing,
    stopEditing,
    getEditingUsers,
    forceRestoreEditing,
    forceJoinAndRestore,
    forceRefreshEditingUsers,
  };
};

