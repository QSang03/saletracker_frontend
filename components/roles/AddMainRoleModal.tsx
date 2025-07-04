import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface AddMainRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (role: { name: string }) => Promise<void>;
}

export default function AddMainRoleModal({
  open,
  onClose,
  onSubmit,
}: AddMainRoleModalProps) {
  const [roleName, setRoleName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset input khi modal đóng
  useEffect(() => {
    if (!open) {
      setRoleName("");
      setShowConfirm(false);
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!roleName.trim()) return;
    setSaving(true);
    await onSubmit({ name: roleName.trim() });
    setSaving(false);
    setRoleName("");
    setShowConfirm(false);
    onClose();
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-bold text-lg mb-2">Thêm vai trò chính</DialogTitle>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Tên vai trò (role)</label>
          <Input
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Nhập tên vai trò, ví dụ: admin, manager, user..."
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={saving || !roleName.trim()}
          >
            {saving ? "Đang lưu..." : "Thêm"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Đóng
          </Button>
        </DialogFooter>
        <ConfirmDialog
          isOpen={showConfirm}
          title="Xác nhận thêm vai trò"
          message={`Bạn có chắc chắn muốn thêm vai trò "${roleName.trim()}"?`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}