"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { OrderDetail } from "@/types"; // ✅ Thay đổi từ Order thành OrderDetail
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { useOrders } from "@/hooks/useOrders";
import PaginatedTable, {
  Filters,
} from "@/components/ui/pagination/PaginatedTable";
import OrderManagement from "@/components/order/manager-order/OrderManagement";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrderPermissions } from "@/hooks/useOrderPermissions";

export default function ManagerOrderPage() {
  const [alert, setAlert] = useState<{
    type: "success" | "error";
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
    refetch,
    resetFilters,
    getFilterOptions,
    updateOrderDetail,
    deleteOrderDetail, // ✅ Thay đổi từ deleteOrder thành deleteOrderDetail
    isLoading,
    error,
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
    { value: "completed", label: "Đã hoàn thành" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "demand", label: "Nhu cầu" },
    { value: "quoted", label: "Đã báo giá" },
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
      const searchValue = paginatedFilters.search || "";
      setSearch(searchValue);

      // Update status (take first status from array)
      const statusValue =
        paginatedFilters.statuses.length > 0
          ? paginatedFilters.statuses[0].toString()
          : "";
      setStatus(statusValue);

      // Update single date
      if (paginatedFilters.singleDate) {
        const dateStr =
          paginatedFilters.singleDate instanceof Date
            ? paginatedFilters.singleDate.toLocaleDateString("en-CA")
            : paginatedFilters.singleDate.toString();
        setDate(dateStr);
      } else {
        setDate("");
      }

      // Update date range
      if (paginatedFilters.dateRange?.from && paginatedFilters.dateRange?.to) {
        const dateRange = {
          start: paginatedFilters.dateRange.from.toLocaleDateString("en-CA"),
          end: paginatedFilters.dateRange.to.toLocaleDateString("en-CA"),
        };
        setDateRange(dateRange);
      } else {
        setDateRange(undefined);
      }

      // Update employees
      const employeesValue =
        paginatedFilters.employees.length > 0
          ? paginatedFilters.employees.join(",")
          : "";
      setEmployees(employeesValue);

      // Update departments
      const departmentsValue =
        paginatedFilters.departments.length > 0
          ? paginatedFilters.departments.join(",")
          : "";
      setDepartments(departmentsValue);

      // Update products/categories (using categories for products)
      const productsValue =
        paginatedFilters.categories.length > 0
          ? paginatedFilters.categories.join(",")
          : "";
      setProducts(productsValue);

      if (paginatedFilters.warningLevels.length > 0) {
        const selectedWarningLevels = paginatedFilters.warningLevels.map(
          (warningLabel) => {
            const foundOption = warningLevelOptions.find(
              (opt) => opt.label === warningLabel
            );
            return foundOption ? foundOption.value : warningLabel;
          }
        );
        const warningLevelValue = selectedWarningLevels.join(",");
        setWarningLevel(warningLevelValue);
      } else {
        setWarningLevel(""); // ✅ Clear when empty
      }

      setPage(1);
    },
    [
      setSearch,
      setStatus,
      setDate,
      setDateRange,
      setEmployees,
      setDepartments,
      setProducts,
      setWarningLevel,
      setPage,
    ]
  );

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

  const handleReload = useCallback(() => {
    refetch();
  }, [refetch]);

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
                      return "Đã báo giá";
                    case "completed":
                      return "Đã hoàn thành";
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
              loading={isLoading}
            />
          </PaginatedTable>
        </CardContent>
      </Card>
    </div>
  );
}
