"use client";

import { useEffect } from 'react';

export function DebtSocket({ onDebtLogUpdate, onDebtConfigUpdate, onDebtUpdate }: {
  onDebtLogUpdate?: (data: any) => void,
  onDebtConfigUpdate?: (data: any) => void
  onDebtUpdate?: (data: any) => void
}) {
  useEffect(() => {
    // Listen for debt_log_realtime_updated event
    const handleDebtLog = (event: CustomEvent) => {
      onDebtLogUpdate?.(event.detail);
    };

    const handleDebtConfig = (event: CustomEvent) => {
      onDebtConfigUpdate?.(event.detail);
    };

    const handleDebt = (event: CustomEvent) => {
      onDebtUpdate?.(event.detail);
    };

    window.addEventListener('ws_debt_log_realtime_updated', handleDebtLog as EventListener);
    window.addEventListener('ws_debt_config_realtime_updated', handleDebtConfig as EventListener);
    window.addEventListener('ws_debt_realtime_updated', handleDebt as EventListener);

    return () => {
      window.removeEventListener('ws_debt_log_realtime_updated', handleDebtLog as EventListener);
      window.removeEventListener('ws_debt_config_realtime_updated', handleDebtConfig as EventListener);
      window.removeEventListener('ws_debt_realtime_updated', handleDebt as EventListener);
    };
  }, [onDebtLogUpdate, onDebtConfigUpdate]);

  return null;
}
