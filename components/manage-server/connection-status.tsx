"use client";

import { cn } from "@/lib/utils";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
  className?: string;
}

export function ConnectionStatus({ 
  isConnected, 
  isConnecting = false, 
  className 
}: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <Badge variant="outline" className={cn("gap-1.5", className)}>
        <Activity className="size-3 animate-pulse text-yellow-500" />
        <span>Đang kết nối...</span>
      </Badge>
    );
  }

  return (
    <Badge 
      variant={isConnected ? "default" : "destructive"} 
      className={cn("gap-1.5", className)}
    >
      {isConnected ? (
        <>
          <Wifi className="size-3 text-green-400" />
          <span>Đã kết nối</span>
        </>
      ) : (
        <>
          <WifiOff className="size-3" />
          <span>Mất kết nối</span>
        </>
      )}
    </Badge>
  );
}
