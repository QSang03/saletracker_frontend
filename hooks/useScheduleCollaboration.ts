// hooks/useScheduleCollaboration.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { 
  SchedulePresence, 
  ScheduleEditSession, 
  SchedulePreviewPatch,
  ScheduleConflict,
  ScheduleVersion 
} from '@/types/schedule';
import { usePermission } from '@/hooks/usePermission';

// Utility function to fix encoding issues - DISABLED
const fixEncoding = (text: string): string => {
  // Bỏ fixEncoding để không làm hỏng data
  return text;
};

export const useScheduleCollaboration = (roomId: string) => {
  const { user } = usePermission();
  const { isConnected, subscribe, unsubscribe, emit } = useWebSocketContext();
  
  // State management
  const [presences, setPresences] = useState<Map<number, SchedulePresence>>(new Map());
  const [editSessions, setEditSessions] = useState<Map<string, ScheduleEditSession>>(new Map());
  const [previewPatches, setPreviewPatches] = useState<Map<string, SchedulePreviewPatch>>(new Map());
  const [conflicts, setConflicts] = useState<Map<string, ScheduleConflict>>(new Map());
  const [versions, setVersions] = useState<Map<string, ScheduleVersion>>(new Map());
  
  // Cell selections state
  const [cellSelections, setCellSelections] = useState<Map<number, any>>(new Map());
  
  // Refs for cleanup
  const presenceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editRenewalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup presences older than 30 seconds
  const cleanupOldPresences = useCallback(() => {
    const now = new Date();
    setPresences(prev => {
      const newPresences = new Map(prev);
      for (const [userId, presence] of newPresences) {
        const lastSeen = new Date(presence.lastSeen);
        if (now.getTime() - lastSeen.getTime() > 30000) {
          newPresences.delete(userId);
        }
      }
      return newPresences;
    });
  }, []);

  // Cleanup expired edit sessions
  const cleanupExpiredSessions = useCallback(() => {
    const now = new Date();
    setEditSessions(prev => {
      const newSessions = new Map(prev);
      for (const [fieldId, session] of newSessions) {
        const expiresAt = new Date(session.expiresAt);
        if (now.getTime() > expiresAt.getTime()) {
          newSessions.delete(fieldId);
        }
      }
      return newSessions;
    });
  }, []);

  // Update presence (local state only)
  const updatePresence = useCallback((data: SchedulePresence) => {
    setPresences(prev => {
      const newPresences = new Map(prev);
      newPresences.set(data.userId, data);
      return newPresences;
    });
  }, []);

  // Send presence update to WebSocket
  const sendPresence = useCallback((data: SchedulePresence) => {
    if (isConnected) {
      emit('schedule:presence:update', data);
    }
  }, [isConnected, emit]);

  // Start edit session
  const startEditSession = useCallback((fieldId: string, fieldType: 'calendar_cell' | 'form_field', coordinates?: any) => {
    if (!user || !isConnected) return false;

    const session: ScheduleEditSession = {
      userId: user.id,
      userName: fixEncoding(user.fullName || user.nickName || user.username || 'Unknown'),
      departmentId: user.departments?.[0]?.id || 0,
      avatar_zalo: user.avatarZalo, // ✅ THÊM: Avatar Zalo của user
      fieldId,
      fieldType,
      coordinates,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds TTL
      isRenewed: false,
    };

    // Emit edit start event
    emit('schedule:edit:start', session);
    
    // Update local state
    setEditSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.set(fieldId, session);
      return newSessions;
    });

    return true;
  }, [user, isConnected, emit]);

  // Renew edit session
  const renewEditSession = useCallback((fieldId: string) => {
    const session = editSessions.get(fieldId);
    if (!session || session.userId !== user?.id) return false;

    const renewedSession: ScheduleEditSession = {
      ...session,
      expiresAt: new Date(Date.now() + 30000).toISOString(),
      isRenewed: true,
    };

    // Emit renew event
    emit('schedule:edit:renew', {
      userId: user.id,
      fieldId,
      expiresAt: renewedSession.expiresAt,
    });

    // Update local state
    setEditSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.set(fieldId, renewedSession);
      return newSessions;
    });

    return true;
  }, [editSessions, user, emit]);

  // Stop edit session
  const stopEditSession = useCallback((fieldId: string) => {
    const session = editSessions.get(fieldId);
    if (!session || session.userId !== user?.id) return;

    // Emit stop event
    emit('schedule:edit:stop', {
      userId: user.id,
      fieldId,
    });

    // Remove from local state
    setEditSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.delete(fieldId);
      return newSessions;
    });
  }, [editSessions, user, emit]);

  // Send preview patch
  const sendPreviewPatch = useCallback((fieldId: string, content: string, selection?: { start: number; end: number }) => {
    if (!user || !isConnected) return;

    // Clear previous debounce timeout
    if (previewDebounceTimeoutRef.current) {
      clearTimeout(previewDebounceTimeoutRef.current);
    }

    // Debounce preview updates
    previewDebounceTimeoutRef.current = setTimeout(() => {
      const patch: SchedulePreviewPatch = {
        userId: user.id,
        userName: fixEncoding(user.fullName || user.nickName || user.username || 'Unknown'),
        departmentId: user.departments?.[0]?.id || 0,
        avatar_zalo: user.avatarZalo, // ✅ THÊM: Avatar Zalo của user
        fieldId,
        content,
        selection,
        timestamp: new Date().toISOString(),
      };

      // Emit preview patch
      emit('schedule:preview:patch', patch);
    }, 100); // 100ms debounce
  }, [user, isConnected, emit]);

  // Update version
  const updateVersion = useCallback((scheduleId: string, version: number, changes: Array<{ field: string; oldValue: any; newValue: any }>) => {
    if (!user || !isConnected) return;

    const versionUpdate: ScheduleVersion = {
      scheduleId,
      version,
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
      changes,
    };

    // Emit version update
    emit('schedule:version:update', versionUpdate);
  }, [user, isConnected, emit]);

  // Cell selections management
  const sendCellSelections = useCallback((selections: any) => {
    if (!user?.id || !roomId || !isConnected) return;
    emit('schedule:cell:selections:update', {
      roomId,
      userId: user.id,
      selections, // { departmentSelections, selectedDepartment, activeView }
    });
    console.log('[CellSel] UPDATE => roomId=', roomId, 'userId=', user.id);
  }, [user?.id, roomId, isConnected, emit]);

  // REMOVED: clearCellSelections - không cần thiết, chỉ dùng clearMySelections

  // Clear only current user's selections by calling clear event
  const clearMySelections = useCallback((reason: 'explicit'|'leave'|'hidden'|'inactivity' = 'explicit', editingCells?: string[]) => {
    if (!user?.id || !roomId || !isConnected) return;
    console.log('[CellSel] CLEAR self, reason=', reason, 'cells=', editingCells);
    emit('schedule:cell:selections:clear', { roomId, userId: user.id, reason, editingCells });
  }, [user?.id, roomId, isConnected, emit]);

  const getCellSelections = useCallback(() => {
    if (!roomId || !isConnected) return;
    emit('schedule:cell:selections:get', { roomId });
    console.log('[CellSel] GET => roomId=', roomId);
  }, [roomId, isConnected, emit]);

  const pingCellSelections = useCallback(() => {
    if (!isConnected || !roomId) return;
    emit('schedule:cell:selections:ping', { roomId });
  }, [isConnected, emit, roomId]);

  // Event listeners
  useEffect(() => {
    // Listen for WebSocket events using subscribe pattern
    const handlePresenceUpdate = (data: any) => {
      console.log('[ScheduleCollaboration] Received presence update:', data);
      
      // Fix encoding issue - decode if needed
      data.userName = fixEncoding(data.userName);
      console.log('[ScheduleCollaboration] After fixEncoding userName:', data.userName);
      
      if (data.userId !== user?.id) { // Ignore own events
        console.log('[ScheduleCollaboration] Updating presence for user:', data.userId);
        updatePresence(data);
        

      }
    };

    const handleEditStart = (data: any) => {
      if (data.userId !== user?.id) { // Ignore own events
        const { userId, fieldId, ...sessionData } = data;
        setEditSessions(prev => {
          const newSessions = new Map(prev);
          newSessions.set(fieldId, {
            ...sessionData,
            userId,
            fieldId,
            startedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30000).toISOString(),
            isRenewed: false,
          });
          return newSessions;
        });
      }
    };

    const handleEditRenew = (event: CustomEvent) => {
      const { userId, fieldId, expiresAt } = event.detail;
      if (userId === user?.id) return; // Ignore own events
      
      setEditSessions(prev => {
        const newSessions = new Map(prev);
        const session = newSessions.get(fieldId);
        if (session) {
          newSessions.set(fieldId, {
            ...session,
            expiresAt,
            isRenewed: true,
          });
        }
        return newSessions;
      });
    };

    const handleEditStop = (event: CustomEvent) => {
      const { userId, fieldId } = event.detail;
      if (userId === user?.id) return; // Ignore own events
      
      setEditSessions(prev => {
        const newSessions = new Map(prev);
        newSessions.delete(fieldId);
        return newSessions;
      });
    };

    const handlePreviewPatch = (event: CustomEvent) => {
      const { userId, fieldId, ...data } = event.detail;
      if (userId === user?.id) return; // Ignore own events
      
      setPreviewPatches(prev => {
        const newPatches = new Map(prev);
        newPatches.set(fieldId, { ...data, userId, fieldId });
        return newPatches;
      });
    };

    const handleConflictDetected = (event: CustomEvent) => {
      const { scheduleId, ...data } = event.detail;
      setConflicts(prev => {
        const newConflicts = new Map(prev);
        newConflicts.set(scheduleId, { ...data, scheduleId });
        return newConflicts;
      });
    };

    const handleVersionUpdate = (event: CustomEvent) => {
      const { scheduleId, ...data } = event.detail;
      setVersions(prev => {
        const newVersions = new Map(prev);
        newVersions.set(scheduleId, { ...data, scheduleId });
        return newVersions;
      });
    };

    const handleCellSelectionsUpdate = (data: any) => {
      if (data?.roomId && data.roomId !== roomId) return;
      if (data.userId === user?.id) return; // Ignore own events
      
      setCellSelections(prev => {
        const newSelections = new Map(prev);
        newSelections.set(data.userId, data);
        return newSelections;
      });
    };

    const handleCellSelectionsClear = (data: any) => {
      if (data?.roomId && data.roomId !== roomId) return;
      // Không ignore own events nữa - để user cũng nhận được event clear của chính mình
      
      setCellSelections(prev => {
        const newSelections = new Map(prev);
        newSelections.delete(data.userId);
        return newSelections;
      });
      
      // Clear edit sessions for the user who left
      setEditSessions(prev => {
        const newSessions = new Map(prev);
        for (const [fieldId, session] of newSessions) {
          if (session.userId === data.userId) {
            newSessions.delete(fieldId);
          }
        }
        return newSessions;
      });
      
      // Force refresh selections for all users to ensure consistency
      // Delay để tránh conflict với getCellSelections từ join
      setTimeout(() => {
        getCellSelections();
      }, 200); // Tăng delay để tránh conflict
    };

    const handleCellSelectionsCurrent = (data: any) => {
      if (data?.roomId && data.roomId !== roomId) return;
      const list = Array.isArray(data?.entries) ? data.entries
               : Array.isArray(data?.selections) ? data.selections
               : [];
      console.log('[CellSel] CURRENT <= roomId=', roomId, 'entries=', list.length);
      setCellSelections(prev => {
        // Merge with existing selections to prevent clearing other users' data
        const m = new Map(prev);
        for (const item of list) {
          if (!item) continue;
          const uid = Number(item.userId ?? item.selections?.userId);
          const sel = item.selections ?? item;
          if (Number.isFinite(uid) && sel) m.set(uid, sel);
        }
        return m;
      });
    };

    // Subscribe to WebSocket events
    subscribe('schedule:presence:update', handlePresenceUpdate);
    subscribe('schedule:edit:start', handleEditStart);
    subscribe('schedule:cell:selections:update', handleCellSelectionsUpdate);
    subscribe('schedule:cell:selections:clear', handleCellSelectionsClear);
    subscribe('schedule:cell:selections:current', handleCellSelectionsCurrent);

    // Cleanup intervals
    presenceUpdateTimeoutRef.current = setInterval(cleanupOldPresences, 10000); // Every 10 seconds
    editRenewalIntervalRef.current = setInterval(cleanupExpiredSessions, 5000); // Every 5 seconds

    return () => {
      // Unsubscribe from WebSocket events
      unsubscribe('schedule:presence:update', handlePresenceUpdate);
      unsubscribe('schedule:edit:start', handleEditStart);
      unsubscribe('schedule:cell:selections:update', handleCellSelectionsUpdate);
      unsubscribe('schedule:cell:selections:clear', handleCellSelectionsClear);
      unsubscribe('schedule:cell:selections:current', handleCellSelectionsCurrent);
      
      // Remove event listeners
      window.removeEventListener('ws_schedule_edit_renew', handleEditRenew as EventListener);
      window.removeEventListener('ws_schedule_edit_stop', handleEditStop as EventListener);
      window.removeEventListener('ws_schedule_preview_patch', handlePreviewPatch as EventListener);
      window.removeEventListener('ws_schedule_conflict_detected', handleConflictDetected as EventListener);
      window.removeEventListener('ws_schedule_version_update', handleVersionUpdate as EventListener);

      // Clear intervals
      if (presenceUpdateTimeoutRef.current) {
        clearInterval(presenceUpdateTimeoutRef.current);
      }
      if (editRenewalIntervalRef.current) {
        clearInterval(editRenewalIntervalRef.current);
      }
      if (previewDebounceTimeoutRef.current) {
        clearTimeout(previewDebounceTimeoutRef.current);
      }
    };
  }, [user, updatePresence, cleanupOldPresences, cleanupExpiredSessions, subscribe, unsubscribe]);

  // Auto-renew active edit sessions
  useEffect(() => {
    const renewActiveSessions = () => {
      for (const [fieldId, session] of editSessions) {
        if (session.userId === user?.id && !session.isRenewed) {
          renewEditSession(fieldId);
        }
      }
    };

    const renewalInterval = setInterval(renewActiveSessions, 25000); // Renew every 25 seconds

    return () => clearInterval(renewalInterval);
  }, [editSessions, user, renewEditSession]);

  // Load initial cell selections when connected
  useEffect(() => {
    if (!isConnected || !user || !roomId) return;
    
    // Join room và get current selections
    emit('schedule:cell:selections:join', { roomId, userId: user.id });
    getCellSelections();
    
    // Clear any existing edit sessions for this user
    setEditSessions(prev => {
      const newSessions = new Map(prev);
      for (const [fieldId, session] of newSessions) {
        if (session.userId === user.id) {
          newSessions.delete(fieldId);
        }
      }
      return newSessions;
    });
    
    // Tự động gửi lệnh xóa để kiểm tra và xóa các ô mà user này đang chọn (nếu có)
    // Delay để đảm bảo getCellSelections hoàn thành trước
    setTimeout(() => {
      console.log('[CellSel] JOIN: Auto-clear for user', user.id, 'on page reload');
      clearMySelections('leave', []); // Gửi lệnh xóa với editingCells rỗng
    }, 100);
  }, [isConnected, user, getCellSelections, emit, roomId, clearMySelections]);

  // Thêm effect visibilitychange chuẩn (không clear khi visible)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        // TẠM THỜI COMMENT OUT để test
        // setTimeout(() => {
        //   if (document.visibilityState === 'hidden') {
        //     clearMySelections('hidden');
        //   }
        // }, 1000);
      } else if (document.visibilityState === 'visible') {
        getCellSelections();                 // quay lại thì GET, không clear
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [clearMySelections, getCellSelections]);

  return {
    // State
    presences,
    editSessions,
    previewPatches,
    conflicts,
    versions,
    cellSelections,
    
    // Actions
    updatePresence,
    sendPresence,
    startEditSession,
    renewEditSession,
    stopEditSession,
    sendPreviewPatch,
    updateVersion,
    sendCellSelections,
    clearMySelections,
    getCellSelections,
    pingCellSelections,
    
    // Utilities
    isFieldLocked: (fieldId: string) => {
      const session = editSessions.get(fieldId);
      return session && session.userId !== user?.id;
    },
    
    getFieldLockedBy: (fieldId: string) => {
      const session = editSessions.get(fieldId);
      return session && session.userId !== user?.id ? session : null;
    },
    
    getPresenceByUserId: (userId: number) => presences.get(userId),
    
    getPreviewPatchForField: (fieldId: string) => previewPatches.get(fieldId),
    
    getConflictForSchedule: (scheduleId: string) => conflicts.get(scheduleId),
    
    getVersionForSchedule: (scheduleId: string) => versions.get(scheduleId),
  };
};
