"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCw, Archive } from "lucide-react"; // ✅ THÊM Archive icon
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PaginatedTable, {
  Filters,
} from "@/components/ui/pagination/PaginatedTable";
import CampaignManagement from "@/components/sale/CampaignManagement";
import { campaignAPI, type CampaignFilters } from "@/lib/campaign-api";
import {
  type Campaign,
  CampaignType,
  CampaignStatus,
  CampaignWithDetails,
} from "@/types";
import { usePermission } from "@/hooks/usePermission";
import { PDynamic } from "@/components/common/PDynamic";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import StatBox from "@/components/common/StatBox";
import CampaignModal from "@/components/sale/CampaignModal";
import { useCampaignFilters } from "@/hooks/useCampaignFilters";

// Types
interface CampaignStats {
  totalCampaigns: number;
  draftCampaigns: number;
  runningCampaigns: number;
  completedCampaigns: number;
  scheduledCampaigns?: number;
  archivedCampaigns?: number;
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
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: CampaignType.HOURLY_KM, label: "Chương trình KM 1 giờ" },
  { value: CampaignType.DAILY_KM, label: "Chương trình KM 1 ngày" },
  { value: CampaignType.THREE_DAY_KM, label: "Chương trình KM trong 3 ngày" },
  { value: CampaignType.WEEKLY_SP, label: "Chương trình gửi SP 1 tuần / lần" },
  {
    value: CampaignType.WEEKLY_BBG,
    label: "Chương trình gửi BBG 1 tuần / lần",
  },
];

const DEFAULT_STATS: CampaignStats = {
  totalCampaigns: 0,
  draftCampaigns: 0,
  runningCampaigns: 0,
  completedCampaigns: 0,
  scheduledCampaigns: 0,
  archivedCampaigns: 0,
};

