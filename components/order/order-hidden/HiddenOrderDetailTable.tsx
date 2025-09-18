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
import { getAccessToken } from "@/lib/auth";

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
  isRestoring?: boolean;
  resetKey?: number;
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
  isRestoring = false,
  resetKey,
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
  const paginatedFilters: Filters = useMemo(() => {
    // Transform employee IDs back to composite format for PaginatedTable
    const employeeValues = filters.employees
      ? filters.employees.split(",").filter(Boolean).map((empId: string) => {
          // Find the department and user to reconstruct the composite value
          const foundUser = filterOptions.departments?.find((d: any) => 
            d.users?.some((user: any) => (user.value || user.id) == empId)
          );
          if (foundUser) {
            const foundUserObj = foundUser.users.find((user: any) => (user.value || user.id) == empId);
            return `${foundUser.id || foundUser.value || 'dept'}_${foundUserObj.value || foundUserObj.id}`;
          }
          return empId; // Fallback to original value
        })
      : [];

    return {
      search: filters.search || "",
      departments: filters.departments
        ? filters.departments.split(",").filter(Boolean)
        : [],
      roles: [],
      statuses: filters.status ? filters.status.split(",").filter(Boolean) : [],
      categories: [],
      brands: [],
  brandCategories: [], // ✅ bổ sung cho type Filters
      warningLevels: [],
      dateRange: filters.hiddenDateRange || { from: undefined, to: undefined },
      employees: employeeValues,
      zaloLinkStatuses: [],
    };
  }, [filters, filterOptions.departments]);

  // ✅ Handle filter changes from PaginatedTable với logic động
  const handleFilterChange = (newFilters: Filters) => {
    // Extract actual employee IDs from the composite values (dept_id format)
    const employeeIds = newFilters.employees.map(empValue => {
      if (typeof empValue === 'string' && empValue.includes('_')) {
        return empValue.split('_')[1]; // Get the user ID part after the underscore
      }
      return empValue;
    });

    // ✅ LOGIC MỚI: Khi chọn nhân viên → cập nhật phòng ban
    let finalDepartments = newFilters.departments;
    if (employeeIds.length > 0 && newFilters.departments.length === 0) {
      // Nếu chọn nhân viên nhưng chưa chọn phòng ban, tự động chọn phòng ban của nhân viên đó
      const selectedEmployeeDepartments = new Set<string>();
      employeeIds.forEach(empId => {
        const foundDept = filterOptions.departments?.find((d: any) => 
          d.users?.some((user: any) => (user.value || user.id) == empId)
        );
        if (foundDept) {
          selectedEmployeeDepartments.add(String(foundDept.id || foundDept.value));
        }
      });
      finalDepartments = Array.from(selectedEmployeeDepartments);
    }

    // ✅ LOGIC MỚI: Khi chọn phòng ban → cập nhật nhân viên (nếu cần)
    let finalEmployees = employeeIds;
    if (newFilters.departments.length > 0 && employeeIds.length === 0) {
      // Nếu chọn phòng ban nhưng chưa chọn nhân viên, giữ nguyên (không tự động chọn nhân viên)
      finalEmployees = [];
    } else if (newFilters.departments.length > 0 && employeeIds.length > 0) {
      // Nếu đã chọn cả phòng ban và nhân viên, lọc nhân viên theo phòng ban đã chọn
      const validEmployeeIds = new Set<string>();
      employeeIds.forEach(empId => {
        const foundDept = filterOptions.departments?.find((d: any) => 
          d.users?.some((user: any) => (user.value || user.id) == empId)
        );
        if (foundDept && newFilters.departments.includes(String(foundDept.id || foundDept.value))) {
          validEmployeeIds.add(String(empId));
        }
      });
      finalEmployees = Array.from(validEmployeeIds);
    }
    
    updateFilters({
      departments: finalDepartments.join(","),
      status: newFilters.statuses.join(","),
      employees: finalEmployees.join(","),
      hiddenDateRange: newFilters.dateRange,
      page: 1,
      search: newFilters.search || "",
    });
  };

  const handlePaginatedTableReset = () => {
    // Reset selections (create new Set to avoid mutating prop)
    if (selectedIds && typeof selectedIds === "object") {
      try {
        // If parent passed setSelectedIds, prefer calling it; otherwise we rely on refresh
        // But since this component only receives selectedIds Set, we'll trigger resetFilters in parent
      } catch (e) {
        // ignore
      }
    }
    // Call parent reset which will clear localStorage, state and notify children
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
      "STT",
      "ID",
      "Khách Hàng",
      "Nhân Viên",
      "Sản Phẩm",
      "Số Lượng",
      "Đơn Giá",
      "Tổng Tiền",
      "Trạng Thái",
      "Lý Do Ẩn",
      "Ngày Ẩn",
    ];

    const exportData = rows.map((row: any, idx: number) => [
      (filters.page - 1) * filters.pageSize + idx + 1,
      row.id ?? "--",
      row.customer_name || "--",
  (row?.order?.sale_by?.fullName || row?.order?.sale_by?.username || "--"),
      getProductName(row),
      row.quantity ?? "--",
      row.unit_price
        ? Number(row.unit_price).toLocaleString("vi-VN") + "₫"
        : "--",
      row.quantity && row.unit_price
        ? Number(row.quantity * row.unit_price).toLocaleString("vi-VN") + "₫"
        : "--",
      (() => {
        switch (row.status) {
          case "pending":
            return "Chờ xử lý";
          case "quoted":
            return "Chưa chốt";
          case "completed":
            return "Đã chốt";
          case "demand":
            return "Nhu cầu";
          case "confirmed":
            return "Đã phản hồi";
          default:
            return "--";
        }
      })(),
      row.reason || "--",
      row.hidden_at
        ? (() => {
            const d =
              typeof row.hidden_at === "string"
                ? new Date(row.hidden_at)
                : row.hidden_at instanceof Date
                ? row.hidden_at
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
  };

  // ✅ Export all data function
  const getExportAllData = async () => {
    const params = new URLSearchParams();
    params.append("page", "1");
    params.append("pageSize", "1000000");
    if (filters.search?.trim()) params.append("search", filters.search.trim());
    if (filters.employees?.trim()) params.append("employees", filters.employees.trim());
    if (filters.departments?.trim()) params.append("departments", filters.departments.trim());
    if (filters.status?.trim()) params.append("status", filters.status.trim());
    if (filters.sortField) params.append("sortField", filters.sortField);
    if (filters.sortDirection) params.append("sortDirection", filters.sortDirection);

    // Hidden date range
    if (filters.hiddenDateRange?.from && filters.hiddenDateRange?.to) {
      params.append(
        "hiddenDateRange",
        JSON.stringify({
          start: filters.hiddenDateRange.from.toISOString().split("T")[0],
          end: filters.hiddenDateRange.to.toISOString().split("T")[0],
        })
      );
    }

    const token = getAccessToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/order-details/hidden?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!res.ok) throw new Error(`Failed to fetch all hidden orders for export: ${res.status}`);
    const result = await res.json();
    const list = Array.isArray(result.data) ? result.data : [];

    // Map to the same shape as getExportData()
    const rows = list.map((row: any, idx: number) => [
      idx + 1,
      row.id ?? "--",
      row.customer_name || "--",
  (row?.order?.sale_by?.fullName || row?.order?.sale_by?.username || "--"),
      getProductName(row),
      row.quantity ?? "--",
      row.unit_price
        ? Number(row.unit_price).toLocaleString("vi-VN") + "₫"
        : "--",
      row.quantity && row.unit_price
        ? Number(row.quantity * row.unit_price).toLocaleString("vi-VN") + "₫"
        : "--",
      (() => {
        switch (row.status) {
          case "pending":
            return "Chờ xử lý";
          case "quoted":
            return "Chưa chốt";
          case "completed":
            return "Đã chốt";
          case "demand":
            return "Nhu cầu";
          case "confirmed":
            return "Đã phản hồi";
          default:
            return "--";
        }
      })(),
      row.reason || "--",
      row.hidden_at
        ? (() => {
            const d =
              typeof row.hidden_at === "string"
                ? new Date(row.hidden_at)
                : row.hidden_at instanceof Date
                ? row.hidden_at
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
        <TableCell className="min-w-[160px] py-4 px-6">
          <Skeleton className="h-4 w-24 rounded-lg animate-pulse" />
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
        key={resetKey !== undefined ? String(resetKey) : undefined}
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
        availableDepartments={useMemo(() => {
          // ✅ LOGIC MỚI: Lọc phòng ban theo nhân viên đã chọn
          if (filters.employees && filters.employees.trim()) {
            const selectedEmpIds = filters.employees.split(',').filter(Boolean);
            const selectedDeptIds = new Set<string>();
            
            selectedEmpIds.forEach((empId: string) => {
              const foundDept = filterOptions.departments?.find((d: any) => 
                d.users?.some((user: any) => (user.value || user.id) == empId)
              );
              if (foundDept) {
                selectedDeptIds.add(String(foundDept.id || foundDept.value));
              }
            });
            
            return filterOptions.departments
              ?.filter((d: any) => selectedDeptIds.has(String(d.id || d.value)))
              ?.map((d: any) => ({
                label: d.label,
                value: String(d.id || d.value)
              })) || [];
          }
          // Nếu không chọn nhân viên nào, hiển thị tất cả phòng ban
          return filterOptions.departments?.map((d: any) => ({
            label: d.label,
            value: String(d.id || d.value)
          })) || [];
        }, [filterOptions.departments, filters.employees])}
        availableStatuses={[
          { value: "pending", label: "Chờ xử lý" },
          { value: "completed", label: "Hoàn thành" },
          { value: "demand", label: "Yêu cầu" },
          { value: "quoted", label: "Báo giá" },
          { value: "confirmed", label: "Xác nhận" },
        ]}
        availableEmployees={useMemo(() => {
          // ✅ LOGIC MỚI: Lọc nhân viên theo phòng ban đã chọn
          if (filters.departments && filters.departments.trim()) {
            const selectedDeptIds = filters.departments.split(',').filter(Boolean);
            return filterOptions.departments
              ?.filter((d: any) => selectedDeptIds.includes(String(d.id || d.value)))
              ?.flatMap((d: any) => 
                d.users?.map((user: any) => ({
                  value: `${d.id || d.value || 'dept'}_${user.value || user.id}`,
                  label: user.label || user.fullName || user.username
                })) || []
              ) || [];
          }
          // Nếu không chọn phòng ban nào, hiển thị tất cả nhân viên
          return filterOptions.departments?.flatMap((d: any) => 
            d.users?.map((user: any) => ({
              value: `${d.id || d.value || 'dept'}_${user.value || user.id}`,
              label: user.label || user.fullName || user.username
            })) || []
          ) || [];
        }, [filterOptions.departments, filters.departments])}
        dateRangeLabel="Ngày ẩn"
        page={filters.page}
        pageSize={filters.pageSize}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
  initialFilters={paginatedFilters}
  // When parent indicates a restoring/reset action, force the PaginatedTable to clear internal UI
  isRestoring={isRestoring}
        onFilterChange={handleFilterChange}
        onDateRangeValidationError={(message) => onAlert("warning", message)}
        loading={loading}
        canExport={true}
        getExportData={getExportData}
        getExportAllData={getExportAllData}
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
                <TableHead className="min-w-[160px] font-bold text-sm text-blue-800 tracking-wide sticky top-0 bg-blue-100 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block animate-bounce text-xs"
                      style={{ animationDelay: "0.05s" }}
                    >
                      👤
                    </span>
                    <span>Nhân viên</span>
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
                    <TableCell colSpan={11} className="text-center py-20">
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

                      <TableCell className="min-w-[160px] py-4 px-6">
                        <div className="text-sm text-gray-700" title={(row?.order?.sale_by?.fullName || row?.order?.sale_by?.username) ?? "—"}>
                          {row?.order?.sale_by?.fullName || row?.order?.sale_by?.username || "—"}
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
