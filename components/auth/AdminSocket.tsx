"use client";

import { memo, useEffect } from 'react';
import { useWSHandler } from '@/hooks/useWSHandler';

export const AdminSocket = memo(function AdminSocket({
  onUserLogin,
  onUserLogout,
  onUserBlock,
  onUserBlocked,
}: {
  onUserLogin?: (userId: number, status: string, lastLogin: string) => void;
  onUserLogout?: (userId: number, status: string) => void;
  onUserBlock?: (userId: number, isBlock: boolean) => void;
  onUserBlocked?: (userId: number, message: string) => void;
}) {
  useWSHandler('user_login', (data: any) => {
    onUserLogin?.(data.userId, data.status, data.last_login);
  });
  
  useWSHandler('user_logout', (data: any) => {
    onUserLogout?.(data.userId, data.status);
  });
  
  useWSHandler('user_block', (data: any) => {
    onUserBlock?.(data.userId, data.isBlock);
  });

  useWSHandler('user_blocked', (data: any) => {
    onUserBlocked?.(data.userId, data.message);
  });
  
  return null;
});