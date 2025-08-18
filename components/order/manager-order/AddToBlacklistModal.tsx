import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OrderDetail } from "@/types";
import {
  Shield,
  AlertTriangle,
  Sparkles,
  Zap,
  Star,
  X,
  UserX,
  Ban,
  Eye,
  EyeOff,
  Lock,
  MessageSquare,
} from "lucide-react";

interface AddToBlacklistModalProps {
  orderDetail: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

const AddToBlacklistModal: React.FC<AddToBlacklistModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  // Extract customer ID from metadata
  const getCustomerId = (): string | null => {
    if (!orderDetail?.metadata) return null;

    try {
      if (typeof orderDetail.metadata === "string") {
        const parsed = JSON.parse(orderDetail.metadata);
        return parsed.customer_id || null;
      } else if (typeof orderDetail.metadata === "object") {
        return orderDetail.metadata.customer_id || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const customerId = getCustomerId();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[30vw] max-h-[95vh] p-0 overflow-auto border-0 bg-transparent no-scrollbar-modal" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <style>{`.no-scrollbar-modal { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-purple-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-violet-300 animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            <Zap className="w-3 h-3 opacity-40" />
          </div>
          <div
            className="absolute bottom-6 left-12 text-indigo-300 animate-ping"
            style={{ animationDelay: "1s" }}
          >
            <Star className="w-2 h-2 opacity-30" />
          </div>
          <div
            className="absolute bottom-12 right-6 text-purple-200 animate-pulse"
            style={{ animationDelay: "1.5s" }}
          >
            <Sparkles className="w-3 h-3 opacity-50" />
          </div>
          <div
            className="absolute top-1/2 left-4 text-violet-200 animate-bounce"
            style={{ animationDelay: "2s" }}
          >
            <Shield className="w-3 h-3 opacity-40" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-purple-500 via-violet-500 to-slate-600 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-purple-50 to-slate-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Enhanced Header */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-purple-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* Shield icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-violet-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-0 bg-slate-400 rounded-full animate-ping opacity-10"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 via-violet-600 to-slate-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <Shield className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-slate-600 bg-clip-text text-transparent mb-2 flex items-center justify-center gap-3">
                <Ban className="w-6 h-6 text-purple-600 animate-pulse" />
                🛡️ Thêm vào Blacklist
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-lg mx-auto leading-relaxed">
                Bạn có muốn thêm khách hàng này vào{" "}
                <span className="font-bold text-purple-600">blacklist</span>{" "}
                không?
                <br />
                <span className="text-slate-600 font-semibold">
                  🚫 Sau khi thêm, bạn sẽ không thấy các đơn hàng của khách hàng
                  này nữa.
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            {orderDetail && (
              <div className="px-8 pb-8 space-y-6">
                {/* Order info card with enhanced design */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-violet-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border-2 border-purple-200 shadow-inner">
                    <Label className="flex items-center gap-2 text-base font-bold text-gray-700 mb-4">
                      <UserX className="w-5 h-5 text-purple-500" />
                      Thông tin đơn hàng sẽ bị ẩn
                    </Label>

                    <div className="bg-white rounded-xl p-4 border border-purple-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          ID Đơn hàng:
                        </span>
                        <span className="font-mono font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-lg">
                          #{orderDetail.id}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          Khách hàng:
                        </span>
                        <span className="font-semibold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">
                          {orderDetail.customer_name || "N/A"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          Sản phẩm:
                        </span>
                        <span className="text-gray-700 bg-blue-100 px-3 py-1 rounded-lg max-w-xs truncate">
                          {orderDetail.product_name ||
                            orderDetail.raw_item ||
                            "N/A"}
                        </span>
                      </div>

                      {customerId && (
                        <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                          <span className="text-sm font-medium text-gray-600">
                            Customer ID:
                          </span>
                          <span className="font-mono text-sm text-green-700 bg-green-100 px-3 py-1 rounded-lg border border-green-200">
                            {customerId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning card if no customer ID */}
                {!customerId && (
                  <div className="relative group animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-2xl blur opacity-30"></div>
                    <div className="relative flex items-center gap-3 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl shadow-inner">
                      <div className="relative">
                        <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-30"></div>
                        <AlertTriangle className="relative w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-yellow-800 mb-1">
                          ⚠️ Không tìm thấy Customer ID
                        </div>
                        <span className="text-sm text-yellow-700">
                          Không tìm thấy customer_id trong metadata. Có thể
                          không thể thêm vào blacklist.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason textarea with enhanced design */}
                <div className="space-y-4">
                  <Label
                    htmlFor="reason"
                    className="flex items-center gap-2 text-base font-bold text-gray-700"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    Lý do (tùy chọn)
                  </Label>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-purple-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Textarea
                        id="reason"
                        placeholder="🤔 Nhập lý do thêm vào blacklist..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                        className="relative text-base border-2 border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-purple-300 resize-none min-h-[120px] pl-12 pt-4"
                      />

                      {/* Icon inside textarea */}
                      <div className="absolute left-4 top-4">
                        <Lock className="w-5 h-5 text-slate-400" />
                      </div>

                      {/* Character counter */}
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full border border-gray-200">
                        <span
                          className={`transition-colors duration-200 ${
                            reason.length > 0
                              ? "text-purple-600 font-medium"
                              : ""
                          }`}
                        >
                          {reason.length} ký tự
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Footer */}
            <DialogFooter className="relative p-8 pt-0">
              <div className="flex justify-end gap-4 w-full">
                {/* Cancel Button */}
                <Button
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

                {/* Blacklist Button */}
                <Button
                  onClick={handleConfirm}
                  disabled={
                    loading || !customerId || reason.trim().length === 0
                  }
                  className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold bg-gradient-to-r from-purple-500 via-violet-600 to-slate-600 hover:from-purple-600 hover:via-violet-700 hover:to-slate-700 border-0 shadow-2xl hover:shadow-purple-500/50 transform hover:scale-110 hover:-translate-y-1 transition-all duration-500 ease-out rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[180px] justify-center"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/50 to-violet-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="relative z-10">Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-2">
                        <Shield className="w-5 h-5 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                        <span className="relative z-10">
                          Thêm vào Blacklist
                        </span>
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                    Đang thêm vào blacklist...
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

export default AddToBlacklistModal;
