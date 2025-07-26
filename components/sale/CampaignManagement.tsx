"use client";

import React, { useState } from "react";
import { Campaign, CampaignStatus } from "@/types";
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
import { MoreHorizontal, Play, Pause, Archive, Trash2, Edit } from "lucide-react";
import { campaignAPI } from "@/lib/campaign-api";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface CampaignManagementProps {
  campaigns: Campaign[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
}

const getStatusBadge = (status: CampaignStatus) => {
  const statusConfig = {
    [CampaignStatus.DRAFT]: { label: "Bản nháp", variant: "secondary" },
    [CampaignStatus.SCHEDULED]: { label: "Đã lên lịch", variant: "outline" },
    [CampaignStatus.RUNNING]: { label: "Đang chạy", variant: "default" },
    [CampaignStatus.PAUSED]: { label: "Tạm dừng", variant: "destructive" },
    [CampaignStatus.COMPLETED]: { label: "Hoàn thành", variant: "default" },
    [CampaignStatus.ARCHIVED]: { label: "Đã lưu trữ", variant: "secondary" },
  } as const;

  const config = statusConfig[status] || { label: status, variant: "secondary" };
  return (
    <Badge variant={config.variant as any}>
      {config.label}
    </Badge>
  );
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function CampaignManagement({
  campaigns,
  expectedRowCount,
  startIndex,
  onReload,
}: CampaignManagementProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { canAccess } = usePermission();
  
  const canUpdate = canAccess("kinh-doanh", "update");
  const canDelete = canAccess("kinh-doanh", "delete");

  const setItemLoading = (id: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [id]: isLoading }));
  };

  const handleStatusToggle = async (campaign: Campaign) => {
    if (!canUpdate) {
      toast.error("Bạn không có quyền thay đổi trạng thái chiến dịch");
      return;
    }

    try {
      setItemLoading(campaign.id, true);
      const newStatus = campaign.status === CampaignStatus.RUNNING 
        ? CampaignStatus.PAUSED 
        : CampaignStatus.RUNNING;
      
      await campaignAPI.updateStatus(campaign.id, newStatus);
      toast.success(`Đã ${newStatus === CampaignStatus.RUNNING ? "chạy" : "tạm dừng"} chiến dịch`);
      onReload();
    } catch (error) {
      console.error("Error toggling campaign status:", error);
      toast.error("Có lỗi xảy ra khi thay đổi trạng thái");
    } finally {
      setItemLoading(campaign.id, false);
    }
  };

  const handleArchive = async (campaign: Campaign) => {
    if (!canUpdate) {
      toast.error("Bạn không có quyền lưu trữ chiến dịch");
      return;
    }

    try {
      setItemLoading(campaign.id, true);
      await campaignAPI.updateStatus(campaign.id, CampaignStatus.ARCHIVED);
      toast.success("Đã lưu trữ chiến dịch");
      onReload();
    } catch (error) {
      console.error("Error archiving campaign:", error);
      toast.error("Có lỗi xảy ra khi lưu trữ chiến dịch");
    } finally {
      setItemLoading(campaign.id, false);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!canDelete) {
      toast.error("Bạn không có quyền xóa chiến dịch");
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa chiến dịch "${campaign.name}"?`)) {
      return;
    }

    try {
      setItemLoading(campaign.id, true);
      await campaignAPI.delete(campaign.id);
      toast.success("Đã xóa chiến dịch");
      onReload();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Có lỗi xảy ra khi xóa chiến dịch");
    } finally {
      setItemLoading(campaign.id, false);
    }
  };

  // Create empty rows to maintain consistent table height
  const emptyRows = Array.from({ length: Math.max(0, expectedRowCount - campaigns.length) });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">STT</TableHead>
          <TableHead>Tên Chiến Dịch</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Trạng Thái</TableHead>
          <TableHead>Ngày Tạo</TableHead>
          <TableHead>Ngày Bắt Đầu</TableHead>
          <TableHead>Khách Hàng</TableHead>
          <TableHead className="text-right">Thao Tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign, index) => (
          <TableRow key={campaign.id}>
            <TableCell className="font-medium">
              {startIndex + index + 1}
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{campaign.name}</div>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm">{campaign.campaign_type}</span>
            </TableCell>
            <TableCell>
              {getStatusBadge(campaign.status)}
            </TableCell>
            <TableCell className="text-sm">
              {formatDate(campaign.created_at)}
            </TableCell>
            <TableCell className="text-sm">
              Chưa đặt
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {campaign.customer_count || 0} khách
              </span>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    disabled={loading[campaign.id]}
                  >
                    <span className="sr-only">Mở menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {/* Status Toggle */}
                  {(campaign.status === CampaignStatus.RUNNING || 
                    campaign.status === CampaignStatus.PAUSED) && (
                    <DropdownMenuItem 
                      onClick={() => handleStatusToggle(campaign)}
                      disabled={loading[campaign.id]}
                    >
                      {campaign.status === CampaignStatus.RUNNING ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Tạm dừng
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Chạy lại
                        </>
                      )}
                    </DropdownMenuItem>
                  )}

                  {/* Archive */}
                  {campaign.status !== CampaignStatus.ARCHIVED && canUpdate && (
                    <DropdownMenuItem 
                      onClick={() => handleArchive(campaign)}
                      disabled={loading[campaign.id]}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Lưu trữ
                    </DropdownMenuItem>
                  )}

                  {/* Delete */}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(campaign)}
                        disabled={loading[campaign.id]}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
        
        {/* Empty rows for consistent height */}
        {emptyRows.map((_, index) => (
          <TableRow key={`empty-${index}`}>
            <TableCell colSpan={8} className="h-[53px]">
              {/* Empty row to maintain table height */}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
