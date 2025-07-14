"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface RefreshIndicatorProps {
  isRefreshing?: boolean;
  lastRefresh?: Date | null;
  onManualRefresh?: () => void;
  error?: string | null;
  className?: string;
}

export const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  isRefreshing = false,
  lastRefresh = null,
  onManualRefresh,
  error = null,
  className = ''
}) => {
  const formatLastRefresh = (date: Date | null) => {
    if (!date) return 'Chưa cập nhật';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return `${seconds} giây trước`;
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {error ? (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Lỗi tải dữ liệu</span>
        </>
      ) : (
        <>
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span className="text-muted-foreground">
            {isRefreshing ? 'Đang cập nhật...' : `Cập nhật: ${formatLastRefresh(lastRefresh)}`}
          </span>
        </>
      )}
      
      {onManualRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="h-6 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};

export default RefreshIndicator;
