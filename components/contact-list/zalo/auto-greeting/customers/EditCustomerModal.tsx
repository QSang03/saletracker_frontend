"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Edit3,
  Save,
  Star,
  Zap,
  Sparkles,
  User,
  MessageSquare,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Customer {
  id: string;
  userId: number;
  zaloDisplayName: string;
  salutation: string;
  greetingMessage: string;
  conversationType?: "group" | "private";
  lastMessageDate?: string;
  customerLastMessageDate?: string;
  customerStatus?: "urgent" | "reminder" | "normal";
  daysSinceLastMessage: number | null;
  status: "ready" | "urgent" | "stable";
  isActive: number; // 1: active, 0: inactive
}

interface SystemConfig {
  enabled: boolean;
  cycleDays: number;
  executionTime: string;
  messageTemplate: string;
  allowCustomMessage: boolean;
}

interface EditCustomerModalProps {
  isOpen: boolean;
  editingCustomer: Customer | null;
  editForm: {
    zaloDisplayName: string;
    salutation: string;
    greetingMessage: string;
    isActive: number;
  };
  systemConfig: SystemConfig | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (field: string, value: string | number) => void;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  editingCustomer,
  editForm,
  systemConfig,
  saving,
  onClose,
  onSave,
  onFormChange,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[60vw] max-h-[90vh] p-0 border-0 bg-transparent">
        {/* hide native scrollbars but keep scrolling functional */}
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{-ms-overflow-style:none; scrollbar-width:none;}`}</style>
        {/* Scrollable wrapper (vertical) */}
        <div className="max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Floating background particles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-6 text-orange-300 animate-pulse">
              <Star className="w-2 h-2 opacity-60" />
            </div>
            <div
              className="absolute top-8 right-8 text-amber-300 animate-bounce"
              style={{ animationDelay: "0.5s" }}
            >
              <Zap className="w-3 h-3 opacity-40" />
            </div>
            <div
              className="absolute bottom-6 left-12 text-yellow-300 animate-ping"
              style={{ animationDelay: "1s" }}
            >
              <Star className="w-2 h-2 opacity-30" />
            </div>
            <div
              className="absolute bottom-12 right-6 text-orange-200 animate-pulse"
              style={{ animationDelay: "1.5s" }}
            >
              <Sparkles className="w-3 h-3 opacity-50" />
            </div>
          </div>

          {/* Main modal container with stunning effects */}
          <div className="relative p-1 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 rounded-3xl animate-gradient-shift">
            <div className="relative bg-gradient-to-br from-white via-orange-50 to-yellow-50 backdrop-blur-xl rounded-3xl shadow-2xl">
              {/* Header with enhanced design */}
              <DialogHeader className="relative p-8 pb-4">
                {/* Floating sparkles in header */}
                <div className="absolute top-4 right-4 text-orange-400 animate-bounce">
                  <Sparkles className="w-5 h-5 drop-shadow-lg" />
                </div>

                {/* Edit icon with pulse effect */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-30"></div>
                    <div
                      className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                      <Edit3 className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                </div>

                <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent mb-2">
                  ⚙️ Chỉnh sửa thông tin khách hàng
                </DialogTitle>

                <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                  Khách hàng:{" "}
                  <span className="font-bold text-orange-600">
                    {editingCustomer?.zaloDisplayName || "N/A"}
                  </span>
                  <br />
                  <span className="text-amber-600 font-semibold">
                    📋 Cập nhật thông tin khách hàng
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Main content */}
              <div className="px-8 pb-8">
                <div className="space-y-6">
                  {/* Tên hiển thị Zalo */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                      <User className="w-4 h-4 text-orange-500" />
                      Tên hiển thị Zalo *
                    </label>

                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-200 to-amber-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Input
                          value={editForm.zaloDisplayName}
                          onChange={(e) =>
                            onFormChange("zaloDisplayName", e.target.value)
                          }
                          placeholder="Nhập tên hiển thị Zalo"
                          className="relative h-14 text-base border-2 border-orange-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-orange-300 pl-12 pr-4"
                        />

                        {/* User icon inside input */}
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                          <User className="w-5 h-5 text-orange-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Xưng hô */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      Xưng hô
                    </label>

                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Input
                          value={editForm.salutation}
                          onChange={(e) =>
                            onFormChange("salutation", e.target.value)
                          }
                          placeholder="Ví dụ: Anh, Chị, Em..."
                          className="relative h-14 text-base border-2 border-blue-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-blue-300 pl-12 pr-4"
                        />

                        {/* Message icon inside input */}
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lời chào */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                      <FileText className="w-4 h-4 text-purple-500" />
                      Lời chào{" "}
                      {systemConfig?.allowCustomMessage
                        ? "(tùy chỉnh)"
                        : "(mặc định)"}
                    </label>

                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-pink-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Textarea
                          value={editForm.greetingMessage}
                          onChange={(e) =>
                            onFormChange("greetingMessage", e.target.value)
                          }
                          placeholder={
                            systemConfig?.allowCustomMessage
                              ? "Nhập lời chào tùy chỉnh (để trống sẽ dùng lời chào mặc định)"
                              : "Hệ thống đang sử dụng lời chào mặc định"
                          }
                          rows={4}
                          className="relative text-base border-2 border-purple-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-purple-300 resize-none pl-12 pt-4"
                          disabled={!systemConfig?.allowCustomMessage}
                        />

                        {/* FileText icon inside textarea */}
                        <div className="absolute left-4 top-4">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>

                        {/* Character counter */}
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full border border-gray-200">
                          <span
                            className={`transition-colors duration-200 ${
                              editForm.greetingMessage.length > 0
                                ? "text-purple-600 font-medium"
                                : ""
                            }`}
                          >
                            {editForm.greetingMessage.length} ký tự
                          </span>
                        </div>
                      </div>
                    </div>

                    {!systemConfig?.allowCustomMessage && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <span>⚠️</span>
                          <span>
                            Hệ thống đang sử dụng lời chào mặc định. Không thể
                            chỉnh sửa.
                          </span>
                        </div>
                      </div>
                    )}
                    {systemConfig?.allowCustomMessage && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-700">
                          <strong>Lời chào mặc định:</strong>{" "}
                          {systemConfig.messageTemplate}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trạng thái kích hoạt */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                      <span className="w-5 h-5 flex items-center justify-center">
                        {editForm.isActive === 1 ? '🟢' : '🔴'}
                      </span>
                      Trạng thái kích hoạt
                    </label>

                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-blue-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <Button
                          type="button"
                          variant={editForm.isActive === 1 ? "default" : "outline"}
                          onClick={() => onFormChange("isActive", 1)}
                          className={`flex items-center gap-2 ${
                            editForm.isActive === 1
                              ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                              : 'border-gray-300 text-gray-600 hover:bg-green-50'
                          }`}
                        >
                          <span className="">
                            <CheckCircle className="w-4 h-4" />
                          Kích hoạt
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant={editForm.isActive === 0 ? "default" : "outline"}
                          onClick={() => onFormChange("isActive", 0)}
                          className={`flex items-center gap-2 ${
                            editForm.isActive === 0
                              ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                              : 'border-gray-300 text-gray-600 hover:bg-red-50'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          Chưa kích hoạt
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end pt-6">
                    {/* Save Button */}
                    <Button
                      onClick={onSave}
                      disabled={saving || !editForm.zaloDisplayName.trim()}
                      className="h-12 px-6 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 justify-center"
                    >
                      {saving ? (
                        <span className="flex items-start justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang lưu...
                        </span>
                      ) : (
                        <span className="flex items-start justify-center gap-2">
                          <Save className="w-5 h-5" />
                          Lưu
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Loading overlay */}
              {saving && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <div
                        className="absolute inset-2 w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"
                        style={{ animationDirection: "reverse" }}
                      ></div>
                    </div>
                    <p className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      Đang lưu thông tin...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerModal;
