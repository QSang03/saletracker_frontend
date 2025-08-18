"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface RenameKeywordDialogProps {
  open: boolean;
  keyword: string;
  onClose: () => void;
  onSubmit: (newKeyword: string) => Promise<void> | void;
}

export default function RenameKeywordDialog({ open, keyword, onClose, onSubmit }: RenameKeywordDialogProps) {
  const [value, setValue] = useState(keyword);
  const canSave = value.trim().length > 0 && value.trim() !== keyword.trim();

  useEffect(() => { setValue(keyword); }, [keyword]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Đổi tên keyword</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nhập tên keyword mới" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button disabled={!canSave} onClick={async () => { if (!canSave) return; await onSubmit(value.trim()); onClose(); }}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
