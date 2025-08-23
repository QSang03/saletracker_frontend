"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, Sparkles, Calendar, Clock, Zap, Star, Hexagon } from "lucide-react";
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
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";

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
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    historyId: string | null;
  }>({ open: false, historyId: null });

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
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setCurrentPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  const formatDate = (dateStr: string | null): DateInfo => {
    if (!dateStr) {
      return { date: "--", time: "--" };
    }

    try {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString("vi-VN"),
        time: date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "--", time: "--" };
    }
  };

  const handleViewDetail = (historyId: number) => {
    setDetailDialog({ open: true, historyId: historyId.toString() });
  };

  // 🎨 Enhanced table rows - ✅ SỬA HOÀN TOÀN ALIGNMENT ISSUE
  const createTableRows = () => {
    // Nếu không có dữ liệu, return empty state tập trung
    if (!loading && histories.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-[400px] text-center">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4 animate-bounce">📋</div>
              <div className="text-xl font-medium bg-gradient-to-r from-slate-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Chưa có lịch sử công nợ
              </div>
              <div className="text-sm text-slate-400">
                Dữ liệu sẽ xuất hiện khi có thông báo được gửi
              </div>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    // Chỉ tạo rows cho dữ liệu thực sự có
    return histories.map((history: DebtHistoryItem, idx: number) => {
      const globalIndex = (currentPage - 1) * currentPageSize + idx + 1;
      const dateInfo = formatDate(history.send_at);

      return (
        <TableRow
          key={history.id}
          className={`
            ${idx % 2 === 0
              ? "bg-gradient-to-r from-white via-blue-50/20 to-white"
              : "bg-gradient-to-r from-gray-50/40 via-purple-50/20 to-gray-50/40"
            } 
            group cursor-pointer border-b border-gray-200/30 relative overflow-hidden
            hover:bg-gradient-to-r hover:from-cyan-50/60 hover:via-blue-50/40 hover:to-purple-50/60
            hover:border-blue-300/50 hover:shadow-lg hover:shadow-blue-100/50
            transition-all duration-500 ease-out
          `}
          style={{
            animationDelay: `${idx * 60}ms`,
            animation: "fadeInScale 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          }}
        >
          {/* STT Column - ✅ CLEAN ALIGNMENT */}
          <TableCell className="text-center font-medium px-4 py-3 relative z-10 w-20">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 rounded-full animate-sparkle ${
                    i % 3 === 0 ? "bg-cyan-400" : i % 3 === 1 ? "bg-blue-500" : "bg-purple-500"
                  }`}
                  style={{
                    left: `${Math.random() * 80 + 10}%`,
                    top: `${Math.random() * 80 + 10}%`,
                    animationDelay: `${Math.random() * 1200}ms`,
                    animationDuration: `${1.8 + Math.random() * 0.8}s`,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-center relative z-10">
              <div className="relative group/stt">
                <div className="relative">
                  <Hexagon className="absolute inset-0 w-12 h-12 text-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <span className="text-sm font-bold bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-700 bg-clip-text text-transparent group-hover/stt:scale-110 transition-transform duration-300">
                      {globalIndex}
                    </span>
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-1 border border-cyan-400/40 rounded-full animate-spin-slow"></div>
                    <div className="absolute inset-2 border border-blue-400/40 rounded-full animate-spin-reverse"></div>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>

          {/* Enhanced Date/Time Column - ✅ CLEAN ALIGNMENT */}
          <TableCell className="text-center px-4 py-3 relative z-10">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 rounded-full animate-sparkle ${
                    i % 3 === 0 ? "bg-cyan-400" : i % 3 === 1 ? "bg-blue-500" : "bg-purple-500"
                  }`}
                  style={{
                    left: `${Math.random() * 90 + 5}%`,
                    top: `${Math.random() * 80 + 10}%`,
                    animationDelay: `${Math.random() * 1200}ms`,
                    animationDuration: `${1.8 + Math.random() * 0.8}s`,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 group/datetime relative z-10">
              <div className="relative group/date">
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-100 via-blue-50 to-slate-100 rounded-lg shadow-sm border border-slate-200/50 group-hover:from-cyan-100 group-hover:via-blue-100 group-hover:to-purple-100 group-hover:border-blue-300/50 transition-all duration-400 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute inset-0 -translate-x-full group-hover/date:translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-1000 ease-out"></div>

                  <Calendar className="h-4 w-4 text-slate-600 group-hover:text-cyan-600 transition-colors duration-300 group-hover/date:rotate-12 transform" />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-cyan-700 transition-colors duration-300 relative z-10">
                    {dateInfo.date}
                  </span>

                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 group-hover/date:opacity-100 transition-opacity duration-500 blur-sm"></div>
                </div>
              </div>

              <div className="relative group/time">
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-lg shadow-sm border border-blue-200/50 group-hover:from-blue-200 group-hover:via-indigo-200 group-hover:to-purple-200 group-hover:border-indigo-300/50 transition-all duration-400 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover/time:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-300/20 via-indigo-300/30 to-purple-300/20 animate-pulse"></div>
                  </div>

                  <Clock className="h-4 w-4 text-blue-600 group-hover:text-indigo-600 transition-colors duration-300 group-hover/time:animate-spin transform" />
                  <span className="text-sm font-bold text-blue-700 group-hover:text-indigo-700 transition-colors duration-300 relative z-10">
                    {dateInfo.time}
                  </span>

                  <Zap className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400 opacity-0 group-hover/time:opacity-100 animate-bounce transition-opacity duration-300" />
                </div>
              </div>
            </div>
          </TableCell>

          {/* Enhanced Action Column - ✅ CLEAN ALIGNMENT */}
          <TableCell className="text-center px-4 py-3 relative z-10 w-25">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 rounded-full animate-sparkle ${
                    i % 3 === 0 ? "bg-cyan-400" : i % 3 === 1 ? "bg-blue-500" : "bg-purple-500"
                  }`}
                  style={{
                    left: `${Math.random() * 70 + 15}%`,
                    top: `${Math.random() * 80 + 10}%`,
                    animationDelay: `${Math.random() * 1200}ms`,
                    animationDuration: `${1.8 + Math.random() * 0.8}s`,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-center relative z-10">
              <div className="relative group/btn">
                <button
                  onClick={() => handleViewDetail(history.id)}
                  className="
                    relative overflow-hidden inline-flex items-center justify-center 
                    h-11 w-11 p-0 rounded-xl shadow-lg 
                    bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600
                    hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500
                    text-white border border-white/30
                    transition-all duration-400 ease-out
                    hover:shadow-xl hover:shadow-blue-300/25 hover:-translate-y-0.5
                    active:translate-y-0 active:scale-95
                    cursor-pointer
                    before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-400
                  "
                  title="Xem chi tiết lịch sử"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-500 animate-spin-slow opacity-0 group-hover/btn:opacity-60 transition-opacity duration-400"></div>
                  <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600"></div>
                  <div className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-br from-yellow-400/30 via-orange-400/30 to-red-400/30 opacity-0 group-hover/btn:opacity-100 animate-pulse transition-opacity duration-300"></div>

                  <div className="relative z-10 group-hover/btn:animate-pulse">
                    <div className="absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 border-2 border-white/20 rounded-full opacity-0 group-hover/btn:opacity-100 group-hover/btn:scale-150 transition-all duration-500 animate-ping"></div>
                    <div className="absolute inset-0 w-6 h-6 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 border border-cyan-300/40 rounded-full opacity-0 group-hover/btn:opacity-100 group-hover/btn:scale-125 transition-all duration-400 animate-spin-slow"></div>
                    <div className="absolute inset-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 border border-yellow-400/60 rounded-full opacity-0 group-hover/btn:opacity-100 group-hover/btn:scale-110 transition-all duration-300 animate-spin-reverse"></div>

                    <Eye className="h-5 w-5 relative z-20 
                      group-hover/btn:scale-125 
                      group-hover/btn:rotate-12 
                      group-hover/btn:text-yellow-200
                      group-hover/btn:drop-shadow-lg
                      group-hover/btn:animate-bounce
                      transition-all duration-400 
                      filter group-hover/btn:brightness-125 group-hover/btn:saturate-150
                    " />

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-t from-transparent via-cyan-400/80 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse transition-opacity duration-300 blur-sm"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-gradient-to-r from-transparent via-blue-400/80 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse transition-opacity duration-300 blur-sm"></div>
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-400 rounded-xl overflow-hidden">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className={`absolute w-1 h-1 rounded-full animate-quantum ${
                          i % 4 === 0 ? "bg-yellow-300" :
                          i % 4 === 1 ? "bg-cyan-300" :
                          i % 4 === 2 ? "bg-blue-300" : "bg-purple-300"
                        }`}
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${i * 100}ms`,
                          animationDuration: "1.5s",
                        }}
                      />
                    ))}
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-400 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent animate-pulse"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-pink-400/10 to-purple-400/10 animate-pulse delay-100"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-out"></div>
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`absolute w-2 h-2 text-yellow-300 animate-ping ${
                          i === 0 ? "-top-2 -left-2" :
                          i === 1 ? "-top-2 -right-2" :
                          i === 2 ? "-bottom-2 -left-2" :
                          i === 3 ? "-bottom-2 -right-2" :
                          i === 4 ? "top-1/2 -left-3 -translate-y-1/2" :
                          i === 5 ? "top-1/2 -right-3 -translate-y-1/2" :
                          i === 6 ? "-top-3 left-1/2 -translate-x-1/2" :
                          "-bottom-3 left-1/2 -translate-x-1/2"
                        }`}
                        style={{
                          animationDelay: `${i * 150}ms`,
                          animationDuration: "1s",
                        }}
                      />
                    ))}
                  </div>
                </button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  // Enhanced Skeleton với crystal loading
  const SkeletonRow = ({ index }: { index: number }) => (
    <TableRow
      key={`skeleton-${index}`}
      className="group relative overflow-hidden animate-pulse"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/50 to-transparent animate-shimmer"></div>

      <TableCell className="h-[50px] px-4 py-3 relative w-20">
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 bg-gradient-to-br from-slate-200 via-blue-200 to-purple-200 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
          </div>
        </div>
      </TableCell>

      <TableCell className="h-[50px] px-4 py-3 relative">
        <div className="flex items-center justify-center gap-4">
          <div className="h-8 bg-gradient-to-r from-slate-200 via-blue-200 to-slate-200 rounded-lg w-24 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
          </div>
          <div className="h-8 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 rounded-lg w-20 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
          </div>
        </div>
      </TableCell>

      <TableCell className="h-[50px] px-4 py-3 relative w-25">
        <div className="flex items-center justify-center">
          <div className="h-11 w-11 bg-gradient-to-br from-cyan-200 via-blue-200 to-purple-200 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(120deg); }
          66% { transform: translateY(-4px) rotate(240deg); }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }

        @keyframes quantum {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          25% { opacity: 0.5; transform: scale(0.5) rotate(90deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
          75% { opacity: 0.5; transform: scale(0.5) rotate(270deg); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .animate-shimmer {
          animation: shimmer 2.5s infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }

        .animate-quantum {
          animation: quantum 1.5s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }

        /* Giới hạn vùng cuộn thực tế (trừ header + padding) */
        .dialog-scroll {
          /* 85vh là kích thước max dialog, trừ khoảng header/footer ~140px => chỉnh nếu cần */
          max-height: calc(85vh - 140px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* Optional: custom scrollbar */
        .dialog-scroll::-webkit-scrollbar { width: 10px; }
        .dialog-scroll::-webkit-scrollbar-thumb { border-radius: 10px; background: rgba(100,116,139,0.12); }
      `}</style>

      <Dialog open={open} onOpenChange={onClose}>
        {/* NOTE: max-h + h-auto — không ép chiều cao con */}
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[85vh] !h-auto flex flex-col">
          {/* Quantum field background (pointer-events-none so it won't affect layout/scroll) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/15 to-blue-400/15 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/15 to-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-300/10 to-purple-300/10 rounded-full blur-3xl animate-spin-slow"></div>

            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full opacity-40 animate-float ${
                  i % 3 === 0 ? "bg-gradient-to-r from-cyan-400 to-blue-500" :
                  i % 3 === 1 ? "bg-gradient-to-r from-blue-500 to-purple-600" :
                  "bg-gradient-to-r from-purple-500 to-pink-500"
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3000}ms`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Enhanced Header - Always visible */}
          <DialogHeader className="relative z-10 flex-shrink-0 pb-4 border-b border-gradient-to-r from-cyan-200/50 via-blue-200/50 to-purple-200/50">
            <DialogTitle className="flex items-center gap-4 text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 bg-clip-text text-transparent">
              <div className="relative group/header">
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 text-white shadow-xl group-hover/header:shadow-2xl transition-all duration-300 relative overflow-hidden">
                  <Sparkles className="h-6 w-6 relative z-10 animate-pulse group-hover/header:animate-spin" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 animate-spin-slow opacity-0 group-hover/header:opacity-40 transition-opacity duration-300"></div>
                  <div className="absolute inset-[2px] rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600"></div>
                </div>
              </div>

              <div className="flex flex-col">
                <span>Lịch sử công nợ</span>
                <span className="text-sm font-normal text-slate-600 mt-1">
                  Theo dõi chi tiết các lần gửi thông báo công nợ
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Main content area với proper layout */}
          <div className="flex-1 flex flex-col min-h-0 relative z-10">
            <PaginatedTable
              loading={loading}
              page={currentPage}
              total={pagination.total}
              pageSize={currentPageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              enablePageSize={true}
              defaultPageSize={10}
              emptyText="Chưa có lịch sử công nợ"
            >
              {/* wrapper: overflow-hidden để tránh nội dung 'đẩy' modal */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {/* dialog-scroll là vùng cuộn thực tế — giới hạn chiều cao bằng calc */}
                <div className="dialog-scroll border border-slate-200/50 rounded-xl bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden">
                  <div className="h-full">
                    {/* TABLE */}
                    <div className="h-full">
                      <Table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-20" />
                          <col />
                          <col className="w-25" />
                        </colgroup>
                        <TableHeader className="sticky top-0 z-10">
                          <TableRow className="bg-gradient-to-r from-cyan-50/80 via-blue-50/80 to-purple-50/80 border-b-2 border-gradient-to-r from-cyan-200 via-blue-200 to-purple-200 backdrop-blur-sm">
                            <TableHead className="text-center font-bold text-slate-700 py-4 px-4 text-sm w-20">
                              <div className="flex items-center justify-center gap-2 group/head">
                                <Hexagon className="h-4 w-4 text-cyan-600 group-hover/head:animate-spin" />
                                <span>STT</span>
                              </div>
                            </TableHead>
                            <TableHead className="text-center font-bold text-slate-700 py-4 px-4 text-sm">
                              <div className="flex items-center justify-center gap-2 group/head">
                                <Calendar className="h-4 w-4 text-blue-600 group-hover/head:rotate-12 transition-transform" />
                                <span>Ngày & Giờ gửi</span>
                              </div>
                            </TableHead>
                            <TableHead className="text-center font-bold text-slate-700 py-4 px-4 text-sm w-25">
                              <div className="flex items-center justify-center gap-2 group/head">
                                <Eye className="h-4 w-4 text-purple-600 group-hover/head:scale-110 transition-transform" />
                                <span>Chi tiết</span>
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            Array.from({ length: currentPageSize }).map((_, index) => (
                              <SkeletonRow key={index} index={index} />
                            ))
                          ) : (
                            createTableRows()
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </PaginatedTable>
          </div>
        </DialogContent>
      </Dialog>

      <DebtDetailDialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, historyId: null })}
        debtConfigId={detailDialog.historyId}
        onShowAlert={onShowAlert}
        isHistory={true}
      />
    </>
  );
}
