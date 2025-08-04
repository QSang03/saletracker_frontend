import React, { useState, useEffect } from "react";
import { OrderDetail } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  Zap,
  Star,
  TrendingUp,
  Eye,
} from "lucide-react";
import EditOrderDetailModal from "./EditOrderDetailModal";
import DeleteOrderDetailModal from "./DeleteOrderDetailModal";
import { POrderDynamic } from "../POrderDynamic";

interface OrderManagementProps {
  orders: OrderDetail[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  onEdit?: (orderDetail: OrderDetail, data: any) => void;
  onDelete?: (orderDetail: OrderDetail, reason: string) => void;
  loading?: boolean;
}

// ✅ Component để hiển thị text với tooltip khi cần thiết
const TruncatedText: React.FC<{
  text: string;
  maxLength?: number;
  className?: string;
}> = ({ text, maxLength = 50, className = "" }) => {
  if (!text || text.length <= maxLength) {
    return <span className={className}>{text || "N/A"}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help ${className}`}>
          {text.substring(0, maxLength)}...
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-md p-3 bg-slate-800 text-white text-sm rounded-lg shadow-xl">
        <div className="whitespace-pre-wrap break-words">{text}</div>
      </TooltipContent>
    </Tooltip>
  );
};

const OrderManagement: React.FC<OrderManagementProps> = ({
  orders,
  expectedRowCount,
  startIndex,
  onReload,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const safeOrders = Array.isArray(orders) ? orders : [];

  // ✅ Tính toán số dòng hiển thị thực tế
  const actualRowCount = Math.min(safeOrders.length, expectedRowCount);

  const [editingDetail, setEditingDetail] = useState<OrderDetail | null>(null);
  const [deletingDetail, setDeletingDetail] = useState<OrderDetail | null>(
    null
  );
  const [viewingDetail, setViewingDetail] = useState<OrderDetail | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleEditClick = (orderDetail: OrderDetail) => {
    setEditingDetail(orderDetail);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (orderDetail: OrderDetail) => {
    setDeletingDetail(orderDetail);
    setIsDeleteModalOpen(true);
  };

  const handleViewClick = (orderDetail: OrderDetail) => {
    setViewingDetail(orderDetail);
    setIsViewModalOpen(true);
  };

  const handleEditSave = (data: Partial<OrderDetail>) => {
    if (editingDetail && onEdit) {
      onEdit(editingDetail, data);
      setIsEditModalOpen(false);
      setEditingDetail(null);
    }
  };

  const handleDeleteConfirm = (reason: string) => {
    if (deletingDetail && onDelete) {
      onDelete(deletingDetail, reason);
      setIsDeleteModalOpen(false);
      setDeletingDetail(null);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingDetail(null);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setDeletingDetail(null);
  };

  const handleViewCancel = () => {
    setIsViewModalOpen(false);
    setViewingDetail(null);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ xử lý";
      case "quoted":
        return "Đã báo giá";
      case "completed":
        return "Đã hoàn thành";
      case "demand":
        return "Nhu cầu";
      case "confirmed":
        return "Đã phản hồi";
      default:
        return status || "N/A";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 shadow-sm";
      case "quoted":
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm";
      case "completed":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 shadow-sm";
      case "demand":
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 shadow-sm";
      case "confirmed":
        return "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300 shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 shadow-sm";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3 mr-1" />;
      case "quoted":
        return <TrendingUp className="w-3 h-3 mr-1" />;
      case "completed":
        return <CheckCircle className="w-3 h-3 mr-1" />;
      case "demand":
        return <AlertTriangle className="w-3 h-3 mr-1" />;
      case "confirmed":
        return <Shield className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  const getRowClassName = (orderDetail: OrderDetail, index: number) => {
    const extended = orderDetail.extended || 0;

    switch (extended) {
      case 1:
        return "bg-gradient-to-r from-red-50 via-red-25 to-red-50 hover:from-red-100 hover:to-red-75 border-l-4 border-red-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
      case 2:
        return "bg-gradient-to-r from-amber-50 via-amber-25 to-amber-50 hover:from-amber-100 hover:to-amber-75 border-l-4 border-amber-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
      case 3:
        return "bg-gradient-to-r from-emerald-50 via-emerald-25 to-emerald-50 hover:from-emerald-100 hover:to-emerald-75 border-l-4 border-emerald-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
      default:
        if (extended >= 4) {
          return index % 2 === 0
            ? "bg-gradient-to-r from-slate-50 via-slate-25 to-slate-50 hover:from-slate-100 hover:to-slate-75 border-l-4 border-slate-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1"
            : "bg-gradient-to-r from-gray-50 via-gray-25 to-gray-50 hover:from-gray-100 hover:to-gray-75 border-l-4 border-gray-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
        }
        return "bg-gradient-to-r from-white via-gray-25 to-white hover:from-gray-50 hover:to-gray-50 border-l-4 border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
    }
  };

  const getExtendedBadgeStyle = (extended: number) => {
    switch (extended) {
      case 1:
        return "px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-red-300 border-2 border-red-400 glow-red transform hover:scale-105 transition-all duration-200";
      case 2:
        return "px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-amber-300 border-2 border-amber-400 glow-amber transform hover:scale-105 transition-all duration-200";
      case 3:
        return "px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-emerald-300 border-2 border-emerald-400 glow-emerald transform hover:scale-105 transition-all duration-200";
      default:
        if (extended >= 4) {
          return "px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-blue-300 border-2 border-blue-400 glow-blue transform hover:scale-105 transition-all duration-200";
        }
        return "px-2 py-1 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 rounded-full text-xs font-medium shadow-sm border border-gray-300 transform hover:scale-105 transition-all duration-200";
    }
  };

  const getExtendedIcon = (extended: number) => {
    switch (extended) {
      case 1:
        return <AlertTriangle className="w-3 h-3 mr-1" />;
      case 2:
        return <Clock className="w-3 h-3 mr-1" />;
      case 3:
        return <Zap className="w-3 h-3 mr-1" />;
      default:
        if (extended >= 4) {
          return <Star className="w-3 h-3 mr-1" />;
        }
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1750px] table-fixed">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <TableHead className="font-bold text-gray-700 w-[50px] text-center">
                  #
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[100px] text-center">
                  Mã đơn
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[80px] text-center">
                  Gia hạn
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Thời gian
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Nhân viên
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Khách hàng
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[400px] text-center">
                  Mặt hàng
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[60px] text-center">
                  SL
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-right">
                  Đơn giá
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Trạng thái
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[140px] text-center">
                  Ghi chú
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[200px] text-center">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ✅ CHỈ tạo skeleton theo actualRowCount, không phải expectedRowCount */}
              {Array.from({ length: actualRowCount }).map((_, index) => (
                <TableRow
                  key={`skeleton-${index}`}
                  className="border-l-4 border-gray-300 bg-gradient-to-r from-gray-50 to-white rounded-lg shadow-sm my-1 animate-pulse"
                >
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-16 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-12 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-full rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 rounded ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <style jsx>{`
        .glow-red {
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }
        .glow-amber {
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }
        .glow-emerald {
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }
        .glow-blue {
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .text-truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .text-wrap {
          word-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
        }
      `}</style>

      <div className="space-y-2">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide shadow-inner rounded-lg border border-slate-200">
            <Table className="min-w-[1750px] table-fixed bg-white">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b-2 border-slate-300 shadow-sm">
                  <TableHead className="font-bold text-slate-700 text-sm w-[50px] text-center sticky left-0 bg-slate-100 z-10">
                    #
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[100px] text-center">
                    🏷️ Mã đơn
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[80px] text-center">
                    ⏰ Gia hạn
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[120px] text-center">
                    📅 Thời gian
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[120px] text-center">
                    👤 Nhân viên
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[120px] text-center">
                    🏪 Khách hàng
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[430px] text-center">
                    🛍️ Mặt hàng
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[60px] text-center">
                    🔢 SL
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[100px] text-right">
                    💰 Đơn giá
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[120px] text-center">
                    📊 Trạng thái
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[140px] text-center">
                    📝 Ghi chú
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[200px] text-center">
                    ⚙️ Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeOrders.length === 0 && (
                  <TableRow className="border-l-4 border-gray-300 bg-gradient-to-r from-gray-50 to-white rounded-lg shadow-sm my-1">
                    <TableCell
                      colSpan={12}
                      className="text-center py-8 text-gray-500"
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className="text-6xl">📋</div>
                        <div className="text-lg font-medium">
                          Không có dữ liệu đơn hàng
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* ✅ CHỈ hiển thị data thật có, KHÔNG tạo empty rows */}
                {safeOrders.length > 0 &&
                  safeOrders.map((orderDetail, index) => (
                    <TableRow
                      key={orderDetail.id || index}
                      className={getRowClassName(orderDetail, index)}
                    >
                      <TableCell className="text-center sticky left-0 bg-inherit z-10">
                        <div className="flex items-center justify-center w-8 h-8 bg-slate-200 rounded-full text-xs font-bold shadow-sm mx-auto">
                          {startIndex + index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-blue-700">
                        <div className="text-truncate">
                          #{orderDetail.id || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center ${getExtendedBadgeStyle(
                            orderDetail.extended || 0
                          )}`}
                        >
                          {getExtendedIcon(orderDetail.extended || 0)}
                          {orderDetail.extended || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm">
                        <div className="flex flex-col">
                          {orderDetail.created_at ? (
                            typeof orderDetail.created_at === "string" ? (
                              <>
                                <div className="font-medium text-blue-600">
                                  {orderDetail.created_at.includes(" ") 
                                    ? orderDetail.created_at.split(" ")[1] || ""
                                    : ""}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {orderDetail.created_at.includes(" ") 
                                    ? orderDetail.created_at.split(" ")[0] || ""
                                    : orderDetail.created_at}
                                </div>
                              </>
                            ) : orderDetail.created_at instanceof Date ? (
                              <>
                                <div className="font-medium text-blue-600">
                                  {orderDetail.created_at.toLocaleTimeString("vi-VN")}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {orderDetail.created_at.toLocaleDateString("vi-VN")}
                                </div>
                              </>
                            ) : (
                              <div>""</div>
                            )
                          ) : (
                            <div>""</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-purple-700 text-sm">
                        <TruncatedText
                          text={
                            orderDetail.order?.sale_by?.fullName ||
                            orderDetail.order?.sale_by?.username ||
                            "N/A"
                          }
                          maxLength={15}
                          className="text-truncate"
                        />
                      </TableCell>
                      <TableCell className="text-center font-medium text-green-700 text-sm">
                        <TruncatedText
                          text={orderDetail.customer_name || "N/A"}
                          maxLength={15}
                          className="text-truncate"
                        />
                      </TableCell>
                      <TableCell className="text-left text-slate-600 hover:text-slate-800 transition-colors">
                        <TruncatedText
                          text={orderDetail.raw_item || "N/A"}
                          maxLength={55}
                          className="text-wrap leading-relaxed"
                        />
                      </TableCell>
                      <TableCell className="text-center font-semibold text-indigo-600">
                        <div className="text-truncate">
                          {orderDetail.quantity || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600 text-sm">
                        <div className="text-truncate">
                          {orderDetail.unit_price
                            ? Number(orderDetail.unit_price).toLocaleString() +
                              "₫"
                            : "0₫"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            orderDetail.status || ""
                          )}`}
                        >
                          {getStatusIcon(orderDetail.status || "")}
                          <span className="text-truncate max-w-[80px]">
                            {getStatusLabel(orderDetail.status || "")}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-slate-600 italic hover:text-slate-800 transition-colors text-sm px-3">
                        <TruncatedText
                          text={orderDetail.notes || "—"}
                          maxLength={18}
                          className="text-wrap leading-relaxed"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <POrderDynamic action="read">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => handleViewClick(orderDetail)}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Xem tin nhắn</p>
                              </TooltipContent>
                            </Tooltip>
                          </POrderDynamic>
                          
                          <POrderDynamic action="update">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => handleEditClick(orderDetail)}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Sửa</p>
                              </TooltipContent>
                            </Tooltip>
                          </POrderDynamic>

                          <POrderDynamic action="delete">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => handleDeleteClick(orderDetail)}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Xóa</p>
                              </TooltipContent>
                            </Tooltip>
                          </POrderDynamic>

                          <POrderDynamic action="update">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors"
                                  disabled
                                >
                                  <Shield className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Blacklist (Tính năng sẽ có trong tương lai)</p>
                              </TooltipContent>
                            </Tooltip>
                          </POrderDynamic>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                {/* ✅ LOẠI BỎ: Không tạo empty rows nữa */}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {editingDetail && (
        <EditOrderDetailModal
          orderDetail={editingDetail}
          isOpen={isEditModalOpen}
          onClose={handleEditCancel}
          onSave={handleEditSave}
          loading={loading}
        />
      )}

      {deletingDetail && (
        <DeleteOrderDetailModal
          orderDetail={deletingDetail}
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          loading={loading}
        />
      )}

      {/* Messages Modal */}
      {viewingDetail && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                💬 Tin nhắn đơn hàng #{viewingDetail.id}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col h-[60vh] bg-gray-50 rounded-lg border">
              {/* Chat Header */}
              <div className="p-4 bg-blue-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {viewingDetail.customer_name?.charAt(0) || "K"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{viewingDetail.customer_name || "Khách hàng"}</h3>
                      <p className="text-sm opacity-90">Mã đơn: {viewingDetail.id}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm opacity-90">
                    <p>Sale: {viewingDetail.order?.sale_by?.fullName || viewingDetail.order?.sale_by?.username || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-gray-50 to-gray-100">
                {(() => {
                  try {
                    // Parse content_lq from metadata
                    const metadata = viewingDetail.metadata || {};
                    const contentLq = metadata.content_lq || "";
                    
                    if (!contentLq) {
                      return (
                        <div className="flex justify-center items-center h-full">
                          <div className="text-center text-gray-500">
                            <div className="text-4xl mb-2">💬</div>
                            <div>Không có tin nhắn nào</div>
                          </div>
                        </div>
                      );
                    }

                    // Split messages by [CUSTOMER] and [SALE] tags
                    interface Message {
                      type: 'customer' | 'sale';
                      text: string;
                      time: string;
                      index: number;
                    }
                    
                    const messages: Message[] = [];
                    const lines = contentLq.split('\n');
                    
                    lines.forEach((line: string, index: number) => {
                      const customerMatch = line.match(/\[CUSTOMER\]\s*(.+?)\s*\((\d+:\d+)\)/);
                      const saleMatch = line.match(/\[SALE\]\s*(.+?)\s*\((\d+:\d+)\)/);
                      
                      if (customerMatch) {
                        try {
                          const messageData = JSON.parse(customerMatch[1]);
                          messages.push({
                            type: 'customer',
                            text: messageData.text || '',
                            time: customerMatch[2] || '',
                            index: index
                          });
                        } catch (e) {
                          // If JSON parsing fails, use raw text
                          messages.push({
                            type: 'customer',
                            text: customerMatch[1] || '',
                            time: customerMatch[2] || '',
                            index: index
                          });
                        }
                      } else if (saleMatch) {
                        try {
                          const messageData = JSON.parse(saleMatch[1]);
                          messages.push({
                            type: 'sale',
                            text: messageData.text || '',
                            time: saleMatch[2] || '',
                            index: index
                          });
                        } catch (e) {
                          // If JSON parsing fails, use raw text
                          messages.push({
                            type: 'sale',
                            text: saleMatch[1] || '',
                            time: saleMatch[2] || '',
                            index: index
                          });
                        }
                      }
                    });

                    if (messages.length === 0) {
                      return (
                        <div className="flex justify-center items-center h-full">
                          <div className="text-center text-gray-500">
                            <div className="text-4xl mb-2">💬</div>
                            <div>Không thể tải tin nhắn</div>
                          </div>
                        </div>
                      );
                    }

                    return messages.map((message: Message, index: number) => {
                      if (message.type === 'customer') {
                        return (
                          <div key={`customer-${index}`} className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-white font-bold">
                                {viewingDetail.customer_name?.charAt(0) || "K"}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-1 max-w-xs lg:max-w-md">
                              <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                  {message.text.replace(/\\n/g, '\n')}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500 ml-3">
                                {message.time}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={`sale-${index}`} className="flex items-start space-x-3 justify-end">
                            <div className="flex flex-col space-y-1 max-w-xs lg:max-w-md">
                              <div className="bg-blue-500 text-white p-3 rounded-2xl rounded-tr-sm shadow-sm">
                                <p className="text-sm whitespace-pre-wrap">
                                  {message.text.replace(/\\n/g, '\n')}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500 mr-3 text-right">
                                {message.time}
                              </span>
                            </div>
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-white font-bold">
                                {viewingDetail.order?.sale_by?.fullName?.charAt(0) || 
                                 viewingDetail.order?.sale_by?.username?.charAt(0) || "S"}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    });
                  } catch (error) {
                    return (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center text-red-500">
                          <div className="text-4xl mb-2">⚠️</div>
                          <div>Lỗi khi tải tin nhắn</div>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Chat Footer with Order Status */}
              <div className="p-4 bg-white border-t rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Trạng thái:</span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        viewingDetail.status || ""
                      )}`}
                    >
                      {getStatusIcon(viewingDetail.status || "")}
                      {getStatusLabel(viewingDetail.status || "")}
                    </span>
                  </div>
                  <Button
                    onClick={handleViewCancel}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
};

export default OrderManagement;
