import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { getAccessToken } from "@/lib/auth";
import { format } from "date-fns";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import HolidayEditRowModal from "./HolidayEditRowModal";

const HOLIDAY_TYPES = [
  { label: "Ngày nghỉ lễ", value: "holiday" },
  { label: "Ngày nghỉ công ty", value: "company" },
  { label: "Lý do khác", value: "other" },
];

const DAY_SELECT_TYPES = [
  { label: "Nghỉ 1 ngày", value: "single" },
  { label: "Nghỉ nhiều ngày liên tục", value: "range" },
  { label: "Nghỉ cách ngày", value: "multi" },
];

const HOLIDAY_NAME_MAP: Record<string, string> = {
  single: "holiday_single_day",
  range: "holiday_multi_days",
  multi: "holiday_separated_days",
};

function parseHolidayValue(value: string | undefined) {
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch {
    return [];
  }
}

export default function HolidayConfigModal({
  open,
  onClose,
  onSaved,
  allConfigs = [],
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (result: { success: boolean; message: string }) => void;
  allConfigs?: any[];
}) {
  const [holidayType, setHolidayType] = useState("holiday");
  const [dayType, setDayType] = useState("single");
  const [reason, setReason] = useState("");
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [editSingleDate, setEditSingleDate] = useState<Date | undefined>(undefined);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [multiDates, setMultiDates] = useState<Date[]>([]);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null); // null: thêm mới, số: sửa
  const [editModal, setEditModal] = useState<{ open: boolean; idx: number | null; type: string; reason: string; dateValue: any }>(
    { open: false, idx: null, type: "single", reason: "", dateValue: undefined }
  );

  // Lấy dữ liệu từng loại ngày nghỉ từ allConfigs (section = holiday)
  const configSingle = allConfigs.find(
    (item) => item.section === "holiday" && item.name === "holiday_single_day"
  );
  const configRange = allConfigs.find(
    (item) => item.section === "holiday" && item.name === "holiday_multi_days"
  );
  const configMulti = allConfigs.find(
    (item) =>
      item.section === "holiday" && item.name === "holiday_separated_days"
  );

  // Dữ liệu là mảng các object {dates, reason}
  const valueSingle = parseHolidayValue(configSingle?.value);
  const valueRange = parseHolidayValue(configRange?.value);
  const valueMulti = parseHolidayValue(configMulti?.value);

  // Lấy config hiện tại theo dayType
  let currentList = valueSingle;
  if (dayType === "range") currentList = valueRange;
  if (dayType === "multi") currentList = valueMulti;

  // Sửa useEffect: chỉ reset form khi chuyển từ sửa sang thêm mới (editIndex thay đổi từ số về null)
  const prevEditIndex = useRef<number | null>(null);
  useEffect(() => {
    if (editIndex !== null && currentList[editIndex]) {
      const item = currentList[editIndex];
      if (dayType === "single") {
        setSingleDate(item.dates?.[0] ? new Date(item.dates[0] + 'T00:00:00') : undefined);
        setEditSingleDate(undefined);
      }
      if (dayType === "range") {
        setRange(
          item.dates?.length === 2
            ? {
                from: new Date(item.dates[0] + 'T00:00:00'),
                to: new Date(item.dates[1] + 'T00:00:00'),
              }
            : undefined
        );
      }
      if (dayType === "multi") {
        setMultiDates(
          Array.isArray(item.dates)
            ? item.dates.map((d: string) => new Date(d + 'T00:00:00'))
            : []
        );
      }
      if (item.reason === "Ngày nghỉ lễ") {
        setHolidayType("holiday");
        setReason("Ngày nghỉ lễ");
      } else if (item.reason === "Ngày nghỉ công ty") {
        setHolidayType("company");
        setReason("Ngày nghỉ công ty");
      } else if (item.reason && item.reason !== "Ngày nghỉ lễ" && item.reason !== "Ngày nghỉ công ty") {
        setHolidayType("other");
        setReason(item.reason);
      } else {
        setHolidayType("holiday");
        setReason("Ngày nghỉ lễ");
      }
    } else if (prevEditIndex.current !== null && editIndex === null) {
      // Chỉ reset khi chuyển từ sửa sang thêm mới
      setSingleDate(new Date());
      setEditSingleDate(undefined);
      setRange(undefined);
      setMultiDates([]);
      setHolidayType("holiday");
      setReason("Ngày nghỉ lễ");
      // Không reset dayType để giữ đúng loại lịch người dùng đang chọn
    }
    prevEditIndex.current = editIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIndex]);

  // Khi mở modal lần đầu, nếu đang ở chế độ thêm mới thì set ngày hiện tại cho tất cả các loại
  useEffect(() => {
    if (open && editIndex === null) {
      const today = new Date();
      if (dayType === "single") setSingleDate(today);
      if (dayType === "range") setRange({ from: today, to: today });
      if (dayType === "multi") setMultiDates([today]);
    }
  }, [open, editIndex, dayType]);

  // Xử lý lưu dữ liệu (thêm mới hoặc sửa)
  const handleSave = async () => {
    setSaving(true);
    let name = HOLIDAY_NAME_MAP[dayType];
    let reasonValue = "";
    if (holidayType === "holiday") reasonValue = "Ngày nghỉ lễ";
    else if (holidayType === "company") reasonValue = "Ngày nghỉ công ty";
    else if (holidayType === "other") reasonValue = reason;

    let newEntry: any = {};
    if (dayType === "single") {
      const dateToSave = editIndex !== null && editSingleDate ? editSingleDate : (singleDate || new Date());
      newEntry = {
        dates: [format(dateToSave, "yyyy-MM-dd")],
        reason: reasonValue,
      };
    }
    if (dayType === "range") {
      let dates: string[] = [];
      if (range?.from && range?.to) {
        let current = new Date(range.from);
        const end = new Date(range.to);
        while (current <= end) {
          dates.push(format(current, "yyyy-MM-dd"));
          current.setDate(current.getDate() + 1);
        }
      }
      newEntry = {
        dates,
        reason: reasonValue,
      };
    }
    if (dayType === "multi") {
      newEntry = {
        dates: multiDates.map((d) => format(d, "yyyy-MM-dd")),
        reason: reasonValue,
      };
    }

    // Nếu không chọn ngày thì không lưu
    if (
      (dayType === "single" && (!singleDate || newEntry.dates.length === 0)) ||
      (dayType === "range" && (!range?.from || !range?.to || newEntry.dates.length === 0)) ||
      (dayType === "multi" && newEntry.dates.length === 0)
    ) {
      setSaving(false);
      onSaved?.({ success: false, message: "Vui lòng chọn ngày nghỉ hợp lệ!" });
      return;
    }

    let newList = [...currentList];
    if (editIndex !== null && newList[editIndex]) {
      newList[editIndex] = newEntry; // sửa đúng phần tử
    } else {
      newList.push(newEntry); // thêm mới
    }

    try {
      const token = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/holiday/${name}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            value: JSON.stringify(newList),
          }),
        }
      );
      if (!res.ok) throw new Error("Lưu cấu hình thất bại");
      onSaved?.({ success: true, message: "Lưu cấu hình thành công!" });
      setSaving(false);
      setEditIndex(null);
    } catch {
      onSaved?.({ success: false, message: "Lưu cấu hình thất bại!" });
      setSaving(false);
    }
  };

  // Xử lý xóa phần tử
  const handleDelete = async (idx: number) => {
    let name = HOLIDAY_NAME_MAP[dayType];
    let newList = [...currentList];
    newList.splice(idx, 1);
    setSaving(true);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/holiday/${name}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            value: JSON.stringify(newList),
          }),
        }
      );
      if (!res.ok) throw new Error("Xóa cấu hình thất bại");
      onSaved?.({ success: true, message: "Xóa thành công!" });
      setEditIndex(null);
      // Không đóng modal
    } catch {
      onSaved?.({ success: false, message: "Xóa cấu hình thất bại!" });
    }
    setSaving(false);
  };

  // Hiển thị danh sách ngày nghỉ hiện tại cho từng loại (table)
  function renderHolidayTable() {
    let data = [];
    let columns: string[] = [];
    if (dayType === "single") {
      data = valueSingle;
      columns = ["Ngày nghỉ", "Lý do", "Hành động"];
    }
    if (dayType === "range") {
      data = valueRange;
      columns = ["Từ ngày", "Đến ngày", "Lý do", "Hành động"];
    }
    if (dayType === "multi") {
      data = valueMulti;
      columns = ["Các ngày", "Lý do", "Hành động"];
    }
    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="font-semibold mb-1 text-base text-pink-600 motion-safe:animate-pulse">
          Danh sách ngày nghỉ đã lưu
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item: any, idx: number) => (
              <React.Fragment key={idx}>
                <TableRow key={"row-" + idx}>
                  {dayType === "single" && (
                    <>
                      <TableCell>
                        {item.dates?.[0]
                          ? format(new Date(item.dates[0]), "dd/MM/yyyy")
                          : ""}
                      </TableCell>
                      <TableCell>
                        {item.reason || (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  {dayType === "range" && (
                    <>
                      <TableCell>
                        {item.dates?.[0]
                          ? format(new Date(item.dates[0]), "dd/MM/yyyy")
                          : ""}
                      </TableCell>
                      <TableCell>
                        {item.dates?.[1]
                          ? format(new Date(item.dates[1]), "dd/MM/yyyy")
                          : ""}
                      </TableCell>
                      <TableCell>
                        {item.reason || (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  {dayType === "multi" && (
                    <>
                      <TableCell>
                        {Array.isArray(item.dates)
                          ? (() => {
                              const maxShow = 3;
                              const total = item.dates.length;
                              const shown = item.dates
                                .slice(0, maxShow)
                                .map((d: string) => format(new Date(d), "dd/MM/yyyy"))
                                .join(", ");
                              return total > maxShow
                                ? `${shown} ... (${total} ngày)`
                                : shown;
                            })()
                          : ""}
                      </TableCell>
                      <TableCell>
                        {item.reason || (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(idx)}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="delete"
                      className="ml-2"
                      onClick={() => handleDelete(idx)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
                {editIndex === idx && dayType === "single" && (
                  <TableRow key={"edit-single-" + idx}>
                    <TableCell colSpan={3} className="bg-fuchsia-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 items-start">
                        {/* Cột 1: Lịch chọn ngày */}
                        <div>
                          <label className="block mb-1 text-pink-600">Chọn ngày mới cho lịch nghỉ này</label>
                          <Calendar
                            mode="single"
                            selected={editSingleDate}
                            onSelect={setEditSingleDate}
                            className="rounded-md border"
                          />
                        </div>
                        {/* Cột 2: Lý do và nút lưu/hủy dọc */}
                        <div className="flex flex-col gap-2">
                          <label className="block mb-1 text-pink-600">Chọn lý do</label>
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
                          {holidayType === "other" && (
                            <Input
                              placeholder="Nhập lý do nghỉ"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="mb-2"
                              size={20}
                            />
                          )}
                          <Button
                            type="button"
                            variant="gradient"
                            onClick={async () => {
                              setShowConfirm(true);
                            }}
                            disabled={saving}
                          >
                            Lưu thay đổi
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditIndex(null);
                              setEditSingleDate(undefined);
                            }}
                            disabled={saving}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {editIndex === idx && dayType === "range" && (
                  <TableRow key={"edit-range-" + idx}>
                    <TableCell colSpan={4} className="bg-fuchsia-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 items-start">
                        {/* Cột 1: Lịch chọn khoảng ngày */}
                        <div>
                          <label className="block mb-1 text-pink-600">Chọn khoảng ngày mới cho lịch nghỉ này</label>
                          <Calendar
                            mode="range"
                            selected={range}
                            onSelect={setRange}
                            numberOfMonths={2}
                            className="rounded-md border"
                          />
                        </div>
                        {/* Cột 2: Lý do và nút lưu/hủy dọc */}
                        <div className="flex flex-col gap-2">
                          <label className="block mb-1 text-pink-600">Chọn lý do</label>
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
                          {holidayType === "other" && (
                            <Input
                              placeholder="Nhập lý do nghỉ"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="mb-2"
                              size={20}
                            />
                          )}
                          <Button
                            type="button"
                            variant="gradient"
                            onClick={async () => {
                              setShowConfirm(true);
                            }}
                            disabled={saving}
                          >
                            Lưu thay đổi
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditIndex(null);
                              setRange(undefined);
                            }}
                            disabled={saving}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Hàm mở modal chỉnh sửa dòng
  function handleEdit(idx: number) {
    let item = currentList[idx];
    let type = dayType;
    let reason = item.reason || "";
    let dateValue = undefined;
    if (type === "single") dateValue = item.dates?.[0] ? new Date(item.dates[0] + 'T00:00:00') : new Date();
    if (type === "range") {
      if (Array.isArray(item.dates) && item.dates.length > 0) {
        dateValue = {
          from: new Date(item.dates[0] + 'T00:00:00'),
          to: new Date(item.dates[item.dates.length - 1] + 'T00:00:00'),
        };
      } else {
        dateValue = { from: new Date(), to: new Date() };
      }
    }
    if (type === "multi") dateValue = Array.isArray(item.dates) && item.dates.length > 0 ? item.dates.map((d: string) => new Date(d + 'T00:00:00')) : [new Date()];
    setEditModal({ open: true, idx, type, reason, dateValue });
  }

  // --- Giao diện 2 cột: trái là nút chọn, phải là table ---
  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
        <DialogContent
          style={{
            maxWidth: "80vw",
            height: "80vh",
            overflow: "auto",
            paddingTop: "3rem",
          }}
        >
          {/* Giảm khoảng cách giữa title và content */}
          <div className="mb-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-1">
                Cấu hình lịch nghỉ
              </DialogTitle>
              <DialogDescription className="mb-1">
                Chọn loại lịch nghỉ và nhập thông tin tương ứng.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Cột trái: nút chọn lý do, kiểu lịch, chọn ngày */}
            <div>
              {/* Chọn lý do */}
              <div className="mb-2">
                <div className="font-semibold text-base text-pink-600 motion-safe:animate-pulse mb-1">
                  Chọn lý do
                </div>
                <div className="flex gap-2 mb-4">
                  {HOLIDAY_TYPES.map((t) => (
                    <Button
                      key={t.value}
                      variant={holidayType === t.value ? "gradient" : "outline"}
                      onClick={() => setHolidayType(t.value)}
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
                    className="mb-4"
                  />
                )}
              </div>
              {/* Chọn kiểu lịch nghỉ */}
              <div className="mb-4">
                <div className="font-semibold text-base text-pink-600 motion-safe:animate-pulse mb-1">
                  Chọn kiểu lịch nghỉ
                </div>
                <div className="flex gap-2">
                  {DAY_SELECT_TYPES.map((t) => (
                    <Button
                      key={t.value}
                      variant={dayType === t.value ? "gradient" : "outline"}
                      onClick={() => setDayType(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
              {/* Box chọn ngày nghỉ */}
              <div className="mb-4">
                {dayType === "single" && (
                  <div>
                    <label className="block mb-1">Chọn ngày nghỉ</label>
                    <Calendar
                      mode="single"
                      selected={singleDate}
                      onSelect={setSingleDate}
                      className="rounded-md border"
                    />
                  </div>
                )}
                {dayType === "range" && (
                  <div>
                    <label className="block mb-1">Chọn khoảng ngày nghỉ</label>
                    <Calendar
                      mode="range"
                      selected={range}
                      onSelect={setRange}
                      numberOfMonths={2}
                      className="rounded-md border"
                    />
                  </div>
                )}
                {dayType === "multi" && (
                  <div>
                    <label className="block mb-1">Chọn nhiều ngày nghỉ</label>
                    <Calendar
                      mode="multiple"
                      selected={multiDates}
                      onSelect={(dates) => setMultiDates(dates ?? [])}
                      required={false}
                      className="rounded-md border"
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Cột phải: table ngày nghỉ đã lưu */}
            <div>{renderHolidayTable()}</div>
          </div>
          {/* Nút lưu/hủy dời xuống góc phải DialogContent */}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button
              type="button" // Đảm bảo không phải submit form
              variant="gradient"
              onClick={() => setShowConfirm(true)}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        isOpen={showConfirm}
        title="Xác nhận lưu cấu hình"
        message="Bạn có chắc chắn muốn lưu cấu hình lịch nghỉ này không?"
        onConfirm={() => {
          setShowConfirm(false);
          handleSave();
        }}
        onCancel={() => setShowConfirm(false)}
      />
      {/* Modal chỉnh sửa dòng */}
      <HolidayEditRowModal
        open={editModal.open}
        onClose={() => setEditModal({ ...editModal, open: false })}
        holidayType={(() => {
          if (editModal.reason === "Ngày nghỉ lễ") return "holiday";
          if (editModal.reason === "Ngày nghỉ công ty") return "company";
          if (editModal.reason) return "other";
          return "holiday";
        })()}
        reason={editModal.reason}
        dateType={editModal.type as any}
        dateValue={editModal.dateValue}
        onSave={(data) => {
          // Cập nhật lại entry và gọi handleSave logic tương ứng
          let newEntry: any = {};
          if (editModal.type === "single") {
            newEntry = {
              dates: [data.dateValue ? format(data.dateValue, "yyyy-MM-dd") : null],
              reason: data.holidayType === "holiday" ? "Ngày nghỉ lễ" : data.holidayType === "company" ? "Ngày nghỉ công ty" : data.reason,
            };
          } else if (editModal.type === "range") {
            // Lấy tất cả các ngày trong khoảng
            let dates: string[] = [];
            if (data.dateValue?.from && data.dateValue?.to) {
              let current = new Date(data.dateValue.from);
              const end = new Date(data.dateValue.to);
              while (current <= end) {
                dates.push(format(current, "yyyy-MM-dd"));
                current.setDate(current.getDate() + 1);
              }
            }
            newEntry = {
              dates,
              reason: data.holidayType === "holiday" ? "Ngày nghỉ lễ" : data.holidayType === "company" ? "Ngày nghỉ công ty" : data.reason,
            };
          } else if (editModal.type === "multi") {
            newEntry = {
              dates: Array.isArray(data.dateValue) ? data.dateValue.map((d: Date) => format(d, "yyyy-MM-dd")) : [],
              reason: data.holidayType === "holiday" ? "Ngày nghỉ lễ" : data.holidayType === "company" ? "Ngày nghỉ công ty" : data.reason,
            };
          }
          let newList = [...currentList];
          if (editModal.idx !== null && newList[editModal.idx]) {
            newList[editModal.idx] = newEntry;
            // Gọi API lưu lại
            (async () => {
              setSaving(true);
              try {
                const token = getAccessToken();
                const name = HOLIDAY_NAME_MAP[editModal.type];
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/holiday/${name}`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token || ""}`,
                    },
                    body: JSON.stringify({ value: JSON.stringify(newList) }),
                  }
                );
                if (!res.ok) throw new Error("Lưu cấu hình thất bại");
                onSaved?.({ success: true, message: "Lưu cấu hình thành công!" });
                setEditModal({ ...editModal, open: false });
              } catch {
                onSaved?.({ success: false, message: "Lưu cấu hình thất bại!" });
              }
              setSaving(false);
            })();
          }
        }}
      />
    </>
  );
}