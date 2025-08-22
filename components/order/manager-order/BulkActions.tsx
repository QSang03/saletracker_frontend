import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, FileText, Sparkles, Zap, Star } from "lucide-react";
import { OrderDetail } from "@/types";

interface BulkActionsProps {
  selectedOrders: OrderDetail[];
  onBulkDelete: () => void;
  onBulkExtend: () => void;
  onBulkNotes: () => void;
  onBulkHide?: () => void;
  loading?: boolean;
  canAct?: boolean; // when false, disable bulk actions due to ownership
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedOrders,
  onBulkDelete,
  onBulkExtend,
  onBulkNotes,
  onBulkHide,
  loading = false,
  canAct = true,
}) => {
  if (selectedOrders.length === 0) {
    return null;
  }

  // Kiểm tra xem có đơn hàng nào không được phép gia hạn không
  const invalidExtendOrders = selectedOrders.filter(
    (order) => order.status === "completed" || order.status === "demand"
  );
  const validExtendOrders = selectedOrders.filter(
    (order) => order.status !== "completed" && order.status !== "demand"
  );
  const canExtend = validExtendOrders.length > 0; // Có ít nhất 1 đơn hợp lệ
  const showExtendButton = canExtend; // Chỉ hiển thị nút nếu có đơn hợp lệ

  return (
    <div className="mb-8 overflow-hidden relative">
      {/* Floating background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-4 text-blue-300 animate-pulse">
          <Star className="w-3 h-3 opacity-60" />
        </div>
        <div
          className="absolute top-6 right-8 text-purple-300 animate-bounce"
          style={{ animationDelay: "0.5s" }}
        >
          <Zap className="w-2 h-2 opacity-40" />
        </div>
        <div
          className="absolute bottom-3 left-8 text-pink-300 animate-ping"
          style={{ animationDelay: "1s" }}
        >
          <Star className="w-2 h-2 opacity-30" />
        </div>
      </div>

      {/* Animated container with enhanced gradient border */}
      <div className="relative p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 rounded-2xl animate-gradient-shift">
        <div className="relative bg-gradient-to-br from-white via-blue-50 to-purple-50 backdrop-blur-xl border-0 rounded-2xl p-6 shadow-2xl">
          {/* Enhanced floating sparkles */}
          <div className="absolute top-3 right-3 text-purple-400 animate-bounce">
            <Sparkles className="w-5 h-5 drop-shadow-lg" />
          </div>
          <div
            className="absolute top-2 right-8 text-blue-400 animate-pulse"
            style={{ animationDelay: "0.3s" }}
          >
            <Sparkles className="w-3 h-3" />
          </div>

          {/* Main content with enhanced spacing */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Selection counter with mega pulsing effect */}
            <div className="flex items-center gap-4 group">
              <div className="relative">
                {/* Triple pulse rings */}
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                <div
                  className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-20"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <div
                  className="absolute inset-0 bg-pink-400 rounded-full animate-ping opacity-10"
                  style={{ animationDelay: "1s" }}
                ></div>

                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-2xl border-2 border-white">
                  {selectedOrders.length}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                                 <div className="text-base font-bold bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 bg-clip-text text-transparent">
                   {selectedOrders.length} đơn hàng chi tiết
                 </div>
                <div className="text-sm text-gray-600 font-medium">
                  đã được chọn ✨
                </div>
                
              </div>
            </div>

            {/* Action buttons with MEGA spacing and effects */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-start lg:justify-end w-full lg:w-auto">
              {/* Hide Button */}
              {onBulkHide && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onBulkHide}
                  disabled={loading || !canAct}
                  className="group relative overflow-hidden flex items-center justify-center gap-3 
                           whitespace-nowrap min-w-[140px] px-6 py-4 text-base font-semibold
                           bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 
                           hover:from-amber-500 hover:via-amber-600 hover:to-orange-600 
                           border-0 shadow-2xl hover:shadow-amber-500/40 
                           transform hover:scale-110 hover:-translate-y-1
                           transition-all duration-500 ease-out rounded-2xl text-white
                           active:scale-95 active:translate-y-0"
                  title={!canAct ? "Chỉ thao tác với đơn hàng chi tiết do bạn sở hữu" : undefined}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                                -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                  ></div>
                  Ẩn ({selectedOrders.length})
                </Button>
              )}
              {/* Delete Button - Enhanced */}
              <Button
                variant="destructive"
                size="lg"
                onClick={onBulkDelete}
                disabled={loading || !canAct}
                className="group relative overflow-hidden flex items-center justify-center gap-3 
                         whitespace-nowrap min-w-[160px] px-6 py-4 text-base font-semibold
                         bg-gradient-to-r from-red-500 via-red-600 to-pink-600 
                         hover:from-red-600 hover:via-red-700 hover:to-pink-700 
                         border-0 shadow-2xl hover:shadow-red-500/50 
                         transform hover:scale-110 hover:-translate-y-1
                         transition-all duration-500 ease-out rounded-2xl text-white
                         active:scale-95 active:translate-y-0"
                title={!canAct ? "Chỉ thao tác với đơn hàng do bạn sở hữu" : undefined}
              >
                {/* Shimmer effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                              -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                ></div>

                <div
                  className="absolute inset-0 bg-gradient-to-r from-red-400/50 to-pink-500/50 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                ></div>
                <span className="flex items-center gap-2">
                  <Trash2
                    className="w-5 h-5 flex-shrink-0 relative z-10
                                 group-hover:rotate-12 group-hover:scale-110 
                                 transition-transform duration-300 drop-shadow-lg"
                  />

                  <span className="relative z-10 tracking-wide">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        Đang xóa...
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </span>
                    ) : (
                      `Xóa (${selectedOrders.length})`
                    )}
                  </span>
                </span>
              </Button>

                             {/* Extend Button - Enhanced */}
               {showExtendButton && (
                 <Button
                   variant="default"
                   size="lg"
                   onClick={onBulkExtend}
                   disabled={loading || !canAct}
                   className="group relative overflow-hidden flex items-center justify-center gap-3 
                            whitespace-nowrap min-w-[180px] px-6 py-4 text-base font-semibold
                            bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 hover:from-blue-600 hover:via-blue-700 hover:to-cyan-700 hover:shadow-blue-500/50 hover:scale-110 hover:-translate-y-1
                            border-0 shadow-2xl transform transition-all duration-500 ease-out rounded-2xl text-white
                            active:scale-95 active:translate-y-0"
                   title={
                     !canAct
                       ? "Chỉ thao tác với đơn hàng chi tiết do bạn sở hữu"
                       : invalidExtendOrders.length > 0
                       ? `Chỉ gia hạn ${validExtendOrders.length} đơn hàng chi tiết hợp lệ, bỏ qua ${invalidExtendOrders.length} đơn không hợp lệ`
                       : undefined
                   }
                 >
                {/* Shimmer effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                              -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                ></div>

                <div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400/50 to-cyan-500/50 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                ></div>
                <span className="flex items-center gap-2">
                  <Clock
                    className="w-5 h-5 flex-shrink-0 relative z-10
                               group-hover:rotate-180 group-hover:scale-110 
                               transition-transform duration-700 drop-shadow-lg"
                  />

                  <span className="relative z-10 tracking-wide">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        Đang gia hạn...
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </span>
                                         ) : invalidExtendOrders.length > 0 ? (
                       `Gia hạn (${validExtendOrders.length} đơn)`
                     ) : (
                       "Gia hạn (+4 ngày)"
                     )}
                   </span>
                 </span>
               </Button>
               )}

              {/* Notes Button - Enhanced */}
              <Button
                variant="default"
                size="lg"
                onClick={onBulkNotes}
                disabled={loading || !canAct}
                className="group relative overflow-hidden flex items-center justify-center gap-3 
                         whitespace-nowrap min-w-[140px] px-6 py-4 text-base font-semibold
                         bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 
                         hover:from-green-600 hover:via-green-700 hover:to-emerald-700 
                         border-0 shadow-2xl hover:shadow-green-500/50 
                         transform hover:scale-110 hover:-translate-y-1
                         transition-all duration-500 ease-out rounded-2xl text-white
                         active:scale-95 active:translate-y-0"
                title={!canAct ? "Chỉ thao tác với đơn hàng chi tiết do bạn sở hữu" : undefined}
              >
                {/* Shimmer effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                              -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                ></div>

                <div
                  className="absolute inset-0 bg-gradient-to-r from-green-400/50 to-emerald-500/50 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                ></div>

                <span className="flex items-center gap-2">
                  <FileText
                    className="w-5 h-5 flex-shrink-0 relative z-10
                                  group-hover:scale-125 group-hover:rotate-6 
                                  transition-transform duration-300 drop-shadow-lg"
                  />

                  <span className="relative z-10 tracking-wide">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        Cập nhật...
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </span>
                    ) : (
                      "Ghi chú"
                    )}
                  </span>
                </span>
              </Button>
            </div>
          </div>

          {/* Super animated progress bar when loading */}
          {loading && (
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-200 to-gray-300 overflow-hidden rounded-b-2xl">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 animate-gradient-slide"></div>
              <div className="absolute h-full w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkActions;
