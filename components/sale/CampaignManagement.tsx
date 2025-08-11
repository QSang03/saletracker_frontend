"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Campaign,
  CampaignFormData,
  CampaignStatus,
  CampaignWithDetails,
} from "@/types";
import { CampaignSocket } from "@/components/socket/CampaignSocket";
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
  Copy,
  AlertTriangle,
  Plus,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { campaignAPI } from "@/lib/campaign-api";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import CampaignCustomersModal from "./CampaignCustomersModal";
import CampaignModal from "./CampaignModal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { transformToCampaignWithDetails } from "@/utils/campaignUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { isZaloNotLinked } from "@/components/common/ZaloLinkStatusChecker";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface CampaignManagementProps {
  campaigns: CampaignWithDetails[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  isLoading?: boolean;
  onCreateNew?: () => void;
  availableUsers?: any[];
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

// ✅ HELPER FUNCTION: Kiểm tra cảnh báo lịch
const hasScheduleWarning = (campaign: CampaignWithDetails): boolean => {
  return (
    campaign.status === CampaignStatus.SCHEDULED &&
    (!campaign.start_date || !campaign.end_date)
  );
};

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
    campaign,
  }: {
    status: CampaignStatus;
    onChange: (newStatus: CampaignStatus) => void;
    loading: boolean;
    campaign?: CampaignWithDetails;
  }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG[CampaignStatus.DRAFT];
    const validStatuses = getValidStatusTransitions(status);

    const hasWarningStatus = useMemo(() => {
      return campaign ? hasScheduleWarning(campaign) : false;
    }, [campaign]);

    const getStatusTooltip = (currentStatus: CampaignStatus) => {
      if (hasWarningStatus) {
        return "";
      }

      switch (currentStatus) {
        case CampaignStatus.SCHEDULED:
          return "Bot Python sẽ tự động chuyển thành 'Đang chạy' khi đến thời gian";
        case CampaignStatus.RUNNING:
          return "Bot Python sẽ tự động chuyển thành 'Hoàn thành' khi kết thúc";
        default:
          return "";
      }
    };

    const buttonColor = hasWarningStatus
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : config.color;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 gap-1 px-2 text-xs min-w-[80px] justify-start",
              buttonColor
            )}
            disabled={loading}
            title={getStatusTooltip(status)}
          >
            <div className="flex items-center gap-1">
              {hasWarningStatus ? (
                <>
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{config.label}</span>
                </>
              ) : (
                <>
                  {config.icon}
                  <span className="truncate">{config.label}</span>
                </>
              )}
            </div>
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

