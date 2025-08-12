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
  Trash2,
  AlertTriangle,
  Sparkles,
  Zap,
  Star,
  X,
  ChevronDown,
} from "lucide-react";

interface BulkDeleteModalProps {
  selectedOrders: OrderDetail[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  selectedOrders,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowConfirm(false);
    onConfirm();
  };

  const handleClose = () => {
    setShowConfirm(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 bg-transparent">
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-red-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-orange-300 animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            <Zap className="w-3 h-3 opacity-40" />
          </div>
          <div
            className="absolute bottom-6 left-12 text-pink-300 animate-ping"
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
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-red-500 via-pink-500 to-yellow-500 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-red-50 to-orange-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Header with enhanced design */}
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
                    className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-2">
                ⚠️ Xóa {selectedOrders.length} đơn hàng
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Bạn có chắc chắn muốn xóa{" "}
                <span className="font-bold text-red-600">
                  {selectedOrders.length}
                </span>{" "}
                đơn hàng đã chọn?
                <br />
                <span className="text-red-500 font-semibold">
                  ⚠️ Hành động này có thể ảnh hưởng đến dữ liệu thống kê và báo cáo của bạn.
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8 space-y-6">
              {/* Order list with enhanced design */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative max-h-40 overflow-y-auto border-2 border-gray-200 rounded-2xl p-4 bg-gradient-to-br from-gray-50 to-white shadow-inner">
                  <Label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    Danh sách đơn hàng sẽ bị xóa:
                  </Label>

                  <div className="space-y-2">
                    {selectedOrders.slice(0, 5).map((order, index) => (
                      <div
                        key={order.id}
                        className="text-sm bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 hover:scale-[1.02] transform"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-semibold text-blue-600">
                            #{order.id}
                          </span>
                          <span className="font-medium text-gray-800">
                            {order.customer_name || "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {selectedOrders.length > 5 && (
                      <div className="text-center py-2">
                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 rounded-full font-medium">
                          <ChevronDown className="w-4 h-4 animate-bounce" />
                          và {selectedOrders.length - 5} đơn hàng khác
                          <ChevronDown
                            className="w-4 h-4 animate-bounce"
                            style={{ animationDelay: "0.3s" }}
                          />
                        </div>
                      </div>
                    )}
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

              {/* Delete Button */}
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={loading}
                className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold
                         bg-gradient-to-r from-red-500 via-red-600 to-pink-600 
                         hover:from-red-600 hover:via-red-700 hover:to-pink-700 
                         border-0 shadow-2xl hover:shadow-red-500/50 
                         transform hover:scale-110 hover:-translate-y-1
                         transition-all duration-500 ease-out rounded-xl text-white
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         min-w-[160px] justify-center"
              >
                {/* Shimmer effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                              -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                ></div>

                <div
                  className="absolute inset-0 bg-gradient-to-r from-red-400/50 to-pink-500/50 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                ></div>

                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Đang xóa...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                    <span className="relative z-10">
                      Xóa {selectedOrders.length} đơn
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

      {/* ✅ Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Xác nhận xóa đơn hàng"
        message={
          <div className="space-y-2">
            <p>Bạn có chắc chắn muốn xóa <strong>{selectedOrders.length}</strong> đơn hàng đã chọn?</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 mb-5">
              <p className="text-sm text-red-800">
                <strong>⚠️ Cảnh báo:</strong> Hành động này <strong>Hành động này có thể ảnh hưởng đến dữ liệu thống kê và báo cáo của bạn</strong>!
              </p>
            </div>
          </div>
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
        confirmText="Xóa đơn hàng"
        cancelText="Hủy"
      />
    </Dialog>
  );
};

export default BulkDeleteModal;
