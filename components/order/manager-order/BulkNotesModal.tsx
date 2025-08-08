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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  FileText,
  Edit3,
  Sparkles,
  Zap,
  Star,
  X,
  ChevronDown,
  CheckCircle,
  PenTool,
  MessageSquare,
} from "lucide-react";

interface BulkNotesModalProps {
  selectedOrders: OrderDetail[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  loading?: boolean;
}

const BulkNotesModal: React.FC<BulkNotesModalProps> = ({
  selectedOrders,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmNotes = () => {
    setShowConfirm(false);
    onConfirm(notes.trim());
  };

  const handleClose = () => {
    setNotes("");
    setShowConfirm(false);
    onClose();
  };

  const isValid = notes.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-0 bg-transparent">
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-green-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-emerald-300 animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            <Zap className="w-3 h-3 opacity-40" />
          </div>
          <div
            className="absolute bottom-6 left-12 text-teal-300 animate-ping"
            style={{ animationDelay: "1s" }}
          >
            <Star className="w-2 h-2 opacity-30" />
          </div>
          <div
            className="absolute bottom-12 right-6 text-green-200 animate-pulse"
            style={{ animationDelay: "1.5s" }}
          >
            <Sparkles className="w-3 h-3 opacity-50" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-green-50 to-teal-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Header with enhanced design */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-green-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* Edit icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <Edit3 className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                ✏️ Thêm ghi chú cho {selectedOrders.length} đơn hàng
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Thêm ghi chú cho{" "}
                <span className="font-bold text-green-600">
                  {selectedOrders.length}
                </span>{" "}
                đơn hàng đã chọn.
                <br />
                <span className="text-emerald-600 font-semibold">
                  📝 Ghi chú sẽ được lưu vào từng đơn hàng.
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8 space-y-6">
              {/* Order list with enhanced design */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-emerald-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative max-h-40 overflow-y-auto border-2 border-green-200 rounded-2xl p-4 bg-gradient-to-br from-green-50 to-white shadow-inner">
                  <Label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <FileText className="w-4 h-4 text-green-500" />
                    Danh sách đơn hàng sẽ được thêm ghi chú:
                  </Label>

                  <div className="space-y-2">
                    {selectedOrders.slice(0, 5).map((order, index) => (
                      <div
                        key={order.id}
                        className="text-sm bg-white rounded-xl p-3 shadow-sm border border-green-100 hover:shadow-md transition-all duration-200 hover:scale-[1.02] transform group/item"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-semibold text-green-600">
                            #{order.id}
                          </span>
                          <span className="font-medium text-gray-800">
                            {order.customer_name || "N/A"}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            <MessageSquare className="w-3 h-3 text-emerald-500 group-hover/item:scale-110 transition-transform duration-200" />
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                              Sẽ thêm ghi chú
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {selectedOrders.length > 5 && (
                      <div className="text-center py-2">
                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-full font-medium">
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

              {/* Notes textarea with enhanced design */}
              <div className="space-y-4">
                <Label
                  htmlFor="bulk-notes"
                  className="flex items-center gap-2 text-base font-bold text-gray-700"
                >
                  <PenTool className="w-4 h-4 text-green-500" />
                  Ghi chú <span className="text-red-500">*</span>
                </Label>

                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-emerald-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                  <div className="relative">
                    <Textarea
                      id="bulk-notes"
                      placeholder="✍️ Nhập ghi chú chi tiết cho các đơn hàng..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                      className="relative text-base border-2 border-green-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-green-300 resize-none p-4"
                    />

                    {/* Character counter with animation */}
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full border border-gray-200">
                      <span
                        className={`transition-colors duration-200 ${
                          notes.length > 0 ? "text-green-600 font-medium" : ""
                        }`}
                      >
                        {notes.length} ký tự
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-400" />
                    Ghi chú này sẽ được thêm vào tất cả{" "}
                    <span className="font-semibold text-green-600">
                      {selectedOrders.length}
                    </span>{" "}
                    đơn hàng đã chọn.
                  </div>
                </div>
              </div>

              {/* Additional info with enhanced design */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-green-200 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-green-100 via-emerald-50 to-teal-50 p-5 rounded-2xl border-2 border-green-200 shadow-inner">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                      Lưu ý quan trọng
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">
                        Ghi chú sẽ được thêm vào{" "}
                        <span className="font-bold text-green-600">
                          trường "notes"
                        </span>{" "}
                        của mỗi đơn hàng
                      </span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">
                        Ghi chú mới sẽ{" "}
                        <span className="font-bold text-emerald-600">
                          thay thế hoàn toàn
                        </span>{" "}
                        ghi chú cũ (nếu có)
                      </span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">
                        Ghi chú{" "}
                        <span className="font-bold text-red-600">
                          không thể để trống
                        </span>
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

              {/* Update Button */}
              <Button
                variant="default"
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold
                         bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 
                         hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 
                         border-0 shadow-2xl hover:shadow-green-500/50 
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
                  className="absolute inset-0 bg-gradient-to-r from-green-400/50 to-emerald-500/50 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                ></div>

                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Đang cập nhật...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                    <span className="relative z-10">
                      Cập nhật {selectedOrders.length} đơn
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
                    <div className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Đang cập nhật ghi chú...
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
        title="Xác nhận cập nhật ghi chú"
        message={
          <div className="space-y-2">
            <p>Bạn có chắc chắn muốn cập nhật ghi chú cho <strong>{selectedOrders.length}</strong> đơn hàng đã chọn?</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Lưu ý:</strong> Ghi chú mới sẽ <strong>thay thế hoàn toàn</strong> ghi chú cũ (nếu có).
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-gray-600 font-medium">Nội dung ghi chú:</p>
              <p className="text-sm text-gray-800 mt-1 italic">"{notes.trim()}"</p>
            </div>
          </div>
        }
        onConfirm={handleConfirmNotes}
        onCancel={() => setShowConfirm(false)}
        confirmText="Xác nhận cập nhật"
        cancelText="Hủy"
      />
    </Dialog>
  );
};

export default BulkNotesModal;
