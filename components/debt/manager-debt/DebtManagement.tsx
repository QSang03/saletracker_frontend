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

// Thêm prop cho phép custom align từng cột
interface DebtManagementProps {
  debts: any[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  columnAligns?: ("left" | "center" | "right")[];
}

function getDaysBetween(date1?: string | Date, date2?: string | Date) {
  if (!date1 || !date2) return "";
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DebtManagement({ debts, expectedRowCount, startIndex, onReload, columnAligns }: DebtManagementProps) {
  const today = new Date();
  // CSS cho cell, giữ nguyên như ban đầu
  const cellClass = "px-3 py-2";
  const cellCenterClass = "text-center px-3 py-2";
  const cellLeftClass = "text-left px-3 py-2";
  const cellRightClass = "text-right px-3 py-2";
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
                  (isAnyFallback ? "bg-yellow-100" : idx % 2 === 0 ? "bg-gray-50" : "")
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
                    debt.status === "Đã thanh toán"
                      ? "text-green-600 font-semibold"
                      : debt.status === "Chưa thanh toán"
                      ? "text-red-600 font-semibold"
                      : "text-yellow-600 font-semibold"
                  }>
                    {debt.status}
                  </span>
                </TableCell>
                <TableCell className={cellCenterClass}>{note}</TableCell>
                <TableCell className={cellCenterClass + " flex gap-2 justify-center"}>
                  <Button size="sm" variant="edit" onClick={() => {}}>
                    Chỉnh sửa
                  </Button>
                  <Button size="sm" variant="delete" onClick={() => {}}>
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
    </div>
  );
}