// ✅ CẬP NHẬT: Loading skeleton với header indicator
const LoadingSkeleton = ({
  expectedRowCount,
}: {
  expectedRowCount: number;
}) => (
  <>
    {/* Loading Header */}
    <TableRow>
      <TableCell colSpan={9} className="bg-blue-50 border-b text-center py-3">
        <div className="flex items-center justify-center gap-3 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">
            Đang tải danh sách chiến dịch...
          </span>
        </div>
      </TableCell>
    </TableRow>

    {/* Skeleton Rows */}
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
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-8 w-8 bg-gray-200 rounded mx-auto" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

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
    const canCreate = canAccess("chien-dich", "create");

    const isArchived = campaign.status === CampaignStatus.ARCHIVED;
    const hasWarning = hasScheduleWarning(campaign);

    const canToggleStatus = useMemo(
      () =>
        canUpdate &&
        (campaign.status === CampaignStatus.RUNNING ||
          campaign.status === CampaignStatus.PAUSED),
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

    const tableRowContent = (
      <TableRow
        className={cn(
          "group transition-all duration-200 cursor-pointer",
          hasWarning
            ? "bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-400"
            : "hover:bg-gray-50",
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
            campaign={campaign}
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

        <TableCell className="text-center text-sm text-gray-700">
          {campaign.created_by?.fullName || "-"}
        </TableCell>

        <TableCell className="text-center text-sm text-gray-500">
          {(() => {
            if (!campaign.start_date) return "Chưa đặt";
            const date = new Date(campaign.start_date);
            if (
              date.getHours() === 0 &&
              date.getMinutes() === 0 &&
              date.getSeconds() === 0
            ) {
              return date.toLocaleDateString("vi-VN");
            }
            if (
              (date.getFullYear() === 1970 || date.getFullYear() === 0) &&
              (date.getMonth() === 0 || date.getMonth() === -1)
            ) {
              return date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });
            }
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
            if (
              date.getHours() === 0 &&
              date.getMinutes() === 0 &&
              date.getSeconds() === 0
            ) {
              return date.toLocaleDateString("vi-VN");
            }
            if (
              (date.getFullYear() === 1970 || date.getFullYear() === 0) &&
              (date.getMonth() === 0 || date.getMonth() === -1)
            ) {
              return date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });
            }
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

              <DropdownMenuItem
                onClick={() => onShowCustomers(campaign)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Xem khách hàng
              </DropdownMenuItem>

              {isArchived && canCreate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onAction("copy", campaign)}
                    disabled={isLoading}
                    className="flex items-center gap-2 cursor-pointer text-blue-600 focus:text-blue-600"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Sao chép chiến dịch
                  </DropdownMenuItem>
                </>
              )}

              {!isArchived && (
                <>
                  <DropdownMenuSeparator />

                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => onAction("edit", campaign)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                  )}

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

                  {canArchiveCampaign && (
                    <DropdownMenuItem
                      onClick={() => onAction("archive", campaign)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Archive className="h-4 w-4" />
                      Lưu trữ
                    </DropdownMenuItem>
                  )}

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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );

    return hasWarning ? (
      <Tooltip>
        <TooltipTrigger asChild>{tableRowContent}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">
            Chiến dịch đã lên lịch nhưng thời gian cấu hình không hợp lệ theo
            quy định phòng ban
          </p>
        </TooltipContent>
      </Tooltip>
    ) : (
      tableRowContent
    );
  }
);

CampaignRow.displayName = "CampaignRow";

// ✅ MAIN COMPONENT
export default function CampaignManagement({
  campaigns: initialCampaigns,
  expectedRowCount,
  startIndex,
  onReload,
  isLoading = false,
  onCreateNew,
  availableUsers = [],
}: CampaignManagementProps) {
  const [campaigns, setCampaigns] =
    useState<CampaignWithDetails[]>(initialCampaigns);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<CampaignWithDetails | null>(null);
  const [isCopyAndEditMode, setIsCopyAndEditMode] = useState(false);

  // ✅ THÊM STATE CHO CREATE MODAL
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { currentUser } = useCurrentUser();
  const { canAccess } = usePermission();
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(
    new Set()
  );
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number>(0);

  const getEventKey = (event: any): string => {
    return `${event.ws_type}_${event.campaign_id}_${event.entity_id}_${event.timestamp}`;
  };

  const hasRealChanges = (event: any): boolean => {
    if (!event.changes) return false;

    return Object.keys(event.changes).some((key) => {
      const change = event.changes[key];
      return change.old !== change.new;
    });
  };

  const updateSpecificCampaign = useCallback(
    async (campaignId: string, changes: any) => {
      try {
        const campaignIndex = campaigns.findIndex((c) => c.id === campaignId);
        if (campaignIndex === -1) {
          onReload();
          return;
        }

        // ✅ THAY VÌ FETCH TOÀN BỘ, chỉ cập nhật những field thay đổi
        if (changes) {
          setCampaigns((prev) => {
            const newCampaigns = [...prev];
            const existingCampaign = newCampaigns[campaignIndex];

            // Chỉ cập nhật những field có trong changes
            const updatedFields: any = {};

            if (changes.status) {
              updatedFields.status = changes.status.new || changes.status;
            }

            if (changes.start_date) {
              updatedFields.start_date = changes.start_date.new;
            }

            if (changes.end_date) {
              updatedFields.end_date = changes.end_date.new;
            }

            // ✅ MERGE chỉ những field cần thiết, GIỮ NGUYÊN data cũ
            newCampaigns[campaignIndex] = {
              ...existingCampaign,
              ...updatedFields,
            };

            return newCampaigns;
          });

          console.log(`✅ Updated campaign ${campaignId} fields:`, changes);
          return; // Không cần fetch API
        }

        // ✅ CHỈ FETCH API khi cần thiết (fallback)
        const updatedCampaign = await campaignAPI.getById(campaignId);
        const existingCampaign = campaigns[campaignIndex];

        const mergedCampaign = {
          ...transformToCampaignWithDetails(updatedCampaign),
          created_by: updatedCampaign.created_by || existingCampaign.created_by,
          created_at: updatedCampaign.created_at || existingCampaign.created_at,
        };

        setCampaigns((prev) => {
          const newCampaigns = [...prev];
          newCampaigns[campaignIndex] = mergedCampaign;
          return newCampaigns;
        });
      } catch (error) {
        console.error("Error updating specific campaign:", error);
        onReload();
      }
    },
    [campaigns, onReload]
  );

  const showConfirmDialog = useCallback(
    (config: {
      title: string;
      message: React.ReactNode | string;
      onConfirm: () => void;
    }) => {
      setConfirmDialog({
        isOpen: true,
        title: config.title,
        message: typeof config.message === "string" ? config.message : "",
        onConfirm: config.onConfirm,
      });
    },
    []
  );

  const hideConfirmDialog = useCallback(() => {
    setConfirmDialog((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // ✅ THÊM HANDLER CHO CREATE CAMPAIGN
  const handleCreateCampaign = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCampaignCreated = useCallback(
    async (data: any) => {
      try {
        await campaignAPI.create(data);
        setCreateModalOpen(false);
        toast.success("Chiến dịch đã được tạo thành công!");
        await onReload();
      } catch (error: any) {
        console.error("Error creating campaign:", error);
        toast.error(
          error.response?.data?.message || "Có lỗi xảy ra khi tạo chiến dịch"
        );
        throw error;
      }
    },
    [onReload]
  );

  const handleCopyCampaign = useCallback(
    async (campaign: CampaignWithDetails) => {
      try {
        setItemLoading(campaign.id, true);

        const copyData = await campaignAPI.getCopyData(campaign.id);
        const newCampaign = await campaignAPI.create(copyData);

        toast.success(
          `Đã sao chép chiến dịch "${campaign.name}" thành công! Đang mở để chỉnh sửa...`
        );

        await onReload();
        await new Promise((resolve) => setTimeout(resolve, 500));

        const safeCampaign = transformToCampaignWithDetails(newCampaign);
        setEditingCampaign(safeCampaign);
        setIsCopyAndEditMode(true);
        setIsEditModalOpen(true);

        setTimeout(() => {
          toast.info(
            "💡 Bạn có thể chỉnh sửa campaign đã sao chép ngay bây giờ!",
            { duration: 3000 }
          );
        }, 800);
      } catch (error: any) {
        console.error("Error copying campaign:", error);
        toast.error(
          error.response?.data?.message ||
            "Có lỗi xảy ra khi sao chép chiến dịch"
        );
      } finally {
        setItemLoading(campaign.id, false);
      }
    },
    [onReload]
  );

  const handleEdit = useCallback((campaign: CampaignWithDetails) => {
    setEditingCampaign(campaign);
    setIsCopyAndEditMode(false);
    setIsEditModalOpen(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingCampaign(null);
    setIsCopyAndEditMode(false);
  }, []);

  const handleEditSubmit = useCallback(
    async (data: CampaignFormData) => {
      try {
        await campaignAPI.update(data.id!, data);

        if (isCopyAndEditMode) {
          toast.success(
            `✅ Hoàn thành! Campaign "${data.name}" đã được sao chép và cập nhật thành công.`
          );
        } else {
          toast.success("Cập nhật chiến dịch thành công");
        }

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
    [onReload, handleEditModalClose, isCopyAndEditMode]
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
      const canCreate = canAccess("chien-dich", "create");

      if (action === "copy") {
        if (!canCreate) {
          toast.error("Bạn không có quyền tạo chiến dịch mới");
          return;
        }
        if (payload.status !== CampaignStatus.ARCHIVED) {
          toast.error("Chỉ có thể sao chép chiến dịch đã lưu trữ");
          return;
        }
        await handleCopyCampaign(payload);
        return;
      }

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

      if (
        (action === "toggle" || action === "change-status") &&
        isZaloNotLinked(currentUser ?? undefined)
      ) {
        toast.error(
          "Bạn cần liên kết Zalo trước khi đổi trạng thái chiến dịch!"
        );
        return;
      }

      if ((action === "toggle" || action === "change-status") && !canUpdate) {
        toast.error("Bạn không có quyền thực hiện thao tác này");
        return;
      }

      if (action === "delete") {
        showConfirmDialog({
          title: "Xác nhận xóa chiến dịch",
          message: (
            <div className="space-y-4">
              <p>
                Bạn có chắc chắn muốn xóa chiến dịch{" "}
                <span className="font-semibold text-gray-900">
                  "{payload.name}"
                </span>
                ?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 font-medium text-sm">
                    Hành động này không thể hoàn tác!
                  </span>
                </div>
              </div>
            </div>
          ),
          onConfirm: async () => {
            hideConfirmDialog();
            try {
              setItemLoading(payload.id, true);
              await campaignAPI.delete(payload.id);
              toast.success("Đã xóa chiến dịch thành công");
              onReload();
            } catch (error: any) {
              console.error("Error deleting campaign:", error);
              const errorMessage =
                error?.response?.data?.message ||
                "Có lỗi xảy ra khi xóa chiến dịch";
              toast.error(errorMessage);
            } finally {
              setItemLoading(payload.id, false);
            }
          },
        });
        return;
      }

      try {
        setItemLoading(payload.id, true);

        switch (action) {
          case "toggle": {
            const newStatus =
              payload.status === CampaignStatus.RUNNING
                ? CampaignStatus.PAUSED
                : CampaignStatus.RUNNING;
            const result = await campaignAPI.updateStatus(
              payload.id,
              newStatus
            );

            if (result.success) {
              toast.success(
                `Đã ${
                  newStatus === CampaignStatus.RUNNING ? "chạy" : "tạm dừng"
                } chiến dịch`
              );
            } else {
              toast.error(
                result.error || "Có lỗi xảy ra khi thay đổi trạng thái"
              );
              return;
            }
            break;
          }

          case "archive": {
            const result = await campaignAPI.archive(payload.id);

            if (result.success) {
              toast.success("Đã lưu trữ chiến dịch");
            } else {
              toast.error(
                result.error || "Có lỗi xảy ra khi lưu trữ chiến dịch"
              );
              return;
            }
            break;
          }

          case "change-status": {
            if (!payload.newStatus || payload.newStatus === payload.status)
              return;
            const result = await campaignAPI.updateStatus(
              payload.id,
              payload.newStatus
            );

            if (result.success) {
              toast.success("Đã chuyển trạng thái chiến dịch");
            } else {
              toast.error(
                result.error || "Có lỗi xảy ra khi chuyển trạng thái"
              );
              return;
            }
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
    [
      onReload,
      setItemLoading,
      handleEdit,
      canAccess,
      handleCopyCampaign,
      showConfirmDialog,
      hideConfirmDialog,
      currentUser,
    ]
  );

  const emptyRows = useMemo(
    () => Math.max(0, expectedRowCount - campaigns.length),
    [expectedRowCount, campaigns.length]
  );

  // ✅ Socket event handlers
  const handleCampaignUpdate = useCallback(
    (data: any) => {
      console.log("Campaign updated via socket:", data);

      // ✅ EXTRACT events từ data
      const events = data.events || [];
      if (events.length === 0) {
        console.log("No events to process");
        return;
      }

      // ✅ XỬ LÝ TỪNG EVENT
      events.forEach((event: any) => {
        const eventKey = getEventKey(event);
        if (processedEvents.has(eventKey)) {
          console.log("🔄 Duplicate event ignored:", eventKey);
          return;
        }

        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime <= lastEventTimestamp) {
          console.log("⏰ Old event ignored:", event.timestamp);
          return;
        }

        // ✅ KIỂM TRA CHANGES ĐÚNG VỚI EVENT OBJECT
        if (!hasRealChanges(event)) {
          console.log("📝 No real changes detected for event:", event);
          return;
        }

        setProcessedEvents((prev) => new Set([...prev, eventKey]));
        setLastEventTimestamp(eventTime);

        // ✅ Cập nhật campaign cụ thể
        if (event.campaign_id) {
          updateSpecificCampaign(event.campaign_id.toString(), event.changes);
        }
      });
    },
    [processedEvents, lastEventTimestamp, updateSpecificCampaign, onReload]
  );

  const handleCampaignScheduleUpdate = useCallback(
    (data: any) => {
      console.log("Campaign schedule updated via socket:", data);

      // ✅ EXTRACT events từ data
      const events = data.events || [];
      if (events.length === 0) {
        console.log("No events to process");
        return;
      }

      // ✅ XỬ LÝ TỪNG EVENT
      events.forEach((event: any) => {
        const eventKey = getEventKey(event);
        if (processedEvents.has(eventKey)) {
          console.log("🔄 Duplicate schedule event ignored:", eventKey);
          return;
        }

        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime <= lastEventTimestamp) {
          console.log("⏰ Old schedule event ignored:", event.timestamp);
          return;
        }

        // ✅ KIỂM TRA CHANGES ĐÚNG STRUCTURE
        const hasScheduleChanges =
          event.changes &&
          ((event.changes.start_date &&
            event.changes.start_date.old !== event.changes.start_date.new) ||
            (event.changes.end_date &&
              event.changes.end_date.old !== event.changes.end_date.new));

        if (!hasScheduleChanges) {
          console.log("📅 No schedule changes detected for event:", event);
          return;
        }

        setProcessedEvents((prev) => new Set([...prev, eventKey]));
        setLastEventTimestamp(eventTime);

        // ✅ Cập nhật campaign cụ thể
        if (event.campaign_id) {
          updateSpecificCampaign(event.campaign_id.toString(), event.changes);
        }
      });
    },
    [processedEvents, lastEventTimestamp, updateSpecificCampaign]
  );

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const fifteenMinutesAgo = now - 15 * 60 * 1000;

      setProcessedEvents((prev) => {
        const filtered = new Set<string>();
        prev.forEach((eventKey) => {
          // Giữ lại events trong 15 phút gần đây
          const parts = eventKey.split("_");
          const timestamp = parts[parts.length - 1];
          if (new Date(timestamp).getTime() > fifteenMinutesAgo) {
            filtered.add(eventKey);
          }
        });
        return filtered;
      });
    }, 5 * 60 * 1000); // Cleanup mỗi 5 phút

    return () => clearInterval(cleanup);
  }, []);

  return (
    <TooltipProvider>
      {/* ✅ Socket integration for real-time updates */}
      <CampaignSocket
        onCampaignUpdate={handleCampaignUpdate}
        onCampaignScheduleUpdate={handleCampaignScheduleUpdate}
      />

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
                Người Tạo Chiến Dịch
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
            {/* ✅ LOADING STATE - CHỈ hiển thị khi isLoading = true */}
            {isLoading && campaigns.length === 0 && (
              <LoadingSkeleton expectedRowCount={expectedRowCount} />
            )}

            {/* ✅ CAMPAIGN ROWS - CHỈ hiển thị khi không loading */}
            {!isLoading &&
              campaigns.map((campaign, index) => (
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

            {/* ✅ EMPTY ROWS - CHỈ khi có campaigns */}
            {!isLoading && emptyRows > 0 && campaigns.length > 0 && (
              <>
                {Array.from({ length: emptyRows }).map((_, index) => (
                  <TableRow
                    key={`empty-${index}`}
                    className="hover:bg-transparent"
                  >
                    <TableCell colSpan={9} className="h-[57px] border-0" />
                  </TableRow>
                ))}
              </>
            )}

            {/* ✅ EMPTY STATE - Icon Plus có thể click */}
            {!isLoading && campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center space-y-6 text-gray-500">
                    {/* ✅ Icon lớn với Plus button clickable */}
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
                        <div className="text-5xl">🚀</div>
                      </div>
                      {/* ✅ Plus icon có thể click */}
                      <div
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 transform hover:scale-110 shadow-lg hover:shadow-xl"
                        onClick={handleCreateCampaign}
                        title="Click để tạo chiến dịch mới"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Nội dung mô tả */}
                    <div className="space-y-3 max-w-md">
                      <h3 className="text-xl font-semibold text-gray-800">
                        Chưa có chiến dịch nào
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Tạo chiến dịch đầu tiên để bắt đầu gửi tin nhắn đến
                        khách hàng của bạn
                      </p>
                    </div>

                    {/* Hướng dẫn nhỏ */}
                    <div className="text-xs text-gray-400 mt-4">
                      💡 Tip: Click vào dấu + hoặc nút "Thêm mới" ở phía trên để
                      tạo chiến dịch
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

      {/* ✅ THÊM: Create Campaign Modal */}
      <CampaignModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCampaignCreated}
        availableUsers={availableUsers}
        mode="create"
      />

      {/* Edit Modal */}
      <CampaignModal
        open={isEditModalOpen}
        onOpenChange={handleEditModalClose}
        onSubmit={handleEditSubmit}
        availableUsers={availableUsers}
        mode="edit"
        initialData={editingCampaign}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={hideConfirmDialog}
        confirmText="Xóa chiến dịch"
        cancelText="Hủy bỏ"
      />
    </TooltipProvider>
  );
}