// ✅ CẬP NHẬT: Custom hook for campaign data với parameter isArchived
const useCampaignData = (
  canRead: boolean,
  currentPage: number,
  filters: CampaignFilters,
  pageSize: number,
  isArchived: boolean = false // ✅ THÊM PARAMETER
) => {
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
      
      // ✅ GỌI API KHÁC TÙY THEO isArchived
      const response = isArchived 
        ? await campaignAPI.getAllArchived({
            ...filters,
            page: currentPage,
            pageSize,
          })
        : await campaignAPI.getAll({
            ...filters,
            page: currentPage,
            pageSize,
          });

      setCampaigns(response.data || []);
      setTotalCount(response.total || 0);
      setStats(response.stats || DEFAULT_STATS);
    } catch (error: any) {
      console.error("Error loading campaigns:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi tải dữ liệu";
      setError(errorMessage);
      setCampaigns([]);
      setTotalCount(0);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, [canRead, currentPage, filters, pageSize, isArchived]);

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
  const [currentFilters, setCurrentFilters] = useState<CampaignFilters>({});
  const [isViewingArchived, setIsViewingArchived] = useState(false); // ✅ THÊM STATE

  // Permissions
  const { canAccess } = usePermission();
  const canRead = canAccess("chien-dich", "read");
  const canCreate = canAccess("chien-dich", "create");
  const isAdmin = canAccess("admin", "read");
  const isManager = canAccess("manager-chien-dich", "read");

  const {
    options,
    loading: optionsLoading,
    handleDepartmentChange,
  } = useCampaignFilters();
  
  // ✅ CẬP NHẬT: Data fetching với isViewingArchived parameter
  const {
    campaigns,
    loading: campaignsLoading,
    totalCount,
    stats,
    error,
    loadCampaigns,
  } = useCampaignData(canRead, currentPage, currentFilters, pageSize, isViewingArchived);

  // Memoized calculations
  const statsData = useMemo(
    () => [
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
        label: "Đã Lên Lịch",
        value: (stats.scheduledCampaigns ?? 0).toLocaleString(),
        icon: "⏰",
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
      {
        label: "Đã Lưu Trữ",
        value: (stats.archivedCampaigns ?? 0).toLocaleString(),
        icon: "📦",
      },
    ],
    [stats]
  );

  // Event handlers
  const handleFilterChange = useCallback(
    (filters: Filters) => {
      const campaignFilters: CampaignFilters = {
        search: filters.search?.trim() || undefined,
        campaign_types:
          filters.categories.length > 0
            ? filters.categories.map((c) => c as CampaignType)
            : undefined,
        statuses:
          filters.statuses.length > 0
            ? filters.statuses.map((s) => s as CampaignStatus)
            : undefined,
        employees:
          filters.employees.length > 0
            ? filters.employees.map((e) => String(e))
            : undefined,
        departments:
          filters.departments.length > 0
            ? filters.departments.map((d) => String(d))
            : undefined,
        singleDate: filters.singleDate
          ? typeof filters.singleDate === "string"
            ? filters.singleDate
            : filters.singleDate.toISOString().split("T")[0]
          : undefined,
        page: currentPage,
        pageSize: pageSize,
      };
      setCurrentFilters(campaignFilters);
      setCurrentPage(1); // Reset về trang 1 khi filter thay đổi
    },
    [currentPage, pageSize]
  );

  const handleResetFilter = useCallback(() => {
    setCurrentFilters({});
    setCurrentPage(1);
    handleDepartmentChange([]);
  }, [handleDepartmentChange]);

  const handleDepartmentFilterChange = useCallback(
    (departments: (string | number)[]) => {
      handleDepartmentChange(departments);

      const updatedFilters: Filters = {
        search: currentFilters.search || "",
        departments: departments,
        roles: [],
        statuses:
          currentFilters.statuses?.map((s) => s as string | number) || [],
        categories:
          currentFilters.campaign_types?.map((c) => c as string | number) || [],
        brands: [],
        employees:
          currentFilters.employees?.map((e) => e as string | number) || [],
        dateRange: { from: undefined, to: undefined },
        singleDate: currentFilters.singleDate || undefined,
      };

      handleFilterChange(updatedFilters);

      setCurrentPage(1);
    },
    [handleDepartmentChange, handleFilterChange, currentFilters, setCurrentPage]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);

      // Update filters với page mới
      const newFilters = { ...currentFilters, page };
      setCurrentFilters(newFilters);
    },
    [currentFilters]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setCurrentPage(1);

      // Update filters với pageSize mới
      const newFilters = { ...currentFilters, pageSize: newPageSize, page: 1 };
      setCurrentFilters(newFilters);
    },
    [currentFilters]
  );

  const handleCreateCampaign = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCampaignCreated = useCallback(
    async (data: any) => {
      try {
        await campaignAPI.create(data);
        setCreateModalOpen(false);
        setAlert({
          type: "success",
          message: "Chiến dịch đã được tạo thành công!",
        });
        await loadCampaigns();
      } catch (error: any) {
        console.error("Error creating campaign:", error);
        setAlert({
          type: "error",
          message:
            error.response?.data?.message || "Có lỗi xảy ra khi tạo chiến dịch",
        });
        throw error;
      }
    },
    [loadCampaigns]
  );

  const handleRefresh = useCallback(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleCloseAlert = useCallback(() => {
    setAlert(null);
  }, []);

  // ✅ THÊM MỚI: Handle toggle view archived
  const handleToggleViewArchived = useCallback(() => {
    setIsViewingArchived(!isViewingArchived);
    setCurrentPage(1);
    setCurrentFilters({});
    handleDepartmentChange([]);
  }, [isViewingArchived, handleDepartmentChange]);

  // Show error state
  if (error && !campaignsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">Có lỗi xảy ra</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline">
          Thử lại
        </Button>
      </div>
    );
  }

  // Show unauthorized state
  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
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
                  {/* ✅ THÊM TITLE ĐIỀU KIỆN */}
                  {isViewingArchived ? "Chiến dịch đã lưu trữ" : "Cấu hình chiến dịch"}
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  {/* ✅ THÊM DESCRIPTION ĐIỀU KIỆN */}
                  {isViewingArchived 
                    ? "Xem và quản lý các chiến dịch đã lưu trữ"
                    : "Quản lý và theo dõi các chiến dịch marketing"
                  }
                </p>
              </div>

              <div className="flex gap-2">
                {/* ✅ CHỈ HIỂN THỊ NÚT TẠO CHIẾN DỊCH KHI KHÔNG XEM ARCHIVED */}
                {!isViewingArchived && (
                  <PDynamic
                    permission={{
                      departmentSlug: "chien-dich",
                      action: "create",
                    }}
                  >
                    <Button
                      onClick={handleCreateCampaign}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                    >
                      <PlusIcon className="h-4 w-4 mr-2 inline-block" />
                      <span className="inline-block">Tạo Chiến Dịch</span>
                    </Button>
                  </PDynamic>
                )}

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={campaignsLoading}
                  className="transition-all duration-200 hover:bg-gray-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      campaignsLoading ? "animate-spin" : ""
                    } inline-block`}
                  />
                  <span className="inline-block">Làm mới</span>
                </Button>

                {/* ✅ THÊM NÚT TOGGLE VIEW ARCHIVED */}
                <Button
                  variant={isViewingArchived ? "edit" : "add"}
                  onClick={handleToggleViewArchived}
                  className="transition-all duration-200"
                >
                  <span className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  {isViewingArchived ? "Quay lại chiến dịch" : "Xem lưu trữ"}
                  </span>
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
        <Accordion
          type="single"
          collapsible
          defaultValue="stats"
          className="w-full"
        >
          <AccordionItem
            value="stats"
            className="border rounded-lg bg-white shadow-sm"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                  <span className="text-xl">📈</span>
                </div>
                <span className="text-lg font-semibold">
                  {/* ✅ THÊM TITLE ĐIỀU KIỆN CHO STATS */}
                  {isViewingArchived ? "Thống Kê Chiến Dịch Lưu Trữ" : "Thống Kê Chiến Dịch"}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
              enableSearch={true}
              enableCategoriesFilter={true} // Cho campaign types
              enableStatusFilter={!isViewingArchived} // ✅ KHÔNG HIỂN THỊ STATUS FILTER CHO ARCHIVED
              enableEmployeeFilter={isAdmin || isManager} // Chỉ admin và manager
              enableDepartmentFilter={isAdmin} // Chỉ admin
              enableSingleDateFilter={true}
              singleDateLabel="Lọc theo ngày tạo"
              // **Options data từ hook**
              availableCategories={CAMPAIGN_TYPE_OPTIONS}
              availableStatuses={[...STATUS_OPTIONS]}
              availableEmployees={options.employees}
              availableDepartments={options.departments}
              // **Pagination**
              page={currentPage}
              pageSize={pageSize}
              total={totalCount}
              onResetFilter={handleResetFilter}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              // **Callbacks**
              onFilterChange={handleFilterChange}
              onDepartmentChange={handleDepartmentFilterChange} // Callback đặc biệt cho department
              loading={campaignsLoading || optionsLoading}
              // **Export functionality**
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

      {/* Create Campaign Modal - CHỈ HIỂN THỊ KHI KHÔNG XEM ARCHIVED */}
      {!isViewingArchived && (
        <CampaignModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={handleCampaignCreated}
          mode="create"
        />
      )}
    </div>
  );
}
