import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimePicker24 } from "@/components/ui/TimePicker24";
import { Trash2, Plus } from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { motion } from "framer-motion";

const WEEKDAYS = [
  { key: "monday", label: "Thứ 2" },
  { key: "tuesday", label: "Thứ 3" },
  { key: "wednesday", label: "Thứ 4" },
  { key: "thursday", label: "Thứ 5" },
  { key: "friday", label: "Thứ 6" },
  { key: "saturday", label: "Thứ 7" },
  { key: "sunday", label: "Chủ nhật" },
];

type TimeRange = { start: string; end: string };
type Schedule = Record<string, TimeRange[]>;

interface ToolScheduleConfigModalProps {
  open: boolean;
  onClose: () => void;
  allConfigs: any[];
  onSaved?: (result: { success: boolean; message: string }) => void;
}

// Lọc các khoảng thời gian hợp lệ (có start và end khác rỗng)
function filterValidSchedule(schedule: Schedule): Schedule {
  const filtered: Schedule = {};
  for (const day of WEEKDAYS) {
    filtered[day.key] =
      schedule[day.key]?.filter(
        (item) => item.start?.trim() && item.end?.trim()
      ) || [];
  }
  return filtered;
}

export default function ToolScheduleConfigModal({
  open,
  onClose,
  allConfigs,
  onSaved,
}: ToolScheduleConfigModalProps) {
  // Lọc config đúng section + name
  const config = allConfigs.find(
    (item) =>
      item.section === "system" && item.name === "system_stopToolConfig"
  );
  const initialSchedule: Schedule =
    config?.value && typeof config.value === "string"
      ? JSON.parse(config.value)
      : Object.fromEntries(WEEKDAYS.map(({ key }) => [key, []]));

  const [schedule, setSchedule] = useState<Schedule>(
    filterValidSchedule(initialSchedule)
  );
  const [saving, setSaving] = useState(false);

  // Khi mở modal, chỉ hiển thị các khoảng thời gian hợp lệ
  useEffect(() => {
    setSchedule(filterValidSchedule(initialSchedule));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config?.value]);

  const updateSchedule = (
    day: string,
    updater: (items: TimeRange[]) => TimeRange[]
  ) => {
    setSchedule((prev) => ({ ...prev, [day]: updater(prev[day]) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Lọc lại trước khi lưu để không lưu các khoảng trống
      const validSchedule = filterValidSchedule(schedule);
      const token = getAccessToken();
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || ""
        }/system-config/by-section/system/system_stopToolConfig`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ value: JSON.stringify(validSchedule) }),
        }
      );
      if (!res.ok) throw new Error("Lưu cấu hình thất bại");
      onSaved?.({ success: true, message: "Lưu cấu hình thành công!" });
      onClose();
    } catch (e) {
      onSaved?.({ success: false, message: "Lưu cấu hình thất bại!" });
    }
    setSaving(false);
  };

  // Chia ngày thành 2 cột
  const col1 = WEEKDAYS.slice(0, 4); // Thứ 2 -> Thứ 5
  const col2 = WEEKDAYS.slice(4);    // Thứ 6 -> Chủ nhật

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        style={{ maxWidth: "80vw", height: "80vh", overflow: "auto" }}
      >
        <DialogHeader>
          <DialogTitle>Cấu hình lịch dừng tool</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[col1, col2].map((days, colIdx) => (
            <div key={colIdx} className="space-y-4">
              {days.map((day) => (
                <div key={day.key} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <motion.span
                      className="font-semibold text-2xl bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent"
                      style={{ backgroundSize: "200% auto" }}
                      animate={{
                        backgroundPosition: ["0% center", "100% center"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                      }}
                    >
                      {day.label}
                    </motion.span>
                    <Button
                      size="icon"
                      variant="add"
                      onClick={() =>
                        updateSchedule(day.key, (items) => [
                          ...items,
                          { start: "", end: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {filterValidSchedule(schedule)[day.key].length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Chưa có khung giờ
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filterValidSchedule(schedule)[day.key].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded shadow"
                        >
                          <TimePicker24
                            value={item.start}
                            onChange={(val) =>
                              updateSchedule(day.key, (items) =>
                                items.map((it, i) =>
                                  i === idx ? { ...it, start: val } : it
                                )
                              )
                            }
                          />
                          <span>→</span>
                          <TimePicker24
                            value={item.end}
                            onChange={(val) =>
                              updateSchedule(day.key, (items) =>
                                items.map((it, i) =>
                                  i === idx ? { ...it, end: val } : it
                                )
                              )
                            }
                          />
                          <Button
                            size="icon"
                            variant="delete"
                            className="text-white"
                            onClick={() =>
                              updateSchedule(day.key, (items) =>
                                items.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
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