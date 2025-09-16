import React, { useState } from "react";
import { OrderDetail } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  AlertTriangle,
  Sparkles,
  Zap,
  Star,
  X,
  Package,
} from "lucide-react";

interface DeleteProductCodeModalProps {
  orderDetail: OrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

const DeleteProductCodeModal: React.FC<DeleteProductCodeModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    console.log('🔴 Nút "Xóa mã sản phẩm" được bấm, reason:', reason);
    onConfirm(reason || "Xóa mã sản phẩm khỏi đơn hàng");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[25vw] !max-h-[95vh] p-0 overflow-auto border-0 bg-transparent no-scrollbar-modal" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <DialogTitle className="sr-only">Xác nhận xóa mã sản phẩm</DialogTitle>
        <style>{`.no-scrollbar-modal { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-red-300 animate-pulse">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="absolute top-8 right-8 text-red-200 animate-bounce">
            <Zap className="h-3 w-3" />
          </div>
          <div className="absolute bottom-6 left-8 text-red-300 animate-pulse">
            <Star className="h-3 w-3" />
          </div>
          <div className="absolute bottom-8 right-6 text-red-200 animate-bounce">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        {/* Main modal content */}
        <div className="relative bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-3">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Xác nhận xóa mã sản phẩm</h2>
                  <p className="text-red-100 text-sm">Chỉ xóa mã sản phẩm khỏi đơn hàng</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Warning message */}
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Bạn có chắc chắn muốn xóa mã sản phẩm khỏi đơn hàng này?</p>
                <p className="mt-1 text-red-600">
                  Đơn hàng sẽ vẫn tồn tại nhưng không còn liên kết với sản phẩm nào.
                </p>
              </div>
            </div>

            {/* Order information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-gray-900">Thông tin đơn hàng:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">ID:</span>
                  <span className="ml-2 font-mono text-red-600">#{orderDetail.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">Khách hàng:</span>
                  <span className="ml-2 font-medium">{orderDetail.customer_name || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Mã sản phẩm hiện tại:</span>
                  <span className="ml-2 font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {orderDetail.product?.productCode || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Lý do xóa mã sản phẩm (tùy chọn):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do xóa mã sản phẩm..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Hủy</span>
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>{loading ? "Đang xóa..." : "Xóa mã sản phẩm"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProductCodeModal;
