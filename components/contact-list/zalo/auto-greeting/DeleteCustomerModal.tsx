import React from "react";
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
  UserX,
} from "lucide-react";

interface DeleteCustomerModalProps {
  customer: {
    id: string;
    zaloDisplayName: string;
    salutation?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  customer,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    onClose();
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="!max-w-[25vw] !max-h-[95vh] p-0 overflow-auto border-0 bg-transparent no-scrollbar-modal"
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        <style>{`.no-scrollbar-modal { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>
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
        <div className="relative p-1 bg-gradient-to-r from-red-500 via-pink-500 to-yellow-500 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-red-50 to-orange-50 backdrop-blur-xl rounded-3xl shadow-2xl">
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
                ⚠️ Xác nhận xóa khách hàng
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Bạn có chắc chắn muốn xóa khách hàng:
                <br />
                <span className="font-bold text-red-600">
                  {customer.zaloDisplayName}
                  {customer.salutation && ` (${customer.salutation})`}
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
              {/* Customer info card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-pink-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-red-50 to-white p-4 rounded-2xl border-2 border-red-200 shadow-inner">
                  <div className="flex items-center gap-3 mb-2">
                    <UserX className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-gray-700">
                      Thông tin khách hàng sẽ bị xóa:
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-red-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-mono font-bold text-red-600">
                        #{customer.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-600">Tên Zalo:</span>
                      <span className="font-semibold text-gray-800">
                        {customer.zaloDisplayName}
                      </span>
                    </div>
                    {customer.salutation && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-600">Xưng hô:</span>
                        <span className="font-semibold text-gray-800">
                          {customer.salutation}
                        </span>
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
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="h-12 px-6 bg-white text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 justify-center border-2 border-gray-200"
              >
                {loading ? (
                  <span className="flex items-start justify-center">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                    Đang hủy...
                  </span>
                ) : (
                  <span className="flex items-start justify-center">
                    <X className="w-5 h-5 mr-1" />
                    Hủy
                  </span>
                )}
              </Button>

              {/* Delete Button */}
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                disabled={loading}
                className="h-12 px-6 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 justify-center"
              >
                {loading ? (
                  <span className="flex items-start justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xóa...
                  </span>
                ) : (
                  <span className="flex items-start justify-center">
                    <Trash2 className="w-5 h-5 mr-1" />
                    Xóa
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
                    Đang xóa khách hàng...
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

export default DeleteCustomerModal;
