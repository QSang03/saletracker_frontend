"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquareIcon, PlusIcon, BarChart3Icon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import CampaignManagement from "@/components/sale/CampaignManagement";
import CreateCampaignModal from "@/components/sale/CreateCampaignModal";
import { campaignAPI, CampaignFilters } from "@/lib/campaign-api";
import { Campaign, CampaignType, CampaignStatus } from "@/types";
import { usePermission } from "@/hooks/usePermission";

export default function CampaignPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    draftCampaigns: 0,
    runningCampaigns: 0,
    completedCampaigns: 0,
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<CampaignFilters>({});

  // Status options for filter
  const statusOptions = [
    { value: CampaignStatus.DRAFT, label: "Bản nháp" },
    { value: CampaignStatus.SCHEDULED, label: "Đã lên lịch" },
    { value: CampaignStatus.RUNNING, label: "Đang chạy" },
    { value: CampaignStatus.PAUSED, label: "Tạm dừng" },
    { value: CampaignStatus.COMPLETED, label: "Hoàn thành" },
    { value: CampaignStatus.ARCHIVED, label: "Đã lưu trữ" },
  ];

  const { canAccess } = usePermission();
  const canRead = canAccess("kinh-doanh", "read");
  const canCreate = canAccess("kinh-doanh", "create");

  useEffect(() => {
    if (canRead) {
      loadCampaigns();
    }
  }, [canRead, currentPage, filters]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      console.log('Loading campaigns with filters:', filters, 'page:', currentPage);
      
      const response = await campaignAPI.getAll({
        ...filters,
        page: currentPage,
        pageSize,
      });
      
      console.log('Campaign API response:', response);
      
      setCampaigns(response.data || []);
      setTotalCount(response.total || 0);
      
      // Safely handle stats with default values
      if (response.stats) {
        setStats(response.stats);
      } else {
        setStats({
          totalCampaigns: response.data?.length || 0,
          draftCampaigns: 0,
          runningCampaigns: 0,
          completedCampaigns: 0,
        });
      }
    } catch (error: any) {
      console.error("Error loading campaigns:", error);
      console.error("Error details:", error.response?.data || error.message);
      setCampaigns([]);
      setTotalCount(0);
      // Keep default stats on error
      setStats({
        totalCampaigns: 0,
        draftCampaigns: 0,
        runningCampaigns: 0,
        completedCampaigns: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCreateCampaign = () => {
    setCreateModalOpen(true);
  };

  const handleCampaignCreated = async (data: any) => {
    try {
      await campaignAPI.create(data);
      setCreateModalOpen(false);
      loadCampaigns();
    } catch (error) {
      console.error("Error creating campaign:", error);
      throw error;
    }
  };

  // Prepare filter options for PaginatedTable
  const filterConfig = [
    {
      key: "campaignTypes",
      label: "Loại Chiến Dịch",
      type: "multiSelect" as const,
      options: [
        { value: CampaignType.HOURLY_KM, label: "Chương trình KM 1 giờ" },
        { value: CampaignType.DAILY_KM, label: "Chương trình KM 1 ngày" },
        { value: CampaignType.THREE_DAY_KM, label: "Chương trình KM trong 3 ngày" },
        { value: CampaignType.WEEKLY_SP, label: "Chương trình gửi SP 1 tuần / lần" },
        { value: CampaignType.WEEKLY_BBG, label: "Chương trình gửi BBG 1 tuần / lần" },
      ],
    },
    {
      key: "statuses",
      label: "Trạng Thái",
      type: "multiSelect" as const,
      options: [
        { value: CampaignStatus.DRAFT, label: "Bản nháp" },
        { value: CampaignStatus.SCHEDULED, label: "Đã lên lịch" },
        { value: CampaignStatus.RUNNING, label: "Đang chạy" },
        { value: CampaignStatus.PAUSED, label: "Tạm dừng" },
        { value: CampaignStatus.COMPLETED, label: "Hoàn thành" },
        { value: CampaignStatus.ARCHIVED, label: "Đã lưu trữ" },
      ],
    },
  ];

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats in Accordion */}
      <Accordion type="single" collapsible defaultValue="stats">
        <AccordionItem value="stats">
          <AccordionTrigger className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Thống Kê Chiến Dịch
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tổng Chiến Dịch</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalCampaigns || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bản Nháp</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">{stats?.draftCampaigns || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Đang Chạy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.runningCampaigns || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hoàn Thành</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats?.completedCampaigns || 0}</div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareIcon className="h-6 w-6" />
              <CardTitle>Cấu Hình Gửi Tin Nhắn</CardTitle>
            </div>
            {canCreate && (
              <Button onClick={handleCreateCampaign} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Tạo Chiến Dịch
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <PaginatedTable
            enableSearch
            enableStatusFilter
            enableDateRangeFilter
            page={currentPage}
            pageSize={pageSize}
            total={totalCount}
            loading={loading}
            availableStatuses={statusOptions}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onFilterChange={handleFilterChange}
            emptyText="Chưa có chiến dịch nào"
          >
            <CampaignManagement
              campaigns={campaigns}
              expectedRowCount={pageSize}
              startIndex={(currentPage - 1) * pageSize}
              onReload={loadCampaigns}
            />
          </PaginatedTable>
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCampaignCreated}
      />
    </div>
  );
}
