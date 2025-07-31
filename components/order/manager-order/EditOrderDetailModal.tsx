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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditOrderDetailModalProps {
  orderDetail: OrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<OrderDetail>) => void;
  loading?: boolean;
}

const statusOptions = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "demand", label: "Yêu cầu" },
  { value: "quoted", label: "Đã báo giá" },
  { value: "confirmed", label: "Đã phản hồi" },
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
    notes: orderDetail.notes || "", // ✅ Thay đổi từ customer_request_summary thành notes
    extended: orderDetail.extended?.toString() || "4",
  });

  useEffect(() => {
    setFormData({
      status: orderDetail.status || "pending",
      unit_price: orderDetail.unit_price?.toString() || "0",
      notes: orderDetail.notes || "", // ✅ Thay đổi từ customer_request_summary thành notes
      extended: orderDetail.extended?.toString() || "4",
    });
  }, [orderDetail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: orderDetail.id,
      status: formData.status as any,
      unit_price: parseInt(formData.unit_price) || 0,
      notes: formData.notes, // ✅ Thay đổi từ customer_request_summary thành notes
      extended: parseInt(formData.extended) || 4,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa chi tiết đơn hàng</DialogTitle>
          <DialogDescription>
            Khách hàng: {orderDetail.customer_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Giá (VNĐ)</label>
            <Input
              type="number"
              value={formData.unit_price}
              onChange={(e) => handleChange("unit_price", e.target.value)}
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Gia hạn (ngày){" "}
              {/* ✅ Sửa từ "tháng" thành "ngày" cho đúng với logic */}
            </label>
            <Input
              type="number"
              value={formData.extended}
              onChange={(e) => handleChange("extended", e.target.value)}
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Ghi chú{" "}
              {/* ✅ Thay đổi label từ "Yêu cầu khách hàng" thành "Ghi chú" */}
            </label>
            <Textarea
              value={formData.notes} // ✅ Thay đổi từ customer_request_summary thành notes
              onChange={(e) => handleChange("notes", e.target.value)} // ✅ Thay đổi field name
              rows={3}
              placeholder="Nhập ghi chú..." // ✅ Thay đổi placeholder
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditOrderDetailModal;
