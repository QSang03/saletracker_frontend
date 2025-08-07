import React, { useState } from "react";
import { OrderDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Trash2,
  AlertTriangle,
  Sparkles,
  Zap,
  Star,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  UserX,
  CheckCircle,
} from "lucide-react";

interface DeleteOrderDetailModalProps {
  orderDetail: OrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

const deleteReasons = [
  {
    value: "Khách không chốt",
    icon: UserX,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  {
    value: "Giá không theo được",
    icon: AlertTriangle,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    value: "Kẹt công nợ",
    icon: CheckCircle,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  {
    value: "Đã chốt đơn",
    icon: CheckCircle,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  {
    value: "Sai tên mặt hàng",
    icon: AlertTriangle,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    value: "Mặt hàng của nhóm khác",
    icon: UserX,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
];

const DeleteOrderDetailModal: React.FC<DeleteOrderDetailModalProps> = ({
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
    if (!finalReason) {
      // Enhanced alert with animation
      const alertDiv = document.createElement("div");
      alertDiv.className =
        "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce";
      alertDiv.textContent = "⚠️ Vui lòng chọn hoặc nhập lý do xóa";
      document.body.appendChild(alertDiv);
      setTimeout(() => alertDiv.remove(), 3000);
      return;
    }
    onConfirm(finalReason);
  };

  const handleClose = () => {
    setReason("");
    setCustomReason("");
    setUseCustomReason(false);
    onClose();
  };

  const selectedReason = deleteReasons.find((r) => r.value === reason);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] p-0 overflow-hidden border-0 bg-transparent">
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-red-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-pink-300 animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            <Zap className="w-3 h-3 opacity-40" />
          </div>
          <div
            className="absolute bottom-6 left-12 text-orange-300 animate-ping"
            style={{ animationDelay: "1s" }}
          >
            <Star className="w-2 h-2 opacity-30" />
          </div>
          <div
            className="absolute bottom-12 right-6 text-red-200 animate-pulse"
            style={{ animationDelay: "1.5s" }}
          >
            <Sparkles className="w-3 h-3 opacity-50" />
          </div>
          <div
            className="absolute top-1/2 left-4 text-pink-200 animate-bounce"
            style={{ animationDelay: "2s" }}
          >
            <AlertTriangle className="w-3 h-3 opacity-40" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-red-500 via-pink-500 via-orange-500 to-yellow-500 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-red-50 via-pink-50 to-orange-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Enhanced Header */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-red-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* Warning icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-pink-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-10"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 via-pink-600 to-orange-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-2">
                ⚠️ Xác nhận xóa đơn hàng
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Bạn có chắc chắn muốn xóa đơn hàng của khách hàng:
                <br />
                <span className="font-bold text-red-600">
                  {orderDetail.customer_name}
                </span>
                ?
                <br />
                <span className="text-red-500 font-bold text-sm">
                  ⚠️ Hành động này không thể hoàn tác!
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8 space-y-6">
              {/* Order info card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-pink-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-red-50 to-white p-4 rounded-2xl border-2 border-red-200 shadow-inner">
                  <div className="flex items-center gap-3 mb-2">
                    <UserX className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-gray-700">
                      Thông tin đơn hàng sẽ bị xóa:
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-red-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-mono font-bold text-red-600">
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
                <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                  <MessageSquare className="w-4 h-4 text-red-500" />
                  Lý do xóa <span className="text-red-500">*</span>
                </label>

                {!useCustomReason ? (
                  <div className="space-y-4">
                    {/* Enhanced Select */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-pink-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="relative h-14 text-base border-2 border-red-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-red-300">
                          <div className="flex items-center gap-3">
                            {selectedReason && (
                              <selectedReason.icon className="w-5 h-5 text-red-500" />
                            )}
                            <SelectValue placeholder="🤔 Chọn lý do xóa..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="border-2 border-red-200 rounded-xl shadow-xl">
                          {deleteReasons.map((reasonOption) => {
                            const ReasonIcon = reasonOption.icon;
                            return (
                              <SelectItem
                                key={reasonOption.value}
                                value={reasonOption.value}
                                className="text-base py-3 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200 cursor-pointer"
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
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Switch to custom button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUseCustomReason(true)}
                      className="group relative overflow-hidden w-full h-12 text-base font-medium border-2 border-purple-300 hover:border-purple-400 bg-white hover:bg-purple-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-pink-200 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"></div>
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                        <span>✍️ Nhập lý do khác</span>
                      </div>
                    </Button>
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
                          placeholder="✍️ Nhập lý do xóa chi tiết..."
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
                      className="group relative overflow-hidden w-full h-12 text-base font-medium border-2 border-red-300 hover:border-red-400 bg-white hover:bg-red-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-pink-200 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"></div>
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
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

              {/* Delete Button */}
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                disabled={loading || (!reason && !customReason.trim())}
                className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold bg-gradient-to-r from-red-500 via-pink-600 to-red-600 hover:from-red-600 hover:via-pink-700 hover:to-red-700 border-0 shadow-2xl hover:shadow-red-500/50 transform hover:scale-110 hover:-translate-y-1 transition-all duration-500 ease-out rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[140px] justify-center"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                <div className="absolute inset-0 bg-gradient-to-r from-red-400/50 to-pink-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-5 h-5 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      <span className="relative z-10">🗑️ Xóa</span>
                    </span>
                  </>
                )}
              </Button>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                    Đang xóa đơn hàng...
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

export default DeleteOrderDetailModal;
