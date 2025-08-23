"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, Sparkles, Calendar, Clock, Hexagon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DebtDetailDialog from "./DebtDetailDialog";
import { useDebtHistory } from "@/hooks/useDebtHistory";
// NOTE: removed PaginatedTable import on purpose so we control pagination placement

interface DebtHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  debtConfigId: string | null;
  onShowAlert?: (alert: { type: "success" | "error"; message: string }) => void;
}

interface DebtHistoryItem {
  id: number;
  debt_log_id: number;
  send_at: string | null;
  created_at: string;
  remind_status?: string;
}

interface DateInfo {
  date: string;
  time: string;
}

export default function DebtHistoryDialog({
  open,
  onClose,
  debtConfigId,
  onShowAlert,
}: DebtHistoryDialogProps) {
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; historyId: string | null }>({
    open: false,
    historyId: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const {
    data: histories = [],
    loading,
    error,
    pagination = { total: 0 },
    fetchData,
  } = useDebtHistory({
    debtConfigId,
    initialPageSize: currentPageSize,
    enabled: open,
  });

  useEffect(() => {
    if (error && onShowAlert) {
      onShowAlert({
        type: "error",
        message: "Lỗi khi tải lịch sử công nợ",
      });
    }
  }, [error, onShowAlert]);

  useEffect(() => {
    if (!open) {
      setDetailDialog({ open: false, historyId: null });
      setCurrentPage(1);
    }
  }, [open]);

  useEffect(() => {
    if (open && debtConfigId) {
      fetchData(currentPage, currentPageSize);
    }
  }, [currentPage, currentPageSize, open, debtConfigId, fetchData]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1) return;
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setCurrentPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / currentPageSize));

  const formatDate = (dateStr: string | null): DateInfo => {
    if (!dateStr) {
      return { date: "--", time: "--" };
    }
    try {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString("vi-VN"),
        time: date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
    } catch {
      return { date: "--", time: "--" };
    }
  };

  const handleViewDetail = (historyId: number) => {
    setDetailDialog({ open: true, historyId: historyId.toString() });
  };

  const createTableRows = () => {
    if (!loading && histories.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-[320px] text-center">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4 animate-bounce">📋</div>
              <div className="text-xl font-medium bg-gradient-to-r from-slate-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Chưa có lịch sử công nợ
              </div>
              <div className="text-sm text-slate-400">Dữ liệu sẽ xuất hiện khi có thông báo được gửi</div>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return histories.map((history: DebtHistoryItem, idx: number) => {
      const globalIndex = (currentPage - 1) * currentPageSize + idx + 1;
      const dateInfo = formatDate(history.send_at);

      return (
        <TableRow
          key={history.id}
          className={`
            ${idx % 2 === 0 ? "bg-gradient-to-r from-white via-blue-50/20 to-white" : "bg-gradient-to-r from-gray-50/40 via-purple-50/20 to-gray-50/40"}
            group cursor-pointer border-b border-gray-200/30 relative overflow-hidden
            hover:bg-gradient-to-r hover:from-cyan-50/60 hover:via-blue-50/40 hover:to-purple-50/60
            hover:border-blue-300/50 hover:shadow-lg hover:shadow-blue-100/50
            transition-all duration-500 ease-out
          `}
          style={{ animationDelay: `${idx * 60}ms`, animation: "fadeInScale 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}
        >
          <TableCell className="text-center font-medium px-4 py-3 relative z-10 w-20">
            <div className="flex items-center justify-center relative z-10">
              <div className="relative group/stt">
                <div className="relative">
                  <Hexagon className="absolute inset-0 w-12 h-12 opacity-20" />
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <span className="text-sm font-bold">{globalIndex}</span>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>

          <TableCell className="text-center px-4 py-3 relative z-10">
            <div className="flex items-center justify-center gap-4 group/datetime relative z-10">
              <div className="relative group/date">
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-100 via-blue-50 to-slate-100 rounded-lg shadow-sm border border-slate-200/50 transition-all duration-400 relative overflow-hidden backdrop-blur-sm">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">{dateInfo.date}</span>
                </div>
              </div>

              <div className="relative group/time">
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-lg shadow-sm border border-blue-200/50 transition-all duration-400 relative overflow-hidden">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">{dateInfo.time}</span>
                </div>
              </div>
            </div>
          </TableCell>

          <TableCell className="text-center px-4 py-3 relative z-10 w-25">
            <div className="flex items-center justify-center relative z-10">
              <button
                onClick={() => handleViewDetail(history.id)}
                className="relative inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 text-white shadow"
                title="Xem chi tiết lịch sử"
              >
                <Eye className="h-5 w-5" />
              </button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  const SkeletonRow = ({ index }: { index: number }) => (
    <TableRow key={`s-${index}`} className="group relative overflow-hidden animate-pulse">
      <TableCell className="h-[50px] px-4 py-3 relative w-20">
        <div className="h-12 w-12 rounded-lg bg-slate-200" />
      </TableCell>
      <TableCell className="h-[50px] px-4 py-3 relative">
        <div className="flex items-center gap-4">
          <div className="h-8 w-24 rounded-lg bg-slate-200" />
          <div className="h-8 w-20 rounded-lg bg-slate-200" />
        </div>
      </TableCell>
      <TableCell className="h-[50px] px-4 py-3 relative w-25">
        <div className="h-11 w-11 rounded-xl bg-slate-200" />
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <style jsx>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .dialog-scroll {
          /* IMPORTANT: height adjusted so table body scrolls inside modal */
          max-height: calc(70vh - 160px); /* modal max height minus header/footer */
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .pagination-footer {
          border-top: 1px solid rgba(148,163,184,0.08);
          background: rgba(255,255,255,0.95);
        }
      `}</style>

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!w-[60vw] !max-w-[60vw] max-h-[80vh] !h-auto flex flex-col">
          {/* Keep background orbs/effects if you like; omitted here for brevity */}
          <DialogHeader className="relative z-10 flex-shrink-0 pb-4 border-b">
            <DialogTitle className="flex items-center gap-4 text-2xl font-bold">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span>Lịch sử công nợ</span>
                <span className="text-sm text-slate-600">Theo dõi chi tiết các lần gửi thông báo công nợ</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* MAIN: header (fixed), content (scroll), footer (pagination fixed inside modal) */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Content area: table with internal scroll */}
            <div className="dialog-scroll border border-slate-200/50 rounded-xl bg-white/95 shadow p-2">
              <Table className="w-full table-fixed">
                <colgroup>
                  <col className="w-20" />
                  <col />
                  <col className="w-25" />
                </colgroup>
                <TableHeader className="sticky top-0 z-10 bg-white/80">
                  <TableRow className="bg-gradient-to-r from-cyan-50/80 via-blue-50/80 to-purple-50/80 border-b-2">
                    <TableHead className="text-center font-bold py-4 px-4 text-sm w-20">
                      <div className="flex items-center justify-center gap-2">
                        <Hexagon className="h-4 w-4 text-cyan-600" />
                        <span>STT</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-bold py-4 px-4 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>Ngày & Giờ gửi</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-bold py-4 px-4 text-sm w-25">
                      <div className="flex items-center justify-center gap-2">
                        <Eye className="h-4 w-4 text-purple-600" />
                        <span>Chi tiết</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? Array.from({ length: currentPageSize }).map((_, i) => <SkeletonRow key={i} index={i} />) : createTableRows()}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer INSIDE modal (always visible under scroll area) */}
            <div className="pagination-footer mt-3 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm">Dòng / trang</label>
                <select value={currentPageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="px-3 py-1 rounded border">
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <div className="text-sm text-slate-500">Tổng: {pagination.total || 0}</div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-3 py-2 rounded bg-pink-200 text-pink-700 disabled:opacity-50" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>← Trước</button>

                <div className="px-4 py-2 bg-white border rounded">Trang <strong>{currentPage}</strong> / {totalPages}</div>

                <button className="px-3 py-2 rounded bg-pink-200 text-pink-700 disabled:opacity-50" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>Sau →</button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DebtDetailDialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, historyId: null })} debtConfigId={detailDialog.historyId} onShowAlert={onShowAlert} isHistory={true} />
    </>
  );
}
