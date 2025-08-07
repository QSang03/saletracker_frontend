import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getAccessToken } from "@/lib/auth";

const TOOLS = [
  { key: "system_processDebt", label: "Xử lý công nợ" },
  { key: "system_processOrder", label: "Xử lý giao dịch" },
  { key: "system_scheduleHoliday", label: "Lịch nghỉ" },
  { key: "system_processCampaign", label: "Xử lý chiến dịch" },
  { key: "zalo_conversation_name_updater_enabled", label: "Cập nhật tên trò chuyện Zalo" },
  // ...thêm tool khác nếu có
];

const SECTION = "system";
const TYPE = "toggle";

export default function ToolToggleConfigModal({
  open,
  onClose,
  onSaved,
  allConfigs,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (result: { success: boolean; message: string }) => void;
  allConfigs: any[];
}) {
  const [toolStates, setToolStates] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Khi mở modal, map trạng thái từ allConfigs
  useEffect(() => {
    if (!open) return;
    const filtered = allConfigs.filter(
      (item) => item.section === SECTION && item.type === TYPE
    );
    const states: { [key: string]: boolean } = {};
    TOOLS.forEach((tool) => {
      const found = filtered.find((item) => item.name === tool.key);
      states[tool.key] = found
        ? found.value === "true" || found.value === "1"
        : false;
    });
    setToolStates(states);
  }, [open, allConfigs]);

  // Khi gạt switch thì mở confirm
  const handleSwitchChange = (key: string) => {
    setPendingKey(key);
    setConfirmOpen(true);
  };

  // Xác nhận lưu trạng thái mới cho tool
  const handleConfirm = async () => {
    if (!pendingKey) return;
    setSaving(true);
    try {
      const newState = !toolStates[pendingKey];
      const token = getAccessToken();
      await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || ""
        }/system-config/by-section/${SECTION}/${pendingKey}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            value: newState ? "1" : "0"
          }),
        }
      );
      setToolStates((prev) => ({
        ...prev,
        [pendingKey]: newState,
      }));
      onSaved?.({ success: true, message: "Lưu cấu hình thành công!" });
    } catch {
      onSaved?.({ success: false, message: "Lưu cấu hình thất bại!" });
    }
    setSaving(false);
    setConfirmOpen(false);
    setPendingKey(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Cấu hình bật/tắt tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {TOOLS.map((tool) => (
              <div key={tool.key} className="flex items-center justify-between">
                <span>{tool.label}</span>
                <Switch
                  checked={!!toolStates[tool.key]}
                  onCheckedChange={() => handleSwitchChange(tool.key)}
                  disabled={saving}
                  className="scale-150"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xác nhận thay đổi"
        message="Bạn có chắc chắn muốn thay đổi trạng thái tool này không?"
        onConfirm={handleConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingKey(null);
        }}
      />
    </>
  );
}
