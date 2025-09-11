"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useContactProfile } from "@/hooks/contact-list/useContactProfile";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import {
  User,
  FileText,
  MessageSquare,
  AlertTriangle,
  Save,
  X,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle2,
  Lock,
  Sparkles,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: number | null;
}

export default function ContactProfileModal({
  open,
  onClose,
  contactId,
}: Props) {
  const { profile, fetchProfile, saveProfile, loading, error } =
    useContactProfile(contactId);
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;

  const [form, setForm] = useState({
    notes: "",
    toneHints: "",
    aovThreshold: "",
  });
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    if (open) {
      fetchProfile();
      setValidationErrors({});
      setJustSaved(false);
    }
  }, [open, fetchProfile]);

  useEffect(() => {
    if (profile) {
      setForm({
        notes: profile.notes || "",
        toneHints: profile.toneHints || "",
        aovThreshold: profile.aovThreshold || "",
      });
    }
  }, [profile]);

  // Handle ESC key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (form.aovThreshold && isNaN(Number(form.aovThreshold))) {
      errors.aovThreshold = "Ngưỡng cảnh báo phải là một số hợp lệ";
    }

    if (form.aovThreshold && Number(form.aovThreshold) < 0) {
      errors.aovThreshold = "Ngưỡng cảnh báo không được âm";
    }

    if (form.aovThreshold && Number(form.aovThreshold) % 1 !== 0) {
      errors.aovThreshold = "Số lượng phải là số nguyên";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async () => {
    if (zaloDisabled || !validateForm()) return;

    setSaving(true);
    try {
      await saveProfile({
        notes: form.notes,
        toneHints: form.toneHints,
        aovThreshold: form.aovThreshold === "" ? null : form.aovThreshold,
      } as any);

      setJustSaved(true);
      setTimeout(() => {
        onClose();
        setJustSaved(false);
      }, 1500);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative !max-w-3xl w-full !max-h-[90vh] flex flex-col overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-xl animate-fadeIn">
        {/* Enhanced Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Cấu hình Khách hàng
                </div>
                <div className="text-sm text-gray-600 font-normal">
                  Tùy chỉnh thông tin và cảnh báo AI cho khách hàng
                </div>
              </div>
            </motion.div>

            <div className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {zaloDisabled ? (
                  <Badge variant="destructive" className="gap-1">
                    <Lock className="w-3 h-3" />
                    Chỉ đọc
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Có thể chỉnh sửa
                  </Badge>
                )}
              </motion.div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                disabled={saving}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* Loading State */}
          <AnimatePresence>
            {loading && (
              <motion.div
                className="flex items-center justify-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <div className="text-sm text-gray-500">
                    Đang tải thông tin...
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-sm text-red-700 font-medium">
                  Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zalo Disabled Warning */}
          <AnimatePresence>
            {zaloDisabled && (
              <motion.div
                className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-800 mb-1">
                    Chế độ chỉ đọc
                  </div>
                  <div className="text-sm text-amber-700">
                    Bạn không thể chỉnh sửa thông tin khách hàng vì tài khoản
                    Zalo chưa được liên kết hoặc đã bị tạm khóa.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {justSaved && (
              <motion.div
                className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="text-sm text-green-700 font-medium">
                  Đã lưu thành công! Thông tin khách hàng đã được cập nhật.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Fields */}
          {!loading && (
            <div className="space-y-6">
              {/* Notes Field */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  Ghi chú
                  <div className="relative group">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Thông tin bổ sung về khách hàng
                    </div>
                  </div>
                </Label>
                <Textarea
                  disabled={zaloDisabled}
                  className={cn(
                    "bg-white border-2 border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-300 resize-none text-base leading-relaxed px-4 py-3",
                    zaloDisabled &&
                      "bg-gray-50 text-gray-500 cursor-not-allowed"
                  )}
                  rows={4}
                  placeholder="Nhập ghi chú về khách hàng, ví dụ: sở thích, lịch sử mua hàng, thông tin liên hệ..."
                  value={form.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {form.notes.length}/500 ký tự
                </div>
              </motion.div>

              {/* Tone Hints Field */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Gợi ý giọng điệu
                  <div className="relative group">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Hướng dẫn AI cách giao tiếp với khách hàng này
                    </div>
                  </div>
                </Label>
                <Textarea
                  disabled={zaloDisabled}
                  className={cn(
                    "bg-white border-2 border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-300 resize-none text-base leading-relaxed px-4 py-3",
                    zaloDisabled &&
                      "bg-gray-50 text-gray-500 cursor-not-allowed"
                  )}
                  rows={3}
                  placeholder="Ví dụ: Khách hàng thích giao tiếp thân thiện, tránh ngôn ngữ quá chính thức. Quan tâm đến chất lượng hơn giá cả..."
                  value={form.toneHints}
                  onChange={(e) =>
                    handleInputChange("toneHints", e.target.value)
                  }
                />
                <div className="text-xs text-gray-500 mt-1">
                  {form.toneHints.length}/300 ký tự
                </div>
              </motion.div>

              {/* Alert Threshold Field */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Ngưỡng cảnh báo số lượng
                  <div className="relative group">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      AI sẽ cảnh báo sale khi khách yêu cầu vượt ngưỡng này
                    </div>
                  </div>
                </Label>
                <div className="relative">
                  <Input
                    disabled={zaloDisabled}
                    type="number"
                    min="0"
                    step="1"
                    className={cn(
                      "bg-white border-2 border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-300 text-base px-4 py-3",
                      zaloDisabled &&
                        "bg-gray-50 text-gray-500 cursor-not-allowed",
                      validationErrors.aovThreshold &&
                        "border-red-400 focus:border-red-400 focus:ring-red-100"
                    )}
                    placeholder="Ví dụ: 50 (AI sẽ cảnh báo khi khách hỏi >50 sản phẩm)"
                    value={form.aovThreshold}
                    onChange={(e) =>
                      handleInputChange("aovThreshold", e.target.value)
                    }
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    sản phẩm
                  </div>
                </div>
                {validationErrors.aovThreshold && (
                  <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.aovThreshold}
                  </div>
                )}
                
                {/* Enhanced Alert Warning */}
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-xs text-orange-700 space-y-1">
                    <div className="flex items-center gap-1 font-medium">
                      <Bell className="w-3 h-3" />
                      Cảnh báo tự động:
                    </div>
                    <div>• <strong>Khi khách hỏi ≤ ngưỡng:</strong> AI phản hồi bình thường</div>
                    <div>• <strong>Khi khách hỏi {'>'} ngưỡng:</strong> AI sẽ gợi ý "Để tôi kiểm tra và báo sale hỗ trợ bạn về đơn hàng lớn này"</div>
                    <div>• <strong>Để trống:</strong> Không có cảnh báo số lượng</div>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Tips Section */}
              <motion.div
                className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Hướng dẫn sử dụng AI Alert System
                </div>
                <div className="text-xs text-blue-600 space-y-2">
                  <div>
                    • <strong>Ghi chú:</strong> Lưu thông tin quan trọng về khách hàng để AI tham khảo khi tư vấn
                  </div>
                  <div>
                    • <strong>Gợi ý giọng điệu:</strong> AI sẽ điều chỉnh cách giao tiếp cho phù hợp với từng khách hàng
                  </div>
                  <div>
                    • <strong>Ngưỡng cảnh báo:</strong> Khi khách hàng yêu cầu số lượng lớn, AI sẽ:
                    <div className="ml-4 mt-1 space-y-1">
                      <div>→ Thông báo ngay cho sale qua notification</div>
                      <div>→ Gợi ý khách chờ để được hỗ trợ tốt hơn</div>
                      <div>→ Tránh cam kết về giá/tồn kho mà chưa kiểm tra</div>
                    </div>
                  </div>
                </div>
                
                {/* Example Scenarios */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-xs font-medium text-blue-700 mb-2">📋 Ví dụ thực tế:</div>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>• <strong>Ngưỡng 10:</strong> Khách lẻ (≤10) → AI tự xử lý | Khách buôn ({'>'}10) → Báo sale</div>
                    <div>• <strong>Ngưỡng 50:</strong> Đơn thường (≤50) → AI quote giá | Đơn lớn ({'>'}50) → Sale đàm phán</div>
                    <div>• <strong>Ngưỡng 100:</strong> Chỉ cảnh báo với đơn hàng rất lớn cần approval đặc biệt</div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-full">
                🤖 AI sẽ tự động cảnh báo sale khi cần thiết
              </div>
              {form.notes && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-600 border-blue-200"
                >
                  Có ghi chú
                </Badge>
              )}
              {form.aovThreshold && (
                <Badge
                  variant="outline"
                  className="text-xs bg-orange-50 text-orange-600 border-orange-200"
                >
                  <Bell className="w-3 h-3 mr-1" />
                  Cảnh báo: {form.aovThreshold}+
                </Badge>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="bg-white hover:bg-gray-50 border-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Đóng
              </Button>
              <Button
                onClick={save}
                disabled={zaloDisabled || saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
