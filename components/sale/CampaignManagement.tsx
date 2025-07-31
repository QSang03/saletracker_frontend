"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Campaign,
  CampaignFormData,
  CampaignStatus,
  CampaignWithDetails,
} from "@/types";
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

// Status config
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

const getValidStatusTransitions = (
  currentStatus: CampaignStatus
): CampaignStatus[] => {
  const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
    [CampaignStatus.DRAFT]: [CampaignStatus.SCHEDULED],
    [CampaignStatus.SCHEDULED]: [CampaignStatus.DRAFT],
    [CampaignStatus.RUNNING]: [CampaignStatus.PAUSED],
    [CampaignStatus.PAUSED]: [CampaignStatus.RUNNING],
    [CampaignStatus.COMPLETED]: [CampaignStatus.ARCHIVED],
    [CampaignStatus.ARCHIVED]: [],
  };

  return validTransitions[currentStatus] || [];
};

const StatusDropdown = React.memo(
  ({
    status,
    onChange,
    loading,
  }: {
    status: CampaignStatus;
    onChange: (newStatus: CampaignStatus) => void;
    loading: boolean;
  }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG[CampaignStatus.DRAFT];
    const validStatuses = getValidStatusTransitions(status);

    // ✅ THÊM TOOLTIP GIẢI THÍCH CHO CÁC TRẠNG THÁI
    const getStatusTooltip = (currentStatus: CampaignStatus) => {
      switch (currentStatus) {
        case CampaignStatus.SCHEDULED:
          return "Bot Python sẽ tự động chuyển thành 'Đang chạy' khi đến thời gian";
        case CampaignStatus.RUNNING:
          return "Bot Python sẽ tự động chuyển thành 'Hoàn thành' khi kết thúc";
        default:
          return "";
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 gap-1 px-2 text-xs", config.color)}
            disabled={loading}
            title={getStatusTooltip(status)} // ✅ Thêm tooltip
          >
            {config.icon}
            {config.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Chuyển trạng thái</DropdownMenuLabel>
          {validStatuses.length === 0 && (
            <DropdownMenuItem disabled>
              {status === CampaignStatus.ARCHIVED
                ? "Không thể chuyển trạng thái"
                : "Bot Python sẽ tự động xử lý"}
            </DropdownMenuItem>
          )}
          {validStatuses.map((s) => {
            const sConfig = STATUS_CONFIG[s];
            return (
              <DropdownMenuItem
                key={s}
                onClick={() => onChange(s)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {sConfig.icon}
                {sConfig.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

StatusDropdown.displayName = "StatusDropdown";

// Date formatter
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

// Loading skeleton
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

// Campaign row
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
        canUpdate &&
        (campaign.status === CampaignStatus.RUNNING ||
          campaign.status === CampaignStatus.PAUSED),
      [canUpdate, campaign.status]
    );

    // Thêm logic cho các trạng thái khác
    const canSchedule = useMemo(
      () => canUpdate && campaign.status === CampaignStatus.DRAFT,
      [canUpdate, campaign.status]
    );

    const canBackToDraft = useMemo(
      () => canUpdate && campaign.status === CampaignStatus.SCHEDULED,
      [canUpdate, campaign.status]
    );

    const canEdit = useMemo(
      () =>
        canUpdate &&
        (campaign.status === CampaignStatus.DRAFT ||
          campaign.status === CampaignStatus.PAUSED),
      [canUpdate, campaign.status]
    );

    const canDeleteCampaign = useMemo(
      () => canDelete && campaign.status === CampaignStatus.DRAFT,
      [canDelete, campaign.status]
    );

    const canArchiveCampaign = useMemo(
      () => canUpdate && campaign.status === CampaignStatus.COMPLETED,
      [canUpdate, campaign.status]
    );

    const canArchive = useMemo(
      () => campaign.status !== CampaignStatus.ARCHIVED,
      [campaign.status]
    );

    // Show customers
    const handleDoubleClick = useCallback(() => {
      onShowCustomers(campaign);
    }, [campaign, onShowCustomers]);

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
          <StatusDropdown
            status={campaign.status}
            loading={isLoading}
            onChange={(newStatus) =>
              onAction("change-status", {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                newStatus,
              } as any)
            }
          />
        </TableCell>

        <TableCell className="text-center text-sm text-gray-600">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(campaign.created_at)}
          </div>
        </TableCell>

        <TableCell className="text-center text-sm text-gray-500">
          {(() => {
            if (!campaign.start_date) return "Chưa đặt";
            const date = new Date(campaign.start_date);
            // Check if time is 00:00:00 (show only date)
            if (
              date.getHours() === 0 &&
              date.getMinutes() === 0 &&
              date.getSeconds() === 0
            ) {
              return date.toLocaleDateString("vi-VN");
            }
            // If only time (date part is 1970-01-01 or 0000-00-00)
            if (
              (date.getFullYear() === 1970 || date.getFullYear() === 0) &&
              (date.getMonth() === 0 || date.getMonth() === -1)
            ) {
              return date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
              });
            }
            // Otherwise, show full date & time
            return date.toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          })()}
        </TableCell>

        <TableCell className="text-center text-sm text-gray-500">
          {(() => {
            if (!campaign.end_date) return "Chưa đặt";
            const date = new Date(campaign.end_date);
            // Check if time is 00:00:00 (show only date)
            if (
              date.getHours() === 0 &&
              date.getMinutes() === 0 &&
              date.getSeconds() === 0
            ) {
              return date.toLocaleDateString("vi-VN");
            }
            // If only time (date part is 1970-01-01 or 0000-00-00)
            if (
              (date.getFullYear() === 1970 || date.getFullYear() === 0) &&
              (date.getMonth() === 0 || date.getMonth() === -1)
            ) {
              return date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
              });
            }
            // Otherwise, show full date & time
            return date.toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          })()}
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
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Thao tác</DropdownMenuLabel>

              {/* Xem khách hàng - luôn có thể */}
              <DropdownMenuItem
                onClick={() => onShowCustomers(campaign)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Xem khách hàng
              </DropdownMenuItem>

              {/* ✅ Chỉnh sửa - CHỈ KHI DRAFT HOẶC PAUSED */}
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => onAction("edit", campaign)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
              )}

              {/* Status Toggle cho RUNNING và PAUSED thôi */}
              {canToggleStatus && (
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

              {/* ✅ Archive - CHỈ KHI COMPLETED */}
              {canArchiveCampaign && (
                <DropdownMenuItem
                  onClick={() => onAction("archive", campaign)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  Lưu trữ
                </DropdownMenuItem>
              )}

              {/* ✅ Delete - CHỈ KHI DRAFT */}
              {canDeleteCampaign && (
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
  const [editingCampaign, setEditingCampaign] =
    useState<CampaignWithDetails | null>(null);
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
        await campaignAPI.update(data.id!, data);
        toast.success("Cập nhật chiến dịch thành công");
        onReload();
        handleEditModalClose();
      } catch (error: any) {
        console.error("Error updating campaign:", error);
        const errorMessage =
          error?.response?.data?.message ||
          "Có lỗi xảy ra khi cập nhật chiến dịch";
        toast.error(errorMessage);
        throw error;
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

  const handleShowCustomers = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsCustomersModalOpen(true);
  }, []);

  const handleCloseCustomersModal = useCallback(() => {
    setIsCustomersModalOpen(false);
    setSelectedCampaign(null);
  }, []);

  const handleAction = useCallback(
    async (action: string, payload: any) => {
      const canUpdate = canAccess("chien-dich", "update");
      const canDelete = canAccess("chien-dich", "delete");

      // ✅ KIỂM TRA QUYỀN VÀ TRẠNG THÁI CHO TỪNG ACTION
      if (action === "edit") {
        if (!canUpdate) {
          toast.error("Bạn không có quyền chỉnh sửa chiến dịch");
          return;
        }
        if (
          ![CampaignStatus.DRAFT, CampaignStatus.PAUSED].includes(
            payload.status
          )
        ) {
          toast.error(
            "Chỉ có thể chỉnh sửa chiến dịch ở trạng thái bản nháp hoặc tạm dừng"
          );
          return;
        }
      }

      if (action === "delete") {
        if (!canDelete) {
          toast.error("Bạn không có quyền xóa chiến dịch");
          return;
        }
        if (payload.status !== CampaignStatus.DRAFT) {
          toast.error("Chỉ có thể xóa chiến dịch ở trạng thái bản nháp");
          return;
        }
      }

      if (action === "archive") {
        if (!canUpdate) {
          toast.error("Bạn không có quyền lưu trữ chiến dịch");
          return;
        }
        if (payload.status !== CampaignStatus.COMPLETED) {
          toast.error("Chỉ có thể lưu trữ chiến dịch đã hoàn thành");
          return;
        }
      }

      if ((action === "toggle" || action === "change-status") && !canUpdate) {
        toast.error("Bạn không có quyền thực hiện thao tác này");
        return;
      }

      // Confirm delete
      if (action === "delete") {
        const confirmed = window.confirm(
          `Bạn có chắc chắn muốn xóa chiến dịch "${payload.name}"?`
        );
        if (!confirmed) return;
      }

      try {
        setItemLoading(payload.id, true);

        switch (action) {
          case "toggle": {
            // Chỉ RUNNING <-> PAUSED (FE đã kiểm soát)
            const newStatus =
              payload.status === CampaignStatus.RUNNING
                ? CampaignStatus.PAUSED
                : CampaignStatus.RUNNING;
            await campaignAPI.updateStatus(payload.id, newStatus);
            toast.success(
              `Đã ${
                newStatus === CampaignStatus.RUNNING ? "chạy" : "tạm dừng"
              } chiến dịch`
            );
            break;
          }

          case "archive": {
            await campaignAPI.updateStatus(payload.id, CampaignStatus.ARCHIVED);
            toast.success("Đã lưu trữ chiến dịch");
            break;
          }

          case "change-status": {
            if (!payload.newStatus || payload.newStatus === payload.status)
              return;
            // Fe đã validate chuyển trạng thái hợp lệ
            await campaignAPI.updateStatus(payload.id, payload.newStatus);
            toast.success("Đã chuyển trạng thái chiến dịch");
            break;
          }

          case "delete": {
            await campaignAPI.delete(payload.id);
            toast.success("Đã xóa chiến dịch");
            break;
          }

          case "edit": {
            handleEdit(payload);
            return;
          }

          default:
            return;
        }

        onReload();
      } catch (error: any) {
        console.error(`Error performing ${action}:`, error);
        const errorMessage =
          error?.response?.data?.message ||
          `Có lỗi xảy ra khi ${
            action === "toggle"
              ? "thay đổi trạng thái"
              : action === "archive"
              ? "lưu trữ"
              : action === "delete"
              ? "xóa"
              : action === "change-status"
              ? "chuyển trạng thái"
              : action === "edit"
              ? "chỉnh sửa"
              : "thực hiện thao tác"
          }`;
        toast.error(errorMessage);
      } finally {
        setItemLoading(payload.id, false);
      }
    },
    [onReload, setItemLoading, handleEdit, canAccess]
  );

  // Khoảng trống cho UI
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
                  Click vào Tên hoặc double-click để xem khách hàng
                </div>
              </TableHead>
              <TableHead className="font-semibold min-w-[160px] max-w-[200px]">
                Loại
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[140px] max-w-[180px] h-14 align-middle">
                Trạng Thái
                <div className="text-xs font-normal text-gray-500 mt-1">
                  Click vào để chuyển đổi trạng thái
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[160px] max-w-[200px] h-14 align-middle">
                Ngày Tạo
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[140px] max-w-[180px] h-14 align-middle">
                Lịch Bắt Đầu
              </TableHead>
              <TableHead className="text-center font-semibold min-w-[140px] max-w-[180px] h-14 align-middle">
                Lịch Kết Thúc
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
                    <TableCell colSpan={8} className="h-[57px] border-0" />
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
