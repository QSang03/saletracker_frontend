import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function DebtConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [runTime, setRunTime] = useState("");
  const [remind1, setRemind1] = useState("");
  const [remind1Delay, setRemind1Delay] = useState("");
  const [remind2, setRemind2] = useState("");
  const [remind2Delay, setRemind2Delay] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cấu hình công nợ</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Input
            placeholder="Thời gian chạy công nợ (hh:mm)"
            value={runTime}
            onChange={e => setRunTime(e.target.value)}
          />
          <Textarea
            placeholder="Câu nhắc nợ lần 1"
            value={remind1}
            onChange={e => setRemind1(e.target.value)}
          />
          <Input
            placeholder="Thời gian giữa lần nhắn đầu đến câu nhắc 1 (phút)"
            value={remind1Delay}
            onChange={e => setRemind1Delay(e.target.value)}
            type="number"
          />
          <Textarea
            placeholder="Câu nhắc nợ lần 2"
            value={remind2}
            onChange={e => setRemind2(e.target.value)}
          />
          <Input
            placeholder="Thời gian giữa lần 1 và lần 2 (phút)"
            value={remind2Delay}
            onChange={e => setRemind2Delay(e.target.value)}
            type="number"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant="gradient">Lưu</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}