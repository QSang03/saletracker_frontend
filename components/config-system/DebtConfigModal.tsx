import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAccessToken } from "@/lib/auth";

export default function DebtConfigModal({ open, onClose, allConfigs = [], onSaved }: { open: boolean; onClose: () => void; allConfigs?: any[]; onSaved?: (result: { success: boolean; message: string }) => void }) {
  const [runTime, setRunTime] = useState("");
  const [remind1, setRemind1] = useState("");
  const [remind1Delay, setRemind1Delay] = useState("");
  const [remind2, setRemind2] = useState("");
  const [remind2Delay, setRemind2Delay] = useState("");

  // Prefill fields from allConfigs when modal opens or allConfigs changes
  useEffect(() => {
    if (!open) return;
    const getValue = (name: string) => allConfigs.find((c: any) => c.section === "debt" && c.name === name)?.value || "";
    setRunTime(getValue("debt_runTime"));
    setRemind1(getValue("debt_firstReminderSentence"));
    setRemind1Delay(getValue("debt_firstReminderDelayTime"));
    setRemind2(getValue("debt_secondReminderSentence"));
    setRemind2Delay(getValue("debt_secondReminderDelayTime"));
  }, [open, allConfigs]);

  const handleSave = async () => {
    const token = getAccessToken ? getAccessToken() : localStorage.getItem("access_token");
    const fields = [
      { name: "debt_runTime", value: runTime },
      { name: "debt_firstReminderSentence", value: remind1 },
      { name: "debt_secondReminderSentence", value: remind2 },
      { name: "debt_firstReminderDelayTime", value: remind1Delay },
      { name: "debt_secondReminderDelayTime", value: remind2Delay },
    ];
    let success = true;
    for (const field of fields) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/debt/${field.name}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({ value: field.value }),
        }
      );
      if (!res.ok) success = false;
    }
    if (success) {
      if (onSaved) onSaved({ success: true, message: "Lưu cấu hình công nợ thành công!" });
      onClose();
    } else {
      if (onSaved) onSaved({ success: false, message: "Lưu cấu hình thất bại!" });
      else alert("Lưu cấu hình thất bại!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cấu hình công nợ</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="block mb-1 font-medium">Thời gian chạy công nợ (hh:mm)</label>
            <Input
              type="time"
              step="60"
              placeholder="Thời gian chạy công nợ (hh:mm)"
              value={runTime}
              onChange={e => setRunTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Câu nhắc nợ lần 1</label>
            <Textarea
              placeholder="Câu nhắc nợ lần 1"
              value={remind1}
              onChange={e => setRemind1(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Thời gian giữa lần nhắn đầu đến câu nhắc 1 (phút)</label>
            <Input
              placeholder="Thời gian giữa lần nhắn đầu đến câu nhắc 1 (phút)"
              value={remind1Delay}
              onChange={e => setRemind1Delay(e.target.value)}
              type="number"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Câu nhắc nợ lần 2</label>
            <Textarea
              placeholder="Câu nhắc nợ lần 2"
              value={remind2}
              onChange={e => setRemind2(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Thời gian giữa lần 1 và lần 2 (phút)</label>
            <Input
              placeholder="Thời gian giữa lần 1 và lần 2 (phút)"
              value={remind2Delay}
              onChange={e => setRemind2Delay(e.target.value)}
              type="number"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant="gradient" onClick={handleSave}>Lưu</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}