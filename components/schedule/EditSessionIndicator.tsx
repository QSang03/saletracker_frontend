// components/schedule/EditSessionIndicator.tsx
"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, Edit, Clock } from "lucide-react";
import { ScheduleEditSession } from "@/types/schedule";
import { getDepartmentColor } from "@/lib/utils";

interface EditSessionIndicatorProps {
  session: ScheduleEditSession;
  className?: string;
}

export const EditSessionIndicator = ({ session, className = "" }: EditSessionIndicatorProps) => {
  const departmentColor = getDepartmentColor(session.departmentId);
  const timeLeft = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
  const timeLeftSeconds = Math.ceil(timeLeft / 1000);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`flex items-center gap-2 p-2 rounded-lg border-2 ${departmentColor.border} ${departmentColor.light} shadow-sm ${className}`}
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 border border-white">
                <AvatarImage src={`/api/avatars/${session.userId}`} alt={session.userName} />
                <AvatarFallback className={`${departmentColor.bg} text-white text-xs`}>
                  {session.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex items-center gap-1">
                <Edit className="w-3 h-3 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">
                  {session.userName}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-600">
                  {timeLeftSeconds}s
                </span>
              </div>
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium text-sm">{session.userName}</div>
            <div className="text-xs text-muted-foreground">
              Đang chỉnh sửa {session.fieldType === 'calendar_cell' ? 'ô lịch' : 'trường dữ liệu'}
            </div>
            <div className="text-xs text-muted-foreground">
              Còn lại {timeLeftSeconds} giây
            </div>
            {session.coordinates && (
              <div className="text-xs text-muted-foreground">
                Vị trí: {JSON.stringify(session.coordinates)}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface LockedFieldIndicatorProps {
  session: ScheduleEditSession;
  className?: string;
}

export const LockedFieldIndicator = ({ session, className = "" }: LockedFieldIndicatorProps) => {
  const departmentColor = getDepartmentColor(session.departmentId);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`absolute inset-0 flex items-center justify-center bg-slate-100 bg-opacity-80 rounded border-2 ${departmentColor.border} border-dashed ${className}`}
          >
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white shadow-md">
              <Lock className={`w-4 h-4 ${departmentColor.text}`} />
              <span className={`text-xs font-medium ${departmentColor.text}`}>
                {session.userName}
              </span>
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium text-sm">{session.userName}</div>
            <div className="text-xs text-muted-foreground">
              Đang chỉnh sửa trường này
            </div>
            <div className="text-xs text-muted-foreground">
              Vui lòng chờ...
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface EditSessionListProps {
  sessions: ScheduleEditSession[];
  className?: string;
}

export const EditSessionList = ({ sessions, className = "" }: EditSessionListProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {sessions.map((session) => (
        <EditSessionIndicator
          key={session.fieldId}
          session={session}
        />
      ))}
    </div>
  );
};
