import React, { useState } from "react";
import { OrderDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EyeOff,
  AlertTriangle,
  Sparkles,
  Zap,
  Star,
  X,
  MessageSquare,
  UserX,
  CheckCircle,
  Clock,
} from "lucide-react";

interface HideOrderDetailModalProps {
  orderDetail: OrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

const hideReasons = [
  {
    value: "Khách không phản hồi",
    icon: UserX,
    color: "bg-gray-100 text-gray-700 border-gray-200",
  },
  {
    value: "Tạm hoãn do giá",
    icon: Clock,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    value: "Cần xác nhận thêm",
    icon: AlertTriangle,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  {
    value: "Khách yêu cầu ẩn",
    icon: EyeOff,
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    value: "Đơn hàng trùng lặp",
    icon: CheckCircle,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  {
    value: "Chờ phê duyệt",
    icon: Clock,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
];

const HideOrderDetailModal: React.FC<HideOrderDetailModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [useCustomReason, setUseCustomReason] = useState(false);

  const handleConfirm = () => {
    const finalReason = useCustomReason ? customReason.trim() : reason;
    if (!finalReason) return;
    onConfirm(finalReason);
  };

  const handleClose = () => {
    setReason("");
    setCustomReason("");
    setUseCustomReason(false);
    onClose();
  };

  const handleReasonChange = (value: string) => {
    if (value === "custom") {
      setUseCustomReason(true);
      setReason("");
    } else {
      setUseCustomReason(false);
      setReason(value);
      setCustomReason("");
    }
  };

  const selectedReason = hideReasons.find((r) => r.value === reason);
  const isValid = useCustomReason ? customReason.trim().length > 0 : reason.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[30vw] !max-h-[95vh] p-0 overflow-auto border-0 bg-transparent no-scrollbar-modal" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <style>{`.no-scrollbar-modal { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-amber-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-orange-300 animate-bounce"
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
            className="absolute bottom-12 right-6 text-amber-200 animate-pulse"
            style={{ animationDelay: "1.5s" }}
          >
            <Sparkles className="w-3 h-3 opacity-50" />
          </div>
          <div
            className="absolute top-1/2 left-4 text-orange-200 animate-bounce"
            style={{ animationDelay: "2s" }}
          >
            <EyeOff className="w-3 h-3 opacity-40" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-amber-50 to-orange-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Enhanced Header */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-amber-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* Hide icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-10"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-amber-500 via-orange-600 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <EyeOff className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-2">
                👁️‍🗨️ Ẩn đơn hàng
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Ẩn tạm thời đơn hàng của khách hàng:
                <br />
                <span className="font-bold text-amber-600">
                  {orderDetail.customer_name}
                </span>
                <br />
                <span className="text-orange-600 font-medium text-sm">
                  💡 Bạn có thể khôi phục sau tại trang "Đơn hàng đã ẩn"
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8 space-y-6">
              {/* Order info card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-orange-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border-2 border-amber-200 shadow-inner">
                  <div className="flex items-center gap-3 mb-2">
                    <EyeOff className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-gray-700">
                      Thông tin đơn hàng sẽ bị ẩn:
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-amber-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-mono font-bold text-orange-600">
                        #{orderDetail.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-600">Khách hàng:</span>
                      <span className="font-semibold text-gray-800">
                        {orderDetail.customer_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason selection */}
              <div className="space-y-4">
                <Label
                  htmlFor="hide-reason"
                  className="flex items-center gap-2 text-base font-bold text-gray-700"
                >
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  Lý do ẩn <span className="text-amber-500">*</span>
                </Label>

                {!useCustomReason ? (
                  <div className="space-y-4">
                    {/* Enhanced Select */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-orange-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <Select value={reason} onValueChange={handleReasonChange}>
                        <SelectTrigger className="relative h-14 text-base border-2 border-amber-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-amber-300">
                          <div className="flex items-center gap-3">
                            {selectedReason && (
                              <selectedReason.icon className="w-5 h-5 text-amber-500" />
                            )}
                            <SelectValue placeholder="🤔 Chọn lý do ẩn..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="border-2 border-amber-200 rounded-xl shadow-xl">
                          {hideReasons.map((reasonOption) => {
                            const ReasonIcon = reasonOption.icon;
                            return (
                              <SelectItem
                                key={reasonOption.value}
                                value={reasonOption.value}
                                className="text-base py-3 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-200 cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <ReasonIcon className="w-4 h-4" />
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium border ${reasonOption.color}`}
                                  >
                                    {reasonOption.value}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                          <SelectItem
                            value="custom"
                            className="text-base py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 cursor-pointer border-t border-gray-100"
                          >
                            <span className="flex items-center gap-2 font-medium text-purple-600">
                              <Sparkles className="w-3 h-3" />
                              Lý do khác...
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Enhanced Textarea */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-pink-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Textarea
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="✍️ Nhập lý do ẩn chi tiết..."
                          rows={4}
                          className="relative text-base border-2 border-purple-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-purple-300 resize-none pl-12 pt-4"
                        />

                        {/* Textarea icon */}
                        <div className="absolute left-4 top-4">
                          <MessageSquare className="w-5 h-5 text-purple-400" />
                        </div>

                        {/* Character counter */}
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full border border-gray-200">
                          <span
                            className={`transition-colors duration-200 ${
                              customReason.length > 0
                                ? "text-purple-600 font-medium"
                                : ""
                            }`}
                          >
                            {customReason.length} ký tự
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Switch back to select button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUseCustomReason(false);
                        setCustomReason("");
                      }}
                      className="group relative overflow-hidden w-full h-12 text-base font-medium border-2 border-amber-300 hover:border-amber-400 bg-white hover:bg-amber-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-orange-200 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"></div>
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <span>📋 Chọn từ danh sách có sẵn</span>
                      </div>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons with stunning effects */}
            <div className="flex justify-end gap-4 p-8 pt-0">
              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 text-base font-semibold border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out min-w-[120px]"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Hủy</span>
                </span>
              </Button>

              {/* Hide Button */}
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={loading || !isValid}
                className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold
                         bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 
                         hover:from-amber-500 hover:via-amber-600 hover:to-orange-600 
                         border-0 shadow-2xl hover:shadow-amber-500/40 
                         transform hover:scale-110 hover:-translate-y-1
                         transition-all duration-500 ease-out rounded-xl text-white
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         min-w-[140px] justify-center"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/50 to-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Đang ẩn...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <EyeOff className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                    <span className="relative z-10">👁️‍🗨️ Ẩn đơn hàng</span>
                  </span>
                )}
              </Button>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    Đang ẩn đơn hàng...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HideOrderDetailModal;
