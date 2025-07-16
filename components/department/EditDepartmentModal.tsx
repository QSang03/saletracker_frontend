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
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { getAccessToken } from "@/lib/auth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function EditDepartmentModal({
  open,
  onClose,
  department,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  department: { id: number; name: string; slug: string; server_ip?: string } | null;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(department?.name || "");
  const [serverIp, setServerIp] = useState(department?.server_ip || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [deletedDepartment, setDeletedDepartment] = useState<any>(null);

  useEffect(() => {
    setName(department?.name || "");
    setServerIp(department?.server_ip || "");
    setError(null);
    setShowRestoreConfirm(false);
    setDeletedDepartment(null);
  }, [department, open]);

  const handleUpdate = async () => {
    if (!department || !name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments/${department.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name, server_ip: serverIp }),
        }
      );
      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const data = await res.json();
        // Kiểm tra nếu trùng với phòng ban đã xóa
        if (data.code === 'DEPARTMENT_EXISTS_DELETED') {
          setDeletedDepartment(data.deletedDepartment);
          setShowRestoreConfirm(true);
        } else {
          setError(data.message || "Cập nhật phòng ban thất bại!");
        }
      }
    } catch {
      setError("Cập nhật phòng ban thất bại!");
    }
    setIsSubmitting(false);
  };

  const handleRestore = async () => {
    if (!deletedDepartment) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments/${deletedDepartment.id}/restore`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        setShowRestoreConfirm(false);
        setDeletedDepartment(null);
        onUpdated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || "Khôi phục phòng ban thất bại!");
      }
    } catch {
      setError("Khôi phục phòng ban thất bại!");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa phòng ban</DialogTitle>
          <DialogDescription>
            Đổi tên phòng ban, slug sẽ tự động cập nhật.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tên phòng ban
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên phòng ban"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              IP Server (tùy chọn)
            </label>
            <Input
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder="Nhập IP server (vd: 192.168.1.100)"
            />
          </div>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="gradient"
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? <LoadingSpinner size={18} /> : "Lưu"}
          </Button>
        </div>
        <ConfirmDialog
          isOpen={showConfirm}
          title="Xác nhận chỉnh sửa"
          message={`Bạn có chắc chắn muốn lưu thay đổi tên phòng ban thành "${name}"${serverIp ? ` và IP server "${serverIp}"` : ''}?`}
          onConfirm={() => {
            setShowConfirm(false);
            handleUpdate();
          }}
          onCancel={() => setShowConfirm(false)}
        />
        {showRestoreConfirm && deletedDepartment && (
          <ConfirmDialog
            isOpen={showRestoreConfirm}
            onCancel={() => setShowRestoreConfirm(false)}
            onConfirm={handleRestore}
            confirmText="Khôi phục"
            cancelText="Hủy"
            title="Khôi phục phòng ban đã xóa"
            message={`Đã tồn tại phòng ban "${deletedDepartment.name}" bị xóa. Bạn có muốn khôi phục phòng ban này không?

• Tên: ${deletedDepartment.name}
• Slug: ${deletedDepartment.slug}${deletedDepartment.server_ip ? '\n• IP Server: ' + deletedDepartment.server_ip : ''}
• Ngày xóa: ${new Date(deletedDepartment.deletedAt).toLocaleDateString('vi-VN')}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
