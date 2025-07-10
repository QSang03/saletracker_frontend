import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface EditDebtModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { note: string; status: string }) => void;
  initialNote?: string;
  initialStatus?: string;
  statusOptions: { label: string; value: string }[];
}

export default function EditDebtModal({
  open,
  onClose,
  onSave,
  initialNote = "",
  initialStatus = "",
  statusOptions,
}: EditDebtModalProps) {
  const [note, setNote] = useState(initialNote);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  // Định nghĩa sẵn statusOptions mặc định nếu không truyền đủ
  const defaultStatusOptions = [
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'pay_later', label: 'Đã hẹn thanh toán' },
    { value: 'no_information_available', label: 'Không có thông tin' },
  ];
  const mergedStatusOptions = Array.isArray(statusOptions) && statusOptions.length >= 3
    ? statusOptions
    : defaultStatusOptions;

  // Reset lại note và status mỗi khi mở modal hoặc initialNote/initialStatus thay đổi
  useEffect(() => {
    if (open) {
      setNote(initialNote);
      setStatus(initialStatus);
      setSaving(false); // Reset saving state khi mở modal
    }
  }, [open, initialNote, initialStatus]);

  // Khi bấm Lưu, chỉ truyền dữ liệu lên parent, KHÔNG tự đóng modal
  const handleSave = () => {
    setSaving(true);
    // Gọi onSave và để parent xử lý logic async
    onSave({ note, status });
    // Không setSaving(false) ở đây, để parent quyết định khi nào reset
  };

  return (
    <Dialog open={open} onOpenChange={v => {
      // Chỉ gọi onClose khi người dùng thực sự muốn đóng (bấm ra ngoài hoặc nút Đóng), không gọi khi đang lưu
      if (!v && !saving) onClose();
    }}>
      <DialogContent className="max-w-md w-full">
        <DialogTitle className="mb-2">Chỉnh sửa công nợ</DialogTitle>
        <div className="mb-4">
          <label className="block font-medium mb-1">Ghi chú</label>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
            placeholder="Nhập ghi chú..."
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Trạng thái</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="-- Chọn trạng thái --" />
            </SelectTrigger>
            <SelectContent>
              {mergedStatusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="gradient" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}