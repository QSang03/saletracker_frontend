"use client";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit3,
  User,
  Save,
  X,
  Loader2,
  Sparkles,
  UserCheck,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function RenameContactModal({
  open,
  onClose,
  contactId,
  currentName,
}: {
  open: boolean;
  onClose: () => void;
  contactId: number;
  currentName: string;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
    }
  }, [open, currentName]);

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

  const isValid = name && name.trim().length >= 2;
  const hasChanged = name.trim() !== currentName.trim();

  const save = async () => {
    if (!isValid) {
      setError("Tên phải có ít nhất 2 ký tự");
      return;
    }

    if (!hasChanged) {
      setError("Tên mới phải khác tên hiện tại");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.patch(`auto-reply/contacts/${contactId}/rename`, {
        newName: name.trim(),
      });
      await api.post("auto-reply/zalo/rename-webhook", {
        contactId,
        newName: name.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi đổi tên");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid && hasChanged && !saving) {
      save();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative max-w-2xl w-full max-h-[90vh] overflow-hidden bg-gradient-to-br from-green-50/95 via-white/95 to-teal-50/95 backdrop-blur-xl border-0 shadow-2xl rounded-xl animate-fadeIn">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/3 via-teal-500/3 to-blue-500/3 pointer-events-none"></div>

        {/* Header */}
        <div className="relative pb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-500 rounded-3xl blur-sm opacity-40 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-green-500 to-teal-500 p-4 rounded-3xl">
                  <Edit3 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  Đổi tên liên hệ
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Cập nhật tên hiển thị cho liên hệ Zalo
                </p>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 rounded-full hover:bg-gray-100/80 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 animate-in slide-in-from-top-2 duration-500">
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 font-medium">{error}</span>
                </div>
              </div>
            </div>
          )}

          {/* Current Contact Info */}
          <div className="mb-8 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 to-purple-500/8 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/60 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {currentName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Tên hiện tại</div>
                  <div className="text-xl font-semibold text-gray-800">
                    {currentName}
                  </div>
                  <div className="text-sm text-gray-400">ID: {contactId}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-8 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/8 to-teal-500/8 rounded-3xl blur-xl group-focus-within:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/60 rounded-3xl p-6 shadow-xl">
              <Label className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-green-500" />
                Tên mới
              </Label>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tên mới cho liên hệ..."
                  className="h-14 bg-white/50 border-green-200 focus:border-green-400 focus:ring-green-400 rounded-2xl text-lg transition-all duration-300 pl-14 pr-14"
                  disabled={saving}
                />
                <User className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
                {isValid && hasChanged && (
                  <Check className="absolute right-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500 animate-in zoom-in-50 duration-300" />
                )}
              </div>

              {/* Validation Feedback */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Độ dài:</span>
                  <span
                    className={`font-medium transition-colors duration-300 ${
                      name.length < 2 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {name.length}/2 ký tự tối thiểu
                  </span>
                </div>

                {hasChanged && (
                  <div className="flex items-center gap-2 text-sm text-green-600 animate-in slide-in-from-right-2 duration-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Đã thay đổi</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comparison Section */}
          {hasChanged && (
            <div className="mb-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200/50">
                <h4 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Xem trước thay đổi
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">Tên cũ</div>
                    <div className="bg-white/60 rounded-2xl p-3 font-medium text-gray-600">
                      {currentName}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">Tên mới</div>
                    <div className="bg-green-100 rounded-2xl p-3 font-medium text-green-700">
                      {name.trim()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative pt-6 p-6">
          <div className="flex gap-6 w-full justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="bg-white/60 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 px-8 py-3 h-14 text-base rounded-2xl"
            >
              <X className="w-5 h-5 mr-3" />
              Hủy
            </Button>

            <Button
              onClick={save}
              disabled={!isValid || !hasChanged || saving}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group px-10 py-3 h-14 text-base rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-6 right-12 opacity-15 pointer-events-none">
          <div className="flex gap-2">
            <Sparkles className="w-8 h-8 text-green-500 animate-pulse" />
            <Edit3 className="w-6 h-6 text-teal-500 animate-bounce" />
          </div>
        </div>
        <div className="absolute bottom-6 left-6 opacity-8 pointer-events-none">
          <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
