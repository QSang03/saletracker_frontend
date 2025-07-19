// components/SocketPortal.tsx - Simple version với AdminSocket
"use client";

import { useCallback } from "react";
import { AdminSocket } from "@/components/socket/AdminSocket";

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

  return (
    <AdminSocket
      onUserLogin={handleUserLogin}
      onUserLogout={handleUserLogout}
      onUserBlock={handleUserBlock}
      onUserBlocked={handleUserBlocked}
      onDebtLogUpdate={handleDebtLogUpdate}
      onDebtConfigUpdate={handleDebtConfigUpdate}
      onDebtUpdate={handleDebtRealtimeUpdate}
    />
  );
}
