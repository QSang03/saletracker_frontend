"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ServiceStatusIndicatorProps {
  status: string;
  running: boolean;
  className?: string;
}

export function ServiceStatusIndicator({ 
  status, 
  running, 
  className 
}: ServiceStatusIndicatorProps) {
  const getStatusConfig = () => {
    if (running) {
      return {
        variant: "default" as const,
        icon: CheckCircle,
        iconColor: "text-green-600",
        textColor: "text-green-800 dark:text-green-200",
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800"
      };
    }
    
    switch (status) {
      case "Stopped":
        return {
          variant: "secondary" as const,
          icon: XCircle,
          iconColor: "text-gray-500",
          textColor: "text-gray-700 dark:text-gray-300",
          bgColor: "bg-gray-50 dark:bg-gray-950",
          borderColor: "border-gray-200 dark:border-gray-800"
        };
      case "Not started":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          iconColor: "text-yellow-600",
          textColor: "text-yellow-800 dark:text-yellow-200",
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
          borderColor: "border-yellow-200 dark:border-yellow-800"
        };
      default:
        return {
          variant: "outline" as const,
          icon: Activity,
          iconColor: "text-blue-600",
          textColor: "text-blue-800 dark:text-blue-200",
          bgColor: "bg-blue-50 dark:bg-blue-950",
          borderColor: "border-blue-200 dark:border-blue-800"
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "gap-1.5 px-2.5 py-1",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon className={cn("size-3", config.iconColor)} />
      <span className={cn("font-medium", config.textColor)}>{status}</span>
    </Badge>
  );
}
