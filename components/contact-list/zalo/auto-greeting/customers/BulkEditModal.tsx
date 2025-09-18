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
  X,
  Star,
  Zap,
  Sparkles,
  MessageSquare,
  FileText,
} from "lucide-react";

interface SystemConfig {
  enabled: boolean;
  cycleDays: number;
  executionTime: string;
  messageTemplate: string;
  allowCustomMessage: boolean;
}

interface BulkEditModalProps {
  isOpen: boolean;
  selectedCount: number;
  bulkEditForm: {
    salutation: string;
    greetingMessage: string;
  };
  systemConfig: SystemConfig | null;
  bulkSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: { salutation: string; greetingMessage: string }) => void;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  selectedCount,
  bulkEditForm,
  systemConfig,
  bulkSaving,
  onClose,
  onSave,
  onFormChange,
}) => {
  const handleFormChange = (field: string, value: string) => {
    onFormChange({
      ...bulkEditForm,
      [field]: value,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[60vw] max-h-[90vh] p-0 border-0 bg-transparent">
        {/* hide native scrollbars but keep scrolling functional */}
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{-ms-overflow-style:none; scrollbar-width:none;}`}</style>
        {/* Scrollable wrapper (vertical) */}
        <div className="max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Floating background particles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-6 text-blue-300 animate-pulse">
              <Star className="w-2 h-2 opacity-60" />
            </div>
            <div
              className="absolute top-8 right-8 text-indigo-300 animate-bounce"
              style={{ animationDelay: "0.5s" }}
            >
              <Zap className="w-3 h-3 opacity-40" />
            </div>
            <div
              className="absolute bottom-6 left-12 text-purple-300 animate-ping"
              style={{ animationDelay: "1s" }}
            >
              <Star className="w-2 h-2 opacity-30" />
            </div>
            <div
              className="absolute bottom-12 right-6 text-blue-200 animate-pulse"
              style={{ animationDelay: "1.5s" }}
            >
              <Sparkles className="w-3 h-3 opacity-50" />
            </div>
          </div>

          {/* Main modal container with stunning effects */}
          <div className="relative p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl animate-gradient-shift">
            <div className="relative bg-gradient-to-br from-white via-blue-50 to-indigo-50 backdrop-blur-xl rounded-3xl shadow-2xl">
              {/* Header with enhanced design */}
              <DialogHeader className="relative p-8 pb-4">
                {/* Floating sparkles in header */}
                <div className="absolute top-4 right-4 text-blue-400 animate-bounce">
                  <Sparkles className="w-5 h-5 drop-shadow-lg" />
                </div>

                {/* Edit icon with pulse effect */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                    <div
                      className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                      <Edit3 className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                </div>

                <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  ⚙️ Chỉnh sửa hàng loạt
                </DialogTitle>

                <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                  Đã chọn{" "}
                  <span className="font-bold text-blue-600">
                    {selectedCount}
                  </span>{" "}
                  khách hàng
                  <br />
                  <span className="text-indigo-600 font-semibold">
                    📋 Cập nhật thông tin cho tất cả khách hàng được chọn
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Main content */}
              <div className="px-8 pb-8">
                <div className="space-y-6">
                  {/* Notice */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-blue-800 mb-1">
                          Lưu ý quan trọng
                        </h4>
                        <p className="text-sm text-blue-700">
                          Chỉ các trường được điền sẽ được cập nhật cho tất cả
                          khách hàng được chọn. Các trường để trống sẽ giữ
                          nguyên giá trị hiện tại.
                        </p>
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
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Input
                          value={bulkEditForm.salutation}
                          onChange={(e) =>
                            handleFormChange("salutation", e.target.value)
                          }
                          placeholder="Ví dụ: Anh, Chị, Em... (để trống giữ nguyên)"
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
                          value={bulkEditForm.greetingMessage}
                          onChange={(e) =>
                            handleFormChange("greetingMessage", e.target.value)
                          }
                          placeholder={
                            systemConfig?.allowCustomMessage
                              ? "Nhập lời chào tùy chỉnh (để trống giữ nguyên)"
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
                              bulkEditForm.greetingMessage.length > 0
                                ? "text-purple-600 font-medium"
                                : ""
                            }`}
                          >
                            {bulkEditForm.greetingMessage.length} ký tự
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

                  {/* Action buttons */}
                  <div className="flex justify-end pt-6 gap-3">
                    {/* Cancel Button */}
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={bulkSaving}
                      className="px-6 py-3 text-base font-medium border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200"
                    >
                      <span className="flex items-start justify-center">
                        <X className="h-4 w-4 mr-2" />
                        Hủy
                      </span>
                    </Button>

                    {/* Save Button */}
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={onSave}
                      disabled={
                        bulkSaving ||
                        (!bulkEditForm.salutation.trim() && !bulkEditForm.greetingMessage.trim())
                      }
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 justify-center"
                    >
                      {bulkSaving ? (
                        <span className="flex items-start justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang cập nhật...
                        </span>
                      ) : (
                        <span className="flex items-start justify-center">
                          <Save className="w-4 h-4 mr-1" />
                          Cập nhật hàng loạt
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Loading overlay */}
              {bulkSaving && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                      <div
                        className="absolute inset-2 w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"
                        style={{ animationDirection: "reverse" }}
                      ></div>
                    </div>
                    <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Đang cập nhật thông tin...
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

export default BulkEditModal;
