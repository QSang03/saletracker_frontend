"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import CampaignManagement from "@/components/sale/CampaignManagement";
import { campaignAPI, type CampaignFilters } from "@/lib/campaign-api";
import { type Campaign, CampaignType, CampaignStatus, CampaignWithDetails } from "@/types";
import { usePermission } from "@/hooks/usePermission";
import { PDynamic } from "@/components/common/PDynamic";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import StatBox from "@/components/common/StatBox";
import CampaignModal from "@/components/sale/CampaignModal";

// Types
interface CampaignStats {
  totalCampaigns: number;
  draftCampaigns: number;
  runningCampaigns: number;
  completedCampaigns: number;
}

interface Alert {
  type: "success" | "error";
  message: string;
}

// Constants
const STATUS_OPTIONS = [
  { value: CampaignStatus.DRAFT, label: "Bản nháp" },
  { value: CampaignStatus.SCHEDULED, label: "Đã lên lịch" },
  { value: CampaignStatus.RUNNING, label: "Đang chạy" },
  { value: CampaignStatus.PAUSED, label: "Tạm dừng" },
  { value: CampaignStatus.COMPLETED, label: "Hoàn thành" },
  { value: CampaignStatus.ARCHIVED, label: "Đã lưu trữ" },
] as const;

const FILTER_CONFIG = [
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
    options: STATUS_OPTIONS,
  },
] as const;

const DEFAULT_STATS: CampaignStats = {
  totalCampaigns: 0,
  draftCampaigns: 0,
  runningCampaigns: 0,
  completedCampaigns: 0,
};

// Custom hook for campaign data
const useCampaignData = (canRead: boolean, currentPage: number, filters: CampaignFilters, pageSize: number) => {
  const [campaigns, setCampaigns] = useState<CampaignWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<CampaignStats>(DEFAULT_STATS);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!canRead) return;

    try {
      setLoading(true);
      setError(null);

      const response = await campaignAPI.getAll({
        ...filters,
        page: currentPage,
        pageSize,
      });

      setCampaigns(response.data || []);
      setTotalCount(response.total || 0);
      setStats(response.stats || DEFAULT_STATS);
    } catch (error: any) {
      console.error("Error loading campaigns:", error);
      const errorMessage = error.response?.data?.message || error.message || "Có lỗi xảy ra khi tải dữ liệu";
      setError(errorMessage);
      setCampaigns([]);
      setTotalCount(0);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, [canRead, currentPage, filters, pageSize]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  return {
    campaigns,
    loading,
    totalCount,
    stats,
    error,
    loadCampaigns,
  };
};

export default function CampaignPage() {
  // State management
  const [alert, setAlert] = useState<Alert | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<CampaignFilters>({});

  // Permissions
  const { canAccess } = usePermission();
  const canRead = canAccess("chien-dich", "read");
  const canCreate = canAccess("chien-dich", "create");

  // Data fetching
  const {
    campaigns,
    loading,
    totalCount,
    stats,
    error,
    loadCampaigns,
  } = useCampaignData(canRead, currentPage, filters, pageSize);

  // Memoized calculations
  const statsData = useMemo(() => [
    {
      label: "Tổng Chiến Dịch",
      value: stats.totalCampaigns.toLocaleString(),
      icon: "📊",
    },
    {
      label: "Bản Nháp",
      value: stats.draftCampaigns.toLocaleString(),
      icon: "📝",
    },
    {
      label: "Đang Chạy",
      value: stats.runningCampaigns.toLocaleString(),
      icon: "🚀",
    },
    {
      label: "Hoàn Thành",
      value: stats.completedCampaigns.toLocaleString(),
      icon: "✅",
    },
  ], [stats]);

  // Event handlers
  const handleFilterChange = useCallback((filters: any) => {
    // Convert statuses to CampaignStatus[]
    const convertedFilters: CampaignFilters = {
      ...filters,
      statuses: Array.isArray(filters.statuses)
        ? filters.statuses.filter(Boolean).map((s: string | number) => s as CampaignStatus)
        : undefined,
    };
    setFilters(convertedFilters);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleCreateCampaign = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCampaignCreated = useCallback(async (data: any) => {
    try {
      await campaignAPI.create(data);
      setCreateModalOpen(false);
      setAlert({
        type: "success",
        message: "Chiến dịch đã được tạo thành công!"
      });
      await loadCampaigns();
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      setAlert({
        type: "error",
        message: error.response?.data?.message || "Có lỗi xảy ra khi tạo chiến dịch"
      });
      throw error;
    }
  }, [loadCampaigns]);

  const handleRefresh = useCallback(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleCloseAlert = useCallback(() => {
    setAlert(null);
  }, []);

  // Show error state
  if (error && !loading) {
    return (
      <div className="h-full flex items-center justify-center w-full">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Có lỗi xảy ra</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show unauthorized state
  if (!canRead) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-gray-400 text-6xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2">Không có quyền truy cập</h3>
            <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto p-6 space-y-6">
        {/* Header Card */}
        <Card className="shadow-sm border-0 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Cấu hình chiến dịch
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Quản lý và theo dõi các chiến dịch marketing
                </p>
              </div>
              
              <div className="flex gap-2">
                <PDynamic permission={{ departmentSlug: "marketing", action: "create" }}>
                  <Button
                    onClick={handleCreateCampaign}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                  >
                    <PlusIcon className="h-4 w-4 mr-2 inline-block" />
                    <span className="inline-block">Tạo Chiến Dịch</span>
                  </Button>
                </PDynamic>

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={loading}
                  className="transition-all duration-200 hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''} inline-block`} />
                  <span className="inline-block">Làm mới</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Alert */}
        {alert && (
          <div className="animate-in slide-in-from-top duration-300">
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={handleCloseAlert}
            />
          </div>
        )}

        {/* Stats Accordion */}
        <Accordion type="single" collapsible defaultValue="stats" className="w-full">
          <AccordionItem value="stats" className="border rounded-lg bg-white shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                  <span className="text-xl">📈</span>
                </div>
                <span className="text-lg font-semibold">Thống Kê Chiến Dịch</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsData.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="animate-in fade-in duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <StatBox
                      label={stat.label}
                      value={stat.value}
                      icon={stat.icon}
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Campaign Table */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-0">
            <PaginatedTable
              key={`pagination-${currentPage}-${pageSize}`}
              enableSearch
              enableStatusFilter
              enableDateRangeFilter
              page={currentPage}
              pageSize={pageSize}
              total={totalCount}
              loading={loading}
              availableStatuses={[...STATUS_OPTIONS]}
              onPageChange={handlePageChange}
              onPageSizeChange={setPageSize}
              onFilterChange={handleFilterChange}
              emptyText="Chưa có chiến dịch nào"
            >
              <CampaignManagement
                key={`campaign-mgmt-${totalCount}-${currentPage}`}
                campaigns={campaigns}
                expectedRowCount={pageSize}
                startIndex={(currentPage - 1) * pageSize}
                onReload={loadCampaigns}
              />
            </PaginatedTable>
          </CardContent>
        </Card>
      </div>

      {/* Create Campaign Modal */}
      <CampaignModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCampaignCreated}
        mode="create"
      />
    </div>
  );
}