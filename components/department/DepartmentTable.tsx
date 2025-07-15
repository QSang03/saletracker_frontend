import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Department } from "../../types";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useState } from "react";

export default function DepartmentTable({
  departments,
  expectedRowCount,
  startIndex = 0,
  onEdit,
  onDelete,
}: {
  departments: Department[];
  expectedRowCount?: number;
  startIndex?: number;
  onEdit?: (dep: Department) => void;
  onDelete?: (dep: Department) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedDep, setSelectedDep] = useState<Department | null>(null);

  const safeDepartments = Array.isArray(departments) ? departments : [];
  const rowCount = expectedRowCount ?? safeDepartments.length;
  const rows: (Department | null)[] = [];
  for (let i = 0; i < rowCount; ++i) {
    rows.push(safeDepartments[i] ?? null);
  }

  const handleDeleteClick = (dep: Department) => {
    setSelectedDep(dep);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (selectedDep && onDelete) onDelete(selectedDep);
    setConfirmOpen(false);
    setSelectedDep(null);
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setSelectedDep(null);
  };

  return (
    <div className="border rounded-xl overflow-x-auto shadow-inner">
      <Table className="min-w-[700px]">
        <TableHeader className="sticky top-0 z-10 shadow-sm">
          <TableRow>
            <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
            <TableHead className="px-3 py-2 text-left">Tên phòng ban</TableHead>
            <TableHead className="px-3 py-2 text-left">Slug</TableHead>
            <TableHead className="px-3 py-2 text-left">Trưởng nhóm</TableHead>
            <TableHead className="px-3 py-2 text-left">Ngày tạo</TableHead>
            <TableHead className="w-36 text-center px-3 py-2">
              Thao tác
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4 text-gray-400">
                Không có phòng ban nào phù hợp.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((dep, idx) =>
              dep ? (
                <TableRow
                  key={dep.id}
                  className={idx % 2 === 0 ? "bg-gray-50" : ""}
                >
                  <TableCell className="text-center px-3 py-2">
                    {startIndex + idx + 1}
                  </TableCell>
                  <TableCell className="px-3 py-2">{dep.name}</TableCell>
                  <TableCell className="px-3 py-2">{dep.slug}</TableCell>
                  <TableCell className="px-3 py-2">
                    {dep.manager?.fullName || dep.manager?.username || "-"}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {dep.createdAt
                      ? new Date(dep.createdAt).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center px-3 py-2 flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="edit"
                      onClick={() => onEdit && onEdit(dep)}
                    >
                      Chỉnh sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="delete"
                      onClick={() => handleDeleteClick(dep)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={`empty-${idx}`}
                  className="bg-white dark:bg-muted/20 select-none"
                  style={{ height: 49, opacity: 0, pointerEvents: "none" }}
                  aria-hidden="true"
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableCell key={i} />
                  ))}
                </TableRow>
              )
            )
          )}
          <ConfirmDialog
            isOpen={confirmOpen}
            title="Xác nhận xóa phòng ban"
            message={`Bạn có chắc chắn muốn xóa phòng ban "${selectedDep?.name}"?`}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </TableBody>
      </Table>
    </div>
  );
}
