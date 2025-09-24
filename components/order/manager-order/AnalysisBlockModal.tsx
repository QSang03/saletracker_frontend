import React, { useState, useMemo } from "react";
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
  BarChart3,
  FileText,
  TrendingUp,
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

interface AnalysisBlockModalProps {
  orderDetail: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    reason?: string;
    blockType: 'analysis' | 'reporting' | 'stats';
  }) => Promise<void>;
  loading?: boolean;
  checkContactBlocked?: (zaloContactId: string) => Promise<{ isBlocked: boolean; blockType?: string; reason?: string }>;
}

const AnalysisBlockModal: React.FC<AnalysisBlockModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  checkContactBlocked,
}) => {
  const [blockType, setBlockType] = useState<'analysis' | 'reporting' | 'stats'>('analysis');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleConfirm = async () => {
    try {
      setError(null); // Clear previous error
      setIsChecking(true);
      
      // Check if contact is already blocked before sending request
      if (checkContactBlocked && customerId) {
        const checkResult = await checkContactBlocked(customerId);
        if (checkResult.isBlocked) {
          setError(`Khách hàng này đã bị chặn phân tích (${checkResult.blockType}). Không thể chặn lại.`);
          setIsChecking(false);
          return;
        }
      }
      
      await onConfirm({
        reason: reason.trim() || undefined,
        blockType,
      });
      // Reset form and close modal only after successful confirmation
      setReason('');
      setBlockType('analysis');
      setError(null);
    } catch (error: any) {
      // Don't close modal if there's an error - chỉ hiển thị lỗi trong modal
      console.error('Error confirming analysis block:', error);
      
      // Xử lý các loại lỗi khác nhau
      let errorMessage = 'Có lỗi xảy ra khi chặn phân tích';
      
      if (error.message?.includes('Đã tồn tại analysis block')) {
        errorMessage = 'Khách hàng này đã bị chặn phân tích. Không thể chặn lại.';
      } else if (error.message?.includes('admin')) {
        errorMessage = 'Chỉ admin mới có quyền sử dụng tính năng này';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Không throw error ra ngoài để tránh hiển thị ở nơi khác
    } finally {
      setIsChecking(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setBlockType('analysis');
    setError(null);
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

  const blockTypeConfig = {
    analysis: {
      icon: BarChart3,
      label: 'Phân tích',
      description: 'Chặn khỏi các báo cáo phân tích dữ liệu',
      color: 'orange',
    },
    reporting: {
      icon: FileText,
      label: 'Báo cáo',
      description: 'Chặn khỏi các báo cáo tổng hợp',
      color: 'blue',
    },
    stats: {
      icon: TrendingUp,
      label: 'Thống kê',
      description: 'Chặn khỏi các thống kê và biểu đồ',
      color: 'green',
    },
  };

  const currentConfig = blockTypeConfig[blockType];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[30vw] max-h-[95vh] p-0 overflow-auto border-0 bg-transparent no-scrollbar-modal" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <style>{`.no-scrollbar-modal { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>
        
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-orange-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-amber-300 animate-bounce"
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
            className="absolute bottom-12 right-6 text-orange-200 animate-pulse"
            style={{ animationDelay: "1.5s" }}
          >
            <Sparkles className="w-3 h-3 opacity-50" />
          </div>
          <div
            className="absolute top-1/2 left-4 text-amber-200 animate-bounce"
            style={{ animationDelay: "2s" }}
          >
            <BarChart3 className="w-3 h-3 opacity-40" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-orange-50 to-amber-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Enhanced Header */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-orange-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* Block type icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-10"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <currentConfig.icon className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent mb-2 flex items-center justify-center gap-3">
                <Ban className="w-6 h-6 text-orange-600 animate-pulse" />
                🚫 Chặn Phân Tích
                <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded-full">ADMIN ONLY</span>
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-lg mx-auto leading-relaxed">
                <span className="text-red-600 font-bold">⚠️ Chức năng này chỉ dành cho Admin</span>
                <br />
                Bạn có muốn chặn khách hàng này khỏi{" "}
                <span className="font-bold text-orange-600">{currentConfig.label}</span>{" "}
                không?
                <br />
                <span className="text-amber-600 font-semibold">
                  📊 {currentConfig.description}
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            {orderDetail && (
              <div className="px-8 pb-8 space-y-6">
                {/* Order info card with enhanced design */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-200 to-amber-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-orange-50 to-white p-5 rounded-2xl border-2 border-orange-200 shadow-inner">
                    <Label className="flex items-center gap-2 text-base font-bold text-gray-700 mb-4">
                      <UserX className="w-5 h-5 text-orange-500" />
                      Thông tin đơn hàng sẽ bị chặn phân tích
                    </Label>

                    <div className="bg-white rounded-xl p-4 border border-orange-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          ID Đơn hàng:
                        </span>
                        <span className="font-mono font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">
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
                          không thể chặn phân tích.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="relative group animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-pink-200 rounded-2xl blur opacity-30"></div>
                    <div className="relative flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl shadow-inner">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30"></div>
                        <AlertTriangle className="relative w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-red-800 mb-1">
                          ❌ Lỗi khi chặn phân tích
                        </div>
                        <span className="text-sm text-red-700">
                          {error}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Block Type Selection */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2 text-base font-bold text-gray-700">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                    Loại chặn phân tích
                  </Label>

                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(blockTypeConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      const isActive = blockType === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setBlockType(key as any)}
                          disabled={loading}
                          className={`relative group p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                            isActive
                              ? `bg-gradient-to-br from-${config.color}-500 to-${config.color}-600 text-white border-${config.color}-600 shadow-lg`
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : `text-${config.color}-500`}`} />
                            <span className="font-semibold text-sm">{config.label}</span>
                            <span className={`text-xs text-center leading-tight ${
                              isActive ? 'text-white/80' : 'text-gray-500'
                            }`}>
                              {config.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reason textarea with enhanced design */}
                <div className="space-y-4">
                  <Label
                    htmlFor="reason"
                    className="flex items-center gap-2 text-base font-bold text-gray-700"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    Lý do (tùy chọn)
                  </Label>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-orange-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Textarea
                        id="reason"
                        placeholder="🤔 Nhập lý do chặn phân tích..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                        className="relative text-base border-2 border-amber-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-orange-300 resize-none min-h-[120px] pl-12 pt-4"
                      />

                      {/* Icon inside textarea */}
                      <div className="absolute left-4 top-4">
                        <Lock className="w-5 h-5 text-amber-400" />
                      </div>

                      {/* Character counter */}
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full border border-gray-200">
                        <span
                          className={`transition-colors duration-200 ${
                            reason.length > 0
                              ? "text-orange-600 font-medium"
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

                {/* Analysis Block Button */}
                <Button
                  onClick={handleConfirm}
                  disabled={loading || isChecking || !customerId}
                  className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold bg-gradient-to-r from-orange-500 via-amber-600 to-yellow-600 hover:from-orange-600 hover:via-amber-700 hover:to-yellow-700 border-0 shadow-2xl hover:shadow-orange-500/50 transform hover:scale-110 hover:-translate-y-1 transition-all duration-500 ease-out rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[180px] justify-center"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/50 to-amber-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

                  {loading || isChecking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="relative z-10">
                        {isChecking ? 'Đang kiểm tra...' : 'Đang xử lý...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-2">
                        <currentConfig.icon className="w-5 h-5 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                        <span className="relative z-10">
                          Chặn {currentConfig.label}
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
                    <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    Đang chặn phân tích...
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

export default AnalysisBlockModal;
