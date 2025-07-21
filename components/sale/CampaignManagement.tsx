import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Play, 
  Pause, 
  MoreVertical, 
  Archive, 
  Trash2, 
  Eye,
  Users
} from "lucide-react";
import { Campaign, CampaignStatus, CampaignType } from "@/types";
import { Progress } from "../ui/progress";
import CampaignDetailsModal from "./CampaignDetailsModal";

interface CampaignManagementProps {
  campaigns: Campaign[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  onStatusChange?: (campaign: Campaign, newStatus: CampaignStatus) => Promise<void>;
  onArchive?: (campaign: Campaign) => Promise<void>;
  onDelete?: (campaign: Campaign) => Promise<void>;
}

const campaignTypeLabels: Record<CampaignType, string> = {
  [CampaignType.HOURLY_KM]: "Chương trình KM 1 giờ",
  [CampaignType.DAILY_KM]: "Chương trình KM 1 ngày", 
  [CampaignType.THREE_DAY_KM]: "Chương trình KM trong 3 ngày",
  [CampaignType.WEEKLY_SP]: "Chương trình gửi SP 1 tuần / lần",
  [CampaignType.WEEKLY_BBG]: "Chương trình gửi BBG 1 tuần / lần",
};

const statusLabels: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: "Bản nháp",
  [CampaignStatus.SCHEDULED]: "Đã lên lịch",
  [CampaignStatus.RUNNING]: "Đang chạy",
  [CampaignStatus.PAUSED]: "Tạm dừng",
  [CampaignStatus.COMPLETED]: "Hoàn thành",
  [CampaignStatus.ARCHIVED]: "Đã lưu trữ",
};

const statusColors: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: "bg-gray-100 text-gray-800",
  [CampaignStatus.SCHEDULED]: "bg-blue-100 text-blue-800",
  [CampaignStatus.RUNNING]: "bg-green-100 text-green-800",
  [CampaignStatus.PAUSED]: "bg-yellow-100 text-yellow-800",
  [CampaignStatus.COMPLETED]: "bg-purple-100 text-purple-800",
  [CampaignStatus.ARCHIVED]: "bg-gray-100 text-gray-600",
};

export default function CampaignManagement({
  campaigns,
  expectedRowCount,
  startIndex,
  onReload,
  onStatusChange,
  onArchive,
  onDelete,
}: CampaignManagementProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const cellClass = "px-3 py-2";
  const cellCenterClass = "text-center px-3 py-2";
  const cellLeftClass = "text-left px-3 py-2";

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("vi-VN");
  };

  const handleStatusToggle = async (campaign: Campaign) => {
    if (!onStatusChange) return;

    let newStatus: CampaignStatus;
    
    if (campaign.status === CampaignStatus.DRAFT) {
      newStatus = CampaignStatus.SCHEDULED;
    } else if (campaign.status === CampaignStatus.SCHEDULED) {
      newStatus = CampaignStatus.RUNNING;
    } else if (campaign.status === CampaignStatus.RUNNING) {
      newStatus = CampaignStatus.PAUSED;
    } else if (campaign.status === CampaignStatus.PAUSED) {
      newStatus = CampaignStatus.RUNNING;
    } else {
      return; // Không thể thay đổi trạng thái
    }

    await onStatusChange(campaign, newStatus);
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailsModalOpen(true);
  };

  return (
    <>
      <div className="border rounded-xl shadow-inner overflow-x-auto always-show-scrollbar">
        <Table className="min-w-[700px]">
          <TableHeader className="sticky top-0 z-[8] shadow-sm">
            <TableRow>
              <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
              <TableHead className="px-3 py-2 text-left">Tên Chiến Dịch</TableHead>
              <TableHead className="px-3 py-2 text-center">Loại Chiến Dịch</TableHead>
              <TableHead className="px-3 py-2 text-center">Trạng Thái</TableHead>
              <TableHead className="px-3 py-2 text-center">Thời gian chạy</TableHead>
              <TableHead className="px-3 py-2 text-center">Số Lượng KH</TableHead>
              <TableHead className="px-3 py-2 text-center">Tiến Trình</TableHead>
              <TableHead className="px-3 py-2 text-center">Tỉ Lệ Phản Hồi</TableHead>
              <TableHead className="px-3 py-2 text-center">Cấu Hình Của Saller</TableHead>
              <TableHead className="w-36 text-center px-3 py-2">Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: expectedRowCount }).map((_, idx) => {
              const campaign = campaigns[idx];
              return campaign ? (
                <TableRow
                  key={campaign.id}
                  className={idx % 2 === 0 ? "bg-gray-50" : ""}
                >
                  <TableCell className={cellCenterClass}>
                    {startIndex + idx + 1}
                  </TableCell>
                  <TableCell className={cellLeftClass}>
                    <div className="font-medium">{campaign.name}</div>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <Badge variant="outline" className="text-xs">
                      {campaignTypeLabels[campaign.campaign_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <Badge className={`text-xs ${statusColors[campaign.status]}`}>
                      {statusLabels[campaign.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <div className="text-sm">
                      <div>Tạo: {formatDateTime(campaign.created_at)}</div>
                      <div>Cập nhật: {formatDateTime(campaign.updated_at)}</div>
                    </div>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{campaign.customer_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <div className="w-full max-w-[100px] mx-auto">
                      <Progress 
                        value={campaign.progress_percentage || 0} 
                        className="h-2"
                      />
                      <div className="text-xs mt-1">
                        {campaign.progress_percentage || 0}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <span className="font-medium text-green-600">
                      {campaign.response_rate || 0}%
                    </span>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <div className="text-sm">
                      <div className="font-medium">{campaign.created_by.fullName}</div>
                      <div className="text-gray-500">{campaign.department.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className={cellCenterClass}>
                    <div className="flex items-center justify-center gap-2">
                      {/* Toggle for Draft -> Scheduled */}
                      {campaign.status === CampaignStatus.DRAFT && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Toggle
                                pressed={false}
                                onPressedChange={() => handleStatusToggle(campaign)}
                                size="sm"
                              >
                                <Play className="h-4 w-4" />
                              </Toggle>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Kích hoạt chiến dịch</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Pause/Resume for Running/Scheduled campaigns */}
                      {(campaign.status === CampaignStatus.SCHEDULED || 
                        campaign.status === CampaignStatus.RUNNING ||
                        campaign.status === CampaignStatus.PAUSED) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusToggle(campaign)}
                              >
                                {campaign.status === CampaignStatus.PAUSED ? (
                                  <Play className="h-4 w-4" />
                                ) : (
                                  <Pause className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {campaign.status === CampaignStatus.PAUSED 
                                  ? "Tiếp tục chiến dịch" 
                                  : "Tạm dừng chiến dịch"
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* View Details */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(campaign)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Xem chi tiết</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* More Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onArchive && campaign.status !== CampaignStatus.ARCHIVED && (
                            <DropdownMenuItem
                              onClick={() => onArchive(campaign)}
                              className="text-orange-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Lưu trữ
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete(campaign)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={`empty-${idx}`} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <TableCell colSpan={10} className="h-12"></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />
      )}
    </>
  );
}
