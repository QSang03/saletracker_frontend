import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { getAccessToken } from "@/lib/auth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function RestoreDepartmentModal({
  open,
  onClose,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [departments, setDepartments] = useState<
    { id: number; name: string; slug: string; deletedAt: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeletedDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments/deleted`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        // Đảm bảo luôn là mảng
        setDepartments(Array.isArray(data) ? data : data.data || []);
      } else {
        setError("Không thể tải danh sách nhóm đã xóa!");
      }
    } catch {
      setError("Không thể tải danh sách nhóm đã xóa!");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) fetchDeletedDepartments();
    // eslint-disable-next-line
  }, [open]);

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    setError(null);
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments/${id}/restore`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        setDepartments(departments.filter((dep) => dep.id !== id));
        onRestored();
      } else {
        setError("Khôi phục thất bại!");
      }
    } catch {
      setError("Khôi phục thất bại!");
    }
    setRestoringId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Khôi phục phòng ban đã xóa</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size={32} />
          </div>
        ) : (
          <div>
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {departments.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                Không có phòng ban nào đã xóa.
              </div>
            ) : (
              <table className="w-full text-sm border">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border">Tên phòng ban</th>
                    <th className="px-2 py-1 border">Slug</th>
                    <th className="px-2 py-1 border">Ngày xóa</th>
                    <th className="px-2 py-1 border">Khôi phục</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(departments) ? departments : []).map(
                    (dep) => (
                      <tr key={dep.id}>
                        <td className="px-2 py-1 border">{dep.name}</td>
                        <td className="px-2 py-1 border">{dep.slug}</td>
                        <td className="px-2 py-1 border">
                          {dep.deletedAt
                            ? new Date(dep.deletedAt).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-2 py-1 border text-center">
                          <Button
                            size="sm"
                            variant="gradient"
                            disabled={restoringId === dep.id}
                            onClick={() => setConfirmRestoreId(dep.id)}
                          >
                            {restoringId === dep.id ? (
                              <LoadingSpinner size={16} />
                            ) : (
                              "Khôi phục"
                            )}
                          </Button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
        <ConfirmDialog
          isOpen={confirmRestoreId !== null}
          title="Xác nhận khôi phục"
          message={
            confirmRestoreId !== null
              ? `Bạn có chắc chắn muốn khôi phục phòng ban này?`
              : ""
          }
          onConfirm={() => {
            if (confirmRestoreId !== null) handleRestore(confirmRestoreId);
            setConfirmRestoreId(null);
          }}
          onCancel={() => setConfirmRestoreId(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
