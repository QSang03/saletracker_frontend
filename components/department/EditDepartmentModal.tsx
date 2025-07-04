import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { getAccessToken } from "@/lib/auth";

export default function EditDepartmentModal({
  open,
  onClose,
  department,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  department: { id: number; name: string; slug: string } | null;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(department?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(department?.name || "");
    setError(null);
  }, [department, open]);

  const handleUpdate = async () => {
    if (!department || !name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAccessToken ? getAccessToken() : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments/${department.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name }),
        }
      );
      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || "Cập nhật phòng ban thất bại!");
      }
    } catch {
      setError("Cập nhật phòng ban thất bại!");
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
            <label className="block text-sm font-medium mb-1">Tên phòng ban</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nhập tên phòng ban"
              autoFocus
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm mt-1">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="gradient"
            onClick={handleUpdate}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? <LoadingSpinner size={18} /> : "Lưu"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}