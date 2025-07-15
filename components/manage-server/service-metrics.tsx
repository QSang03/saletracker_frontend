"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";

interface ServiceMetricsProps {
  processCount: number;
  uptime?: string;
  className?: string;
}

export function ServiceMetrics({ processCount, uptime, className }: ServiceMetricsProps) {
  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <div className="flex items-center gap-1.5">
        <Users className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Tiến trình:</span>
        <Badge variant="secondary" className="text-xs">
          {processCount}
        </Badge>
      </div>
      {uptime && (
        <div className="flex items-center gap-1.5">
          <Clock className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Uptime:</span>
          <span className="text-xs font-mono">{uptime}</span>
        </div>
      )}
    </div>
  );
}
