"use client";

import { useEffect } from 'react';

export function DebtSocket({ onDebtLogUpdate, onDebtConfigCreate, onDebtConfigUpdate, onDebtUpdate }: {
  onDebtLogUpdate?: (data: any) => void,
  onDebtConfigCreate?: (data: any) => void,
  onDebtConfigUpdate?: (data: any) => void,
  onDebtUpdate?: (data: any) => void,
}) {
  useEffect(() => {
    // Listen for debt_log_realtime_updated event
    const handleDebtLog = (event: CustomEvent) => {
      onDebtLogUpdate?.(event.detail);
    };

    const handleDebtConfigCreate = (event: CustomEvent) => {
      onDebtConfigCreate?.(event.detail);
    }

    const handleDebtConfigUpdate = (event: CustomEvent) => {
      onDebtConfigUpdate?.(event.detail);
    };

    const handleDebt = (event: CustomEvent) => {
      onDebtUpdate?.(event.detail);
    };

    window.addEventListener('ws_debt_log_realtime_updated', handleDebtLog as EventListener);
    window.addEventListener('ws_debt_config_created', handleDebtConfigCreate as EventListener);
    window.addEventListener('ws_debt_config_realtime_updated', handleDebtConfigUpdate as EventListener);
    window.addEventListener('ws_debt_realtime_updated', handleDebt as EventListener);

    return () => {
      window.removeEventListener('ws_debt_log_realtime_updated', handleDebtLog as EventListener);
      window.removeEventListener('ws_debt_config_created', handleDebtConfigCreate as EventListener);
      window.removeEventListener('ws_debt_config_realtime_updated', handleDebtConfigUpdate as EventListener);
      window.removeEventListener('ws_debt_realtime_updated', handleDebt as EventListener);
    };
  }, [onDebtLogUpdate, onDebtConfigCreate, onDebtConfigUpdate, onDebtUpdate]);

  return null;
}
