"use client";

import { memo } from 'react';
import { useWSHandler } from '@/hooks/useWSHandler';

export const AdminSocket = memo(function AdminSocket({
  onUserLogin,
  onUserLogout,
  onUserBlock,
  onUserBlocked,
  onDebtLogUpdate,
  onDebtConfigCreate,
  onDebtConfigUpdate,
  onDebtUpdate,
  onCampaignUpdate,
  onCampaignInteractionLogUpdate,
  onCampaignScheduleUpdate,
}: {
  onUserLogin?: (userId: number, status: string, lastLogin: string) => void;
  onUserLogout?: (userId: number, status: string) => void;
  onUserBlock?: (userId: number, isBlock: boolean) => void;
  onUserBlocked?: (userId: number, message: string) => void;
  onDebtLogUpdate?: (data: any) => void;
  onDebtConfigCreate?: (data: any) => void;
  onDebtConfigUpdate?: (data: any) => void;
  onDebtUpdate?: (data: any) => void;
  onCampaignUpdate?: (data: any) => void;
  onCampaignInteractionLogUpdate?: (data: any) => void;
  onCampaignScheduleUpdate?: (data: any) => void;
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

  useWSHandler('debt_log_realtime_updated', (data: any) => {
    onDebtLogUpdate?.(data);
  });

  useWSHandler('debt_config_created', (data: any) => {
    onDebtConfigCreate?.(data);
  });

  useWSHandler('debt_config_realtime_updated', (data: any) => {
    onDebtConfigUpdate?.(data);
  });

  useWSHandler('debt_realtime_updated', (data: any) => {
    onDebtUpdate?.(data);
  });

  useWSHandler('campaign_realtime_updated', (data: any) => {
    onCampaignUpdate?.(data);
  });

  useWSHandler('campaign_interaction_log_realtime_updated', (data: any) => {
    onCampaignInteractionLogUpdate?.(data);
  });

  useWSHandler('campaign_schedule_realtime_updated', (data: any) => {
    onCampaignScheduleUpdate?.(data);
  });

  return null;
});