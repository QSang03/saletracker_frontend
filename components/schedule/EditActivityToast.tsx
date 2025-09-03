// components/schedule/EditActivityToast.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, Clock, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDepartmentColor } from "@/lib/utils";
import { ScheduleEditSession, SchedulePreviewPatch } from "@/types/schedule";

interface EditActivityToastProps {
  userId: number;
  userName: string;
  departmentId: number;
  departmentName: string;
  editSessions: ScheduleEditSession[];
  previewPatches: SchedulePreviewPatch[];
  onClose: (userId: number) => void;
  onViewHistory: (userId: number) => void;
}

export const EditActivityToast = ({
  userId,
  userName,
  departmentId,
  departmentName,
  editSessions,
  previewPatches,
  onClose,
  onViewHistory,
}: EditActivityToastProps) => {
  const departmentColor = getDepartmentColor(departmentId);
  
  // Fix encoding for display
  const fixedUserName = userName
    ? userName.replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống')
    : 'Unknown User';

  // Normalize department name encoding
  const fixedDepartmentName = departmentName
    ? departmentName.replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống')
    : 'Unknown';
  
  const isEditing = editSessions.length > 0;
  const isTyping = previewPatches.length > 0;
  
  const getActivityText = () => {
    if (isEditing) {
      return `Đang chỉnh sửa ${editSessions.length} ô`;
    }
    if (isTyping) {
      return `Đang nhập liệu...`;
    }
    return "Đang xem";
  };

  const getActivityIcon = () => {
    if (isEditing) return <Edit className="w-4 h-4" />;
    if (isTyping) return <Clock className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-80 mb-2"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
          <AvatarImage src={`/api/avatars/${userId}`} alt={fixedUserName} />
          <AvatarFallback className={`${departmentColor.bg} text-white text-sm font-medium`}>
            {fixedUserName && fixedUserName.length > 0 ? fixedUserName.charAt(0).toUpperCase() : 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 truncate">
              {fixedUserName}
            </span>
            <Badge variant="outline" className="text-xs">
              {fixedDepartmentName}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            {getActivityIcon()}
            <span>{getActivityText()}</span>
          </div>

          {/* Activity details */}
          {isEditing && (
            <div className="text-xs text-gray-500 mb-2">
              <div className="flex items-center gap-1">
                <Edit className="w-3 h-3" />
                <span>Đang chỉnh sửa:</span>
              </div>
              <div className="ml-4 mt-1 space-y-1">
                {editSessions.slice(0, 2).map((session, index) => (
                  <div key={index} className="text-gray-600">
                    • {session.fieldType === 'calendar_cell' ? 'Ô lịch' : 'Trường form'}
                  </div>
                ))}
                {editSessions.length > 2 && (
                  <div className="text-gray-500">
                    +{editSessions.length - 2} ô khác
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => onViewHistory(userId)}
            >
              <User className="w-3 h-3 mr-1" />
              Xem lịch sử
            </Button>
          </div>
        </div>

        {/* Close button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          onClick={() => onClose(userId)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

interface EditActivityToastsContainerProps {
  editSessions: Map<string, ScheduleEditSession>;
  previewPatches: Map<string, SchedulePreviewPatch>;
  departments: Array<{ id: number; name: string }>;
  onViewHistory: (userId: number) => void;
}

export const EditActivityToastsContainer = ({
  editSessions,
  previewPatches,
  departments,
  onViewHistory,
}: EditActivityToastsContainerProps) => {
  const [closedToasts, setClosedToasts] = useState<Set<number>>(new Set());

  // Group activities by user
  const userActivities = new Map<number, {
    userName: string;
    departmentId: number;
    departmentName: string;
    editSessions: ScheduleEditSession[];
    previewPatches: SchedulePreviewPatch[];
  }>();

  // Collect edit sessions by user
  for (const session of editSessions.values()) {
    if (!userActivities.has(session.userId)) {
      const department = departments.find(dept => dept.id === session.departmentId);
      userActivities.set(session.userId, {
        userName: session.userName || 'Unknown User',
        departmentId: session.departmentId,
        departmentName: department?.name || 'Unknown',
        editSessions: [],
        previewPatches: [],
      });
    }
    userActivities.get(session.userId)!.editSessions.push(session);
  }

  // Collect preview patches by user
  for (const patch of previewPatches.values()) {
    if (!userActivities.has(patch.userId)) {
      const department = departments.find(dept => dept.id === patch.departmentId);
      userActivities.set(patch.userId, {
        userName: patch.userName || 'Unknown User',
        departmentId: patch.departmentId,
        departmentName: department?.name || 'Unknown',
        editSessions: [],
        previewPatches: [],
      });
    }
    userActivities.get(patch.userId)!.previewPatches.push(patch);
  }

  const handleCloseToast = (userId: number) => {
    setClosedToasts(prev => new Set(prev).add(userId));
  };

  const activeUsers = Array.from(userActivities.entries()).filter(
    ([userId]) => !closedToasts.has(userId)
  );

  if (activeUsers.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      <AnimatePresence>
        {activeUsers.map(([userId, activity]) => (
          <EditActivityToast
            key={userId}
            userId={userId}
            userName={activity.userName}
            departmentId={activity.departmentId}
            departmentName={activity.departmentName}
            editSessions={activity.editSessions}
            previewPatches={activity.previewPatches}
            onClose={handleCloseToast}
            onViewHistory={onViewHistory}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
