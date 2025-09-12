"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useBlacklist } from "@/hooks/useBlacklist";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import PaginatedTable, {
  Filters,
} from "@/components/ui/pagination/PaginatedTable";
import BlacklistManagement from "@/components/order/order-blacklist/BlacklistManagement";
import { getAccessToken } from "@/lib/auth";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";

// Component that uses useSearchParams - needs to be wrapped in Suspense
function OrderBlacklistContent() {
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // ✅ Thêm state để lưu vị trí scroll và page
  const [preservedState, setPreservedState] = useState<{
    scrollPosition: number;
    currentPage: number;
  } | null>(null);

  const { user } = useDynamicPermission();

  const {
    blacklists,
    total,
    isLoading,
    error,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setDepartments,
    setUsers,
    resetFilters,
    departmentOptions,
    userOptions,
    updateBlacklist,
    deleteBlacklist,
    refetch,
  } = useBlacklist();

  // ✅ Helper functions để lưu và khôi phục vị trí
  const saveCurrentPosition = useCallback(() => {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    setPreservedState({
      scrollPosition,
      currentPage: filters.page,
    });
  }, [filters.page]);

  const restorePosition = useCallback(() => {
    if (preservedState) {
      // Khôi phục page trước
      if (preservedState.currentPage !== filters.page) {
        setPage(preservedState.currentPage);
      }
      
      // Khôi phục scroll position sau khi data đã load
      setTimeout(() => {
        window.scrollTo(0, preservedState.scrollPosition);
        setPreservedState(null);
      }, 100);
    }
  }, [preservedState, filters.page, setPage]);

  // Handle filter changes from PaginatedTable với logic động
  const handleFilterChange = useCallback(
    (paginatedFilters: Filters) => {
      const searchValue = paginatedFilters.search || "";
      const departments = paginatedFilters.departments
        .map(Number)
        .filter((id) => !isNaN(id));
      const users = paginatedFilters.employees
        .map(Number)
        .filter((id) => !isNaN(id)); // employees -> users

      // ✅ LOGIC MỚI: Khi chọn nhân viên → cập nhật phòng ban
      let finalDepartments = departments;
      if (users.length > 0 && departments.length === 0) {
        // Nếu chọn nhân viên nhưng chưa chọn phòng ban, tự động chọn phòng ban của nhân viên đó
        // Logic này sẽ được xử lý trong hook useBlacklist
        finalDepartments = [];
      }

      // ✅ LOGIC MỚI: Khi chọn phòng ban → cập nhật nhân viên (nếu cần)
      let finalUsers = users;
      if (departments.length > 0 && users.length === 0) {
        // Nếu chọn phòng ban nhưng chưa chọn nhân viên, giữ nguyên (không tự động chọn nhân viên)
        finalUsers = [];
      } else if (departments.length > 0 && users.length > 0) {
        // Nếu đã chọn cả phòng ban và nhân viên, lọc nhân viên theo phòng ban đã chọn
        // Logic này sẽ được xử lý trong hook useBlacklist
        finalUsers = users;
      }

      setSearch(searchValue);
      setDepartments(finalDepartments);
      setUsers(finalUsers);
    },
    [setSearch, setDepartments, setUsers]
  );

  const handleDepartmentChange = useCallback((departments: (string | number)[]) => {
    const deptIds = departments.map(Number).filter((id) => !isNaN(id));
    setDepartments(deptIds);
  }, [setDepartments]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
    },
    [setPage]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
    },
    [setPageSize]
  );

  const handleResetFilter = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  // Handle edit blacklist reason
  const handleEdit = useCallback(
    async (id: number, reason: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();
        
        await updateBlacklist(id, { reason });
        setAlert({
          type: "success",
          message: "Cập nhật lý do chặn thành công!",
        });
        refetch();
      } catch (err: any) {
        console.error("Error updating blacklist:", err);
        setAlert({
          type: "error",
          message: err.message || "Lỗi khi cập nhật lý do chặn!",
        });
      }
    },
    [updateBlacklist, refetch, saveCurrentPosition]
  );

  // Handle delete blacklist
  const handleDelete = useCallback(
    async (id: number) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();
        
        await deleteBlacklist(id);
        setAlert({
          type: "success",
          message: "Xóa khỏi blacklist thành công!",
        });
        refetch();
      } catch (err: any) {
        console.error("Error deleting blacklist:", err);
        setAlert({
          type: "error",
          message: err.message || "Lỗi khi xóa khỏi blacklist!",
        });
      }
    },
    [deleteBlacklist, refetch, saveCurrentPosition]
  );

  // Auto hide alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Handle API errors
  useEffect(() => {
    if (error) {
      setAlert({
        type: "error",
        message: error,
      });
    }
  }, [error]);

  // ✅ Khôi phục vị trí sau khi data được refetch
  useEffect(() => {
    if (!isLoading && preservedState) {
      restorePosition();
    }
  }, [isLoading, preservedState, restorePosition]);

  // ✅ Export data function
  const getExportData = () => {
    const headers = [
      "STT",
      "Khách Hàng",
      "Zalo Contact ID",
      "Lý Do Chặn",
      "Người Chặn",
      "Thời Gian Chặn",
    ];

    const exportData = blacklists.map((item, idx) => [
      (filters.page - 1) * filters.pageSize + idx + 1,
      item.customerName || "--",
      item.zaloContactId || "--",
      item.reason || "--",
      item.user?.fullName || item.user?.username || "--",
      item.created_at
        ? (() => {
            const d = new Date(item.created_at);
            return d
              ? d
                  .toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "")
              : "--";
          })()
        : "--",
    ]);

    return { headers, data: exportData };
  };

  // ✅ Export all data function
  const getExportAllData = async () => {
    const params = new URLSearchParams();
    params.append("page", "1");
    params.append("pageSize", "1000000");
    if (filters.search?.trim()) params.append("search", filters.search.trim());
    if (filters.departments.length > 0) params.append("departments", filters.departments.join(","));
    if (filters.users.length > 0) params.append("users", filters.users.join(","));

    const token = getAccessToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/order-blacklist?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!res.ok) throw new Error(`Failed to fetch all blacklist data for export: ${res.status}`);
    const result = await res.json();
    const list = Array.isArray(result.data) ? result.data : [];

    // Map to the same shape as getExportData()
    const rows = list.map((item: any, idx: number) => [
      idx + 1,
      item.customerName || "--",
      item.zaloContactId || "--",
      item.reason || "--",
      item.user?.fullName || item.user?.username || "--",
      item.created_at
        ? (() => {
            const d = new Date(item.created_at);
            return d
              ? d
                  .toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "")
              : "--";
          })()
        : "--",
    ]);

    return rows;
  };

  // Prepare filters for PaginatedTable
  const memoizedInitialFilters = useMemo(
    () => ({
      search: filters.search || "",
      departments: [],
      roles: [],
      statuses: [],
      categories: [],
      brands: [],
      warningLevels: [],
      dateRange: { from: undefined, to: undefined },
      singleDate: undefined,
      employees: filters.users || [],
    }),
    [filters.search]
  );

  // ✅ LOGIC MỚI: Lọc phòng ban theo nhân viên đã chọn
  const memoizedAvailableDepartments = useMemo(() => {
    if (filters.users.length > 0) {
      // Nếu có nhân viên được chọn, chỉ hiển thị phòng ban của nhân viên đó
      // Logic này sẽ được xử lý trong hook useBlacklist thông qua API
      return departmentOptions;
    }
    // Nếu không chọn nhân viên nào, hiển thị tất cả phòng ban
    return departmentOptions;
  }, [departmentOptions, filters.users]);

  // ✅ LOGIC MỚI: Lọc nhân viên theo phòng ban đã chọn
  const memoizedAvailableEmployees = useMemo(() => {
    if (filters.departments.length > 0) {
      // Nếu có phòng ban được chọn, chỉ hiển thị nhân viên thuộc phòng ban đó
      // Logic này sẽ được xử lý trong hook useBlacklist thông qua API
      return userOptions;
    }
    // Nếu không chọn phòng ban nào, hiển thị tất cả nhân viên
    return userOptions;
  }, [userOptions, filters.departments]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden relative">
      {alert && (
        <div className="mb-4">
          <ServerResponseAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            🚫 Quản lý Blacklist
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={refetch} className="text-sm">
              🔄 Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch={true}
            enablePageSize={true}
            enableDepartmentFilter={true}
            enableEmployeeFilter={true}
            availableDepartments={memoizedAvailableDepartments}
            availableEmployees={memoizedAvailableEmployees}
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onFilterChange={handleFilterChange}
            onDepartmentChange={handleDepartmentChange}
            loading={isLoading}
            initialFilters={memoizedInitialFilters}
            onResetFilter={handleResetFilter}
            canExport={true}
            getExportData={getExportData}
            getExportAllData={getExportAllData}
          >
            <BlacklistManagement
              blacklists={blacklists}
              total={total}
              loading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </PaginatedTable>
        </CardContent>
      </Card>

      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}

// Loading component for Suspense fallback
function OrderBlacklistLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function OrderBlacklistPage() {
  return (
    <Suspense fallback={<OrderBlacklistLoading />}>
      <OrderBlacklistContent />
    </Suspense>
  );
}
