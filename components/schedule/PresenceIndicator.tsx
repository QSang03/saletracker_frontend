// components/schedule/PresenceIndicator.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SchedulePresence } from "@/types/schedule";
import { getDepartmentColor } from "@/lib/utils";
import { MousePointer, Edit, Eye } from "lucide-react";

interface PresenceIndicatorProps {
  presence: SchedulePresence;
  isEditing?: boolean;
  className?: string;
}

export const PresenceIndicator = ({ presence, isEditing = false, className = "" }: PresenceIndicatorProps) => {
  const departmentColor = getDepartmentColor(presence.departmentId);
  
  // Fix encoding for display
  const fixedUserName = presence.userName
    ? presence.userName.replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống')
    : 'Unknown User';

  // Normalize department name encoding (same fix as userName) to avoid mojibake
  const fixedDepartmentName = presence.departmentName
    ? presence.departmentName.replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống')
    : 'Unknown';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`relative ${className}`}
          >
            <div className="relative">
              <Avatar className="w-8 h-8 border-2 border-white shadow-md">
                <AvatarImage 
                  src={presence.avatar_zalo || `/api/avatars/${presence.userId}`} 
                  alt={fixedUserName} 
                />
                <AvatarFallback className={`${departmentColor.bg} text-white text-xs font-medium`}>
                  {fixedUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Editing indicator */}
              {isEditing && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className={`absolute -top-1 -right-1 w-3 h-3 ${departmentColor.bg} rounded-full border-2 border-white shadow-sm flex items-center justify-center`}
                >
                  <Edit className="w-2 h-2 text-white" />
                </motion.div>
              )}
              
              {/* Viewing indicator */}
              {!isEditing && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute -top-1 -right-1 w-3 h-3 ${departmentColor.bg} rounded-full border-2 border-white shadow-sm flex items-center justify-center`}
                >
                  <Eye className="w-2 h-2 text-white" />
                </motion.div>
              )}
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium text-sm">{fixedUserName}</div>
            <div className="text-xs text-muted-foreground">{fixedDepartmentName}</div>
            {isEditing && (
              <Badge variant="secondary" className="text-xs">
                <Edit className="w-3 h-3 mr-1" />
                Đang chỉnh sửa
              </Badge>
            )}
            {!isEditing && (
              <Badge variant="outline" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Đang xem
              </Badge>
            )}
            <div className="text-xs text-muted-foreground">
              Hoạt động {new Date(presence.lastSeen).toLocaleTimeString('vi-VN')}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Cursor indicator component để hiển thị con trỏ của người khác
export const CursorIndicator = ({ presence }: { presence: SchedulePresence }) => {
  const departmentColor = getDepartmentColor(presence.departmentId);
  
  if (!presence.position) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: presence.position.x,
        top: presence.position.y,
      }}
    >
      {/* Cursor pointer */}
      <div className="relative">
        <MousePointer className={`w-5 h-5 ${departmentColor.text} drop-shadow-lg`} />
        
        {/* User info bubble */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute top-6 left-0 bg-white rounded-lg shadow-lg border ${departmentColor.border} p-2 whitespace-nowrap`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${departmentColor.bg} rounded-full`} />
            <span className="text-xs font-medium">{presence.userName}</span>
          </div>
          {presence.position.dayIndex !== undefined && presence.position.time && (
            <div className="text-xs text-gray-500 mt-1">
              {presence.position.dayIndex === 0 ? 'T2' : 
               presence.position.dayIndex === 1 ? 'T3' :
               presence.position.dayIndex === 2 ? 'T4' :
               presence.position.dayIndex === 3 ? 'T5' :
               presence.position.dayIndex === 4 ? 'T6' :
               presence.position.dayIndex === 5 ? 'T7' : 'CN'} {presence.position.time}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

interface PresenceListProps {
  presences: SchedulePresence[];
  maxDisplay?: number;
  className?: string;
}

export const PresenceList = ({ presences, maxDisplay = 5, className = "" }: PresenceListProps) => {
  const displayPresences = presences.slice(0, maxDisplay);
  const remainingCount = presences.length - maxDisplay;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <AnimatePresence>
        {displayPresences.map((presence) => (
          <PresenceIndicator
            key={presence.userId}
            presence={presence}
            isEditing={presence.isEditing}
          />
        ))}
      </AnimatePresence>
      
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} người khác
        </Badge>
      )}
    </div>
  );
};
