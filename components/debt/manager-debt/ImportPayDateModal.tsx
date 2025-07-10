import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelectCombobox, Option } from "@/components/ui/MultiSelectCombobox";
import { DatePicker } from "@/components/ui/date-picker";

interface ImportPayDateModalProps {
  open: boolean;
  onClose: () => void;
  customerOptions: Option[];
  onSubmit: (data: { customerCodes: (string|number)[], payDate: string | null }) => void;
}

export default function ImportPayDateModal({ open, onClose, customerOptions, onSubmit }: ImportPayDateModalProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<(string|number)[]>([]);
  const [payDate, setPayDate] = useState<Date|null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCustomers([]);
      setPayDate(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    // Chuyển ngày về yyyy-MM-dd local, không dùng toISOString để tránh lệch ngày
    let payDateStr: string | null = null;
    if (payDate) {
      payDateStr = `${payDate.getFullYear()}-${(payDate.getMonth() + 1).toString().padStart(2, '0')}-${payDate.getDate().toString().padStart(2, '0')}`;
    }
    await onSubmit({ customerCodes: selectedCustomers, payDate: payDateStr });
    setSubmitting(false);
    onClose();
  };

  // Đảm bảo customerOptions đúng định dạng Option[]: { label, value }
  const mappedCustomerOptions = Array.isArray(customerOptions)
    ? customerOptions
        .map((opt) => {
          const label = String((opt as any).label ?? (opt as any).name ?? (opt as any).code ?? '').trim();
          const value = (opt as any).value ?? (opt as any).code;
          if (!label || value === undefined || value === null || value === '') return null;
          return { label, value };
        })
        .filter((opt): opt is Option => !!opt && !!opt.label && opt.value !== undefined && opt.value !== null && opt.value !== '')
    : [];
  // Loại bỏ trùng value
  const uniqueCustomerOptions = mappedCustomerOptions.filter(
    (opt, idx, arr) =>
      opt !== null &&
      arr.findIndex(o => o !== null && o.value === opt.value) === idx
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Nhập ngày hẹn thanh toán</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <MultiSelectCombobox
            options={uniqueCustomerOptions}
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
