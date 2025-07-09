import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelectCombobox, Option } from "@/components/ui/MultiSelectCombobox";
import { DatePicker } from "@/components/ui/date-picker";

interface ImportPayDateModalProps {
  open: boolean;
  onClose: () => void;
  customerOptions: Option[];
  onSubmit: (data: { customerCodes: (string|number)[], payDate: Date|null }) => void;
}

export default function ImportPayDateModal({ open, onClose, customerOptions, onSubmit }: ImportPayDateModalProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<(string|number)[]>([]);
  const [payDate, setPayDate] = useState<Date|null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onSubmit({ customerCodes: selectedCustomers, payDate });
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Nhập ngày hẹn thanh toán</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <MultiSelectCombobox
            options={customerOptions}
            value={selectedCustomers}
            onChange={setSelectedCustomers}
            placeholder="Tìm kiếm mã khách hàng..."
            className="w-full"
          />
          <DatePicker
            value={payDate ?? undefined}
            onChange={date => setPayDate(date ?? null)}
            placeholder="Chọn ngày hẹn thanh toán"
            className="w-full"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="delete" type="button">Hủy</Button>
          </DialogClose>
          <Button
            variant="add"
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !payDate || selectedCustomers.length === 0}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
