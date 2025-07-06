import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

const HOLIDAY_TYPES = [
  { label: "Ngày nghỉ lễ", value: "holiday" },
  { label: "Ngày nghỉ công ty", value: "company" },
  { label: "Lý do khác", value: "other" },
];

export default function HolidayEditRowModal({
  open,
  onClose,
  holidayType: initialHolidayType,
  reason: initialReason,
  dateType,
  dateValue,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  holidayType: string;
  reason: string;
  dateType: "single" | "range" | "multi";
  dateValue: Date | DateRange | Date[] | undefined;
  onSave: (data: { holidayType: string; reason: string; dateValue: any }) => void;
}) {
  const [holidayType, setHolidayType] = useState(initialHolidayType);
  const [reason, setReason] = useState(initialReason);
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [multiDates, setMultiDates] = useState<Date[]>([]);

  useEffect(() => {
    setHolidayType(initialHolidayType);
    setReason(initialReason);
    if (dateType === "single") setSingleDate(dateValue as Date ?? new Date());
    if (dateType === "range") setRange((dateValue as DateRange) ?? { from: new Date(), to: new Date() });
    if (dateType === "multi") setMultiDates(Array.isArray(dateValue) && dateValue.length > 0 ? dateValue : [new Date()]);
  }, [open, initialHolidayType, initialReason, dateType, dateValue]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent style={{
            maxWidth: "30vw",
            height: "60vh",
            overflow: "auto",
            paddingTop: "3rem",
          }}>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa ngày nghỉ</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-pink-600">Chọn lý do</label>
            <div className="flex flex-col gap-2">
              {HOLIDAY_TYPES.map((t) => (
                <Button
                  key={t.value}
                  variant={holidayType === t.value ? "gradient" : "outline"}
                  onClick={() => setHolidayType(t.value)}
                  size="sm"
                  className="w-fit"
                >
                  {t.label}
                </Button>
              ))}
            </div>
            {holidayType === "other" && (
              <Input
                placeholder="Nhập lý do nghỉ"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2"
              />
            )}
          </div>
          <div>
            <label className="block mb-1 text-pink-600">
              {dateType === "single"
                ? "Chọn ngày nghỉ"
                : dateType === "range"
                ? "Chọn khoảng ngày nghỉ"
                : "Chọn nhiều ngày nghỉ"}
            </label>
            {dateType === "single" ? (
              <Calendar mode="single" selected={singleDate} onSelect={setSingleDate} className="rounded-md border" />
            ) : dateType === "range" ? (
              <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} className="rounded-md border" />
            ) : (
              <Calendar mode="multiple" selected={multiDates} onSelect={(dates) => setMultiDates(dates ?? [])} className="rounded-md border" />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button
              variant="gradient"
              onClick={() => {
                onSave({
                  holidayType,
                  reason,
                  dateValue:
                    dateType === "single"
                      ? singleDate
                      : dateType === "range"
                      ? range
                      : multiDates,
                });
              }}
            >
              Lưu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
