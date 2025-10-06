import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, MessageCircle, Clock } from "lucide-react";
import { useSendHistory } from "@/hooks/useSendHistory";
import { OrderDetail } from "@/types";

interface SendHistoryViewProps {
  orderDetail: OrderDetail;
  className?: string;
}

export function SendHistoryView({
  orderDetail,
  className,
}: SendHistoryViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Giảm từ 20 xuống 10 để phân trang rõ ràng hơn

  // Extract zalo customer ID from metadata
  let zaloCustomerId: string | undefined;
  try {
    if (orderDetail.metadata) {
      const metadata =
        typeof orderDetail.metadata === "string"
          ? JSON.parse(orderDetail.metadata)
          : orderDetail.metadata;
      zaloCustomerId = metadata.customer_id;
    }
  } catch (error) {
    console.error("Error parsing metadata for send history:", error);
  }

  // Fetch send history for this customer
  const {
    data: sendHistory,
    total,
    loading,
    error,
    refetch,
  } = useSendHistory({
    zalo_customer_id: zaloCustomerId,
    send_function: "handleSendInquiry",
    page: currentPage,
    pageSize: pageSize,
  });

  // Count total sent messages for this customer
  const totalSentCount = total || 0;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      // Reset to first page and refetch when dialog opens
      setCurrentPage(1);
      refetch();
    }
  };

  if (!zaloCustomerId) {
    return null; // Don't show if no customer ID available
  }

  return (
    <div className={className}>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-blue-50"
          >
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>Đã gửi</span>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Badge variant={totalSentCount > 0 ? "default" : "secondary"}>
                  {totalSentCount}
                </Badge>
              )}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="!max-w-[60vw] !max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Lịch sử gửi tin nhắn - {orderDetail.customer_name || "Unknown"}
              <Badge variant="outline">{totalSentCount} lần gửi</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Đang tải lịch sử...</span>
              </div>
            ) : sendHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có tin nhắn nào được gửi cho khách hàng này</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Thời gian gửi</TableHead>
                    <TableHead>Nội dung tin nhắn</TableHead>
                    <TableHead className="w-[120px]">Người gửi</TableHead>
                    <TableHead className="w-[200px]">Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sendHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 opacity-50" />
                          {formatDate(item.sent_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md break-words">
                          {item.content}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.sent_from}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-600 max-w-48 break-words">
                          {item.notes || "--"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm text-gray-500">
                Tổng cộng: {totalSentCount} tin nhắn đã gửi
                {total > 0 && (
                  <span className="ml-2">
                    (Hiển thị {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, total)} / {total})
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Pagination Controls */}
                {total > pageSize && (
                  <div className="flex items-center gap-2 mr-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1 || loading}
                      className="px-2 py-1 text-xs"
                    >
                      ««
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                      className="px-2 py-1 text-xs"
                    >
                      ‹
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      {currentPage} / {Math.ceil(total / pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(total / pageSize), prev + 1))}
                      disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                      className="px-2 py-1 text-xs"
                    >
                      ›
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(total / pageSize))}
                      disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                      className="px-2 py-1 text-xs"
                    >
                      »»
                    </Button>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Làm mới
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
