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
}: EditHistoryModalProps) => {
  const departmentColor = getDepartmentColor(departmentId);
  
  // Fix encoding for display and provide safe fallback
  const fixedUserName = userName
    ? userName.replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống')
    : 'Unknown User';

  // Normalize department name encoding
  const fixedDepartmentName = departmentName
    ? departmentName.replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống')
    : 'Unknown';
  
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
      return `Field ID: ${data.fieldId}`;
    }
    return `Nội dung: ${data.content?.substring(0, 50)}${data.content?.length > 50 ? '...' : ''}`;
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
                <AvatarImage src={`/api/avatars/${userId}`} alt={fixedUserName} />
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
                  <Card key={index} className="border-l-4 border-l-blue-500">
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

