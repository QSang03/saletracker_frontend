import { useState, useEffect } from "react";
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
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [multiDates, setMultiDates] = useState<Date[]>([]);
  const [saving, setSaving] = useState(false);

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

  // Khi đổi loại, load lại dữ liệu cũ (lấy phần tử đầu tiên để chỉnh sửa/thêm mới)
  useEffect(() => {
    const first = currentList[0] || {};
    if (dayType === "single") {
      setSingleDate(first.dates?.[0] ? new Date(first.dates[0]) : undefined);
    }
    if (dayType === "range") {
      setRange(
        first.dates?.length === 2
          ? {
              from: new Date(first.dates[0]),
              to: new Date(first.dates[1]),
            }
          : undefined
      );
    }
    if (dayType === "multi") {
      setMultiDates(
        Array.isArray(first.dates)
          ? first.dates.map((d: string) => new Date(d))
          : []
      );
    }
    setReason(first.reason || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    dayType,
    configSingle?.value,
    configRange?.value,
    configMulti?.value,
  ]);

  // Xử lý lưu dữ liệu (ghi đè hoặc thêm mới)
  const handleSave = async () => {
    setSaving(true);
    let name = HOLIDAY_NAME_MAP[dayType];
    let newEntry: any = {};
    if (dayType === "single") {
      newEntry = {
        dates: singleDate ? [singleDate.toISOString().slice(0, 10)] : [],
        reason: holidayType === "other" ? reason : "",
      };
    }
    if (dayType === "range") {
      newEntry = {
        dates:
          range?.from && range?.to
            ? [
                range.from.toISOString().slice(0, 10),
                range.to.toISOString().slice(0, 10),
              ]
            : [],
        reason: holidayType === "other" ? reason : "",
      };
    }
    if (dayType === "multi") {
      newEntry = {
        dates: multiDates.map((d) => d.toISOString().slice(0, 10)),
        reason: holidayType === "other" ? reason : "",
      };
    }

    // Nếu đang chỉnh sửa, thay thế phần tử đầu, nếu thêm mới thì push vào mảng
    let newList = [...currentList];
    if (newList.length > 0) {
      newList[0] = newEntry;
    } else {
      newList.push(newEntry);
    }

    try {
      const token = getAccessToken();
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || ""
        }/system-config/by-section/holiday/${name}`,
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
      onClose();
    } catch {
      onSaved?.({ success: false, message: "Lưu cấu hình thất bại!" });
    }
    setSaving(false);
  };

  // Hiển thị danh sách ngày nghỉ hiện tại cho từng loại (table)
  function renderHolidayTable() {
    let data = [];
    let columns: string[] = [];
    if (dayType === "single") {
      data = valueSingle;
      columns = ["Ngày nghỉ", "Lý do"];
    }
    if (dayType === "range") {
      data = valueRange;
      columns = ["Từ ngày", "Đến ngày", "Lý do"];
    }
    if (dayType === "multi") {
      data = valueMulti;
      columns = ["Các ngày", "Lý do"];
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
              <TableRow key={idx}>
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
                        ? item.dates
                            .map((d: string) =>
                              format(new Date(d), "dd/MM/yyyy")
                            )
                            .join(", ")
                        : ""}
                    </TableCell>
                    <TableCell>
                      {item.reason || (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // --- Giao diện 2 cột: trái là nút chọn, phải là table ---
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        style={{
          maxWidth: "80vw",
          height: "80vh",
          overflow: "auto",
          paddingTop: 0,
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
          <Button variant="gradient" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}