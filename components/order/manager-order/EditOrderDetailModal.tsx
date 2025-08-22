import React, { useState, useEffect } from "react";
import { OrderDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Edit3,
  Save,
  Sparkles,
  Zap,
  Star,
  CheckCircle,
  DollarSign,
  Clock,
  FileText,
  Settings,
  TrendingUp,
  Calendar,
  MessageSquare,
  Plus,
} from "lucide-react";

interface EditOrderDetailModalProps {
  orderDetail: OrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<OrderDetail>) => void;
  loading?: boolean;
}

const statusOptions = [
  {
    value: "pending",
    label: "Chờ xử lý",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  {
    value: "completed",
    label: "Đã chốt",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
  },
  {
    value: "demand",
    label: "Nhu cầu",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: TrendingUp,
  },
  {
    value: "quoted",
    label: "Chưa chốt",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: DollarSign,
  },
  {
    value: "confirmed",
    label: "Đã phản hồi",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: MessageSquare,
  },
];

const EditOrderDetailModal: React.FC<EditOrderDetailModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    status: orderDetail.status || "pending",
    unit_price: orderDetail.unit_price?.toString() || "0",
    notes: orderDetail.notes || "",
    extendDays: "", // Trường mới: số ngày gia hạn thêm, mặc định rỗng
  });

  useEffect(() => {
    setFormData({
      status: orderDetail.status || "pending",
      unit_price: orderDetail.unit_price?.toString() || "0",
      notes: orderDetail.notes || "",
      extendDays: "", // Reset về rỗng mỗi khi mở modal
    });
  }, [orderDetail]);

  // ✅ SỬA CHÍNH: Chỉ gửi số ngày user nhập, không cộng dồn (backend sẽ tự tính)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const additionalDays = parseInt(formData.extendDays);
    
    const updatedData: Partial<OrderDetail> = {
      id: orderDetail.id,
      status: formData.status as any,
      unit_price: parseInt(formData.unit_price) || 0,
      notes: formData.notes,
    };

    // CHỈ gửi số ngày user nhập (để backend tự cộng dồn, tránh duplicate calculation)
    // Và chỉ khi đơn hàng có thể gia hạn
    if (!isNaN(additionalDays) && additionalDays > 0 && canExtend) {
      updatedData.extended = additionalDays; // Chỉ gửi số user nhập
    }
    
    onSave(updatedData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const currentStatus = statusOptions.find(
    (option) => option.value === formData.status
  );
  const StatusIcon = currentStatus?.icon || Settings;

  // Kiểm tra xem đơn hàng có thể gia hạn không
  const canExtend = orderDetail.status !== "completed" && orderDetail.status !== "demand";
  
  // Tính toán giá trị preview (CHỈ để hiển thị cho user, không gửi đi)
  const currentExtended = orderDetail.extended || 4;
  const additionalDays = parseInt(formData.extendDays) || 0;
  const newExtended = currentExtended + additionalDays;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[60vw] max-h-[90vh] p-0 border-0 bg-transparent">
        {/* hide native scrollbars but keep scrolling functional */}
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{-ms-overflow-style:none; scrollbar-width:none;}`}</style>
        {/* Scrollable wrapper (vertical) */}
        <div className="max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Floating background particles */}
          <div className="absolute inset-0 pointer-events-none">
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
        </div>

          {/* Main modal container with stunning effects */}
          <div className="relative p-1 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-orange-50 to-yellow-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Header with enhanced design */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-orange-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* Edit icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <Edit3 className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent mb-2">
                ⚙️ Chỉnh sửa chi tiết đơn hàng
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Khách hàng:{" "}
                <span className="font-bold text-orange-600">
                  {orderDetail.customer_name}
                </span>
                <br />
                <span className="text-amber-600 font-semibold">
                  📋 Cập nhật thông tin đơn hàng
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Status Selection with enhanced design */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                    <StatusIcon className="w-4 h-4 text-orange-500" />
                    Trạng thái
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-200 to-amber-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleChange("status", value)}
                    >
                      <SelectTrigger className="relative h-14 text-base border-2 border-orange-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-orange-300">
                        <div className="flex items-center gap-3">
                          <StatusIcon className="w-5 h-5 text-orange-500" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="border-2 border-orange-200 rounded-xl shadow-xl">
                        {statusOptions.map((option) => {
                          const OptionIcon = option.icon;
                          return (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-base py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-200 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <OptionIcon className="w-4 h-4" />
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium border ${option.color}`}
                                >
                                  {option.label}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Input with enhanced design */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Giá (VNĐ)
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-emerald-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Input
                        type="number"
                        value={formData.unit_price}
                        onChange={(e) =>
                          handleChange("unit_price", e.target.value)
                        }
                        min="0"
                        className="relative h-14 text-base border-2 border-green-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-green-300 pl-12 pr-4"
                        placeholder="0"
                      />

                      {/* Currency icon inside input */}
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                      </div>

                      {/* Formatted value display */}
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                        {parseInt(formData.unit_price || "0").toLocaleString()}{" "}
                        ₫
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ Extension Section - THAY ĐỔI CHÍNH TẠI ĐÂY */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Gia hạn
                  </label>

                  {/* Hiển thị thời gian extend hiện tại */}
                  <div className={`p-4 rounded-xl border-2 ${
                    canExtend 
                      ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200" 
                      : "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        canExtend ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        <Clock className={`w-4 h-4 ${
                          canExtend ? "text-blue-600" : "text-gray-400"
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Thời hạn hiện tại</div>
                        <div className={`text-lg font-bold ${
                          canExtend ? "text-blue-600" : "text-gray-500"
                        }`}>
                          {currentExtended} ngày
                        </div>
                      </div>
                    </div>
                    
                    {/* Thông báo khi không thể gia hạn */}
                    {!canExtend && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <span>⚠️</span>
                          <span>Không thể gia hạn đơn hàng có trạng thái "{orderDetail.status === "completed" ? "Đã chốt" : "Nhu cầu"}"</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input để nhập số ngày muốn gia hạn thêm - chỉ hiển thị khi có thể gia hạn */}
                  {canExtend && (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-orange-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.extendDays}
                          onChange={(e) =>
                            handleChange("extendDays", e.target.value)
                          }
                          min="0"
                          placeholder="0"
                          className="relative h-14 text-base border-2 border-amber-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-amber-300 pl-12 pr-4"
                        />

                        {/* Plus icon inside input */}
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                          <Plus className="w-5 h-5 text-amber-500" />
                        </div>

                        {/* Label bên trong input */}
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                          + ngày
                        </div>
                      </div>

                      {/* Hiển thị preview kết quả (CHỈ để show cho user, không gửi đi) */}
                      {additionalDays > 0 && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                          <div className="flex items-center justify-center text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-green-500" />
                              <span className="text-gray-600">Sau khi gia hạn:</span>
                              <span className="font-bold text-green-600 text-base">
                                {newExtended} ngày
                              </span>
                            </div>
                          </div>
                          <div className="text-center mt-1 text-xs text-gray-500">
                            ({currentExtended} + {additionalDays} = {newExtended})
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes Textarea with enhanced design */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Ghi chú
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-pink-200 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => handleChange("notes", e.target.value)}
                        rows={4}
                        placeholder="📝 Nhập ghi chú chi tiết..."
                        className="relative text-base border-2 border-purple-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 focus:border-purple-300 resize-none pl-12 pt-4"
                      />

                      {/* Notes icon inside textarea */}
                      <div className="absolute left-4 top-4">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>

                      {/* Character counter */}
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full border border-gray-200">
                        <span
                          className={`transition-colors duration-200 ${
                            formData.notes.length > 0
                              ? "text-purple-600 font-medium"
                              : ""
                          }`}
                        >
                          {formData.notes.length} ký tự
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons - ĐÃ BỎ CANCEL BUTTON */}
                <div className="flex justify-end pt-6">
                  {/* Save Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold
                             bg-gradient-to-r from-orange-500 via-amber-600 to-red-600 
                             hover:from-orange-600 hover:via-amber-700 hover:to-red-700 
                             border-0 shadow-2xl hover:shadow-orange-500/50 
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
                      className="absolute inset-0 bg-gradient-to-r from-orange-400/50 to-amber-500/50 
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
                    <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    Đang lưu thông tin...
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditOrderDetailModal;
