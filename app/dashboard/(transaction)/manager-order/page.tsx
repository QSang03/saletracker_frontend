"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { OrderDetail } from "@/types"; // ✅ Thay đổi từ Order thành OrderDetail
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { useOrders } from "@/hooks/useOrders";
import type { OrderFilters } from "@/hooks/useOrders"; // ✅ Import OrderFilters type
import PaginatedTable, {
  Filters,
} from "@/components/ui/pagination/PaginatedTable";
import OrderManagement from "@/components/order/manager-order/OrderManagement";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrderPermissions } from "@/hooks/useOrderPermissions";
import { CustomerSearchIndicator } from "@/components/order/manager-order/CustomerSearchIndicator";
import { ServerResponseAlert, type AlertType } from "@/components/ui/loading/ServerResponseAlert";

// Component that uses useSearchParams - needs to be wrapped in Suspense
function ManagerOrderContent() {
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  const [filterOptions, setFilterOptions] = useState<{
    departments: Array<{
      value: number;
      label: string;
      users: Array<{ value: number; label: string }>;
    }>;
    products: Array<{ value: number; label: string }>;
  }>({ departments: [], products: [] });

  const { canExportInDepartment, user } = useDynamicPermission();
  const {
    orders,
    total,
    filters,
    setFilters,
    setPage,
    setPageSize,
    setSearch,
    setStatus,
    setDate,
    setDateRange,
    setEmployee,
    setEmployees,
    setDepartments,
    setProducts,
    setWarningLevel,
    setSortField,
    setSortDirection,
    refetch,
    resetFilters,
    getFilterOptions,
    updateOrderDetail,
    updateOrderDetailCustomerName,
    deleteOrderDetail, // ✅ Thay đổi từ deleteOrder thành deleteOrderDetail
    bulkDeleteOrderDetails,
    bulkExtendOrderDetails,
    bulkAddNotesOrderDetails,
    isLoading,
    error,

    // ✅ Customer search navigation
    performCustomerSearch,
    restorePreviousState,
    isInCustomerSearchMode,
    setIsInCustomerSearchMode,
    canGoBack,
    isRestoring,
  } = useOrders();

  const {
    canAccessOrderManagement,
    canCreateOrder,
    canImportOrder,
    canExportOrder,
    user: orderPermissionsUser,
  } = useOrderPermissions();
  // Available options for filters
  const statusOptions = [
    { value: "completed", label: "Đã chốt" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "demand", label: "Nhu cầu" },
    { value: "quoted", label: "Chưa chốt" },
  ];

  const warningLevelOptions = [
    { value: "1", label: "Cảnh báo 1 (Ngày cuối)" },
    { value: "2", label: "Cảnh báo 2" },
    { value: "3", label: "Cảnh báo 3" },
    { value: "4", label: "Bình thường" },
  ];

  // Lấy danh sách nhân viên từ filter options
  const allEmployeeOptions = filterOptions.departments.reduce((acc, dept) => {
    dept.users.forEach((user) => {
      if (!acc.find((emp) => emp.value === user.value.toString())) {
        acc.push({ label: user.label, value: user.value.toString() });
      }
    });
    return acc;
  }, [] as { label: string; value: string }[]);

  // ✅ Filter employees theo departments đã chọn
  const filteredEmployeeOptions = useMemo(() => {
    if (!filters.departments || filters.departments === "") {
      return allEmployeeOptions; // Nếu không chọn department nào, hiển thị tất cả
    }

    const selectedDepartmentIds = filters.departments
      .split(",")
      .filter((d) => d);
    if (selectedDepartmentIds.length === 0) {
      return allEmployeeOptions;
    }

    // Lọc employees theo departments đã chọn
    const filtered = filterOptions.departments
      .filter((dept) => selectedDepartmentIds.includes(dept.value.toString()))
      .reduce((acc, dept) => {
        dept.users.forEach((user) => {
          if (!acc.find((emp) => emp.value === user.value.toString())) {
            acc.push({ label: user.label, value: user.value.toString() });
          }
        });
        return acc;
      }, [] as { label: string; value: string }[]);

    return filtered;
  }, [filters.departments, filterOptions.departments, allEmployeeOptions]);

  const departmentOptions = filterOptions.departments.map((dept) => ({
    label: dept.label,
    value: dept.value.toString(),
  }));

  const productOptions = filterOptions.products.map((product) => ({
    label: product.label,
    value: product.value.toString(),
  }));

  // Convert PaginatedTable filters to useOrders filters
  const handleFilterChange = useCallback(
    (paginatedFilters: Filters) => {
      
      const shouldResetPage = !isInCustomerSearchMode && !filters.search;

      // ✅ Build new filters object với tất cả changes cùng lúc
      const searchValue = paginatedFilters.search || "";
      const statusValue = paginatedFilters.statuses.length > 0 ? paginatedFilters.statuses[0].toString() : "";
      
      // Handle single date
      let dateValue = "";
      if (paginatedFilters.singleDate) {
        dateValue = paginatedFilters.singleDate instanceof Date
          ? paginatedFilters.singleDate.toLocaleDateString("en-CA")
          : paginatedFilters.singleDate.toString();
      }

      // Handle date range
      let dateRangeValue: { start: string; end: string } | undefined;
      if (paginatedFilters.dateRange?.from && paginatedFilters.dateRange?.to) {
        dateRangeValue = {
          start: paginatedFilters.dateRange.from.toLocaleDateString("en-CA"),
          end: paginatedFilters.dateRange.to.toLocaleDateString("en-CA"),
        };
      }

      // Handle employees
      const employeesValue = paginatedFilters.employees.length > 0 ? paginatedFilters.employees.join(",") : "";
      
      // Handle departments
      const departmentsValue = paginatedFilters.departments.length > 0 ? paginatedFilters.departments.join(",") : "";
      
      // Handle products/categories
      const productsValue = paginatedFilters.categories.length > 0 ? paginatedFilters.categories.join(",") : "";
      
      // Handle warning levels
      let warningLevelValue = "";
      if (paginatedFilters.warningLevels.length > 0) {
        const selectedWarningLevels = paginatedFilters.warningLevels.map(
          (warningLabel) => {
            const foundOption = warningLevelOptions.find(
              (opt) => opt.label === warningLabel
            );
            return foundOption ? foundOption.value : warningLabel;
          }
        );
        warningLevelValue = selectedWarningLevels.join(",");
      }

      // ✅ Build complete new filters object
      const newFilters: Partial<OrderFilters> = {
        search: searchValue,
        status: statusValue,
        date: dateValue,
        dateRange: dateRangeValue,
        employees: employeesValue,
        departments: departmentsValue,
        products: productsValue,
        warningLevel: warningLevelValue,
        page: shouldResetPage ? 1 : filters.page,
      };
      
      // ✅ Apply tất cả filters chỉ với 1 lần gọi
      setFilters(newFilters);
    },
    [
      setFilters,
      isInCustomerSearchMode,
      filters.search,
      filters.page,
      warningLevelOptions,
    ]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      // Không cần clear customer search mode nữa vì browser history sẽ handle
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

  // ✅ Cập nhật handleEdit - nhận OrderDetail và data
  const handleEdit = useCallback(
    async (orderDetail: OrderDetail, data: any) => {
      try {
        await updateOrderDetail(Number(orderDetail.id), {
          status: data.status,
          unit_price: data.unit_price,
          customer_request_summary: data.customer_request_summary,
          extended: data.extended,
          notes: data.notes,
        });

        setAlert({
          type: "success",
          message: "Cập nhật order detail thành công!",
        });
        refetch();
      } catch (err) {
        console.error("Error updating order detail:", err);
        setAlert({ type: "error", message: "Lỗi khi cập nhật order detail!" });
      }
    },
    [updateOrderDetail, refetch]
  );

  // ✅ Cập nhật handleDelete - chỉ nhận OrderDetail và reason
  const handleDelete = useCallback(
    async (orderDetail: OrderDetail, reason: string) => {
      if (!confirm("Bạn có chắc chắn muốn xóa order detail này?")) return;

      try {
        await deleteOrderDetail(Number(orderDetail.id));
        setAlert({ type: "success", message: "Xóa order detail thành công!" });
        refetch();
      } catch (err) {
        console.error("Error deleting order detail:", err);
        setAlert({ type: "error", message: "Lỗi khi xóa order detail!" });
      }
    },
    [deleteOrderDetail, refetch]
  ); // ✅ Thay đổi dependency

  // ✅ Handle bulk delete
  const handleBulkDelete = useCallback(
    async (orderDetails: OrderDetail[], reason: string) => {
      try {
        const ids = orderDetails.map(od => Number(od.id));
        await bulkDeleteOrderDetails(ids, reason);
        setAlert({ type: "success", message: `Đã xóa ${orderDetails.length} đơn hàng thành công!` });
        refetch();
      } catch (err) {
        console.error("Error bulk deleting order details:", err);
        setAlert({ type: "error", message: "Lỗi khi xóa nhiều đơn hàng!" });
      }
    },
    [bulkDeleteOrderDetails, refetch]
  );

  // ✅ Handle bulk extend
  const handleBulkExtend = useCallback(
    async (orderDetails: OrderDetail[]) => {
      try {
        const ids = orderDetails.map(od => Number(od.id));
        await bulkExtendOrderDetails(ids);
        setAlert({ type: "success", message: `Đã gia hạn ${orderDetails.length} đơn hàng thành công!` });
        refetch();
      } catch (err) {
        console.error("Error bulk extending order details:", err);
        setAlert({ type: "error", message: "Lỗi khi gia hạn nhiều đơn hàng!" });
      }
    },
    [bulkExtendOrderDetails, refetch]
  );

  // ✅ Handle bulk notes
  const handleBulkNotes = useCallback(
    async (orderDetails: OrderDetail[], notes: string) => {
      try {
        const ids = orderDetails.map(od => Number(od.id));
        await bulkAddNotesOrderDetails(ids, notes);
        setAlert({ type: "success", message: `Đã cập nhật ghi chú cho ${orderDetails.length} đơn hàng thành công!` });
        refetch();
      } catch (err) {
        console.error("Error bulk adding notes to order details:", err);
        setAlert({ type: "error", message: "Lỗi khi cập nhật ghi chú nhiều đơn hàng!" });
      }
    },
    [bulkAddNotesOrderDetails, refetch]
  );

  // ✅ Handle edit customer name
  const handleEditCustomerName = useCallback(
    async (orderDetail: OrderDetail, newCustomerName: string) => {
      try {
        await updateOrderDetailCustomerName(Number(orderDetail.id), newCustomerName, orderDetail);
        setAlert({ type: "success", message: "Đã cập nhật tên khách hàng thành công!" });
        refetch();
      } catch (err) {
        console.error("Error updating customer name:", err);
        setAlert({ type: "error", message: "Lỗi khi cập nhật tên khách hàng!" });
      }
    },
    [updateOrderDetailCustomerName, refetch]
  );

  const handleReload = useCallback(() => {
    refetch();
  }, [refetch]);

  // ✅ Handle search từ double-click tên khách hàng
  const handleSearch = useCallback(
    (searchTerm: string) => {
      performCustomerSearch(searchTerm);
    },
    [performCustomerSearch]
  );

  // ✅ Handle restore previous state
  const handleRestorePrevious = useCallback(async () => {
    await restorePreviousState();
  }, [restorePreviousState]);

  // ✅ Handle sort từ OrderManagement
  const handleSort = useCallback(
    (
      field: "quantity" | "unit_price" | null,
      direction: "asc" | "desc" | null
    ) => {
      setSortField(field);
      setSortDirection(direction);
      setPage(1); // Reset về page 1 khi sort
    },
    [setSortField, setSortDirection, setPage]
  );

  // Effects
  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: error });
    }
  }, [error]);

  // ✅ Clear employees when departments change
  useEffect(() => {
    if (filters.departments && filters.employees) {
      // Kiểm tra xem có employees nào không thuộc departments đã chọn không
      const selectedDepartmentIds = filters.departments
        .split(",")
        .filter((d) => d);
      const selectedEmployeeIds = filters.employees.split(",").filter((e) => e);

      if (selectedDepartmentIds.length > 0 && selectedEmployeeIds.length > 0) {
        // Lấy danh sách valid employees từ departments đã chọn
        const validEmployeeIds = filterOptions.departments
          .filter((dept) =>
            selectedDepartmentIds.includes(dept.value.toString())
          )
          .reduce((acc, dept) => {
            dept.users.forEach((user) => {
              acc.add(user.value.toString());
            });
            return acc;
          }, new Set<string>());

        // Lọc bỏ employees không hợp lệ
        const validSelectedEmployees = selectedEmployeeIds.filter((empId) =>
          validEmployeeIds.has(empId)
        );

        if (validSelectedEmployees.length !== selectedEmployeeIds.length) {
          // Có employees không hợp lệ, cần cập nhật
          setEmployees(validSelectedEmployees.join(","));
        }
      }
    }
  }, [
    filters.departments,
    filterOptions.departments,
    filters.employees,
    setEmployees,
  ]);

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
      } catch (err) {
        console.error("Error loading filter options:", err);
      }
    };

    loadFilterOptions();
  }, [getFilterOptions]);

  // Auto hide alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // ✅ Handle browser back/forward navigation for customer search
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isInCustomerSearchMode && canGoBack) {
        // Prevent default browser back behavior
        event.preventDefault();

        // Restore previous state instead
        handleRestorePrevious();
      }
    };

    if (isInCustomerSearchMode) {
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [isInCustomerSearchMode, canGoBack, handleRestorePrevious]);

  // Memoize initialFilters để tránh tạo object mới liên tục
  const memoizedInitialFilters = useMemo(() => {
    const mappedWarningLevels = (() => {
      if (!filters.warningLevel) return [];
      const levels = filters.warningLevel
        .split(",")
        .filter((w) => w)
        .map((value) => {
          const foundOption = warningLevelOptions.find(
            (opt) => opt.value === value
          );
          return foundOption ? foundOption.label : value;
        });
      return levels;
    })();

    const result = {
      search: filters.search || "",
      departments: filters.departments
        ? filters.departments.split(",").filter((d) => d)
        : [],
      roles: [],
      statuses: filters.status ? [filters.status] : [],
      categories: filters.products
        ? filters.products.split(",").filter((p) => p)
        : [], // Products
      brands: [], // Không sử dụng brands nữa
      warningLevels: mappedWarningLevels, // Mức độ cảnh báo
      dateRange:
        filters.dateRange && filters.dateRange.start && filters.dateRange.end
          ? {
              from: new Date(filters.dateRange.start),
              to: new Date(filters.dateRange.end),
            }
          : { from: undefined, to: undefined },
      singleDate: filters.date ? new Date(filters.date) : undefined,
      employees: filters.employees
        ? filters.employees.split(",").filter((e) => e)
        : [],
    };

    return result;
  }, [
    filters.search,
    filters.departments,
    filters.status,
    filters.products,
    filters.warningLevel,
    filters.dateRange?.start,
    filters.dateRange?.end,
    filters.date,
    filters.employees,
    JSON.stringify(warningLevelOptions), // Include warningLevelOptions to handle mapping changes
  ]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden relative">
      {alert && (
        <div
          className={`mb-4 p-4 rounded-lg border ${
            alert.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{alert.message}</span>
            <button
              onClick={() => setAlert(null)}
              className="ml-2 text-xl font-bold hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ✅ Customer Search Indicator */}
      {isInCustomerSearchMode && filters.search && (
        <CustomerSearchIndicator
          customerName={filters.search}
          onRestorePrevious={handleRestorePrevious}
          onClearSearch={() => {
            // Clear search and exit customer search mode
            setSearch("");
            handleRestorePrevious(); // Or just restore to previous state
          }}
          className="mb-4"
        />
      )}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            📦 Quản lý đơn hàng
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleReload}
              className="text-sm"
            >
              🔄 Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch={true}
            enableStatusFilter={true}
            enableSingleDateFilter={true}
            enableDateRangeFilter={true}
            enableEmployeeFilter={true}
            enableDepartmentFilter={true}
            enableCategoriesFilter={true} // Sử dụng cho products
            enableWarningLevelFilter={true} // Thêm warning level filter
            enablePageSize={true}
            availableStatuses={statusOptions}
            availableEmployees={filteredEmployeeOptions}
            availableDepartments={departmentOptions}
            availableCategories={productOptions} // Products mapped to categories
            availableWarningLevels={warningLevelOptions} // Thay thế availableBrands
            singleDateLabel="Ngày tạo đơn"
            dateRangeLabel="Khoảng thời gian"
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onResetFilter={handleResetFilter}
            isRestoring={isRestoring}
            loading={isLoading}
            canExport={
              canExportInDepartment &&
              canExportInDepartment(user?.departments?.[0]?.slug || "")
            }
            getExportData={() => ({
              headers: [
                "STT",
                "Mã Đơn",
                "Gia Hạn",
                "Thời Gian Tạo Đơn Hàng",
                "Tên Nhân Viên",
                "Tên Khách Hàng",
                "Tên Mặt Hàng",
                "Số Lượng",
                "Đơn Giá",
                "Trạng Thái",
                "Ghi Chú",
              ],
              data: orders.map((orderDetail, idx) => [
                idx + 1,
                orderDetail.id ?? "--",
                orderDetail.extended ?? "--",
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
                orderDetail.order?.sale_by?.fullName ||
                  orderDetail.order?.sale_by?.username ||
                  "--",
                orderDetail.customer_name || "--",
                orderDetail.raw_item || "--",
                orderDetail.quantity ?? "--",
                orderDetail.unit_price
                  ? Number(orderDetail.unit_price).toLocaleString("vi-VN") + "₫"
                  : "--",
                // Map trạng thái
                (() => {
                  switch (orderDetail.status) {
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
                orderDetail.notes || "--",
              ]),
            })}
            initialFilters={memoizedInitialFilters}
          >
            <OrderManagement
              orders={orders}
              expectedRowCount={filters.pageSize}
              startIndex={(filters.page - 1) * filters.pageSize}
              onReload={handleReload}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onEditCustomerName={handleEditCustomerName}
              onBulkDelete={handleBulkDelete}
              onBulkExtend={handleBulkExtend}
              onBulkNotes={handleBulkNotes}
              onSearch={handleSearch}
              onSort={handleSort}
              currentSortField={filters.sortField}
              currentSortDirection={filters.sortDirection}
              loading={isLoading}
            />
          </PaginatedTable>
        </CardContent>
      </Card>

      {/* ✅ Alert notifications */}
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
function ManagerOrderLoading() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý đơn hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Đang tải...</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component with Suspense boundary
export default function ManagerOrderPage() {
  return (
    <Suspense fallback={<ManagerOrderLoading />}>
      <ManagerOrderContent />
    </Suspense>
  );
}
