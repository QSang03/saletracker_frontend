"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCw, Archive, Download } from "lucide-react"; // ✅ THÊM Archive icon
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
import { usePaginationSync } from "@/hooks/usePaginationSync"; // ✅ NEW IMPORT

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

// ✅ CẬP NHẬT: Custom hook for campaign data với pagination sync
const useCampaignData = (
  canRead: boolean,
  paginationState: { page: number; pageSize: number; filters: CampaignFilters },
  isArchived: boolean = false
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
      
      // ✅ Default backend sort to align with modal data recency
      const defaultSort = "start_date:desc,end_date:desc,created_at:desc";
      const requestFilters = {
        ...paginationState.filters,
        page: paginationState.page,
        pageSize: paginationState.pageSize,
        sort: paginationState.filters?.sort || defaultSort,
      } as any;

      // ✅ GỌI API KHÁC TÙY THEO isArchived
      const response = isArchived 
        ? await campaignAPI.getAllArchived(requestFilters)
        : await campaignAPI.getAll(requestFilters);

      // Apply a stable default sort so initial view matches expected order
      const list = (response.data || []).slice();
      const sorted = list.sort((a, b) => {
        // Prefer start_date desc when present
        const ad = a.start_date ? new Date(a.start_date).getTime() : 0;
        const bd = b.start_date ? new Date(b.start_date).getTime() : 0;
        if (ad !== bd) return bd - ad;
        // Then end_date desc
        const ae = a.end_date ? new Date(a.end_date).getTime() : 0;
        const be = b.end_date ? new Date(b.end_date).getTime() : 0;
        if (ae !== be) return be - ae;
        // Then created_at desc
        const ac = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bc = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (ac !== bc) return bc - ac;
        // Finally by customer_count desc
        const acc = a.customer_count ?? 0;
        const bcc = b.customer_count ?? 0;
        return bcc - acc;
      });
      setCampaigns(sorted);
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
  }, [canRead, paginationState, isArchived]);

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
  // ✅ THÊM: Constants cho localStorage
  const PAGE_SIZE_KEY = "campaignPageSize";
  
  // State management
  const [alert, setAlert] = useState<Alert | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isViewingArchived, setIsViewingArchived] = useState(false);

  // ✅ THÊM: Lấy pageSize từ localStorage
  const getInitialPageSize = useCallback(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PAGE_SIZE_KEY);
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  }, []); // ✅ SỬA: Không cần PAGE_SIZE_KEY trong deps vì nó là constant

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

  // ✅ CẬP NHẬT: Use pagination sync hook với pageSize từ localStorage
  const pagination = usePaginationSync({
    initialPage: 1,
    initialPageSize: getInitialPageSize(),
    initialFilters: {},
    onStateChange: (state) => {
    },
    debounceMs: 300
  });
  
  // ✅ CẬP NHẬT: Data fetching với pagination state
  const {
    campaigns,
    loading: campaignsLoading,
    totalCount,
    stats,
    error,
    loadCampaigns,
  } = useCampaignData(canRead, pagination.state, isViewingArchived);

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

  // Event handlers với pagination sync
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
  page: 1, // ✅ ALWAYS reset to page 1 when filters change
  pageSize: pagination.pageSize,
  sort: "start_date:desc,end_date:desc,created_at:desc",
      };
      
      // ✅ UPDATE: Use pagination hook
      pagination.setFilters(campaignFilters);
    },
  [pagination]
  );

  const handleResetFilter = useCallback(() => {
    // ✅ Reset pageSize về mặc định và cập nhật localStorage
    const defaultPageSize = 10;
    if (typeof window !== "undefined") {
      localStorage.setItem(PAGE_SIZE_KEY, defaultPageSize.toString());
    }
    
  // ✅ Reset pagination state với pageSize mặc định
    pagination.setPageSize(defaultPageSize);
    pagination.setFilters({});
    pagination.setPage(1);
  // ✅ Force reload after reset to avoid stale state preventing next filters
  loadCampaigns();
    
    // ✅ Reset department selection
    handleDepartmentChange([]);
  }, [pagination, handleDepartmentChange, loadCampaigns]);

  const handleDepartmentFilterChange = useCallback(
    (departments: (string | number)[]) => {
      handleDepartmentChange(departments);

      const updatedFilters: Filters = {
        search: pagination.filters.search || "",
        departments: departments,
        roles: [],
        statuses:
          pagination.filters.statuses?.map((s: any) => s as string | number) || [],
        categories:
          pagination.filters.campaign_types?.map((c: any) => c as string | number) || [],
        brands: [],
        employees:
          pagination.filters.employees?.map((e: any) => e as string | number) || [],
        dateRange: { from: undefined, to: undefined },
        singleDate: pagination.filters.singleDate || undefined,
        warningLevels: [],
      };

      // ✅ UPDATE: Use handleFilterChange to ensure proper sync
      handleFilterChange(updatedFilters);
    },
    [handleDepartmentChange, handleFilterChange, pagination.filters]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      // ✅ UPDATE: Use pagination hook
      pagination.setPage(page);
    },
    [pagination]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      // ✅ UPDATE: Use pagination hook và lưu vào localStorage
      pagination.setPageSize(newPageSize);
      
      // ✅ THÊM: Lưu pageSize vào localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(PAGE_SIZE_KEY, newPageSize.toString());
      }
    },
    [pagination] // ✅ SỬA: Không cần PAGE_SIZE_KEY trong deps vì nó là constant
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
    const newIsArchived = !isViewingArchived;
    setIsViewingArchived(newIsArchived);
    
    // ✅ UPDATE: Reset everything using pagination hook
    pagination.reset();
    handleDepartmentChange([]);
  }, [isViewingArchived, pagination, handleDepartmentChange]);

  // ✅ THÊM MỚI: Download sample file function
  const downloadSampleFile = useCallback(() => {
    // Đường dẫn file mẫu trong thư mục public
    const fileUrl = "/file_mau_cau_hinh_gui_tin_nhan.xlsx";
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = "file_mau_cau_hinh_gui_tin_nhan.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

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

                {/* ✅ THÊM NÚT TẢI FILE MẪU */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadSampleFile}
                  className="transition-all duration-200 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Tải file mẫu</span>
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
          <CardContent className="p-3">
            <PaginatedTable
              key={`pagination-${pagination.page}-${pagination.pageSize}`}
              enableSearch={true}
              enableCategoriesFilter={true} // Cho campaign types
              enableStatusFilter={!isViewingArchived} // ✅ KHÔNG HIỂN THỊ STATUS FILTER CHO ARCHIVED
              enableEmployeeFilter={isAdmin || isManager} // Chỉ admin và manager
              enableDepartmentFilter={isAdmin} // Chỉ admin
              enableSingleDateFilter={true}
              enablePageSize={true} // ✅ THÊM: Bật tính năng thay đổi số dòng
              singleDateLabel="Lọc theo ngày tạo"
              // **Options data từ hook**
              availableCategories={CAMPAIGN_TYPE_OPTIONS}
              availableStatuses={[...STATUS_OPTIONS]}
              availableEmployees={options.employees}
              availableDepartments={options.departments}
              // **Pagination**
              page={pagination.page}
              pageSize={pagination.pageSize}
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
                key={`campaign-mgmt-${totalCount}-${pagination.page}`}
                campaigns={campaigns}
                expectedRowCount={pagination.pageSize}
                startIndex={(pagination.page - 1) * pagination.pageSize}
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
