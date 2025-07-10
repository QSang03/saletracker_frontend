import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import EditDebtModal from "./EditDebtModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getAccessToken } from "@/lib/auth";

// Thêm prop cho phép custom align từng cột
interface DebtManagementProps {
  debts: any[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  columnAligns?: ("left" | "center" | "right")[];
  onEdit?: (debt: any, data: { note: string; status: string }) => Promise<void>;
  onDelete?: (debt: any) => Promise<void>; // Thêm prop onDelete
}

function getDaysBetween(date1?: string | Date, date2?: string | Date) {
  if (!date1 || !date2) return "";
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DebtManagement({ debts, expectedRowCount, startIndex, onReload, columnAligns, onEdit, onDelete }: DebtManagementProps) {
  const today = new Date();
  // CSS cho cell, giữ nguyên như ban đầu
  const cellClass = "px-3 py-2";
  const cellCenterClass = "text-center px-3 py-2";
  const cellLeftClass = "text-left px-3 py-2";
  const cellRightClass = "text-right px-3 py-2";
  
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingDebt, setEditingDebt] = React.useState<any>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [debtToDelete, setDebtToDelete] = React.useState<any>(null);
  const [pendingEditData, setPendingEditData] = React.useState<{ note: string; status: string } | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Lấy danh sách trạng thái unique từ dữ liệu nợ
  const statusOptions = React.useMemo(() => {
    const statuses = debts.map(d => d.status).filter(Boolean);
    return Array.from(new Set(statuses)).map(s => ({ label: s, value: s }));
  }, [debts]);

  // Hàm xử lý khi bấm Lưu trong EditDebtModal
  const handleModalSave = (data: { note: string; status: string }) => {
    setPendingEditData(data);
    setShowConfirm(true);
  };

  // Hàm xử lý khi xác nhận trong ConfirmDialog
  const handleConfirmEdit = async () => {
    if (!onEdit || !editingDebt || !pendingEditData) return;
    
    setIsProcessing(true);
    try {
      await onEdit(editingDebt, pendingEditData);
      // Chỉ đóng modal và reset state sau khi API thành công
      setShowConfirm(false);
      setEditModalOpen(false);
      setEditingDebt(null);
      setPendingEditData(null);
    } catch (error) {
      console.error('Error updating debt:', error);
      // Nếu có lỗi, chỉ đóng confirm dialog, giữ nguyên edit modal
      setShowConfirm(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Hàm xử lý khi hủy trong ConfirmDialog
  const handleCancelEdit = () => {
    setShowConfirm(false);
    setPendingEditData(null);
    // Không đóng edit modal, để user có thể chỉnh sửa lại
  };

  // Hàm xử lý khi đóng edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingDebt(null);
    setPendingEditData(null);
  };

  return (
    <div className="border rounded-xl shadow-inner overflow-x-auto always-show-scrollbar">
      <Table className="min-w-[700px]">
        <TableHeader className="sticky top-0 z-[8] bg-background shadow-sm">
          <TableRow>
            <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
            <TableHead className="px-3 py-2 text-left">Tên khách hàng</TableHead>
            <TableHead className="px-3 py-2 text-left">NV Công nợ</TableHead>
            <TableHead className="px-3 py-2 text-center">NV Bán hàng</TableHead>
            <TableHead className="px-3 py-2 text-center">Số chứng từ</TableHead>
            <TableHead className="px-3 py-2 text-center">Số hóa đơn</TableHead>
            <TableHead className="px-3 py-2 text-center">Ngày chứng từ</TableHead>
            <TableHead className="px-3 py-2 text-center">Ngày đến hạn</TableHead>
            <TableHead className="px-3 py-2 text-center">Số ngày công nợ</TableHead>
            <TableHead className="px-3 py-2 text-center">Số ngày quá hạn</TableHead>
            <TableHead className="px-3 py-2 text-center">Ngày hẹn thanh toán</TableHead>
            <TableHead className="px-3 py-2 text-center">Số tiền chứng từ</TableHead>
            <TableHead className="px-3 py-2 text-center">Số tiền còn lại</TableHead>
            <TableHead className="px-3 py-2 text-center">Trạng thái</TableHead>
            <TableHead className="px-3 py-2 text-center">Ghi chú</TableHead>
            <TableHead className="w-36 text-center px-3 py-2">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: expectedRowCount }).map((_, idx) => {
            const debt = debts[idx];
            const customerCode = debt?.debt_config?.customer_code || debt?.customer_raw_code || "";
            const isCustomerCodeFallback = !debt?.debt_config?.customer_code;
            const employeeName = debt?.debt_config?.employee?.fullName || debt?.employee_code_raw || "";
            const isEmployeeFallback = !debt?.debt_config?.employee?.fullName;
            const saleName = debt?.sale?.fullName || debt?.sale_name_raw || "";
            const isSaleFallback = !debt?.sale?.fullName;
            // Sửa lấy ngày hẹn thanh toán: lấy từ debt.pay_later (kiểu Date hoặc string)
            const payLater = debt?.pay_later ? new Date(debt.pay_later).toLocaleDateString() : "--";
            const note = debt?.note || "--";
            // Nếu bất kỳ trường nào là fallback thì tô vàng cả dòng
            const isAnyFallback = isCustomerCodeFallback || isEmployeeFallback || isSaleFallback;
            return debt ? (
              <TableRow
                key={debt.id || idx}
                className={
                  (isAnyFallback ? "bg-yellow-100" : idx % 2 === 0 ? "bg-gray-200" : "")
                }
              >
                <TableCell className={cellCenterClass}>{startIndex + idx + 1}</TableCell>
                <TableCell className={cellLeftClass}>{customerCode}</TableCell>
                <TableCell className={cellLeftClass}>{employeeName}</TableCell>
                <TableCell className={cellLeftClass}>{saleName}</TableCell>
                <TableCell className={cellCenterClass}>{debt.invoice_code}</TableCell>
                <TableCell className={cellCenterClass}>{debt.bill_code}</TableCell>
                <TableCell className={cellCenterClass}>{debt.issue_date ? new Date(debt.issue_date).toLocaleDateString() : ""}</TableCell>
                <TableCell className={cellCenterClass}>{debt.due_date ? new Date(debt.due_date).toLocaleDateString() : ""}</TableCell>
                <TableCell className={cellCenterClass}>{debt.issue_date && debt.due_date ? getDaysBetween(debt.issue_date, debt.due_date) : ""}</TableCell>
                <TableCell className={cellCenterClass}>{debt.due_date ? getDaysBetween(debt.due_date, today) : ""}</TableCell>
                <TableCell className={cellCenterClass}>{payLater}</TableCell>
                <TableCell className={cellCenterClass}>{debt.total_amount ? Number(debt.total_amount).toLocaleString() : ""}</TableCell>
                <TableCell className={cellCenterClass}>{debt.remaining ? Number(debt.remaining).toLocaleString() : ""}</TableCell>
                <TableCell className={cellCenterClass}>
                  <span className={
                    debt.status === "paid"
                      ? "text-green-600 font-semibold"
                      : debt.status === "pay_later"
                      ? "text-blue-600 font-semibold"
                      : debt.status === "no_information_available"
                      ? "text-gray-500 font-semibold"
                      : debt.status === "Đã thanh toán"
                      ? "text-green-600 font-semibold"
                      : debt.status === "Chưa thanh toán"
                      ? "text-red-600 font-semibold"
                      : "text-yellow-600 font-semibold"
                  }>
                    {debt.status === "paid"
                      ? "Đã thanh toán"
                      : debt.status === "pay_later"
                      ? "Đã hẹn thanh toán"
                      : debt.status === "no_information_available"
                      ? "Không có thông tin"
                      : debt.status}
                  </span>
                </TableCell>
                <TableCell className={cellCenterClass}>{note}</TableCell>
                <TableCell className={cellCenterClass + " flex gap-2 justify-center"}>
                  <Button 
                    size="sm" 
                    variant="edit" 
                    onClick={() => {
                      // Lưu object debt đầy đủ vào state riêng biệt
                      setEditingDebt({ ...debt });
                      setEditModalOpen(true);
                    }}
                    disabled={isProcessing}
                  >
                    Chỉnh sửa
                  </Button>
                  <Button 
                    size="sm" 
                    variant="delete" 
                    onClick={() => { 
                      setDebtToDelete(debt); 
                      setShowDeleteConfirm(true); 
                    }}
                    disabled={isProcessing}
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
                {Array.from({ length: 16 }).map((_, i) => (
                  <TableCell key={i} />
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Modal chỉnh sửa */}
      <EditDebtModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        initialNote={editingDebt?.note || ""}
        initialStatus={editingDebt?.status || ""}
        statusOptions={statusOptions}
        onSave={handleModalSave}
      />

      {/* Confirm dialog cho edit */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Xác nhận cập nhật phiếu công nợ"
        message="Bạn có chắc chắn muốn lưu thay đổi ghi chú và trạng thái cho phiếu này?"
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
      />

      {/* Confirm dialog cho delete */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa phiếu công nợ"
        message="Bạn có chắc chắn muốn xóa mềm phiếu công nợ này?"
        onConfirm={async () => {
          if (onDelete && debtToDelete) {
            setIsProcessing(true);
            try {
              await onDelete(debtToDelete);
              setShowDeleteConfirm(false);
              setDebtToDelete(null);
              onReload();
            } finally {
              setIsProcessing(false);
            }
          }
        }}
        onCancel={() => { 
          setShowDeleteConfirm(false); 
          setDebtToDelete(null); 
        }}
      />
    </div>
  );
}