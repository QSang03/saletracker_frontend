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

interface DebtManagementProps {
  debts: any[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
}

function getDaysBetween(date1?: string | Date, date2?: string | Date) {
  if (!date1 || !date2) return "";
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DebtManagement({ debts, expectedRowCount, startIndex, onReload }: DebtManagementProps) {
  const today = new Date();
  return (
    <div className="border rounded-xl overflow-x-auto shadow-inner">
      <Table className="min-w-[1200px]">
        <TableHeader className="sticky top-0 z-[8] bg-background shadow-sm">
          <TableRow>
            <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
            <TableHead className="px-3 py-2 text-left">Tên khách hàng</TableHead>
            <TableHead className="px-3 py-2 text-left">NV Công nợ</TableHead>
            <TableHead className="px-3 py-2 text-left">NV Bán hàng</TableHead>
            <TableHead className="px-3 py-2 text-left">Số chứng từ</TableHead>
            <TableHead className="px-3 py-2 text-left">Số hóa đơn</TableHead>
            <TableHead className="px-3 py-2 text-left">Ngày chứng từ</TableHead>
            <TableHead className="px-3 py-2 text-left">Ngày đến hạn</TableHead>
            <TableHead className="px-3 py-2 text-right">Số ngày công nợ</TableHead>
            <TableHead className="px-3 py-2 text-right">Số ngày quá hạn</TableHead>
            <TableHead className="px-3 py-2 text-left">Ngày hẹn thanh toán</TableHead>
            <TableHead className="px-3 py-2 text-right">Số tiền chứng từ</TableHead>
            <TableHead className="px-3 py-2 text-right">Số tiền còn lại</TableHead>
            <TableHead className="px-3 py-2 text-left">Trạng thái</TableHead>
            <TableHead className="px-3 py-2 text-left">Ghi chú</TableHead>
            <TableHead className="w-36 text-center px-3 py-2">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: expectedRowCount }).map((_, idx) => {
            const debt = debts[idx];
            return debt ? (
              <TableRow key={debt.id || idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                <TableCell className="text-center px-3 py-2 font-medium">{startIndex + idx + 1}</TableCell>
                <TableCell className="px-3 py-2">{debt.customer_name}</TableCell>
                <TableCell className="px-3 py-2">{debt.employee_name || ""}</TableCell>
                <TableCell className="px-3 py-2">{debt.sale_name_raw || debt.sale_name || ""}</TableCell>
                <TableCell className="px-3 py-2">{debt.invoice_code}</TableCell>
                <TableCell className="px-3 py-2">{debt.bill_code}</TableCell>
                <TableCell className="px-3 py-2">{debt.issue_date ? new Date(debt.issue_date).toLocaleDateString() : ""}</TableCell>
                <TableCell className="px-3 py-2">{debt.due_date ? new Date(debt.due_date).toLocaleDateString() : ""}</TableCell>
                <TableCell className="px-3 py-2 text-right">{debt.issue_date && debt.due_date ? getDaysBetween(debt.issue_date, debt.due_date) : ""}</TableCell>
                <TableCell className="px-3 py-2 text-right">{debt.due_date ? getDaysBetween(debt.due_date, today) : ""}</TableCell>
                <TableCell className="px-3 py-2">{debt.pay_date ? new Date(debt.pay_date).toLocaleDateString() : ""}</TableCell>
                <TableCell className="px-3 py-2 text-right">{debt.total_amount ? Number(debt.total_amount).toLocaleString() : ""}</TableCell>
                <TableCell className="px-3 py-2 text-right">{debt.remaining ? Number(debt.remaining).toLocaleString() : ""}</TableCell>
                <TableCell className="px-3 py-2">
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
                <TableCell className="px-3 py-2">{debt.note}</TableCell>
                <TableCell className="text-center px-3 py-2 flex gap-2 justify-center">
                  <Button size="sm" variant="gradient" onClick={() => {}}>
                    Xem chi tiết
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

// Không cần sửa gì ở file này, đã đúng chuẩn export default và props.
