"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, User, MousePointer } from "lucide-react";
import { SchedulePresence } from "@/types/schedule";
import { getDepartmentColor } from "@/lib/utils";

interface CellSelectionIndicatorProps {
  presences: Map<number, SchedulePresence>;
  className?: string;
}

export const CellSelectionIndicator = ({ presences, className = "" }: CellSelectionIndicatorProps) => {
  // Lọc ra những presence có thông tin cell selection hoặc mouse move
  const cellSelections = Array.from(presences.values()).filter(
    (presence) => presence.position?.cellType && (presence.position?.action === 'clicked' || presence.position?.action === 'move')
  );

  if (cellSelections.length === 0) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${className}`}>
      <AnimatePresence>
        {cellSelections.map((presence) => {
          const departmentColor = getDepartmentColor(presence.departmentId);
          
          return (
            <motion.div
              key={`${presence.userId}-${presence.position?.dayIndex}-${presence.position?.time}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="absolute"
              style={{
                left: presence.position?.x || 0,
                top: presence.position?.y || 0,
              }}
            >
              {/* Selection indicator */}
              <div className="relative">
                <div 
                  className={`w-6 h-6 rounded-md flex items-center justify-center shadow-lg ${departmentColor.bg} ${
                    presence.position?.action === 'move' ? 'opacity-70 animate-pulse' : ''
                  }`}
                >
                  {presence.position?.action === 'clicked' ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <MousePointer className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* User info tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {presence.userName}
                  </div>
                  <div className="text-gray-300">
                    {presence.position?.cellType === 'timeSlot' 
                      ? `${presence.position?.time} - ${presence.position?.date}`
                      : `Ngày ${presence.position?.date}/${(presence.position?.month || 0) + 1}`
                    }
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
