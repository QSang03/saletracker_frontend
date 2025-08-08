import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Edit3,
  Shield,
  Sparkles,
  Zap,
  Star,
  X,
  Save,
  UserX,
  CheckCircle,
  MessageSquare,
  Lock,
} from "lucide-react";
import { BlacklistItem } from "@/hooks/useBlacklist";

interface EditBlacklistReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, reason: string) => Promise<void>;
  blacklistItem: BlacklistItem | null;
  loading?: boolean;
}

export default function EditBlacklistReasonModal({
  isOpen,
  onClose,
  onSave,
  blacklistItem,
  loading = false,
}: EditBlacklistReasonModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Reset form when modal opens/closes or blacklistItem changes
  useEffect(() => {
    if (isOpen && blacklistItem) {
      setReason(blacklistItem.reason || "");
      setError(null);
      setHasChanged(false);
    } else if (!isOpen) {
      setReason("");
      setError(null);
      setIsSubmitting(false);
      setHasChanged(false);
    }
  }, [isOpen, blacklistItem]);

  // Track changes
  useEffect(() => {
    if (blacklistItem) {
      setHasChanged(reason.trim() !== (blacklistItem.reason || "").trim());
    }
  }, [reason, blacklistItem]);

  const handleSave = async () => {
    if (!blacklistItem) return;

    // Validate reason is not empty
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do chặn");

      // Enhanced error animation
      const errorDiv = document.createElement("div");
      errorDiv.className =
        "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce flex items-center gap-2";
      errorDiv.innerHTML =
        "<span>⚠️</span><span>Vui lòng nhập lý do chặn</span>";
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 3000);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(blacklistItem.id, reason.trim());

      // Success notification
      const successDiv = document.createElement("div");
      successDiv.className =
        "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce flex items-center gap-2";
      successDiv.innerHTML =
        "<span>✅</span><span>Đã cập nhật lý do chặn thành công!</span>";
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);

      onClose();
    } catch (err: any) {
      console.error("Error saving blacklist reason:", err);
      setError(err.message || "Lỗi khi lưu lý do chặn");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!blacklistItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-0 bg-transparent">
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
          <div
            className="absolute top-1/2 left-4 text-indigo-200 animate-bounce"
            style={{ animationDelay: "2s" }}
          >
            <Shield className="w-3 h-3 opacity-40" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-slate-600 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-blue-50 to-purple-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Enhanced Header */}
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
                  <div
                    className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-10"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <Edit3 className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 flex items-center justify-center gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 animate-pulse" />
                ✏️ Chỉnh sửa lý do chặn
              </DialogTitle>

              <div className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Cập nhật lý do chặn cho khách hàng
                <br />
                <span className="text-indigo-600 font-semibold">
                  🛡️ Thông tin sẽ được lưu vào hệ thống
                </span>
              </div>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8 space-y-6">
              {/* Customer info card with enhanced design */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border-2 border-blue-200 shadow-inner">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <UserX className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-700">
                      Khách hàng bị chặn:
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-blue-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">
                        Tên khách hàng:
                      </span>
                      <span className="font-semibold text-gray-800 bg-blue-100 px-3 py-1 rounded-lg">
                        {blacklistItem.customerName || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                      <span className="text-sm font-medium text-gray-600">
                        Contact ID:
                      </span>
                      <span className="font-mono text-sm text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200">
                        {blacklistItem.zaloContactId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason input with enhanced design */}
              <div className="space-y-4">
                <Label
                  htmlFor="reason"
                  className="flex items-center gap-2 text-base font-bold text-gray-700"
                >
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  Lý do chặn <span className="text-red-500">*</span>
                </Label>

                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-blue-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                  <div className="relative">
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="🤔 Nhập lý do chặn khách hàng này..."
                      disabled={isSubmitting || loading}
                      className="relative text-base border-2 border-purple-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-purple-300 resize-none min-h-[120px] pl-12 pt-4"
                    />

                    {/* Icon inside textarea */}
                    <div className="absolute left-4 top-4">
                      <Lock className="w-5 h-5 text-purple-400" />
                    </div>

                    {/* Change indicator */}
                    {hasChanged && (
                      <div className="absolute right-4 top-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    )}

                    {/* Character counter */}
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full border border-gray-200">
                      <span
                        className={`transition-colors duration-200 ${
                          reason.length > 0 ? "text-purple-600 font-medium" : ""
                        }`}
                      >
                        {reason.length} ký tự
                      </span>
                    </div>
                  </div>

                  {/* Change preview */}
                  {hasChanged && (
                    <div className="mt-3 animate-fadeIn">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-blue-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                        <div className="relative bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 rounded-xl border-2 border-green-200 shadow-inner">
                          <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-semibold text-gray-700">
                              Xem trước thay đổi:
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="bg-red-100 px-3 py-2 rounded-lg border border-red-200">
                              <span className="text-red-600 font-medium">
                                Cũ:
                              </span>
                              <span className="text-gray-700 ml-2">
                                {blacklistItem.reason || "Không có lý do"}
                              </span>
                            </div>

                            <div className="bg-green-100 px-3 py-2 rounded-lg border border-green-200">
                              <span className="text-green-600 font-medium">
                                Mới:
                              </span>
                              <span className="text-gray-700 ml-2 font-semibold">
                                {reason}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced error message */}
              {error && (
                <div className="relative group animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-pink-200 rounded-xl blur opacity-30"></div>
                  <div className="relative flex items-center gap-3 text-sm bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 p-4 rounded-xl shadow-inner">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30"></div>
                      <AlertCircle className="relative w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-red-700 font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons with stunning effects */}
            <div className="flex justify-end gap-4 p-8 pt-0">
              {/* Cancel Button */}
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting || loading}
                className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 text-base font-semibold border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out min-w-[120px]"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Hủy</span>
                </span>
              </Button>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={
                  isSubmitting || loading || !reason.trim() || !hasChanged
                }
                className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 border-0 shadow-2xl hover:shadow-blue-500/50 transform hover:scale-110 hover:-translate-y-1 transition-all duration-500 ease-out rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[140px] justify-center"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/50 to-indigo-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-2">
                      <Save className="w-5 h-5 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      <span className="relative z-10">💾 Lưu</span>
                    </span>
                  </>
                )}
              </Button>
            </div>

            {/* Loading overlay */}
            {(isSubmitting || loading) && (
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
                    Đang cập nhật lý do...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
