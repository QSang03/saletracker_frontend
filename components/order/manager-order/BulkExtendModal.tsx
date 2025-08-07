import React, { useState } from "react";
import { OrderDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Clock,
  Calendar,
  Sparkles,
  Zap,
  Star,
  X,
  ChevronRight,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface BulkExtendModalProps {
  selectedOrders: OrderDetail[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const BulkExtendModal: React.FC<BulkExtendModalProps> = ({
  selectedOrders,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleExtendClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmExtend = () => {
    setShowConfirm(false);
    onConfirm();
  };

  const handleClose = () => {
    setShowConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-0 bg-transparent">
          {/* Floating background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-4 left-6 text-blue-300 animate-pulse">
              <Star className="w-2 h-2 opacity-60" />
            </div>
            <div
              className="absolute top-8 right-8 text-cyan-300 animate-bounce"
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
              className="absolute bottom-12 right-6 text-blue-200 animate-pulse"
              style={{ animationDelay: "1.5s" }}
            >
              <Sparkles className="w-3 h-3 opacity-50" />
            </div>
          </div>

          {/* Main modal container with stunning effects */}
          <div className="relative p-1 bg-gradient-to-r from-blue-500 via-cyan-500 via-indigo-500 to-purple-500 rounded-3xl animate-gradient-shift">
            <div className="relative bg-gradient-to-br from-white via-blue-50 via-cyan-50 to-indigo-50 backdrop-blur-xl rounded-3xl shadow-2xl">
              {/* Header with enhanced design */}
              <DialogHeader className="relative p-8 pb-4">
                {/* Floating sparkles in header */}
                <div className="absolute top-4 right-4 text-blue-400 animate-bounce">
                  <Sparkles className="w-5 h-5 drop-shadow-lg" />
                </div>

                {/* Time icon with pulse effect */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                    <div
                      className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-20"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                      <Clock className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                </div>

                <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  ⏰ Gia hạn {selectedOrders.length} đơn hàng
                </DialogTitle>

                <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                  Gia hạn thêm{" "}
                  <span className="font-bold text-blue-600">+4 ngày</span> cho{" "}
                  <span className="font-bold text-cyan-600">
                    {selectedOrders.length}
                  </span>{" "}
                  đơn hàng đã chọn.
                  <br />
                  <span className="text-green-600 font-semibold">
                    ✨ Thời gian xử lý sẽ được kéo dài.
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Main content */}
              <div className="px-8 pb-8 space-y-6">
                {/* Order list with enhanced design */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative max-h-48 overflow-y-auto border-2 border-blue-200 rounded-2xl p-4 bg-gradient-to-br from-blue-50 to-white shadow-inner">
                    <Label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      Danh sách đơn hàng sẽ được gia hạn:
                    </Label>

                    <div className="space-y-3">
                      {selectedOrders.slice(0, 5).map((order, index) => (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-200 hover:scale-[1.02] transform group/item"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-semibold text-blue-600">
                                #{order.id}
                              </span>
                              <span className="font-medium text-gray-800">
                                {order.customer_name || "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                                <Clock className="w-3 h-3 text-blue-600" />
                                <span className="font-medium text-blue-700">
                                  {order.extended || 4} ngày
                                </span>
                              </div>

                              <ArrowRight className="w-4 h-4 text-gray-400 group-hover/item:text-blue-500 group-hover/item:scale-110 transition-all duration-200" />

                              <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-100 to-blue-100 px-3 py-1 rounded-full border border-cyan-200">
                                <Clock className="w-3 h-3 text-cyan-600" />
                                <span className="font-bold text-cyan-700">
                                  {(order.extended || 4) + 4} ngày
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {selectedOrders.length > 5 && (
                        <div className="text-center py-2">
                          <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gradient-to-r from-blue-100 to-cyan-100 px-4 py-2 rounded-full font-medium">
                            <ChevronRight className="w-4 h-4 animate-bounce" />
                            và {selectedOrders.length - 5} đơn hàng khác
                            <ChevronRight
                              className="w-4 h-4 animate-bounce"
                              style={{ animationDelay: "0.3s" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extension info with enhanced design */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-blue-200 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-blue-100 via-cyan-50 to-green-50 p-5 rounded-2xl border-2 border-blue-200 shadow-inner">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                        Chi tiết gia hạn
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          Mỗi đơn hàng sẽ được{" "}
                          <span className="font-bold text-blue-600">
                            gia hạn thêm +4 ngày
                          </span>
                        </span>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          Thời gian gia hạn được{" "}
                          <span className="font-bold text-cyan-600">
                            tính từ ngày tạo đơn gốc
                          </span>
                        </span>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          Gia hạn sẽ{" "}
                          <span className="font-bold text-green-600">
                            áp dụng ngay lập tức
                          </span>{" "}
                          sau khi xác nhận
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons with stunning effects */}
              <div className="flex justify-end gap-4 p-8 pt-0">
                {/* Cancel Button */}
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 text-base font-semibold
                           border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50
                           rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105
                           transition-all duration-300 ease-out min-w-[120px]"
                >
                  <span className="flex items-center gap-2">
                    <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Hủy</span>
                  </span>
                </Button>

                {/* Extend Button */}
                <Button
                  variant="default"
                  onClick={handleExtendClick}
                  disabled={loading}
                  className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold
                           bg-gradient-to-r from-blue-500 via-cyan-600 to-indigo-600 
                           hover:from-blue-600 hover:via-cyan-700 hover:to-indigo-700 
                           border-0 shadow-2xl hover:shadow-blue-500/50 
                           transform hover:scale-110 hover:-translate-y-1
                           transition-all duration-500 ease-out rounded-xl text-white
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                           min-w-[180px] justify-center"
                >
                  {/* Shimmer effect */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                                -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                  ></div>

                  <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400/50 to-cyan-500/50 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                  ></div>

                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="relative z-10">Đang gia hạn...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5 relative z-10 group-hover:rotate-180 group-hover:scale-110 transition-transform duration-500" />
                      <span className="relative z-10">
                        Gia hạn {selectedOrders.length} đơn
                      </span>
                    </span>
                  )}
                </Button>
              </div>

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                      <div
                        className="absolute inset-2 w-12 h-12 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin"
                        style={{ animationDirection: "reverse" }}
                      ></div>
                    </div>
                    <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Đang gia hạn đơn hàng...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="✨ Xác nhận gia hạn"
        message={
          <div className="space-y-2">
            <p>
              Bạn có chắc chắn muốn gia hạn thêm{" "}
              <span className="font-bold text-blue-600">+4 ngày</span> cho{" "}
              <span className="font-bold text-cyan-600">
                {selectedOrders.length}
              </span>{" "}
              đơn hàng đã chọn?
            </p>
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Thời gian xử lý sẽ được kéo dài tự động</span>
              </div>
            </div>
          </div>
        }
        onConfirm={handleConfirmExtend}
        onCancel={() => setShowConfirm(false)}
        confirmText="🚀 Xác nhận gia hạn"
        cancelText="Hủy"
      />
    </>
  );
};

export default BulkExtendModal;
