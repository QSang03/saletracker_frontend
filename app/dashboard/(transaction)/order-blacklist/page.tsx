"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useBlacklist } from "@/hooks/useBlacklist";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import PaginatedTable, {
  Filters,
} from "@/components/ui/pagination/PaginatedTable";
import BlacklistManagement from "@/components/order/order-blacklist/BlacklistManagement";

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

  // Handle filter changes from PaginatedTable
  const handleFilterChange = useCallback(
    (paginatedFilters: Filters) => {
      const searchValue = paginatedFilters.search || "";
      const departments = paginatedFilters.departments
        .map(Number)
        .filter((id) => !isNaN(id));
      const users = paginatedFilters.employees
        .map(Number)
        .filter((id) => !isNaN(id)); // employees -> users

      setSearch(searchValue);
      setDepartments(departments);
      setUsers(users);
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
        await updateBlacklist(id, { reason });
        setAlert({
          type: "success",
          message: "Cập nhật lý do chặn thành công!",
        });
      } catch (err: any) {
        console.error("Error updating blacklist:", err);
        setAlert({
          type: "error",
          message: err.message || "Lỗi khi cập nhật lý do chặn!",
        });
      }
    },
    [updateBlacklist]
  );

  // Handle delete blacklist
  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteBlacklist(id);
        setAlert({
          type: "success",
          message: "Xóa khỏi blacklist thành công!",
        });
      } catch (err: any) {
        console.error("Error deleting blacklist:", err);
        setAlert({
          type: "error",
          message: err.message || "Lỗi khi xóa khỏi blacklist!",
        });
      }
    },
    [deleteBlacklist]
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
            availableDepartments={departmentOptions}
            availableEmployees={userOptions}
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
            canExport={false}
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
