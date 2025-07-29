"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Campaign, CampaignFormData, CampaignStatus, CampaignWithDetails } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontal,
  Play,
  Pause,
  Archive,
  Trash2,
  Edit,
  Calendar,
  Users,
  Clock,
} from "lucide-react";
import { campaignAPI } from "@/lib/campaign-api";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import CampaignCustomersModal from "./CampaignCustomersModal";
import CampaignModal from "./CampaignModal";

interface CampaignManagementProps {
  campaigns: CampaignWithDetails[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
}

// Status configuration with consistent styling
const STATUS_CONFIG = {
  [CampaignStatus.DRAFT]: {
    label: "Bản nháp",
    variant: "secondary" as const,
    color: "bg-gray-100 text-gray-700",
    icon: "📝",
  },
  [CampaignStatus.SCHEDULED]: {
    label: "Đã lên lịch",
    variant: "outline" as const,
    color: "bg-blue-100 text-blue-700",
    icon: "⏰",
  },
  [CampaignStatus.RUNNING]: {
    label: "Đang chạy",
    variant: "default" as const,
    color: "bg-green-100 text-green-700",
    icon: "🚀",
  },
  [CampaignStatus.PAUSED]: {
    label: "Tạm dừng",
    variant: "destructive" as const,
    color: "bg-orange-100 text-orange-700",
    icon: "⏸️",
  },
  [CampaignStatus.COMPLETED]: {
    label: "Hoàn thành",
    variant: "default" as const,
    color: "bg-emerald-100 text-emerald-700",
    icon: "✅",
  },
  [CampaignStatus.ARCHIVED]: {
    label: "Đã lưu trữ",
    variant: "secondary" as const,
    color: "bg-gray-100 text-gray-600",
    icon: "📦",
  },
} as const;

// Memoized status badge component
const StatusBadge = React.memo(({ status }: { status: CampaignStatus }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[CampaignStatus.DRAFT];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-all duration-200",
        "hover:scale-105 hover:shadow-sm",
        config.color
      )}
    >
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </Badge>
  );
});

StatusBadge.displayName = "StatusBadge";

// Optimized date formatter
const formatDate = (date: string | Date): string => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "Không xác định";
  }
};

