"use client";

import { useEffect } from 'react';

export function LoginSocket({ userId, onBlocked }: { userId: number, onBlocked?: () => void }) {
  useEffect(() => {
    // Listen for user_blocked event (specific to this user)
    const handleUserBlocked = (event: CustomEvent) => {
      const { userId: blockedUserId, message } = event.detail;
      console.log('[LoginSocket] Received user_blocked:', { userId: blockedUserId, message });
      
      // Chỉ trigger nếu user hiện tại bị block
      if (blockedUserId === userId && onBlocked) {
        onBlocked();
      }
    };

    // Also listen for general user_block event (for UI consistency)
    const handleUserBlock = (event: CustomEvent) => {
      const { userId: blockedUserId, isBlock } = event.detail;
      console.log('[LoginSocket] Received user_block:', { userId: blockedUserId, isBlock });
      
      // Chỉ trigger nếu user hiện tại bị block
      if (blockedUserId === userId && isBlock && onBlocked) {
        onBlocked();
      }
    };

    window.addEventListener('ws_user_blocked', handleUserBlocked as EventListener);
    window.addEventListener('ws_user_block', handleUserBlock as EventListener);
    
    return () => {
      window.removeEventListener('ws_user_blocked', handleUserBlocked as EventListener);
      window.removeEventListener('ws_user_block', handleUserBlock as EventListener);
    };
  }, [userId, onBlocked]);

  return null;
}