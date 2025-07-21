"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, MessageCircle, User, AlertTriangle } from "lucide-react";
import { CampaignInteractionLog, LogStatus } from "@/types";

interface CampaignLogDetailModalProps {
  log: CampaignInteractionLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<LogStatus, string> = {
  [LogStatus.PENDING]: "Chờ gửi",
  [LogStatus.SENT]: "Đã gửi",
  [LogStatus.FAILED]: "Thất bại",
  [LogStatus.CUSTOMER_REPLIED]: "KH đã phản hồi",
  [LogStatus.STAFF_HANDLED]: "NV đã xử lý",
  [LogStatus.REMINDER_SENT]: "Đã gửi nhắc",
};

const statusColors: Record<LogStatus, string> = {
  [LogStatus.PENDING]: "bg-yellow-100 text-yellow-800",
  [LogStatus.SENT]: "bg-blue-100 text-blue-800",
  [LogStatus.FAILED]: "bg-red-100 text-red-800",
  [LogStatus.CUSTOMER_REPLIED]: "bg-green-100 text-green-800",
  [LogStatus.STAFF_HANDLED]: "bg-purple-100 text-purple-800",
  [LogStatus.REMINDER_SENT]: "bg-orange-100 text-orange-800",
};

export default function CampaignLogDetailModal({
  log,
  open,
  onOpenChange,
}: CampaignLogDetailModalProps) {
  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return "--";
    return new Date(date).toLocaleString("vi-VN");
  };

  const renderAttachment = (attachment: Record<string, any> | undefined) => {
    if (!attachment) return null;

    switch (attachment.type) {
      case "image":
        return (
          <div className="mt-2">
            <img 
              src={attachment.base64 || attachment.url} 
              alt="Hình ảnh đã gửi" 
              className="max-w-xs max-h-32 object-contain border rounded"
            />
          </div>
        );
      case "link":
        return (
          <div className="mt-2">
            <a 
              href={attachment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {attachment.url}
            </a>
          </div>
        );
      case "file":
        return (
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              File: {attachment.filename || "attachment"}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Log chi tiết - {log.customer.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Khách hàng:</label>
                  <p className="text-lg font-semibold">{log.customer.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Số điện thoại:</label>
                  <p className="text-lg">{log.customer.phone_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Cách xưng hô:</label>
                  <p className="text-lg">{log.customer.salutation || "--"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Trạng thái gửi:</label>
                  <Badge className={`text-sm ${statusColors[log.status]}`}>
                    {statusLabels[log.status]}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Initial Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nội dung gửi kèm thông điệp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{log.message_content_sent}</p>
                {renderAttachment(log.attachment_sent)}
              </div>
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Thời gian gửi: {formatDateTime(log.sent_at)}
              </div>
            </CardContent>
          </Card>

          {/* Reminders */}
          {log.reminder_metadata && log.reminder_metadata.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lịch sử nhắc lại</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {log.reminder_metadata.map((reminder, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Lần {index + 1}</h4>
                      {reminder.error && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Lỗi
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Thời gian nhắc lần {index + 1}:
                        </label>
                        <p className="text-sm">{formatDateTime(reminder.remindAt)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Nội dung nhắc lần {index + 1}:
                        </label>
                        <div className="bg-yellow-50 p-3 rounded mt-1">
                          <p className="whitespace-pre-wrap text-sm">{reminder.message}</p>
                          {renderAttachment(reminder.attachment_sent)}
                        </div>
                      </div>
                      {reminder.error && (
                        <div>
                          <label className="text-sm font-medium text-red-600">Lỗi:</label>
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                            {reminder.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Customer Response */}
          {log.customer_reply_content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Phản hồi từ khách hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{log.customer_reply_content}</p>
                </div>
                <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Thời gian khách phản hồi: {formatDateTime(log.customer_replied_at)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Response */}
          {log.staff_reply_content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Phản hồi từ sale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{log.staff_reply_content}</p>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nhân viên xử lý: {log.staff_handler?.fullName || "--"}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Thời gian sale phản hồi: {formatDateTime(log.staff_handled_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Details */}
          {log.error_details && Object.keys(log.error_details).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Lỗi nếu có
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-red-50 p-4 rounded-lg">
                  <pre className="text-sm text-red-800 whitespace-pre-wrap">
                    {JSON.stringify(log.error_details, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Metadata */}
          {log.conversation_metadata && Object.keys(log.conversation_metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metadata cuộc hội thoại</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(log.conversation_metadata, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
