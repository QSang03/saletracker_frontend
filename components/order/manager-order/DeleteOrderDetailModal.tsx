import React, { useState } from "react";
import { OrderDetail } from "@/types";
import { Button } from "@/components/ui/button";
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

interface DeleteOrderDetailModalProps {
  orderDetail: OrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

const deleteReasons = [
  "Khách không chốt",
  "Giá không theo được", 
  "Kẹt công nợ",
  "Đã chốt đơn",
  "Sai tên mặt hàng",
  "Mặt hàng của nhóm khác",
];

const DeleteOrderDetailModal: React.FC<DeleteOrderDetailModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [useCustomReason, setUseCustomReason] = useState(false);

  const handleConfirm = () => {
    const finalReason = useCustomReason ? customReason.trim() : reason;
    if (!finalReason) {
      alert("Vui lòng chọn hoặc nhập lý do xóa");
      return;
    }
    onConfirm(finalReason);
  };

  const handleClose = () => {
    setReason("");
    setCustomReason("");
    setUseCustomReason(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa đơn hàng</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa đơn hàng của khách hàng: {orderDetail.customer_name}?
            <br />
            <strong>Hành động này không thể hoàn tác!</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Lý do xóa <span className="text-red-500">*</span>
            </label>
            
            {!useCustomReason ? (
              <div className="space-y-2">
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lý do xóa" />
                  </SelectTrigger>
                  <SelectContent>
                    {deleteReasons.map((reasonOption) => (
                      <SelectItem key={reasonOption} value={reasonOption}>
                        {reasonOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUseCustomReason(true)}
                  className="w-full"
                >
                  Nhập lý do khác
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Nhập lý do xóa..."
                  rows={3}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseCustomReason(false);
                    setCustomReason("");
                  }}
                  className="w-full"
                >
                  Chọn từ danh sách có sẵn
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading || (!reason && !customReason.trim())}
            >
              {loading ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOrderDetailModal;
