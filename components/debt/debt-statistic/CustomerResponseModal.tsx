"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, X, FileText, User } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import type { ContactDetailItem } from "@/lib/debt-statistics-api";

interface CustomerResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  items: ContactDetailItem[];
  loading?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void | Promise<void>;
}

const CustomerResponseModal: React.FC<CustomerResponseModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  loading = false,
  total = 0,
  page = 1,
  limit = 50,
  onPageChange,
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(page);
  const [pageSize, setPageSize] = useState(limit);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  useEffect(() => {
    setPageSize(limit);
  }, [limit]);

  const filtered = useMemo(() => {
    if (!searchTerm) return safeItems;
    const q = searchTerm.toLowerCase();
    return safeItems.filter((it) => {
      return (
        (it.customer_code || "").toString().toLowerCase().includes(q) ||
        (it.customer_name || "").toString().toLowerCase().includes(q) ||
        (it.employee_code_raw || "").toString().toLowerCase().includes(q)
      );
    });
  }, [safeItems, searchTerm]);

  // simple pagination for client-side lists
  const totalItems = filtered.length;
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  const paginated = filtered.slice(start, end);

  useEffect(() => {
    // if parent provides onPageChange, call it when currentPage changes
    if (onPageChange) onPageChange(currentPage);
  }, [currentPage, onPageChange]);

  const handleClear = useCallback(() => {
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] !h-[80vh] !max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background">
          <DialogTitle className="text-lg font-semibold">
            {title || "Khách hàng - Chi tiết phản hồi"} ({total || totalItems} khách)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" /> Tìm kiếm
                </Label>
                <div className="relative mt-1">
                  <Input
                    placeholder="Mã KH, tên, mã NV..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" /> Bộ lọc
                </Label>
                <div className="mt-1 text-sm text-gray-600">Tùy chọn lọc nhanh</div>
              </div>

              <div className="flex items-end justify-end">
                <div className="text-right text-sm text-gray-600">
                  <div>Tổng khách: <strong>{total || totalItems}</strong></div>
                  <div>Hiển thị: {start + 1}-{end} trên {totalItems}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-56">
                <LoadingSpinner size={32} />
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow>
                    <TableHead className="w-14 text-center">#</TableHead>
                    <TableHead>Mã KH</TableHead>
                    <TableHead>Tên KH</TableHead>
                    <TableHead>Mã NV</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((c, idx) => {
                      const time =
                        c.send_at || c.first_remind_at || c.second_remind_at || c.latest_time || "-";
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-center">{start + idx + 1}</TableCell>
                          <TableCell className="font-mono">{c.customer_code || "-"}</TableCell>
                          <TableCell>{c.customer_name || "-"}</TableCell>
                          <TableCell className="font-mono">{c.employee_code_raw || "-"}</TableCell>
                          <TableCell>
                            {time !== "-" ? new Date(time).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-gray-500">Không có dữ liệu</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Xóa bộ lọc
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">Trang</div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>Đầu</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Trước</Button>
                <div className="px-2">{currentPage}</div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={end >= totalItems}>Tiếp</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, Math.ceil(totalItems / pageSize)))} disabled={end >= totalItems}>Cuối</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerResponseModal;
