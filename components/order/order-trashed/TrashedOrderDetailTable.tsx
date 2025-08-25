"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PaginatedTable, {
  type Filters,
} from "@/components/ui/pagination/PaginatedTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import type { OrderDetail } from "@/types";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useTrashedOrders } from "@/hooks/useTrashedOrders";
import { getAccessToken } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function TrashedOrderDetailTable() {
  const { currentUser } = useCurrentUser();
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  const {
    data,
    total,
    isLoading,
    filters,
    setFilters,
    setPage,
    setPageSize,
    getFilterOptions,
    reload,
    bulkRestoreOrderDetails,
  } = useTrashedOrders();

  // Load filter options once
  const [filterOptions, setFilterOptions] = useState<{
    departments: Array<{
      value: number;
      label: string;
      users: Array<{ value: number; label: string }>;
    }>;
    products: Array<{ value: number; label: string }>;
  }>({ departments: [], products: [] });

  useEffect(() => {
    (async () => {
      try {
        const opts = await getFilterOptions();
        setFilterOptions(opts);
      } catch (e) {
        // ignore
      }
    })();
  }, [getFilterOptions]);

  const allEmployeeOptions = useMemo(() => {
    return filterOptions.departments.reduce((acc, dept) => {
      dept.users.forEach((u) => {
        if (!acc.find((x) => x.value === String(u.value))) {
          acc.push({ label: u.label, value: String(u.value) });
        }
      });
      return acc;
    }, [] as { label: string; value: string }[]);
  }, [filterOptions.departments]);

  const departmentOptions = filterOptions.departments.map((d) => ({
    label: d.label,
    value: String(d.value),
  }));
  const productOptions = filterOptions.products.map((p) => ({
    label: p.label,
    value: String(p.value),
  }));

  const handleFilterChange = useCallback(
    (f: Filters) => {
      const employeesValue =
        f.employees.length > 0 ? f.employees.join(",") : "";
      const departmentsValue =
        f.departments.length > 0 ? f.departments.join(",") : "";
      const productsValue =
        f.categories.length > 0 ? f.categories.join(",") : ""; // reuse categories as products

      setFilters({
        search: f.search || "",
        employees: employeesValue,
        departments: departmentsValue,
        products: productsValue,
        page: 1,
      });
    },
    [setFilters]
  );

  const handlePageChange = useCallback((p: number) => setPage(p), [setPage]);
  const handlePageSizeChange = useCallback(
    (s: number) => setPageSize(s),
    [setPageSize]
  );

  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const selectedRows = data.filter((d) => selected.has(d.id));
  const isOwner = useCallback(
    (od: OrderDetail) =>
      !!(
        od?.order?.sale_by?.id &&
        currentUser?.id &&
        od.order!.sale_by!.id === currentUser.id
      ),
    [currentUser?.id]
  );
  const canBulkRestore = selectedRows.length > 0 && selectedRows.every(isOwner);

  const handleBulkRestore = useCallback(() => {
    if (!canBulkRestore) return;

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận khôi phục",
      message: `Bạn có chắc chắn muốn khôi phục ${selectedRows.length} đơn hàng đã chọn?`,
      onConfirm: async () => {
        try {
          const ids = selectedRows.map((x) => Number(x.id));
          await bulkRestoreOrderDetails(ids);
          setAlert({
            type: "success",
            message: `Đã khôi phục ${ids.length} đơn hàng`,
          });
          setSelected(new Set());
          reload();
        } catch (e) {
          setAlert({ type: "error", message: "Khôi phục thất bại" });
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  }, [selectedRows, canBulkRestore, bulkRestoreOrderDetails, reload]);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // ✅ Enhanced Skeleton Row Component
  const SkeletonTableRow = () => (
    <TableRow className="group transition-all duration-300 border-b border-red-100">
      <TableCell className="min-w-[60px] text-center py-4 px-6">
        <Skeleton className="h-3 w-3 rounded animate-pulse mx-auto" />
      </TableCell>
      <TableCell className="min-w-[80px] py-4 px-6">
        <Skeleton className="h-4 w-8 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[120px] py-4 px-6">
        <Skeleton className="h-4 w-16 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[180px] py-4 px-6">
        <Skeleton className="h-4 w-24 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[220px] py-4 px-6">
        <Skeleton className="h-4 w-32 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[280px] py-4 px-6">
        <Skeleton className="h-4 w-36 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[80px] text-center py-4 px-6">
        <Skeleton className="h-4 w-6 mx-auto rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[120px] text-center py-4 px-6">
        <Skeleton className="h-4 w-16 mx-auto rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[180px] py-4 px-6">
        <Skeleton className="h-4 w-20 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[180px] py-4 px-6">
        <Skeleton className="h-4 w-20 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[140px] py-4 px-6">
        <Skeleton className="h-7 w-20 rounded-lg animate-pulse" />
      </TableCell>
    </TableRow>
  );

  return (
    <div className="h-full overflow-hidden relative">
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            🗑️ Đơn hàng đã xóa
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reload}>
              🔄 Làm mới
            </Button>
            <Button
              variant="default"
              disabled={!canBulkRestore}
              title={
                canBulkRestore
                  ? "Khôi phục"
                  : "Chỉ khôi phục được đơn thuộc quyền sở hữu của bạn"
              }
              onClick={handleBulkRestore}
            >
              ♻️ Khôi phục
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch
            enableStatusFilter={false}
            enableSingleDateFilter={false}
            enableDateRangeFilter={false}
            enableEmployeeFilter
            enableDepartmentFilter
            enableCategoriesFilter
            enableWarningLevelFilter={false}
            enablePageSize
            availableStatuses={[]}
            availableEmployees={allEmployeeOptions}
            availableDepartments={departmentOptions}
            availableCategories={productOptions}
            availableWarningLevels={[]}
            singleDateLabel=""
            dateRangeLabel=""
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onResetFilter={() =>
              setFilters({
                search: "",
                employees: "",
                departments: "",
                products: "",
                page: 1,
              })
            }
            isRestoring={false}
            loading={isLoading}
            canExport={true}
            getExportData={() => {
              const headers = [
                "STT",
                "Mã Đơn",
                "Nhân Viên",
                "Khách Hàng",
                "Mặt Hàng",
                "Số Lượng",
                "Đơn Giá",
                "Ngày Xóa",
                "Ngày Tạo",
              ];

              const exportData = data.map((orderDetail, idx) => [
                (filters.page - 1) * filters.pageSize + idx + 1,
                orderDetail.id ?? "--",
                orderDetail.order?.sale_by?.fullName ||
                  orderDetail.order?.sale_by?.username ||
                  "--",
                orderDetail.customer_name || "--",
                orderDetail.raw_item || "--",
                orderDetail.quantity ?? "--",
                orderDetail.unit_price
                  ? Number(orderDetail.unit_price).toLocaleString("vi-VN") + "₫"
                  : "--",
                orderDetail.deleted_at
                  ? (() => {
                      const d =
                        typeof orderDetail.deleted_at === "string"
                          ? new Date(orderDetail.deleted_at)
                          : orderDetail.deleted_at instanceof Date
                          ? orderDetail.deleted_at
                          : null;
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
                orderDetail.created_at
                  ? (() => {
                      const d =
                        typeof orderDetail.created_at === "string"
                          ? new Date(orderDetail.created_at)
                          : orderDetail.created_at instanceof Date
                          ? orderDetail.created_at
                          : null;
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
            }}
            getExportAllData={async () => {
              const params = new URLSearchParams();
              params.append("page", "1");
              params.append("pageSize", "1000000");
              if (filters.search?.trim()) params.append("search", filters.search.trim());
              if (filters.employees?.trim()) params.append("employees", filters.employees.trim());
              if (filters.departments?.trim()) params.append("departments", filters.departments.trim());
              if (filters.products?.trim()) params.append("products", filters.products.trim());
              if (filters.sortField) params.append("sortField", filters.sortField);
              if (filters.sortDirection) params.append("sortDirection", filters.sortDirection);

              const token = getAccessToken();
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/order-details/trashed?${params.toString()}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                }
              );

              if (!res.ok) throw new Error(`Failed to fetch all trashed orders for export: ${res.status}`);
              const result = await res.json();
              const list: OrderDetail[] = Array.isArray(result)
                ? result
                : Array.isArray(result?.data)
                ? result.data
                : [];

              // Map to the same shape as getExportData()
              const rows: (string | number)[][] = list.map((orderDetail, idx) => [
                idx + 1,
                orderDetail.id ?? "--",
                orderDetail.order?.sale_by?.fullName ||
                  orderDetail.order?.sale_by?.username ||
                  "--",
                orderDetail.customer_name || "--",
                orderDetail.raw_item || "--",
                orderDetail.quantity ?? "--",
                orderDetail.unit_price
                  ? Number(orderDetail.unit_price).toLocaleString("vi-VN") + "₫"
                  : "--",
                orderDetail.deleted_at
                  ? (() => {
                      const d =
                        typeof orderDetail.deleted_at === "string"
                          ? new Date(orderDetail.deleted_at)
                          : orderDetail.deleted_at instanceof Date
                          ? orderDetail.deleted_at
                          : null;
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
                orderDetail.created_at
                  ? (() => {
                      const d =
                        typeof orderDetail.created_at === "string"
                          ? new Date(orderDetail.created_at)
                          : orderDetail.created_at instanceof Date
                          ? orderDetail.created_at
                          : null;
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
            }}
            initialFilters={{
              search: filters.search || "",
              departments: filters.departments
                ? filters.departments.split(",").filter(Boolean)
                : [],
              roles: [],
              statuses: [],
              categories: filters.products
                ? filters.products.split(",").filter(Boolean)
                : [],
              brands: [],
              warningLevels: [],
              dateRange: { from: undefined, to: undefined },
              singleDate: undefined,
              employees: filters.employees
                ? filters.employees.split(",").filter(Boolean)
                : [],
            }}
          >
            {/* ✅ Enhanced Table Container - CHỈ PHẦN NÀY ĐƯỢC TỐI ƯU */}
            <div className="relative rounded-2xl shadow-2xl bg-white border border-gray-200 max-h-[600px] overflow-auto">
              {/* Floating gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 pointer-events-none rounded-2xl"></div>

              <Table className="relative whitespace-nowrap min-w-full">
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-red-100 hover:bg-red-200 transition-all duration-300 border-b-2 border-red-200">
                    <TableHead className="min-w-[60px] text-center sticky top-0 bg-red-100 py-4 px-6">
                      <Checkbox
                        checked={
                          data.length > 0 && data.every((d) => selected.has(d.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked)
                            setSelected(new Set(data.map((d) => d.id)));
                          else setSelected(new Set());
                        }}
                        aria-label="Select all"
                        className="border-2 border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:text-white transition-all duration-200"
                      />
                    </TableHead>
                    
                    <TableHead className="min-w-[80px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0s" }}>📊</span>
                        <span>STT</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[120px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.1s" }}>🆔</span>
                        <span>Mã đơn</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[180px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.2s" }}>👨‍💼</span>
                        <span>Nhân viên</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[220px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.3s" }}>👤</span>
                        <span>Khách hàng</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[280px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.4s" }}>📦</span>
                        <span>Mặt hàng</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[80px] font-bold text-center text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.5s" }}>🔢</span>
                        <span>SL</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[120px] font-bold text-center text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.6s" }}>💰</span>
                        <span>Đơn giá</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[180px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.7s" }}>🗑️</span>
                        <span>Ngày xóa</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[180px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.8s" }}>📅</span>
                        <span>Ngày tạo</span>
                      </div>
                    </TableHead>
                    
                    <TableHead className="min-w-[140px] font-bold text-sm text-red-800 tracking-wide sticky top-0 bg-red-100 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.9s" }}>⚡</span>
                        <span>Hành động</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    // ✅ Enhanced Skeleton Loading
                    Array.from({ length: filters.pageSize || 10 }).map(
                      (_, index) => <SkeletonTableRow key={`skeleton-${index}`} />
                    )
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-20">
                        <div className="space-y-6">
                          <div className="text-6xl animate-pulse">🎉</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            Tuyệt vời! Không có đơn hàng nào bị xóa
                          </div>
                          <div className="text-base text-gray-500">
                            Tất cả đơn hàng đều được giữ nguyên vẹn
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((od, idx) => {
                      const owner = isOwner(od);
                      return (
                        <TableRow 
                          key={String(od.id)}
                          className={`group relative transition-all duration-300 border-b border-red-100 hover:bg-red-50/50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-red-50/30"
                          }`}
                        >
                          <TableCell className="min-w-[60px] text-center py-4 px-6">
                            <Checkbox
                              checked={selected.has(od.id)}
                              onCheckedChange={(checked) => {
                                const s = new Set(selected);
                                if (checked) s.add(od.id);
                                else s.delete(od.id);
                                setSelected(s);
                              }}
                              aria-label="Select row"
                              className="transition-all duration-200"
                            />
                          </TableCell>
                          
                          <TableCell className="min-w-[80px] text-center py-4 px-6">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 rounded-full text-sm font-bold shadow-sm">
                              {(filters.page - 1) * filters.pageSize + idx + 1}
                            </span>
                          </TableCell>
                          
                          <TableCell className="min-w-[120px] py-4 px-6">
                            <div className="font-mono text-sm font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                              #{od.id}
                            </div>
                          </TableCell>
                          
                          <TableCell className="min-w-[180px] py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {(od.order?.sale_by?.fullName || od.order?.sale_by?.username || "??").charAt(0).toUpperCase()}
                              </div>
                              <div className="text-sm font-medium text-gray-800 leading-relaxed">
                                {od.order?.sale_by?.fullName || od.order?.sale_by?.username || "—"}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="min-w-[220px] py-4 px-6">
                            <div className="text-sm font-medium text-gray-800 leading-relaxed" title={od.customer_name || "—"}>
                              {od.customer_name || "—"}
                            </div>
                          </TableCell>
                          
                          <TableCell className="min-w-[280px] py-4 px-6">
                            <div className="text-sm text-gray-700 leading-relaxed" title={od.raw_item || "—"}>
                              {od.raw_item || "—"}
                            </div>
                          </TableCell>
                          
                          <TableCell className="min-w-[80px] text-center py-4 px-6">
                            <span className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold min-w-[40px] shadow-sm">
                              {od.quantity ?? 0}
                            </span>
                          </TableCell>
                          
                          <TableCell className="min-w-[120px] text-center py-4 px-6">
                            <span className="font-mono font-bold text-sm bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              {od.unit_price
                                ? Number(od.unit_price).toLocaleString("vi-VN") + "₫"
                                : "0₫"}
                            </span>
                          </TableCell>
                          
                          <TableCell className="min-w-[180px] py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                              <span className="text-sm text-gray-600 font-medium">
                                {od.deleted_at
                                  ? new Date(od.deleted_at as any).toLocaleString("vi-VN")
                                  : "—"}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="min-w-[180px] py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span className="text-sm text-gray-600 font-medium">
                                {od.created_at
                                  ? new Date(od.created_at as any).toLocaleString("vi-VN")
                                  : "—"}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="min-w-[140px] py-4 px-6">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!owner}
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: "Xác nhận khôi phục",
                                  message: `Bạn có chắc chắn muốn khôi phục đơn hàng #${od.id}?`,
                                  onConfirm: async () => {
                                    try {
                                      await bulkRestoreOrderDetails([Number(od.id)]);
                                      setAlert({
                                        type: "success",
                                        message: "Đã khôi phục 1 đơn",
                                      });
                                      reload();
                                    } catch {
                                      setAlert({
                                        type: "error",
                                        message: "Khôi phục thất bại",
                                      });
                                    } finally {
                                      setConfirmDialog((prev) => ({
                                        ...prev,
                                        isOpen: false,
                                      }));
                                    }
                                  },
                                });
                              }}
                              className={`group relative overflow-hidden px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm ${
                                owner
                                  ? "text-emerald-600 border-emerald-300 hover:border-emerald-400 bg-white hover:bg-emerald-50"
                                  : "text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed"
                              }`}
                              title={
                                owner
                                  ? "Khôi phục đơn hàng này"
                                  : "Chỉ chủ sở hữu đơn hàng mới được khôi phục"
                              }
                            >
                              <span className="flex items-center gap-1">
                                ♻️ <span>Khôi phục</span>
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </PaginatedTable>
        </CardContent>

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() =>
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
          }
          confirmText="Khôi phục"
          cancelText="Hủy"
        />
      </Card>
    </div>
  );
}
