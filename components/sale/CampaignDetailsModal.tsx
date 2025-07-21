"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Trash2 } from "lucide-react";
import { Campaign, CampaignInteractionLog, LogStatus } from "@/types";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import CampaignLogDetailModal from "./CampaignLogDetailModal";

interface CampaignDetailsModalProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<LogStatus, string> = {
  [LogStatus.PENDING]: "Chờ gửi",
  [LogStatus.SENT]: "Đã gửi",
  [LogStatus.FAILED]: "Thất bại",
  [LogStatus.CUSTOMER_REPLIED]: "KH đã phản hồi",
  [LogStatus.STAFF_HANDLED]: "NV đã xử lý",
  [LogStatus.REMINDER_SENT]: "Đã gửi nhắc",
};

const statusColors: Record<LogStatus, string> = {
  [LogStatus.PENDING]: "bg-yellow-100 text-yellow-800",
  [LogStatus.SENT]: "bg-blue-100 text-blue-800",
  [LogStatus.FAILED]: "bg-red-100 text-red-800",
  [LogStatus.CUSTOMER_REPLIED]: "bg-green-100 text-green-800",
  [LogStatus.STAFF_HANDLED]: "bg-purple-100 text-purple-800",
  [LogStatus.REMINDER_SENT]: "bg-orange-100 text-orange-800",
};

export default function CampaignDetailsModal({
  campaign,
  open,
  onOpenChange,
}: CampaignDetailsModalProps) {
  const [logs, setLogs] = useState<CampaignInteractionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    statuses: [] as string[],
  });
  const [logDetailModalOpen, setLogDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CampaignInteractionLog | null>(null);

  const cellClass = "px-3 py-2";
  const cellCenterClass = "text-center px-3 py-2";
  const cellLeftClass = "text-left px-3 py-2";

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return "--";
    return new Date(date).toLocaleString("vi-VN");
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/campaigns/${campaign.id}/logs?` + new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: filters.search,
        statuses: filters.statuses.join(","),
      }));
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching campaign logs:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, page, pageSize, filters]);

  const handleViewLogDetail = (log: CampaignInteractionLog) => {
    setSelectedLog(log);
    setLogDetailModalOpen(true);
  };

  const handleDeleteLog = async (log: CampaignInteractionLog) => {
    try {
      // TODO: Implement delete API call
      console.log("Delete log:", log.id);
      fetchLogs(); // Refresh data after delete
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  const availableStatuses = Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Chi tiết chiến dịch: {campaign.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <PaginatedTable
              enableSearch={true}
              enableStatusFilter={true}
              availableStatuses={availableStatuses}
              page={page}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onFilterChange={(newFilters) => {
                setFilters({
                  search: newFilters.search,
                  statuses: newFilters.statuses.map(s => s.toString()),
                });
                setPage(1); // Reset to first page when filtering
              }}
              loading={loading}
              emptyText="Không có dữ liệu log"
            >
              <div className="border rounded-xl shadow-inner overflow-x-auto always-show-scrollbar">
                <Table className="min-w-[1200px]">
                  <TableHeader className="sticky top-0 z-[8] shadow-sm">
                    <TableRow>
                      <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
                      <TableHead className="px-3 py-2 text-left">Tên Khách Hàng</TableHead>
                      <TableHead className="px-3 py-2 text-center">Số Điện Thoại</TableHead>
                      <TableHead className="px-3 py-2 text-center">Cách Xưng Hô</TableHead>
                      <TableHead className="px-3 py-2 text-center">Trạng Thái Gửi</TableHead>
                      <TableHead className="px-3 py-2 text-center">Nội Dung Phản Hồi</TableHead>
                      <TableHead className="px-3 py-2 text-center">Thời Gian Tạo</TableHead>
                      <TableHead className="px-3 py-2 text-center">Thời Gian Gửi</TableHead>
                      <TableHead className="px-3 py-2 text-center">Thời Gian Nhắc Lại</TableHead>
                      <TableHead className="w-32 text-center px-3 py-2">Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: pageSize }).map((_, idx) => (
                        <TableRow key={`skeleton-${idx}`}>
                          <TableCell colSpan={10} className="h-12">
                            <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          Không có dữ liệu log
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log, idx) => {
                        const startIndex = (page - 1) * pageSize;
                        const nextReminderTime = log.reminder_metadata?.find(r => !r.error)?.remindAt;
                        
                        return (
                          <TableRow
                            key={log.id}
                            className={idx % 2 === 0 ? "bg-gray-50" : ""}
                          >
                            <TableCell className={cellCenterClass}>
                              {startIndex + idx + 1}
                            </TableCell>
                            <TableCell className={cellLeftClass}>
                              <div className="font-medium">{log.customer.full_name}</div>
                            </TableCell>
                            <TableCell className={cellCenterClass}>
                              {log.customer.phone_number}
                            </TableCell>
                            <TableCell className={cellCenterClass}>
                              {log.customer.salutation || "--"}
                            </TableCell>
                            <TableCell className={cellCenterClass}>
                              <Badge className={`text-xs ${statusColors[log.status]}`}>
                                {statusLabels[log.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className={cellLeftClass}>
                              <div className="max-w-[200px] truncate">
                                {log.customer_reply_content || "--"}
                              </div>
                            </TableCell>
                            <TableCell className={cellCenterClass}>
                              {formatDateTime(log.campaign.created_at)}
                            </TableCell>
                            <TableCell className={cellCenterClass}>
                              {formatDateTime(log.sent_at)}
                            </TableCell>
                            <TableCell className={cellCenterClass}>
                              {nextReminderTime ? formatDateTime(nextReminderTime) : "--"}
                            </TableCell>
                            <TableCell className={cellCenterClass}>
                              <div className="flex items-center justify-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewLogDetail(log)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Xem log chi tiết</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteLog(log)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Xóa log</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </PaginatedTable>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Detail Modal */}
      {selectedLog && (
        <CampaignLogDetailModal
          log={selectedLog}
          open={logDetailModalOpen}
          onOpenChange={setLogDetailModalOpen}
        />
      )}
    </>
  );
}
