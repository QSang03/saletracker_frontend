// components/schedule/EditHistoryModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, Clock, User, Calendar, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDepartmentColor } from "@/lib/utils";
import { ScheduleEditSession, SchedulePreviewPatch } from "@/types/schedule";

interface EditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  departmentId: number;
  departmentName: string;
  editSessions: ScheduleEditSession[];
  previewPatches: SchedulePreviewPatch[];
  onSelectActivity?: (activity: { date: string; time?: string; fieldId: string; fieldType: string }) => void;
  // Thêm thông tin cần thiết để tính toán vị trí ô
  currentView: 'week' | 'month';
  currentDate: Date;
  timeSlots: string[];
}

export const EditHistoryModal = ({
  isOpen,
  onClose,
  userId,
  userName,
  departmentId,
  departmentName,
  editSessions,
  previewPatches,
  onSelectActivity,
  currentView,
  currentDate,
  timeSlots,
}: EditHistoryModalProps) => {
  const departmentColor = getDepartmentColor(departmentId);
  
  // Hiển thị trực tiếp data từ WebSocket
  const fixedUserName = userName || 'Unknown User';
  const fixedDepartmentName = departmentName || 'Unknown';
  
  // Sort activities by timestamp
  const allActivities = [
    ...editSessions.map(session => ({
      type: 'edit' as const,
      data: session,
      timestamp: new Date(session.startedAt),
    })),
    ...previewPatches.map(patch => ({
      type: 'preview' as const,
      data: patch,
      timestamp: new Date(patch.timestamp),
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getActivityIcon = (type: 'edit' | 'preview') => {
    return type === 'edit' ? <Edit className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
  };

  const getActivityTitle = (type: 'edit' | 'preview', data: any) => {
    if (type === 'edit') {
      return `Bắt đầu chỉnh sửa ${data.fieldType === 'calendar_cell' ? 'ô lịch' : 'trường form'}`;
    }
    return `Nhập liệu ${data.fieldType === 'calendar_cell' ? 'ô lịch' : 'trường form'}`;
  };

  const getActivityDescription = (type: 'edit' | 'preview', data: any) => {
    if (type === 'edit') {
      // Sửa: Hiển thị thông tin đã được parse và điều chỉnh
      if (data.fieldId && data.fieldId.startsWith('day-')) {
        const datePart = data.fieldId.replace('day-', '');
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const monthNumber = parseInt(month);
          const adjustedMonth = monthNumber + 1;
          const correctedDate = `${String(day).padStart(2, '0')}/${String(adjustedMonth).padStart(2, '0')}/${year}`;
          return `Field ID: day-${day}-${adjustedMonth}-${year} (${correctedDate})`;
        }
      }
      return `Field ID: ${data.fieldId}`;
    }
    return `Nội dung: ${data.content?.substring(0, 50)}${data.content?.length > 50 ? '...' : ''}`;
  };

  const handleActivityClick = (activity: any) => {
    if (!onSelectActivity) return;
    
    // Lấy thông tin về ô từ activity data
    let date = '';
    let time = '';
    
    // Debug: Log ra toàn bộ activity data để xem cấu trúc
    console.log('[EditHistoryModal] Full activity data:', activity);
    console.log('[EditHistoryModal] Activity data fields:', {
      fieldId: activity.data.fieldId,
      fieldType: activity.data.fieldType,
      coordinates: activity.data.coordinates,
      applicable_date: activity.data.applicable_date,
      date: activity.data.date,
      startedAt: activity.data.startedAt
    });
    
    if (activity.data.fieldType === 'calendar_cell') {
      // Lấy trực tiếp từ fieldId - đơn giản thôi
      if (activity.data.fieldId) {
        console.log('[EditHistoryModal] FieldId:', activity.data.fieldId);
        
        // Format: day-13-8-2025 -> lấy 13-8-2025
        if (activity.data.fieldId.startsWith('day-')) {
          const datePart = activity.data.fieldId.replace('day-', '');
          // Chuyển 13-8-2025 thành 2025-08-13
          const parts = datePart.split('-');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            
            // Sửa: month trong fieldId là 0-11, cần +1 để thành 1-12
            const monthNumber = parseInt(month);
            const adjustedMonth = monthNumber + 1;
            
            date = `${year}-${String(adjustedMonth).padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log('[EditHistoryModal] Parsed day fieldId:', { 
              originalFieldId: activity.data.fieldId,
              datePart,
              parts,
              day, 
              month, 
              year,
              monthNumber,
              adjustedMonth,
              finalDate: date 
            });
            
            // Nếu là tháng view, cần chuyển qua tháng mới
            if (currentView !== 'month') {
              console.log('[EditHistoryModal] Switching to month view for day activity');
            }
          }
        }
        // Format: time-slot-1-10:00-2024-01-15 -> lấy 10:00 và 2024-01-15
        else if (activity.data.fieldId.startsWith('time-slot-')) {
          const parts = activity.data.fieldId.split('-');
          if (parts.length >= 5) {
            time = parts[3]; // 10:00
            const datePart = parts.slice(4).join('-'); // 2024-01-15
            if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
              date = datePart;
            }
            console.log('[EditHistoryModal] Parsed time-slot fieldId:', { date, time });
          }
        }
      }
      
      // Nếu không có từ fieldId, thử từ coordinates
      if (!date && activity.data.coordinates) {
        console.log('[EditHistoryModal] Using coordinates:', activity.data.coordinates);
        
        if (activity.data.coordinates.cellType === 'timeSlot') {
          // Tuần view - sửa lại logic tính toán
          // Lấy time slot từ y coordinate (hàng)
          const timeIndex = Math.floor(activity.data.coordinates.y / 80); // Giả sử mỗi ô cao 80px
          if (timeIndex >= 0 && timeIndex < timeSlots.length) {
            time = timeSlots[timeIndex];
          }
          
          // Lấy ngày từ x coordinate (cột)
          const dayIndex = Math.floor(activity.data.coordinates.x / 150); // Giả sử mỗi ô rộng 150px
          if (dayIndex >= 0 && dayIndex < 7) {
            const weekDate = new Date(currentDate);
            weekDate.setDate(currentDate.getDate() - currentDate.getDay() + dayIndex);
            date = weekDate.toISOString().split('T')[0];
          }
          
          console.log('[EditHistoryModal] Calculated from coordinates (week):', { 
            date, 
            time, 
            dayIndex, 
            timeIndex,
            coordinates: activity.data.coordinates,
            // Debug kích thước ô
            cellHeight: 80,
            cellWidth: 150,
            calculatedY: Math.floor(activity.data.coordinates.y / 80),
            calculatedX: Math.floor(activity.data.coordinates.x / 150)
          });
        } else if (activity.data.coordinates.cellType === 'day') {
          // Tháng view - lấy trực tiếp từ data thay vì tính toán
          console.log('[EditHistoryModal] Month view activity:', activity.data);
          
          // Thử lấy từ fieldId trước
          if (activity.data.fieldId) {
            const fieldIdParts = activity.data.fieldId.split('-');
            // Tìm pattern ngày trong fieldId
            for (let i = 0; i < fieldIdParts.length - 1; i++) {
              const potentialDate = `${fieldIdParts[i]}-${fieldIdParts[i + 1]}`;
              if (potentialDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = potentialDate;
                console.log('[EditHistoryModal] Found date in fieldId:', date);
                break;
              }
            }
          }
          

        }
      }
    }
    

    
    // Nếu vẫn không có date, thử từ các field khác
    if (!date) {
      if (activity.data.applicable_date) {
        date = activity.data.applicable_date;
        console.log('[EditHistoryModal] Using applicable_date as fallback:', date);
      } else if (activity.data.date) {
        date = activity.data.date;
        console.log('[EditHistoryModal] Using date field as fallback:', date);
      } else if (activity.data.startedAt) {
        try {
          const startedDate = new Date(activity.data.startedAt);
          if (!isNaN(startedDate.getTime())) {
            date = startedDate.toISOString().split('T')[0];
            console.log('[EditHistoryModal] Using startedAt as fallback:', date);
          }
        } catch (error) {
          console.log('[EditHistoryModal] Error parsing startedAt:', error);
        }
      }
    }
    
    // Debug: Log ra thông tin cuối cùng
    console.log('[EditHistoryModal] Final result:', {
      date,
      time,
      fieldId: activity.data.fieldId,
      fieldType: activity.data.fieldType,
      fallbackUsed: !date ? 'No fallback available' : 'Fallback used'
    });
    
    // Gọi callback để scroll đến ô
    onSelectActivity({
      date,
      time,
      fieldId: activity.data.fieldId,
      fieldType: activity.data.fieldType,
    });
    
    // Đóng modal sau khi chọn
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                <AvatarImage 
                  src={editSessions[0]?.avatar_zalo || `/api/avatars/${userId}`} 
                  alt={fixedUserName} 
                />
                <AvatarFallback className={`${departmentColor.bg} text-white text-lg font-medium`}>
                  {fixedUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{fixedUserName}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {fixedDepartmentName}
                  </Badge>
                  <span className="text-sm text-gray-500">• Lịch sử hoạt động</span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {allActivities.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có hoạt động</h3>
                <p className="text-gray-500">Người dùng này chưa thực hiện bất kỳ thao tác chỉnh sửa nào.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Hoạt động gần đây ({allActivities.length})
                  </h3>
                </div>

                {allActivities.map((activity, index) => (
                  <Card 
                    key={index} 
                    className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${departmentColor.bg} text-white`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-900">
                              {getActivityTitle(activity.type, activity.data)}
                            </h4>
                            <div className="text-xs text-gray-500">
                              {formatTime(activity.timestamp)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {getActivityDescription(activity.type, activity.data)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatDate(activity.timestamp)}</span>
                            {activity.type === 'edit' && (
                              <Badge variant="secondary" className="text-xs">
                                {activity.data.fieldType === 'calendar_cell' ? 'Ô lịch' : 'Form'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Hiển thị {allActivities.length} hoạt động gần đây
            </div>
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Đóng
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

