import React, { useState, useEffect, useMemo } from "react";
import { OrderDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Edit3,
  User,
  Save,
  Sparkles,
  Zap,
  Star,
  X,
  CheckCircle,
  UserCheck,
  ArrowRight,
} from "lucide-react";

interface EditCustomerNameModalProps {
  orderDetail: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderDetail: OrderDetail, newCustomerName: string) => void;
  loading?: boolean;
}

const EditCustomerNameModal: React.FC<EditCustomerNameModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onSave,
  loading = false,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // ✅ Check if this order detail has customer_id in metadata for bulk update warning
  const hasCustomerId = useMemo(() => {

    if (!orderDetail?.metadata) {
      return false;
    }
    try {
      const metadata = orderDetail.metadata;
      const exists = !!metadata.customer_id;
      return exists;
    } catch (error) {
      console.error("[hasCustomerId] error parsing metadata:", error);
      return false;
    }
  }, [orderDetail?.metadata]);

  const getCustomerInfo = useMemo(() => {

    if (!orderDetail?.metadata) {
      return null;
    }
    try {
      const metadata = orderDetail.metadata;
      const info = {
        customerId: metadata.customer_id,
        conversationType: metadata.conversation_info?.is_group,
      };
      return info;
    } catch (error) {
      console.error("[getCustomerInfo] error parsing metadata:", error);
      return null;
    }
  }, [orderDetail?.metadata]);

  useEffect(() => {
  }, [hasCustomerId, getCustomerInfo, customerName]);

  useEffect(() => {
    if (orderDetail) {
      setCustomerName(orderDetail.customer_name || "");
    }
  }, [orderDetail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderDetail) return;

    // Kiểm tra nếu tên không thay đổi
    if (customerName.trim() === (orderDetail.customer_name || "").trim()) {
      onClose();
      return;
    }

    // Hiển thị confirmation dialog
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (orderDetail && customerName.trim()) {
      onSave(orderDetail, customerName.trim());
      setShowConfirm(false);
      onClose();
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const handleModalClose = () => {
    setShowConfirm(false);
    onClose();
  };

  if (!orderDetail) return null;

  const hasChanged =
    customerName.trim() !== (orderDetail.customer_name || "").trim();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-[550px] p-0 overflow-hidden border-0 bg-transparent">
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
          </div>

          {/* Main modal container with stunning effects */}
          <div className="relative p-1 bg-gradient-to-r from-purple-500 via-violet-500 to-blue-500 rounded-3xl animate-gradient-shift">
            <div className="relative bg-gradient-to-br from-white via-purple-50 to-indigo-50 backdrop-blur-xl rounded-3xl shadow-2xl">
              {/* Header with enhanced design */}
              <DialogHeader className="relative p-8 pb-4">
                {/* Floating sparkles in header */}
                <div className="absolute top-4 right-4 text-purple-400 animate-bounce">
                  <Sparkles className="w-5 h-5 drop-shadow-lg" />
                </div>

                {/* Edit icon with pulse effect */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-30"></div>
                    <div
                      className="absolute inset-0 bg-violet-400 rounded-full animate-ping opacity-20"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                      <Edit3 className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                </div>

                <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  ✏️ Chỉnh sửa tên khách hàng
                </DialogTitle>

                <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                  Đơn hàng ID:{" "}
                  <span className="font-bold text-purple-600">
                    #{orderDetail.id}
                  </span>
                  <br />
                  <span className="text-violet-600 font-semibold">
                    👤 Cập nhật thông tin khách hàng
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Main content */}
              <div className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer name input with enhanced design */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                      <User className="w-4 h-4 text-purple-500" />
                      Tên khách hàng <span className="text-red-500">*</span>
                    </label>

                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-violet-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="👤 Nhập tên khách hàng..."
                          disabled={loading}
                          required
                          className="relative h-14 text-base border-2 border-purple-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-purple-300 pl-12 pr-4"
                        />

                        {/* User icon inside input */}
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                          <User className="w-5 h-5 text-purple-400" />
                        </div>

                        {/* Change indicator */}
                        {hasChanged && (
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Change preview */}
                    {hasChanged && (
                      <div className="animate-fadeIn">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-blue-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                          <div className="relative bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 rounded-xl border-2 border-green-200 shadow-inner">
                            <div className="flex items-center gap-3 mb-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <span className="text-sm font-semibold text-gray-700">
                                Xem trước thay đổi:
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-2 bg-red-100 px-3 py-2 rounded-lg border border-red-200">
                                <span className="text-red-600 font-medium">
                                  Cũ:
                                </span>
                                <span className="text-gray-700">
                                  {orderDetail.customer_name || "Không có"}
                                </span>
                              </div>

                              <ArrowRight className="w-4 h-4 text-gray-400 animate-bounce" />

                              <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-lg border border-green-200">
                                <span className="text-green-600 font-medium">
                                  Mới:
                                </span>
                                <span className="text-gray-700 font-semibold">
                                  {customerName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ✅ Warning about bulk update */}
                    {hasChanged && hasCustomerId && getCustomerInfo && (
                      <div className="animate-fadeIn mt-3">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                          <div className="relative bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-4 rounded-xl border-2 border-yellow-300 shadow-inner">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center border border-yellow-300 mt-0.5">
                                <span className="text-yellow-600 text-sm font-bold">
                                  !
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-700 mb-1">
                                  🔄 Cập nhật hàng loạt
                                </div>
                                <div className="text-xs text-gray-600 leading-relaxed">
                                  Hệ thống sẽ tự động cập nhật tên khách hàng
                                  cho <strong>tất cả đơn hàng</strong> có cùng
                                  Customer ID:
                                  <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded ml-1">
                                    {getCustomerInfo.customerId}
                                  </span>
                                  <br />
                                  Loại:{" "}
                                  <span className="font-semibold text-purple-600">
                                    {getCustomerInfo.conversationType ===
                                    "private"
                                      ? "👤 Chat riêng"
                                      : "👥 Nhóm chat"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons with stunning effects */}
                  <div className="flex justify-end gap-4 pt-4">
                    {/* Cancel Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleModalClose}
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

                    {/* Save Button */}
                    <Button
                      type="submit"
                      disabled={loading || !customerName.trim() || !hasChanged}
                      className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold
                               bg-gradient-to-r from-purple-500 via-violet-600 to-indigo-600 
                               hover:from-purple-600 hover:via-violet-700 hover:to-indigo-700 
                               border-0 shadow-2xl hover:shadow-purple-500/50 
                               transform hover:scale-110 hover:-translate-y-1
                               transition-all duration-500 ease-out rounded-xl text-white
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                               min-w-[140px] justify-center"
                    >
                      {/* Shimmer effect */}
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                                    -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                      ></div>

                      <div
                        className="absolute inset-0 bg-gradient-to-r from-purple-400/50 to-violet-500/50 
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                      ></div>

                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="relative z-10">Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            <Save className="w-5 h-5 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                            <span className="relative z-10">Lưu</span>
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

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
                      Đang lưu thông tin...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        title="✨ Xác nhận thay đổi tên khách hàng"
        message={
          <div className="space-y-4">
            <p className="text-base">
              Bạn có chắc chắn muốn thay đổi tên khách hàng?
            </p>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl blur opacity-30"></div>
              <div className="relative bg-gradient-to-br from-purple-50 via-violet-50 to-blue-50 p-4 rounded-xl border-2 border-purple-200 shadow-inner">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center border border-red-200">
                      <User className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-red-600">
                        Tên hiện tại:
                      </div>
                      <div className="text-base font-semibold text-gray-800">
                        {orderDetail.customer_name || "Không có"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-gray-400 animate-bounce" />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                      <UserCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-600">
                        Tên mới:
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {customerName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Bulk update warning in confirmation dialog */}
            {hasCustomerId && getCustomerInfo && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl blur opacity-30"></div>
                <div className="relative bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-4 rounded-xl border-2 border-yellow-300 shadow-inner">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center border border-yellow-300">
                      <span className="text-yellow-600 text-lg font-bold">
                        ⚠️
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-700 mb-2">
                        🔄 Cập nhật hàng loạt
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed space-y-1">
                        <div>
                          Hệ thống sẽ tự động cập nhật tên cho{" "}
                          <strong>tất cả đơn hàng</strong> có cùng Customer ID.
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                            ID: {getCustomerInfo.customerId}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {getCustomerInfo.conversationType === "private"
                              ? "👤 Chat riêng"
                              : "👥 Nhóm chat"}
                          </span>
                        </div>
                        <div className="text-xs text-orange-600 font-medium mt-2">
                          ℹ️ Thay đổi này sẽ ảnh hưởng đến nhiều đơn hàng cùng
                          lúc.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
        confirmText="🚀 Xác nhận"
        cancelText="Hủy"
      />
    </>
  );
};

export default EditCustomerNameModal;
