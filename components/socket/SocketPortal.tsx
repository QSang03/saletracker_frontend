// components/SocketPortal.tsx - Simple version với AdminSocket
"use client";

import { useCallback } from "react";
import { AdminSocket } from "@/components/socket/AdminSocket";
import { ScheduleSocket } from "@/components/socket/ScheduleSocket";

export function SocketPortal() {
  const handleUserLogin = useCallback(
    (userId: number, status: string, lastLogin: string) => {
      window.dispatchEvent(
        new CustomEvent("ws_user_login", {
          detail: { userId, status, lastLogin },
        })
      );
    },
    []
  );

  const handleUserLogout = useCallback((userId: number, status: string) => {
    window.dispatchEvent(
      new CustomEvent("ws_user_logout", {
        detail: { userId, status },
      })
    );
  }, []);

  const handleUserBlock = useCallback((userId: number, isBlock: boolean) => {
    window.dispatchEvent(
      new CustomEvent("ws_user_block", {
        detail: { userId, isBlock },
      })
    );
  }, []);

  const handleUserBlocked = useCallback((userId: number, message: string) => {
    window.dispatchEvent(
      new CustomEvent("ws_user_blocked", {
        detail: { userId, message },
      })
    );
  }, []);

  const handleDebtLogUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_debt_log_realtime_updated", { detail: data })
    );
  }, []);

  const handleDebtConfigCreate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_debt_config_realtime_created", { detail: data })
    );
  }, []);

  const handleDebtConfigUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_debt_config_realtime_updated", { detail: data })
    );
  }, []);

  const handleDebtRealtimeUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_debt_realtime_updated", { detail: data })
    );
  }, []);

  // New handlers
  const handleCampaignUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_campaign_realtime_updated", { detail: data })
    );
  }, []);

  const handleCampaignInteractionLogUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_campaign_interaction_log_realtime_updated", { detail: data })
    );
  }, []);

  const handleCampaignScheduleRealtimeUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_campaign_schedule_realtime_updated", { detail: data })
    );
  }, []);

  // Schedule collaboration handlers
  const handleSchedulePresenceUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_schedule_presence_update", { detail: data })
    );
  }, []);

  const handleScheduleEditStart = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_schedule_edit_start", { detail: data })
    );
  }, []);

  const handleScheduleEditRenew = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_schedule_edit_renew", { detail: data })
    );
  }, []);

  const handleScheduleEditStop = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_schedule_edit_stop", { detail: data })
    );
  }, []);

  const handleSchedulePreviewPatch = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_schedule_preview_patch", { detail: data })
    );
  }, []);

  const handleScheduleConflictDetected = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_schedule_conflict_detected", { detail: data })
    );
  }, []);

  const handleScheduleVersionUpdate = useCallback((data: any) => {
    window.dispatchEvent(
      new CustomEvent("ws_schedule_version_update", { detail: data })
    );
  }, []);

  return (
    <>
      <AdminSocket
        onUserLogin={handleUserLogin}
        onUserLogout={handleUserLogout}
        onUserBlock={handleUserBlock}
        onUserBlocked={handleUserBlocked}
        onDebtLogUpdate={handleDebtLogUpdate}
        onDebtConfigCreate={handleDebtConfigCreate}
        onDebtConfigUpdate={handleDebtConfigUpdate}
        onDebtUpdate={handleDebtRealtimeUpdate}
        onCampaignUpdate={handleCampaignUpdate}
        onCampaignInteractionLogUpdate={handleCampaignInteractionLogUpdate}
        onCampaignScheduleUpdate={handleCampaignScheduleRealtimeUpdate}
      />
      <ScheduleSocket
        onPresenceUpdate={handleSchedulePresenceUpdate}
        onEditStart={handleScheduleEditStart}
        onEditRenew={handleScheduleEditRenew}
        onEditStop={handleScheduleEditStop}
        onPreviewPatch={handleSchedulePreviewPatch}
        onConflictDetected={handleScheduleConflictDetected}
        onVersionUpdate={handleScheduleVersionUpdate}
      />
    </>
  );
}
