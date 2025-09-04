// components/schedule/EditActivityToast.tsx
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, Clock, User, Calendar, Zap, Activity } from "lucide-react";
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
  
  const fixedUserName = userName || 'Unknown User';
  const isEditing = editSessions.length > 0;
  const isTyping = previewPatches.length > 0;

  const getActivityConfig = () => {
    if (isEditing) {
      return {
        text: `Chỉnh sửa ${editSessions.length} ô`,
        icon: <Edit className="w-3 h-3" />,
        gradient: "from-blue-500 to-purple-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        pulseColor: "bg-blue-500"
      };
    }
    if (isTyping) {
      return {
        text: "Đang nhập...",
        icon: <Zap className="w-3 h-3" />,
        gradient: "from-yellow-500 to-orange-600", 
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        pulseColor: "bg-yellow-500"
      };
    }
    return {
      text: "Đang xem",
      icon: <Activity className="w-3 h-3" />,
      gradient: "from-green-500 to-teal-600",
      bgColor: "bg-green-50", 
      borderColor: "border-green-200",
      pulseColor: "bg-green-500"
    };
  };

  const activityConfig = getActivityConfig();

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={`
        relative overflow-hidden rounded-xl shadow-lg border ${activityConfig.borderColor}
        ${activityConfig.bgColor} p-3 w-72 mb-2
        hover:shadow-xl transition-all duration-200
      `}
    >
      {/* Pulse indicator */}
      <div className="absolute top-2 right-8">
        <motion.div
          className={`w-2 h-2 ${activityConfig.pulseColor} rounded-full`}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="flex items-start gap-2">
        {/* Compact Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
            <AvatarImage 
              src={editSessions[0]?.avatar_zalo || `/api/avatars/${userId}`} 
              alt={fixedUserName} 
            />
            <AvatarFallback className={`${departmentColor.bg} text-white text-xs font-bold`}>
              {fixedUserName && fixedUserName.length > 0 ? fixedUserName.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          
          {/* Small status indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r ${activityConfig.gradient} rounded-full border border-white flex items-center justify-center`}>
            <div className="text-white text-xs scale-75">
              {activityConfig.icon}
            </div>
          </div>
        </div>

        {/* Compact Content */}
        <div className="flex-1 min-w-0">
          {/* User name only */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-semibold text-sm text-gray-900 truncate max-w-[120px]">
              {fixedUserName}
            </span>
          </div>
          
          {/* Activity status - single line with proper flex */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
            <div className={`p-1 rounded bg-gradient-to-r ${activityConfig.gradient} text-white flex-shrink-0`}>
              {activityConfig.icon}
            </div>
            <span className="font-medium truncate">{activityConfig.text}</span>
          </div>

          {/* Compact activity details */}
          {isEditing && (
            <div className="bg-white/70 rounded-md p-2 mb-2 text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Edit className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-gray-700">Chi tiết:</span>
              </div>
              
              <div className="space-y-1">
                {editSessions.slice(0, 2).map((session, index) => (
                  <div key={index} className="flex items-center gap-1 text-gray-600">
                    <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="truncate">{session.fieldType === 'calendar_cell' ? 'Ô lịch' : 'Form'}</span>
                  </div>
                ))}
                
                {editSessions.length > 2 && (
                  <div className="text-gray-500 ml-2">
                    +{editSessions.length - 2} khác
                  </div>
                )}
              </div>
            </div>
          )}

                     {/* Compact action button */}
           <div className="flex items-center gap-2">
             <div className={`p-1.5 rounded bg-gradient-to-r ${activityConfig.gradient} text-white flex-shrink-0`}>
               <User className="w-3 h-3" />
             </div>
             <Button
               size="sm"
               className={`
                 bg-gradient-to-r ${activityConfig.gradient} 
                 hover:shadow-md text-white border-0 font-medium
                 h-7 px-3 rounded text-xs flex-1
               `}
               onClick={() => onViewHistory(userId)}
             >
               Lịch sử
             </Button>
           </div>
        </div>

        {/* Compact close button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 rounded-full flex-shrink-0"
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
  presences: Map<number, any>; // Thêm presences
  departments: Array<{ id: number; name: string }>;
  onViewHistory: (userId: number) => void;
}

export const EditActivityToastsContainer = ({
  editSessions,
  previewPatches,
  presences, // Thêm presences
  departments,
  onViewHistory,
}: EditActivityToastsContainerProps) => {
  const [closedToasts, setClosedToasts] = useState<Set<number>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  // Kiểm tra xem có đang ở trang Schedule hay không
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleRouteChange = () => {
      // Kiểm tra URL hiện tại có phải là Schedule không
      const isSchedulePage = window.location.pathname.includes('/schedule') || 
                            window.location.pathname.includes('/lich') ||
                            window.location.pathname.includes('/calendar');
      setIsVisible(isSchedulePage);
    };

    // Lắng nghe sự thay đổi visibility của tab
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Lắng nghe sự thay đổi route (nếu có)
    window.addEventListener('popstate', handleRouteChange);
    
    // Kiểm tra ban đầu
    handleRouteChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Reset closedToasts khi user có hoạt động mới
  useEffect(() => {
    const currentUserIds = new Set([
      ...Array.from(editSessions.values()).map(session => session.userId),
      ...Array.from(previewPatches.values()).map(patch => patch.userId)
    ]);

    setClosedToasts(prev => {
      const newClosedToasts = new Set(prev);
      // Mở lại toast cho users có hoạt động mới
      for (const userId of currentUserIds) {
        newClosedToasts.delete(userId);
      }
      return newClosedToasts;
    });
  }, [editSessions, previewPatches]);

  // Group activities by user (giữ nguyên logic)
  const userActivities = new Map<number, {
    userName: string;
    departmentId: number;
    departmentName: string;
    editSessions: ScheduleEditSession[];
    previewPatches: SchedulePreviewPatch[];
  }>();

  // Collect edit sessions by user (sử dụng userName từ presences nếu có)
  for (const session of editSessions.values()) {
    if (!userActivities.has(session.userId)) {
      // Tìm userName từ presences (WebSocket data) trước, fallback về session
      const presence = presences.get(session.userId);
      const department = departments.find(dept => dept.id === session.departmentId);
      userActivities.set(session.userId, {
        userName: presence?.userName || session.userName || 'Unknown User',
        departmentId: session.departmentId,
        departmentName: presence?.departmentName || department?.name || 'Unknown',
        editSessions: [],
        previewPatches: [],
      });
    }
    userActivities.get(session.userId)!.editSessions.push(session);
  }

  // Collect preview patches by user (sử dụng userName từ presences nếu có)
  for (const patch of previewPatches.values()) {
    if (!userActivities.has(patch.userId)) {
      // Tìm userName từ presences (WebSocket data) trước, fallback về patch
      const presence = presences.get(patch.userId);
      const department = departments.find(dept => dept.id === patch.departmentId);
      userActivities.set(patch.userId, {
        userName: presence?.userName || patch.userName || 'Unknown User',
        departmentId: patch.departmentId,
        departmentName: presence?.departmentName || department?.name || 'Unknown',
        editSessions: [],
        previewPatches: [],
      });
    }
    userActivities.get(patch.userId)!.previewPatches.push(patch);
  }

  // Chỉ hiển thị toast cho users có editSessions hoặc previewPatches
  // Không hiển thị toast cho users chỉ di chuyển chuột

  const handleCloseToast = (userId: number) => {
    setClosedToasts(prev => new Set(prev).add(userId));
  };

  // Lọc ra users có hoạt động và chưa bị đóng
  const activeUsers = Array.from(userActivities.entries()).filter(
    ([userId, activity]) => {
      // Chỉ hiển thị nếu có editSessions hoặc previewPatches
      const hasActivity = activity.editSessions.length > 0 || activity.previewPatches.length > 0;
      // Và chưa bị user đóng
      const notClosed = !closedToasts.has(userId);
      return hasActivity && notClosed;
    }
  );

  if (activeUsers.length === 0 || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-h-[80vh] overflow-y-auto">
      <AnimatePresence mode="popLayout">
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
