// components/schedule/LivePreview.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SchedulePreviewPatch } from "@/types/schedule";
import { getDepartmentColor } from "@/lib/utils";

interface LivePreviewProps {
  patch: SchedulePreviewPatch;
  currentValue: string;
  className?: string;
}

export const LivePreview = ({ patch, currentValue, className = "" }: LivePreviewProps) => {
  const departmentColor = getDepartmentColor(patch.departmentId);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`relative ${className}`}
    >
      {/* Ghost text overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`text-sm ${departmentColor.text} opacity-60`}>
          {patch.content}
        </div>
      </div>
      
      {/* Typing indicator */}
      <div className="absolute -top-6 left-0 flex items-center gap-2">
        <Avatar className="w-4 h-4 border border-white">
                          <AvatarImage 
                  src={patch.avatar_zalo || `/api/avatars/${patch.userId}`} 
                  alt={patch.userName} 
                />
          <AvatarFallback className={`${departmentColor.bg} text-white text-xs`}>
            {patch.userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <Badge variant="secondary" className="text-xs">
          <span className={`w-2 h-2 ${departmentColor.bg} rounded-full mr-1`} />
          {patch.userName} đang nhập...
        </Badge>
      </div>
    </motion.div>
  );
};

interface LivePreviewListProps {
  patches: SchedulePreviewPatch[];
  currentValue: string;
  className?: string;
}

export const LivePreviewList = ({ patches, currentValue, className = "" }: LivePreviewListProps) => {
  // Group patches by fieldId and show the latest one for each field
  const latestPatches = patches.reduce((acc, patch) => {
    const existing = acc.find(p => p.fieldId === patch.fieldId);
    if (!existing || new Date(patch.timestamp) > new Date(existing.timestamp)) {
      acc = acc.filter(p => p.fieldId !== patch.fieldId);
      acc.push(patch);
    }
    return acc;
  }, [] as SchedulePreviewPatch[]);

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {latestPatches.map((patch) => (
          <LivePreview
            key={`${patch.fieldId}-${patch.timestamp}`}
            patch={patch}
            currentValue={currentValue}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface TypingIndicatorProps {
  patches: SchedulePreviewPatch[];
  className?: string;
}

export const TypingIndicator = ({ patches, className = "" }: TypingIndicatorProps) => {
  // Get unique users who are typing
  const typingUsers = patches.reduce((acc, patch) => {
    if (!acc.find(u => u.userId === patch.userId)) {
      acc.push({
        userId: patch.userId,
        userName: patch.userName,
        departmentId: patch.departmentId,
        avatar_zalo: patch.avatar_zalo, // ✅ THÊM: Avatar Zalo của user
      });
    }
    return acc;
  }, [] as Array<{ userId: number; userName: string; departmentId: number; avatar_zalo?: string }>);

  if (typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-2 ${className}`}
    >
      <div className="flex items-center gap-1">
        {typingUsers.slice(0, 3).map((user) => {
          const departmentColor = getDepartmentColor(user.departmentId);
          return (
            <Avatar key={user.userId} className="w-5 h-5 border border-white">
                              <AvatarImage 
                  src={user.avatar_zalo || `/api/avatars/${user.userId}`} 
                  alt={user.userName} 
                />
              <AvatarFallback className={`${departmentColor.bg} text-white text-xs`}>
                {user.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      
      <Badge variant="secondary" className="text-xs">
        {typingUsers.length === 1 
          ? `${typingUsers[0].userName} đang nhập...`
          : typingUsers.length === 2
          ? `${typingUsers[0].userName} và ${typingUsers[1].userName} đang nhập...`
          : `${typingUsers[0].userName} và ${typingUsers.length - 1} người khác đang nhập...`
        }
      </Badge>
    </motion.div>
  );
};