// Loading skeleton component
const LoadingSkeleton = ({
  expectedRowCount,
}: {
  expectedRowCount: number;
}) => (
  <>
    {Array.from({ length: expectedRowCount }).map((_, index) => (
      <TableRow key={`loading-${index}`} className="animate-pulse">
        <TableCell className="text-center">
          <div className="h-4 w-8 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </TableCell>
        <TableCell>
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-6 w-16 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-8 w-8 bg-gray-200 rounded mx-auto" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

// Campaign row component
const CampaignRow = React.memo(
  ({
    campaign,
    index,
    startIndex,
    isLoading,
    onAction,
    onShowCustomers,
  }: {
    campaign: CampaignWithDetails;
    index: number;
    startIndex: number;
    isLoading: boolean;
    onAction: (action: string, campaign: CampaignWithDetails) => void;
    onShowCustomers: (campaign: CampaignWithDetails) => void;
  }) => {
    const { canAccess } = usePermission();
    const canUpdate = canAccess("chien-dich", "update");
    const canDelete = canAccess("chien-dich", "delete");

    const canToggleStatus = useMemo(
      () =>
        campaign.status === CampaignStatus.RUNNING ||
        campaign.status === CampaignStatus.PAUSED,
      [campaign.status]
    );

    const canArchive = useMemo(
      () => campaign.status !== CampaignStatus.ARCHIVED,
      [campaign.status]
    );

    // Handle double click to show customers
    const handleDoubleClick = useCallback(() => {
      onShowCustomers(campaign);
    }, [campaign, onShowCustomers]);

    // Handle campaign name click
    const handleNameClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onShowCustomers(campaign);
      },
      [campaign, onShowCustomers]
    );

    return (
      <TableRow
        className={cn(
          "group transition-all duration-200 hover:bg-gray-50 cursor-pointer",
          isLoading && "opacity-50 pointer-events-none"
        )}
        onDoubleClick={handleDoubleClick}
      >
        <TableCell className="text-center font-medium text-gray-600">
          {startIndex + index + 1}
        </TableCell>

        <TableCell>
          <div className="space-y-1">
            <div
              className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer hover:underline"
              onClick={handleNameClick}
              title="Click để xem danh sách khách hàng"
            >
              {campaign.name}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Tạo: {formatDate(campaign.created_at)}
            </div>
          </div>
        </TableCell>

        <TableCell>
          <div className="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded-md inline-block">
            {(() => {
              switch (campaign.campaign_type) {
                case "hourly_km":
                  return "Khuyến mãi theo giờ";
                case "daily_km":
                  return "Khuyến mãi hàng ngày";
                case "3_day_km":
                  return "Khuyến mãi 3 ngày";
                case "weekly_sp":
                  return "Sản phẩm hàng tuần";
                case "weekly_bbg":
                  return "BBG hàng tuần";
                default:
                  return campaign.campaign_type;
              }
            })()}
          </div>
        </TableCell>

        <TableCell className="text-center">
          <StatusBadge status={campaign.status} />
        </TableCell>

        <TableCell className="text-center text-sm text-gray-600">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(campaign.created_at)}
          </div>
        </TableCell>

        <TableCell className="text-center text-sm text-gray-500">
          Chưa đặt
        </TableCell>

        <TableCell className="text-center">
          <div
            className="flex items-center justify-center gap-1 text-sm cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleNameClick}
            title="Click để xem danh sách khách hàng"
          >
            <Users className="h-3 w-3 text-gray-400" />
            <span className="font-medium">
              {(campaign.customer_count || 0).toLocaleString()}
            </span>
          </div>
        </TableCell>

        <TableCell className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
                disabled={isLoading}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
                Thao tác
              </DropdownMenuLabel>

              <DropdownMenuItem
                onClick={() => onShowCustomers(campaign)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Xem khách hàng
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onAction("edit", campaign)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                Chỉnh sửa
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Status Toggle */}
              {canToggleStatus && canUpdate && (
                <DropdownMenuItem
                  onClick={() => onAction("toggle", campaign)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {campaign.status === CampaignStatus.RUNNING ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Chạy lại
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {/* Archive */}
              {canArchive && canUpdate && (
                <DropdownMenuItem
                  onClick={() => onAction("archive", campaign)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  Lưu trữ
                </DropdownMenuItem>
              )}

              {/* Delete */}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onAction("delete", campaign)}
                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  }
);

CampaignRow.displayName = "CampaignRow";

export default function CampaignManagement({
  campaigns,
  expectedRowCount,
  startIndex,
  onReload,
}: CampaignManagementProps) {
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignWithDetails | null>(null);
  const { canAccess } = usePermission();

  // Handle edit action
  const handleEdit = useCallback((campaign: CampaignWithDetails) => {
    setEditingCampaign(campaign);
    setIsEditModalOpen(true);
  }, []);

  // Handle modal close
  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingCampaign(null);
  }, []);

  // Handle edit submit
  const handleEditSubmit = useCallback(
    async (data: CampaignFormData) => {
      try {
        // Call API to update campaign
        await campaignAPI.update(data.id!, data);
        toast.success("Cập nhật chiến dịch thành công");
        onReload();
        handleEditModalClose();
      } catch (error: any) {
        console.error("Error updating campaign:", error);
        const errorMessage =
          error.response?.data?.message ||
          "Có lỗi xảy ra khi cập nhật chiến dịch";
        toast.error(errorMessage);
        throw error; // Re-throw to let modal handle loading state
      }
    },
    [onReload, handleEditModalClose]
  );

  const setItemLoading = useCallback((id: string, isLoading: boolean) => {
    setLoadingItems((prev) => {
      const newSet = new Set(prev);
      if (isLoading) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Handle showing customers modal
  const handleShowCustomers = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsCustomersModalOpen(true);
  }, []);

  // Handle closing customers modal
  const handleCloseCustomersModal = useCallback(() => {
    setIsCustomersModalOpen(false);
    setSelectedCampaign(null);
  }, []);

  const handleAction = useCallback(
    async (action: string, campaign: CampaignWithDetails) => {
      const canUpdate = canAccess("chien-dich", "update");
      const canDelete = canAccess("chien-dich", "delete");

      if ((action === "toggle" || action === "archive") && !canUpdate) {
        toast.error("Bạn không có quyền thực hiện thao tác này");
        return;
      }

      if (action === "delete" && !canDelete) {
        toast.error("Bạn không có quyền xóa chiến dịch");
        return;
      }

      if (action === "delete") {
        const confirmed = window.confirm(
          `Bạn có chắc chắn muốn xóa chiến dịch "${campaign.name}"?`
        );
        if (!confirmed) return;
      }

      try {
        setItemLoading(campaign.id, true);

        switch (action) {
          case "toggle":
            const newStatus =
              campaign.status === CampaignStatus.RUNNING
                ? CampaignStatus.PAUSED
                : CampaignStatus.RUNNING;
            await campaignAPI.updateStatus(campaign.id, newStatus);
            toast.success(
              `Đã ${
                newStatus === CampaignStatus.RUNNING ? "chạy" : "tạm dừng"
              } chiến dịch`
            );
            break;

          case "archive":
            await campaignAPI.updateStatus(
              campaign.id,
              CampaignStatus.ARCHIVED
            );
            toast.success("Đã lưu trữ chiến dịch");
            break;

          case "delete":
            await campaignAPI.delete(campaign.id);
            toast.success("Đã xóa chiến dịch");
            break;

          case "edit":
            handleEdit(campaign);
            return;

          default:
            return;
        }

        onReload();
      } catch (error: any) {
        console.error(`Error performing ${action}:`, error);
        const errorMessage =
          error.response?.data?.message ||
          `Có lỗi xảy ra khi ${
            action === "toggle"
              ? "thay đổi trạng thái"
              : action === "archive"
              ? "lưu trữ"
              : action === "delete"
              ? "xóa"
              : "thực hiện thao tác"
          }`;
        toast.error(errorMessage);
      } finally {
        setItemLoading(campaign.id, false);
      }
    },
    [onReload, setItemLoading]
  );

  const emptyRows = useMemo(
    () => Math.max(0, expectedRowCount - campaigns.length),
    [expectedRowCount, campaigns.length]
  );

  return (
    <>
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow className="hover:bg-gray-50">
              <TableHead className="w-16 text-center font-semibold h-14 align-middle">
                #
              </TableHead>
              <TableHead className="font-semibold min-w-[260px] max-w-[340px] h-14 align-middle">
                Tên Chiến Dịch
                <div className="text-xs font-normal text-gray-500 mt-1">
                  Click vào tên hoặc double-click để xem khách hàng
                </div>
              </TableHead>
              <TableHead className="font-semibold min-w-[160px] max-w-[200px]">
                Loại
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[140px] max-w-[180px] h-14 align-middle">
                Trạng Thái
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[160px] max-w-[200px] h-14 align-middle">
                Ngày Tạo
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[140px] max-w-[180px] h-14 align-middle">
                Ngày Bắt Đầu
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[140px] max-w-[180px] h-14 align-middle">
                Khách Hàng
                <div className="text-xs font-normal text-gray-500 mt-1">
                  Click để xem chi tiết
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold w-16 h-14 align-middle">
                Thao Tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading state */}
            {campaigns.length === 0 && expectedRowCount > 0 && (
              <LoadingSkeleton expectedRowCount={expectedRowCount} />
            )}

            {/* Campaign rows */}
            {campaigns.map((campaign, index) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                index={index}
                startIndex={startIndex}
                isLoading={loadingItems.has(campaign.id)}
                onAction={handleAction}
                onShowCustomers={handleShowCustomers}
              />
            ))}

            {/* Empty rows for consistent height */}
            {emptyRows > 0 && campaigns.length > 0 && (
              <>
                {Array.from({ length: emptyRows }).map((_, index) => (
                  <TableRow
                    key={`empty-${index}`}
                    className="hover:bg-transparent"
                  >
                    <TableCell colSpan={8} className="h-[57px] border-0">
                      {/* Empty row to maintain table height */}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}

            {/* No data state */}
            {campaigns.length === 0 && expectedRowCount === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 text-gray-500">
                    <div className="text-4xl">📭</div>
                    <div>
                      <p className="font-medium">Chưa có chiến dịch nào</p>
                      <p className="text-sm">
                        Tạo chiến dịch đầu tiên để bắt đầu
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Customers Modal */}
      <CampaignCustomersModal
        isOpen={isCustomersModalOpen}
        onClose={handleCloseCustomersModal}
        campaign={selectedCampaign}
      />
      <CampaignModal
        open={isEditModalOpen}
        onOpenChange={handleEditModalClose}
        onSubmit={handleEditSubmit}
        availableUsers={[]}
        mode="edit"
        initialData={editingCampaign}
      />
    </>
  );
}
