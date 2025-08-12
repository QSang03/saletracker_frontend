"use client";
import { useMemo, useState } from "react";
import PaginatedTable, {
  Filters,
} from "@/components/ui/pagination/PaginatedTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertType } from "@/components/ui/loading/ServerResponseAlert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DeleteOrderDetailModal from "@/components/order/manager-order/DeleteOrderDetailModal";
import { useCurrentUser } from "@/contexts/CurrentUserContext"; // ✅ THÊM

interface HiddenOrderManagementProps {
  rows: any[];
  total: number;
  loading: boolean;
  filters: any;
  updateFilters: (filters: any) => void;
  filterOptions: any;
  selectedIds: Set<number>;
  toggleSelect: (id: number) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  bulkUnhide: () => Promise<{ success: boolean; message: string }>;
  singleUnhide: (id: number) => Promise<{ success: boolean; message: string }>;
  bulkSoftDelete: () => Promise<{ success: boolean; message: string }>;
  singleSoftDelete: (
    id: number
  ) => Promise<{ success: boolean; message: string }>;
  onAlert: (type: AlertType, message: string) => void;
  resetFilters?: () => void;
}

export default function HiddenOrderManagement({
  rows,
  total,
  loading,
  filters,
  updateFilters,
  filterOptions,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  isAllSelected,
  bulkUnhide,
  singleUnhide,
  bulkSoftDelete,
  singleSoftDelete,
  onAlert,
  resetFilters = () => {},
}: HiddenOrderManagementProps) {
  // ✅ THÊM: Current user context
  const { currentUser } = useCurrentUser();

  // ✅ THÊM: Function check ownership
  const isOwner = (row: any) => {
    return !!(
      row?.order?.sale_by?.id &&
      currentUser?.id &&
      row.order.sale_by.id === currentUser.id
    );
  };

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

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    orderDetail: any | null;
  }>({
    isOpen: false,
    orderDetail: null,
  });

  // ✅ Transform filters for PaginatedTable
  const paginatedFilters: Filters = useMemo(
    () => ({
      search: filters.search || "",
      departments: filters.departments
        ? filters.departments.split(",").filter(Boolean)
        : [],
      roles: [],
      statuses: filters.status ? filters.status.split(",").filter(Boolean) : [],
      categories: [],
      brands: [],
      warningLevels: [],
      dateRange: filters.hiddenDateRange || { from: undefined, to: undefined },
      employees: filters.employees
        ? filters.employees.split(",").filter(Boolean)
        : [],
      zaloLinkStatuses: [],
    }),
    [filters]
  );

  // ✅ Handle filter changes from PaginatedTable
  const handleFilterChange = (newFilters: Filters) => {
    updateFilters({
      departments: newFilters.departments.join(","),
      status: newFilters.statuses.join(","),
      employees: newFilters.employees.join(","),
      hiddenDateRange: newFilters.dateRange,
      page: 1,
      search: newFilters.search || "",
    });
  };

  const handlePaginatedTableReset = () => {
    // Reset selections
    selectedIds.clear();
    // Gọi resetFilters từ hook để clear localStorage
    if (typeof resetFilters === "function") {
      resetFilters();
    }
  };

  // ✅ Handle pagination
  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    updateFilters({ pageSize, page: 1 });
  };

  // ✅ THÊM: Check bulk ownership
  const selectedRows = useMemo(() => {
    return rows.filter((row) => selectedIds.has(row.id));
  }, [rows, selectedIds]);

  const canBulkAct = useMemo(() => {
    if (selectedRows.length === 0) return false;
    return selectedRows.every(isOwner);
  }, [selectedRows, currentUser?.id]);

  // ✅ Bulk unhide action - THÊM ownership check
  const handleBulkUnhide = () => {
    if (selectedIds.size === 0) {
      onAlert("warning", "Vui lòng chọn ít nhất một mục để hiện");
      return;
    }

    // ✅ THÊM: Check ownership
    if (!canBulkAct) {
      onAlert("error", "Bạn chỉ có thể thao tác với đơn hàng của mình");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận hiện đơn hàng",
      message: `Bạn có chắc chắn muốn hiện ${selectedIds.size} đơn hàng đã chọn?`,
      onConfirm: async () => {
        const result = await bulkUnhide();
        onAlert(result.success ? "success" : "error", result.message);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ✅ Handler cho bulk soft delete - THÊM ownership check
  const handleBulkSoftDelete = () => {
    if (selectedIds.size === 0) {
      onAlert("warning", "Vui lòng chọn ít nhất một mục để xóa");
      return;
    }

    // ✅ THÊM: Check ownership
    if (!canBulkAct) {
      onAlert("error", "Bạn chỉ có thể thao tác với đơn hàng của mình");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận xóa vĩnh viễn",
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.size} đơn hàng đã chọn? Hành động này không thể hoàn tác!`,
      onConfirm: async () => {
        const result = await bulkSoftDelete();
        onAlert(result.success ? "success" : "error", result.message);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ✅ Single actions handlers - THÊM ownership check
  const handleSingleUnhide = (id: number, row: any) => {
    // ✅ THÊM: Check ownership
    if (!isOwner(row)) {
      onAlert("error", "Bạn chỉ có thể hiện đơn hàng của mình");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận hiện đơn hàng",
      message: `Bạn có chắc chắn muốn hiện đơn hàng #${id}?`,
      onConfirm: async () => {
        const result = await singleUnhide(id);
        onAlert(result.success ? "success" : "error", result.message);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleSingleDelete = async () => {
    if (!deleteModal.orderDetail) return;

    // ✅ THÊM: Check ownership
    if (!isOwner(deleteModal.orderDetail)) {
      onAlert("error", "Bạn chỉ có thể xóa đơn hàng của mình");
      setDeleteModal({ isOpen: false, orderDetail: null });
      return;
    }

    const result = await singleSoftDelete(deleteModal.orderDetail.id);
    onAlert(result.success ? "success" : "error", result.message);
    setDeleteModal({ isOpen: false, orderDetail: null });
  };

  const getProductName = (row: any): string => {
    if (row.product?.productName) {
      return row.product.productName;
    }

    if (row.metadata?.ai_updates?.[0]?.product_info) {
      const productInfo = row.metadata.ai_updates[0].product_info;

      if (productInfo.product_name && productInfo.product_name !== "N/A") {
        return productInfo.product_name;
      }

      if (productInfo.note) {
        const noteMatch = productInfo.note.match(/n:([^-]+)/);
        if (noteMatch) {
          return noteMatch[1].trim();
        }
      }
    }

    if (row.raw_item) {
      return row.raw_item;
    }

    return "—";
  };

  // ✅ Export data function
  const getExportData = () => {
    const headers = [
      "ID",
      "Tên khách hàng",
      "Sản phẩm",
      "Số lượng",
      "Tổng tiền",
      "Trạng thái",
      "Lý do ẩn",
      "Ngày ẩn",
    ];

    const data = rows.map((row) => [
      row.id,
      row.customer_name || "",
      getProductName(row),
      row.quantity || 0,
      (row.quantity || 0) * (row.unit_price || 0),
      row.status || "",
      row.reason || "",
      row.hidden_at ? new Date(row.hidden_at).toLocaleDateString("vi-VN") : "",
    ]);

    return { headers, data };
  };

  // ✅ Enhanced Skeleton Row Component
  const SkeletonTableRow = () => (
    <TableRow className="group transition-all duration-300 border-b border-gray-100">
      <TableCell className="min-w-[80px] text-center py-4 px-6">
        <Skeleton className="h-3 w-3 rounded animate-pulse mx-auto" />
      </TableCell>
      <TableCell className="min-w-[100px] py-4 px-6">
        <Skeleton className="h-4 w-12 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[250px] py-4 px-6">
        <Skeleton className="h-4 w-28 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[320px] py-4 px-6">
        <Skeleton className="h-4 w-36 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[100px] text-center py-4 px-6">
        <Skeleton className="h-4 w-6 mx-auto rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[180px] text-right py-4 px-6">
        <Skeleton className="h-4 w-20 ml-auto rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[180px] py-4 px-6">
        <Skeleton className="h-5 w-16 rounded-full animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[250px] py-4 px-6">
        <Skeleton className="h-4 w-24 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[140px] py-4 px-6">
        <Skeleton className="h-4 w-16 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="min-w-[180px] py-4 px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-12 rounded-lg animate-pulse" />
          <Skeleton className="h-7 w-12 rounded-lg animate-pulse" />
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <PaginatedTable
        enableSearch={true}
        enableDepartmentFilter={true}
        enableRoleFilter={false}
        enableStatusFilter={true}
        enableEmployeeFilter={true}
        enableCategoriesFilter={false}
        enableWarningLevelFilter={false}
        enableDateRangeFilter={true}
        enableSingleDateFilter={false}
        onResetFilter={handlePaginatedTableReset}
        enableZaloLinkStatusFilter={false}
        enablePageSize={true}
        availableDepartments={filterOptions.departments || []}
        availableStatuses={[
          { value: "pending", label: "Chờ xử lý" },
          { value: "completed", label: "Hoàn thành" },
          { value: "demand", label: "Yêu cầu" },
          { value: "quoted", label: "Báo giá" },
          { value: "confirmed", label: "Xác nhận" },
        ]}
        availableEmployees={
          filterOptions.departments?.flatMap((d: any) => d.users || []) || []
        }
        dateRangeLabel="Ngày ẩn"
        page={filters.page}
        pageSize={filters.pageSize}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        initialFilters={paginatedFilters}
        onFilterChange={handleFilterChange}
        loading={loading}
        canExport={true}
        getExportData={getExportData}
      >
        {/* ✅ Enhanced Bulk Actions Bar - THÊM ownership check */}
        {selectedIds.size > 0 && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl shadow-lg backdrop-blur-sm flex items-center justify-between transform transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-base text-blue-700 font-semibold">
                Đã chọn{" "}
                <span className="px-3 py-1 bg-blue-100 rounded-lg font-bold mx-1">
                  {selectedIds.size}
                </span>{" "}
                mục
                {!canBulkAct && (
                  <span className="ml-2 text-sm text-red-600 font-normal">
                    (Chỉ được thao tác đơn của mình)
                  </span>
                )}
              </span>
            </div>

            {/* ✅ Buttons container - THÊM disable logic */}
            <div className="flex items-center gap-3">
              {/* Button Hiện nhiều */}
              <Button
                onClick={handleBulkUnhide}
                size="sm"
                variant="outline"
                disabled={!canBulkAct || loading}
                className={`group relative overflow-hidden text-sm px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold ${
                  canBulkAct
                    ? "text-green-600 border-2 border-green-300 hover:border-green-400 bg-white hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
                    : "text-gray-400 border-2 border-gray-300 bg-gray-100 cursor-not-allowed"
                }`}
                title={
                  canBulkAct
                    ? "Hiện đơn hàng đã chọn"
                    : "Chỉ được thao tác với đơn hàng của mình"
                }
              >
                {canBulkAct && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  👁️ Hiện ({selectedIds.size})
                </span>
              </Button>

              {/* Button Xóa nhiều */}
              <Button
                onClick={handleBulkSoftDelete}
                size="sm"
                variant="outline"
                disabled={!canBulkAct || loading}
                className={`group relative overflow-hidden text-sm px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold ${
                  canBulkAct
                    ? "text-red-600 border-2 border-red-300 hover:border-red-400 bg-white hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50"
                    : "text-gray-400 border-2 border-gray-300 bg-gray-100 cursor-not-allowed"
                }`}
                title={
                  canBulkAct
                    ? "Xóa đơn hàng đã chọn"
                    : "Chỉ được thao tác với đơn hàng của mình"
                }
              >
                {canBulkAct && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  🗑️ Xóa ({selectedIds.size})
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* ✅ Table Container giống OrderManagement */}
        <div className="relative rounded-2xl shadow-2xl bg-white border border-gray-200 max-h-[600px] overflow-auto">
          {/* Floating gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none rounded-2xl"></div>

          {/* ✅ Table trực tiếp với overflow-auto */}
          <Table className="relative whitespace-nowrap min-w-full">
            <TableHeader className="sticky top-0 z-20">
              {/* ✅ Clean Header Design */}
              <TableRow className="bg-blue-100 hover:bg-blue-200 transition-all duration-300 border-b-2 border-blue-200">
                <TableHead className="min-w-[80px] text-center sticky top-0 bg-blue-100 py-4 px-6">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={loading}
                    className="border-2 border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white transition-all duration-200"
                  />
                </TableHead>
                <TableHead className="min-w-[100px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0s" }}
                    >
                      🆔
                    </span>
                    <span>ID</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[250px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.1s" }}
                    >
                      👤
                    </span>
                    <span>Khách hàng</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[320px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.2s" }}
                    >
                      📦
                    </span>
                    <span>Sản phẩm</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[100px] font-bold text-center text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.3s" }}
                    >
                      🔢
                    </span>
                    <span>SL</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[180px] font-bold text-right text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.4s" }}
                    >
                      💎
                    </span>
                    <span>Tổng tiền</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[180px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.5s" }}
                    >
                      📊
                    </span>
                    <span>Trạng thái</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[250px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.6s" }}
                    >
                      💭
                    </span>
                    <span>Lý do ẩn</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[140px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.7s" }}
                    >
                      📅
                    </span>
                    <span>Ngày ẩn</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[180px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.8s" }}
                    >
                      ⚡
                    </span>
                    <span>Thao tác</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                // ✅ Enhanced Skeleton Loading
                Array.from({ length: filters.pageSize || 10 }).map(
                  (_, index) => <SkeletonTableRow key={`skeleton-${index}`} />
                )
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-20">
                    <div className="space-y-6">
                      <div className="text-6xl">👻</div>
                      <div className="text-xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
                        Không có đơn hàng ẩn nào
                      </div>
                      <div className="text-base text-gray-500">
                        Các đơn hàng bị ẩn sẽ xuất hiện tại đây
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => {
                  // ✅ THÊM: Check ownership cho từng row
                  const owner = isOwner(row);

                  return (
                    <TableRow
                      key={row.id}
                      className={`group relative transition-all duration-300 border-b border-gray-100 hover:bg-blue-50/50 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <TableCell className="min-w-[80px] text-center py-4 px-6">
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                          disabled={loading}
                          className="transition-all duration-200"
                        />
                      </TableCell>

                      <TableCell className="min-w-[100px] py-4 px-6">
                        <div className="font-mono text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          #{row.id}
                        </div>
                      </TableCell>

                      <TableCell className="min-w-[250px] py-4 px-6">
                        <div
                          className="text-sm font-medium text-gray-800 leading-relaxed"
                          title={row.customer_name || "—"}
                        >
                          {row.customer_name || "—"}
                        </div>
                      </TableCell>

                      <TableCell className="min-w-[320px] py-4 px-6">
                        <div
                          className="text-sm text-gray-700 leading-relaxed"
                          title={getProductName(row)}
                        >
                          {getProductName(row)}
                        </div>
                      </TableCell>

                      <TableCell className="min-w-[100px] text-center py-4 px-6">
                        <span className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold text-gray-800 min-w-[40px]">
                          {row.quantity || 0}
                        </span>
                      </TableCell>

                      <TableCell className="min-w-[180px] text-right py-4 px-6">
                        <span className="font-mono font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          {(
                            (row.quantity || 0) * (row.unit_price || 0)
                          ).toLocaleString("vi-VN")}
                          đ
                        </span>
                      </TableCell>

                      <TableCell className="min-w-[180px] py-4 px-6">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                            row.status === "completed"
                              ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200"
                              : row.status === "pending"
                              ? "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200"
                              : row.status === "demand"
                              ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200"
                              : row.status === "quoted"
                              ? "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-200"
                              : row.status === "confirmed"
                              ? "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200"
                              : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200"
                          }`}
                        >
                          {row.status === "pending"
                            ? "⏳ Chờ xử lý"
                            : row.status === "completed"
                            ? "✅ Hoàn thành"
                            : row.status === "demand"
                            ? "📋 Yêu cầu"
                            : row.status === "quoted"
                            ? "💰 Báo giá"
                            : row.status === "confirmed"
                            ? "🎯 Xác nhận"
                            : row.status || "❓ Không xác định"}
                        </span>
                      </TableCell>

                      <TableCell className="min-w-[250px] py-4 px-6">
                        <div
                          className="text-sm text-gray-600 leading-relaxed"
                          title={row.reason || "—"}
                        >
                          {row.reason || "—"}
                        </div>
                      </TableCell>

                      <TableCell className="min-w-[140px] py-4 px-6">
                        <span className="text-sm text-gray-500 font-medium">
                          {row.hidden_at
                            ? new Date(row.hidden_at).toLocaleDateString(
                                "vi-VN"
                              )
                            : "—"}
                        </span>
                      </TableCell>

                      <TableCell className="min-w-[180px] py-4 px-6">
                        <div className="flex items-center gap-2">
                          {/* Button Hiện - THÊM ownership check */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSingleUnhide(row.id, row)}
                            disabled={loading || !owner}
                            className={`group relative overflow-hidden px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm ${
                              owner
                                ? "text-green-600 border-green-300 hover:border-green-400 bg-white hover:bg-green-50"
                                : "text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed"
                            }`}
                            title={
                              owner
                                ? "Hiện đơn hàng này"
                                : "Chỉ chủ sở hữu đơn hàng mới được thao tác"
                            }
                          >
                            <span className="flex items-center gap-1">
                              👁️ <span>Hiện</span>
                            </span>
                          </Button>

                          {/* Button Xóa - THÊM ownership check */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDeleteModal({ isOpen: true, orderDetail: row })
                            }
                            disabled={loading || !owner}
                            className={`group relative overflow-hidden px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm ${
                              owner
                                ? "text-red-600 border-red-300 hover:border-red-400 bg-white hover:bg-red-50"
                                : "text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed"
                            }`}
                            title={
                              owner
                                ? "Xóa vĩnh viễn đơn hàng này"
                                : "Chỉ chủ sở hữu đơn hàng mới được thao tác"
                            }
                          >
                            <span className="flex items-center gap-1">
                              🗑️ <span>Xóa</span>
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </PaginatedTable>

      {/* ✅ Enhanced Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
        confirmText="✨ Xác nhận"
        cancelText="❌ Hủy"
      />

      {/* ✅ Chỉ render khi có orderDetail */}
      {deleteModal.orderDetail && (
        <DeleteOrderDetailModal
          orderDetail={deleteModal.orderDetail}
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, orderDetail: null })}
          onConfirm={handleSingleDelete}
          loading={loading}
        />
      )}
    </>
  );
}
