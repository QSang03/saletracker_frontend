"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { flushSync } from "react-dom";
import { OrderDetail } from "@/types";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { useOrders } from "@/hooks/useOrders";
import type { OrderFilters } from "@/hooks/useOrders";
import { useAnalysisBlock } from "@/hooks/useAnalysisBlock";
import PaginatedTable, {
  Filters,
} from "@/components/ui/pagination/PaginatedTable";
import OrderManagement from "@/components/order/manager-order/OrderManagement";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCustomerCount } from "@/hooks/useCustomerCount";
import { CustomerListDialog } from "@/components/order/manager-order/CustomerListDialog";
import { useOrderPermissions } from "@/hooks/useOrderPermissions";
import { CustomerSearchIndicator } from "@/components/order/manager-order/CustomerSearchIndicator";
import InquiryPresetsModal from "@/components/order/manager-order/InquiryPresetsModal";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import { getAccessToken } from "@/lib/auth";
import { MessageCircle } from "lucide-react";

// Helper function để tính toán gia hạn động
const calculateDynamicExtended = (
  createdAt: string | Date | undefined,
  originalExtended: number | undefined
): number | string => {
  if (!createdAt || !originalExtended) return "--";

  try {
    const createdDate =
      typeof createdAt === "string" ? new Date(createdAt) : createdAt;

    if (isNaN(createdDate.getTime())) return "--";

    // Ngày hết hạn = ngày tạo + extended (theo ngày thực tế)
    const expiredDate = new Date(createdDate);
    expiredDate.setHours(0, 0, 0, 0);
    expiredDate.setDate(expiredDate.getDate() + originalExtended);

    // Ngày hiện tại (bỏ giờ)
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Số ngày còn lại (có thể âm nếu đã hết hạn)
    const diffMs = expiredDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.error("Error calculating dynamic extended:", error);
    return originalExtended ?? "--";
  }
};

// Component that uses useSearchParams - needs to be wrapped in Suspense
function ManagerOrderContent() {
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // ✅ Thêm state để lưu vị trí scroll và page
  const [preservedState, setPreservedState] = useState<{
    scrollPosition: number;
    currentPage: number;
  } | null>(null);

  // Inquiry Presets modal state
  const [isInquiryPresetsModalOpen, setIsInquiryPresetsModalOpen] =
    useState(false);

  const [filterOptions, setFilterOptions] = useState<{
    departments: Array<{
      value: number;
      label: string;
      users: Array<{ value: number; label: string }>;
    }>;
    products: Array<{ value: number; label: string }>;
  }>({ departments: [], products: [] });

  const {
    canExportInDepartment,
    user,
    isPM,
    isManager,
    isAnalysisRole,
    isAdmin,
  } = useDynamicPermission();
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
    setProductCode,
    setSortField,
    setSortDirection,
    refetch,
    forceFetch, // ✅ Thêm forceFetch để bypass debounce
    resetFilters,
    getFilterOptions,
    updateOrderDetail,
    updateOrderDetailCustomerName,
    deleteOrderDetail, // ✅ Thay đổi từ deleteOrder thành deleteOrderDetail
    bulkDeleteOrderDetails,
    bulkExtendOrderDetails,
    bulkAddNotesOrderDetails,
    bulkHideOrderDetails,
    addToBlacklist,
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

  // Analysis block hook
  const { addAnalysisBlock, checkContactBlocked } = useAnalysisBlock();

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

  // ✅ SỬA: Xác định xem user có phải là PM đơn thuần (không có manager)
  // User có cả PM và Manager thì xem như Manager, không phải PM
  const isPMUser = isPM && !isManager;

  // 💡 Hiển thị số lượng khách hàng ở tiêu đề
  // PM users chỉ thấy số lượng khách hàng của chính họ
  // User có cả PM và Manager thì xem như Manager (không bị giới hạn)
  const customerCountFilters = useMemo(() => {
    // ✅ Tối ưu: Chỉ tạo object mới khi thực sự cần thiết
    const isCountingSales =
      isInCustomerSearchMode ||
      (filters.search && String(filters.search).trim() !== "");

    return {
      fromDate: filters.dateRange?.start,
      toDate: filters.dateRange?.end,
      employeeId: isPMUser
        ? user?.id
        : filters.employees
        ? Number(filters.employees.split(",")[0])
        : undefined,
      departmentId: isPMUser
        ? undefined // PM user không cần department
        : filters.departments
        ? Number(filters.departments.split(",")[0])
        : undefined,
      // Forward all filters from manager
      search: filters.search,
      status: filters.status,
      date: filters.date,
      dateRange: filters.dateRange,
      employee: filters.employee,
      employees: isPMUser
        ? user?.id
          ? String(user.id)
          : undefined
        : filters.employees,
      departments: isPMUser
        ? undefined // PM user không cần department
        : filters.departments,
      products: filters.products,
      warningLevel: filters.warningLevel,
      quantity:
        typeof filters.quantity === "number"
          ? String(filters.quantity)
          : filters.quantity,
      // If we are in customer search mode (badge triggered by selecting a customer),
      // show countMode 'sale' to count sales instead of unique customers while customer filter is active.
      // If user is in customer-search mode or there is a customer search text, count sales instead of customers
      countMode: isCountingSales ? "sale" : "customer",
    };
  }, [
    filters.dateRange?.start,
    filters.dateRange?.end,
    filters.employees,
    filters.departments,
    filters.search,
    filters.status,
    filters.date,
    filters.dateRange, // ✅ Bỏ JSON.stringify để tránh tạo object mới
    filters.employee,
    filters.products,
    filters.warningLevel,
    filters.quantity,
    isPMUser,
    user?.id,
    isInCustomerSearchMode, // ✅ Thêm dependency này
  ]);

  const {
    count: customerCount,
    loading: customerCountLoading,
    error: customerCountError,
  } = useCustomerCount(customerCountFilters);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  // Badge label depends on whether we're counting sales (sale) or customers
  const isCountingSales =
    isInCustomerSearchMode ||
    (filters.search && String(filters.search).trim() !== "");
  const customerCountLabel = isCountingSales ? "nhân viên" : "khách hàng";
  // Toggle: admin may include hidden items when exporting
  const [includeHiddenExport, setIncludeHiddenExport] = useState(false);

  // Lấy danh sách nhân viên từ filter options
  const allEmployeeOptions = filterOptions.departments.reduce((acc, dept) => {
    if (!dept || !Array.isArray((dept as any).users)) return acc;
    (dept as any).users.forEach((user: any) => {
      try {
        if (!user) return;
        const rawValue = user.value ?? user.id ?? user.value?.toString?.();
        if (rawValue === undefined || rawValue === null) return;
        const value = String(rawValue);
        const label = (user.label ?? user.fullName ?? user.name ?? value) + "";
        if (!acc.find((emp) => emp.value === value)) {
          acc.push({ label, value });
        }
      } catch (e) {
        // ignore malformed user entries
      }
    });
    return acc;
  }, [] as { label: string; value: string }[]);

  // ✅ Filter employees theo departments đã chọn
  const filteredEmployeeOptions = useMemo(() => {
    // Nếu user là PM, không hiển thị employees khác
    if (isPMUser) {
      return [];
    }

    if (
      !filters.departments ||
      typeof filters.departments !== "string" ||
      filters.departments === ""
    ) {
      return allEmployeeOptions; // Nếu không chọn department nào, hiển thị tất cả
    }

    const selectedDepartmentIds = String(filters.departments)
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d);
    if (selectedDepartmentIds.length === 0) {
      return allEmployeeOptions;
    }

    // Lọc employees theo departments đã chọn
    const filtered = filterOptions.departments
      .filter(
        (dept) => dept && selectedDepartmentIds.includes(String(dept.value))
      )
      .reduce((acc, dept) => {
        dept.users.forEach((user) => {
          if (!acc.find((emp) => emp.value === user.value.toString())) {
            acc.push({ label: user.label, value: user.value.toString() });
          }
        });
        return acc;
      }, [] as { label: string; value: string }[]);

    return filtered;
  }, [
    filters.departments,
    filterOptions.departments,
    allEmployeeOptions,
    isPMUser,
  ]);

  // Dynamic department options: when employees are selected, only include departments that contain those employees (like blacklist behavior)
  const departmentOptions = useMemo(() => {
    if (isPMUser) return [];
    const all = filterOptions.departments.map((d) => ({
      label: d.label,
      value: d.value.toString(),
      users: d.users,
    }));
    if (!filters.employees || filters.employees.trim() === "") {
      return all.map(({ label, value }) => ({ label, value }));
    }
    const selectedEmployeeIds = filters.employees.split(",").filter((e) => e);
    if (selectedEmployeeIds.length === 0)
      return all.map(({ label, value }) => ({ label, value }));
    const subset = all.filter((dept) =>
      dept.users.some((u) => selectedEmployeeIds.includes(String(u.value)))
    );
    return subset.map(({ label, value }) => ({ label, value }));
  }, [isPMUser, filterOptions.departments, filters.employees]);

  const productOptions = filterOptions.products.map((product) => ({
    label: product.label,
    value: product.value.toString(),
  }));

  // Convert PaginatedTable filters to useOrders filters
  const handleFilterChange = useCallback(
    (paginatedFilters: Filters) => {
      const shouldResetPage = !isInCustomerSearchMode && !filters.search;

      // Build new filters object với tất cả changes cùng lúc
      const searchValue = paginatedFilters.search || "";

      // ✅ SỬA: Chỉ cần statusesValue cho multiple selection
      const statusValue =
        paginatedFilters.statuses.length > 0
          ? paginatedFilters.statuses.join(",") // ← CSV string cho multiple
          : "";

      // Handle single date
      let dateValue = "";
      if (paginatedFilters.singleDate) {
        dateValue =
          paginatedFilters.singleDate instanceof Date
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
      let employeesValue = "";
      if (isPMUser) {
        // Nếu user là PM đơn thuần, chỉ hiển thị đơn hàng của chính họ (giống như user thường)
        employeesValue = user?.id ? String(user.id) : "";
      } else {
        // User có cả PM và Manager thì xem như Manager (có thể chọn employees)
        employeesValue =
          paginatedFilters.employees.length > 0
            ? paginatedFilters.employees.join(",")
            : "";
      }

      // Handle departments
      let departmentsValue = "";
      if (isPMUser) {
        // Nếu user là PM đơn thuần, không set department để backend filter theo user hiện tại
        departmentsValue = "";
      } else {
        // User có cả PM và Manager thì xem như Manager (có thể chọn departments)
        departmentsValue =
          paginatedFilters.departments.length > 0
            ? paginatedFilters.departments.join(",")
            : "";
      }

      // Handle products/categories
      const productsValue =
        paginatedFilters.categories.length > 0
          ? paginatedFilters.categories.join(",")
          : "";

      // Handle quantity (minimum quantity filter)
      let quantityValue: number | undefined;
      if (
        typeof paginatedFilters.quantity === "number" &&
        !isNaN(paginatedFilters.quantity)
      ) {
        quantityValue = paginatedFilters.quantity;
      } else {
        quantityValue = undefined;
      }

      // Handle warning levels (now stored as value codes directly)
      let warningLevelValue = "";
      if (paginatedFilters.warningLevels.length > 0) {
        warningLevelValue = paginatedFilters.warningLevels.join(",");
      }

      // Handle conversation type (group/personal)
      let conversationTypeValue = "";
      if (
        Array.isArray(paginatedFilters.conversationType) &&
        paginatedFilters.conversationType.length > 0
      ) {
        conversationTypeValue = paginatedFilters.conversationType.join(",");
      }

      // Handle product code filter
      let productCodeValue = "";
      if (paginatedFilters.productCode && paginatedFilters.productCode.trim()) {
        productCodeValue = paginatedFilters.productCode.trim();
      }

      // ✅ SỬA: Build complete new filters object với statuses
      const newFilters: Partial<OrderFilters> = {
        search: searchValue,
        status: statusValue, // ✅ Clear status cũ cho backward compatibility
        date: dateValue,
        dateRange: dateRangeValue,
        employees: employeesValue,
        departments: departmentsValue,
        products: productsValue,
        quantity: quantityValue,
        warningLevel: warningLevelValue,
        conversationType: conversationTypeValue,
        productCode: productCodeValue,
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
      isPMUser,
      user?.id,
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
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

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
    [updateOrderDetail, refetch, saveCurrentPosition]
  );

  // ✅ Cập nhật handleDelete - chỉ nhận OrderDetail và reason
  const handleDelete = useCallback(
    async (orderDetail: OrderDetail, reason?: string) => {
      // if (!confirm("Bạn có chắc chắn muốn xóa order detail này?")) return;

      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        await deleteOrderDetail(Number(orderDetail.id), reason);
        setAlert({ type: "success", message: "Xóa order detail thành công!" });
        refetch();
      } catch (err) {
        console.error("Error deleting order detail:", err);
        setAlert({ type: "error", message: "Lỗi khi xóa order detail!" });
      }
    },
    [deleteOrderDetail, refetch, saveCurrentPosition]
  ); // ✅ Thay đổi dependency

  // ✅ Handle delete product code
  const handleDeleteProductCode = useCallback(
    async (orderDetail: OrderDetail, reason?: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        const token = getAccessToken();
        if (!token) {
          throw new Error("No access token");
        }

        console.log(
          "🔑 Token type:",
          typeof token,
          "Token length:",
          token?.length
        );
        console.log(
          "🗑️ Xóa mã sản phẩm khỏi đơn hàng:",
          orderDetail.id,
          "Lý do:",
          reason
        );

        // Sử dụng endpoint PUT để update order detail
        const requestBody = {
          product_id: null, // Xóa mã sản phẩm bằng cách set product_id = null
        };

        console.log(
          "📤 Request URL:",
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/${orderDetail.id}`
        );
        console.log("📤 Request body:", requestBody);
        console.log(
          "📤 Authorization header:",
          `Bearer ${token?.substring(0, 20)}...`
        );

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/${orderDetail.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", response.status, errorText);
          throw new Error(`Failed to delete product code: ${response.status}`);
        }

        console.log("✅ Xóa mã sản phẩm thành công");
        setAlert({ type: "success", message: "Xóa mã sản phẩm thành công!" });
        refetch();
      } catch (err) {
        console.error("Error deleting product code:", err);
        setAlert({
          type: "error",
          message:
            "Có lỗi khi xóa mã sản phẩm. Vui lòng thử lại hoặc liên hệ quản trị viên.",
        });
      }
    },
    [refetch, saveCurrentPosition]
  );

  // ✅ Handle bulk delete
  const handleBulkDelete = useCallback(
    async (orderDetails: OrderDetail[], reason?: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        const ids = orderDetails.map((od) => Number(od.id));
        await bulkDeleteOrderDetails(ids, reason);
        setAlert({
          type: "success",
          message: `Đã xóa ${orderDetails.length} đơn hàng thành công!`,
        });
        refetch();
      } catch (err) {
        console.error("Error bulk deleting order details:", err);
        setAlert({ type: "error", message: "Lỗi khi xóa nhiều đơn hàng!" });
      }
    },
    [bulkDeleteOrderDetails, refetch, saveCurrentPosition]
  );

  // ✅ Handle bulk extend
  const handleBulkExtend = useCallback(
    async (orderDetails: OrderDetail[]) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        // Lọc ra những đơn hàng chi tiết hợp lệ để gia hạn
        const validOrders = orderDetails.filter(
          (order) => order.status !== "completed" && order.status !== "demand"
        );

        const invalidOrders = orderDetails.filter(
          (order) => order.status === "completed" || order.status === "demand"
        );

        // Chỉ gửi những đơn hợp lệ lên backend
        if (validOrders.length > 0) {
          const validIds = validOrders.map((od) => Number(od.id));
          await bulkExtendOrderDetails(validIds);

          let message = `Đã gia hạn ${validOrders.length} đơn hàng chi tiết thành công!`;
          if (invalidOrders.length > 0) {
            const invalidIds = invalidOrders
              .map((order) => order.id)
              .join(", ");
            message += ` (Bỏ qua ${invalidOrders.length} đơn có trạng thái "Đã chốt" hoặc "Nhu cầu": ${invalidIds})`;
          }

          setAlert({
            type: "success",
            message: message,
          });
          refetch();
        } else {
          setAlert({
            type: "error",
            message: "Không có đơn hàng chi tiết nào hợp lệ để gia hạn!",
          });
        }
      } catch (err) {
        console.error("Error bulk extending order details:", err);
        setAlert({
          type: "error",
          message: "Lỗi khi gia hạn nhiều đơn hàng chi tiết!",
        });
      }
    },
    [bulkExtendOrderDetails, refetch, saveCurrentPosition]
  );

  // ✅ Handle bulk notes
  const handleBulkNotes = useCallback(
    async (orderDetails: OrderDetail[], notes: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        const ids = orderDetails.map((od) => Number(od.id));
        await bulkAddNotesOrderDetails(ids, notes);
        setAlert({
          type: "success",
          message: `Đã cập nhật ghi chú cho ${orderDetails.length} đơn hàng thành công!`,
        });
        refetch();
      } catch (err) {
        console.error("Error bulk adding notes to order details:", err);
        setAlert({
          type: "error",
          message: "Lỗi khi cập nhật ghi chú nhiều đơn hàng!",
        });
      }
    },
    [bulkAddNotesOrderDetails, refetch, saveCurrentPosition]
  );

  // ✅ Handle edit customer name
  const handleEditCustomerName = useCallback(
    async (orderDetail: OrderDetail, newCustomerName: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        await updateOrderDetailCustomerName(
          Number(orderDetail.id),
          newCustomerName,
          orderDetail
        );
        setAlert({
          type: "success",
          message: "Đã cập nhật tên khách hàng thành công!",
        });
        refetch();
      } catch (err) {
        console.error("Error updating customer name:", err);
        setAlert({
          type: "error",
          message: "Lỗi khi cập nhật tên khách hàng!",
        });
      }
    },
    [updateOrderDetailCustomerName, refetch, saveCurrentPosition]
  );

  // ✅ Handle add to blacklist
  const handleAddToBlacklist = useCallback(
    async (orderDetail: OrderDetail, reason?: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        await addToBlacklist(Number(orderDetail.id), reason);
        setAlert({
          type: "success",
          message: "Đã thêm vào blacklist thành công!",
        });
        refetch();
      } catch (err) {
        console.error("Error adding to blacklist:", err);
        setAlert({ type: "error", message: "Lỗi khi thêm vào blacklist!" });
      }
    },
    [addToBlacklist, refetch, saveCurrentPosition]
  );

  // ✅ Handle analysis block
  const handleAnalysisBlock = useCallback(
    async (
      orderDetail: OrderDetail,
      data: { reason?: string; blockType: "analysis" | "reporting" | "stats" }
    ) => {
      try {
        // Extract customer ID from metadata
        let customerId: string | null = null;
        if (orderDetail.metadata) {
          try {
            if (typeof orderDetail.metadata === "string") {
              const parsed = JSON.parse(orderDetail.metadata);
              customerId = parsed.customer_id || null;
            } else if (typeof orderDetail.metadata === "object") {
              customerId = orderDetail.metadata.customer_id || null;
            }
          } catch (error) {
            console.error("Error parsing metadata:", error);
          }
        }

        if (!customerId) {
          throw new Error("Không tìm thấy Customer ID trong metadata");
        }

        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        await addAnalysisBlock({
          zaloContactId: customerId,
          reason: data.reason,
          blockType: data.blockType,
        });

        setAlert({
          type: "success",
          message: `Đã chặn phân tích thành công! (${data.blockType})`,
        });
        refetch();
      } catch (err: any) {
        console.error("Error adding analysis block:", err);
        // Không hiển thị alert ở đây - lỗi sẽ được hiển thị trong modal
        throw err; // Re-throw để modal có thể catch và hiển thị lỗi
      }
    },
    [addAnalysisBlock, refetch, saveCurrentPosition]
  );

  // ✅ Handle hide (single)
  const handleHide = useCallback(
    async (orderDetail: OrderDetail, reason: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        await bulkHideOrderDetails([Number(orderDetail.id)], reason);
        setAlert({ type: "success", message: "Đã ẩn đơn hàng thành công!" });
        refetch();
      } catch (err) {
        console.error("Error hiding order detail:", err);
        setAlert({ type: "error", message: "Lỗi khi ẩn đơn hàng!" });
      }
    },
    [bulkHideOrderDetails, refetch, saveCurrentPosition]
  );

  // ✅ Handle bulk hide
  const handleBulkHide = useCallback(
    async (orderDetails: OrderDetail[], reason: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        const ids = orderDetails.map((od) => Number(od.id));
        await bulkHideOrderDetails(ids, reason);
        setAlert({
          type: "success",
          message: `Đã ẩn ${orderDetails.length} đơn hàng thành công!`,
        });
        refetch();
      } catch (err) {
        console.error("Error bulk hiding order details:", err);
        setAlert({ type: "error", message: "Lỗi khi ẩn nhiều đơn hàng!" });
      }
    },
    [bulkHideOrderDetails, refetch, saveCurrentPosition]
  );

  // ✅ Handle send inquiry
  const handleSendInquiry = useCallback(
    async (orderDetail: OrderDetail, message: string) => {
      try {
        // ✅ Lưu vị trí hiện tại trước khi thực hiện thao tác
        saveCurrentPosition();

        // TODO: Implement API call to send inquiry message
        // await sendInquiryMessage(orderDetail.id, message);
        
        console.log('Sending inquiry:', { orderDetailId: orderDetail.id, message });
        
        setAlert({
          type: "success",
          message: "Đã gửi câu hỏi thăm dò thành công!",
        });
        refetch();
      } catch (err) {
        console.error("Error sending inquiry:", err);
        setAlert({ type: "error", message: "Lỗi khi gửi câu hỏi thăm dò!" });
        throw err; // Re-throw để modal có thể hiển thị lỗi
      }
    },
    [refetch, saveCurrentPosition]
  );

  const handleReload = useCallback(() => {
    refetch();
  }, [refetch]);

  // Provide an async exporter that fetches ALL rows from backend (respects current filters)
  const getExportAllData = useCallback(async () => {
    const params = new URLSearchParams();
    params.append("page", "1");
    params.append("pageSize", "1000000");
    if (filters.search?.trim()) params.append("search", filters.search.trim());
    if (filters.status?.trim()) params.append("status", filters.status.trim());
    if (filters.date?.trim()) params.append("date", filters.date.trim());
    if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
      params.append(
        "dateRange",
        JSON.stringify({
          start: filters.dateRange.start,
          end: filters.dateRange.end,
        })
      );
    }
    if (typeof filters.quantity === "number")
      params.append("quantity", String(filters.quantity));
    // Admin or PM can include hidden items when exporting all
    if ((isAdmin || isPMUser) && includeHiddenExport)
      params.append("includeHidden", "1");

    // Nếu user là PM đơn thuần, chỉ export đơn hàng của chính họ (giống như user thường)
    if (isPMUser) {
      if (user?.id) params.append("employees", String(user.id));
      // Không set departments để backend filter theo user hiện tại
    } else {
      // User có cả PM và Manager thì xem như Manager (có thể export tất cả)
      if (filters.employee?.trim())
        params.append("employee", filters.employee.trim());
      if (filters.employees?.trim())
        params.append("employees", filters.employees.trim());
      if (filters.departments?.trim())
        params.append("departments", filters.departments.trim());
    }
    if (filters.products?.trim())
      params.append("products", filters.products.trim());
    if (filters.warningLevel?.trim())
      params.append("warningLevel", filters.warningLevel.trim());
    if (filters.conversationType?.trim())
      params.append("conversationType", filters.conversationType.trim());
    if (filters.productCode?.trim())
      params.append("productCode", filters.productCode.trim());
    if (filters.sortField) params.append("sortField", filters.sortField);
    if (filters.sortDirection)
      params.append("sortDirection", filters.sortDirection);

    const token = getAccessToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/orders?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!res.ok)
      throw new Error(`Failed to fetch all orders for export: ${res.status}`);
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
      calculateDynamicExtended(orderDetail.created_at, orderDetail.extended),
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
      orderDetail.product?.productCode || "--",
      orderDetail.raw_item || "--",
      orderDetail.quantity ?? "--",
      orderDetail.unit_price
        ? Number(orderDetail.unit_price).toLocaleString("vi-VN") + "₫"
        : "--",
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
    ]);

    return rows;
  }, [filters, isPMUser, user?.id, isAdmin, includeHiddenExport]);

  // ✅ Handle search từ double-click tên khách hàng - giống PM
  const handleSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || !searchTerm.trim()) return;

      // ✅ Tạo search term với exact match cho customer name
      // Sử dụng dấu ngoặc kép để backend có thể hiểu đây là exact match
      const exactSearchTerm = `"${searchTerm.trim()}"`;

      // ✅ Tạo filters mới với search term exact match
      const newFilters = {
        ...filters,
        search: exactSearchTerm,
        page: 1,
      };

      // ✅ Sử dụng flushSync để đảm bảo state được cập nhật ngay lập tức
      flushSync(() => {
        setFilters(newFilters);
      });

      // ✅ Force fetch data ngay lập tức với filters mới - bypass debounce
      forceFetch(newFilters);
    },
    [setFilters, filters, forceFetch]
  );

  // ✅ Handle restore previous state
  const handleRestorePrevious = useCallback(async () => {
    await restorePreviousState();
  }, [restorePreviousState]);

  // ✅ Handle sort từ OrderManagement
  const handleSort = useCallback(
    (
      field:
        | "quantity"
        | "unit_price"
        | "created_at"
        | "conversation_start"
        | "conversation_end"
        | null,
      direction: "asc" | "desc" | null
    ) => {
      // ✅ Batch update tất cả cùng lúc
      setFilters({
        sortField: field,
        sortDirection: direction,
        page: 1,
      });
    },
    [setFilters]
  );

  // Effects
  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: error });
    }
  }, [error]);

  // ✅ Khôi phục vị trí sau khi data được refetch
  useEffect(() => {
    if (!isLoading && preservedState) {
      restorePosition();
    }
  }, [isLoading, preservedState, restorePosition]);

  // ✅ Clear employees when departments change - CHỈ khi thực sự cần thiết
  useEffect(() => {
    // Chỉ xử lý khi có cả departments và employees, và filterOptions đã load xong
    if (
      filters.departments &&
      filters.employees &&
      filterOptions.departments.length > 0
    ) {
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

        // CHỈ cập nhật khi có employees không hợp lệ VÀ số lượng khác biệt đáng kể
        if (
          validSelectedEmployees.length !== selectedEmployeeIds.length &&
          validSelectedEmployees.length > 0
        ) {
          // Có employees không hợp lệ, cần cập nhật
          setEmployees(validSelectedEmployees.join(","));
        } else if (
          validSelectedEmployees.length === 0 &&
          selectedEmployeeIds.length > 0
        ) {
          // Nếu không có employees hợp lệ nào, chỉ xóa khi departments thực sự thay đổi
          // Không tự động xóa để tránh mất bộ lọc khi F5
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
    // Store raw warning level values (match option.value); MultiSelectCombobox will map to labels
    const parsedWarningLevels = filters.warningLevel
      ? filters.warningLevel.split(",").filter((w) => w)
      : [];

    const result = {
      search: filters.search || "",
      departments: isPMUser
        ? [] // PM đơn thuần không cần filter theo department
        : filters.departments
        ? filters.departments.split(",").filter((d) => d)
        : [],
      roles: [],
      statuses: filters.status
        ? filters.status.split(",").filter((s) => s.trim())
        : [],
      categories: filters.products
        ? filters.products.split(",").filter((p) => p)
        : [], // Products
      brands: [], // Không sử dụng brands nữa
      warningLevels: parsedWarningLevels, // Mức độ cảnh báo (values)
      dateRange:
        filters.dateRange && filters.dateRange.start && filters.dateRange.end
          ? {
              from: new Date(filters.dateRange.start),
              to: new Date(filters.dateRange.end),
            }
          : { from: undefined, to: undefined },
      singleDate: filters.date ? new Date(filters.date) : undefined,
      quantity: filters.quantity || 1, // Thêm quantity filter
      conversationType: filters.conversationType
        ? filters.conversationType.split(",").filter(Boolean)
        : [],
      productCode: filters.productCode || "", // Thêm productCode filter
      employees: isPMUser
        ? user?.id
          ? [String(user.id)]
          : [] // PM đơn thuần chỉ hiển thị đơn hàng của chính họ
        : filters.employees
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
    filters.conversationType,
    filters.quantity,
    filters.productCode,
    filters.employees,
    filters.warningLevel,
    isPMUser,
    user?.id,
  ]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // ✅ Kiểm tra quyền truy cập cho PM
  if (!canAccessOrderManagement) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              🚫 Không có quyền truy cập
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-gray-600">
              Bạn không có quyền truy cập vào trang quản lý đơn hàng.
            </div>
            <div className="text-sm text-gray-500">
              {isPM && !isAnalysisRole ? (
                <div>
                  <p>
                    PM cần có role <strong>analysis</strong> để truy cập trang
                    này.
                  </p>
                  <p>
                    Hoặc cần có role <strong>manager</strong> để xem như quản
                    lý.
                  </p>
                </div>
              ) : (
                <p>Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
              )}
            </div>
          </CardContent>
        </Card>
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
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            📦 Quản lý đơn hàng
            {/* Badge số khách hàng */}
            {customerCountLoading ? (
              <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full animate-pulse">
                Đang tải...
              </span>
            ) : typeof customerCount === "number" ? (
              <button
                type="button"
                className="ml-2 px-3 py-1 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-semibold cursor-pointer"
                title="Xem danh sách khách hàng"
                onClick={() => setCustomerDialogOpen(true)}
              >
                👥 {customerCount.toLocaleString()} {customerCountLabel}
              </button>
            ) : customerCountError ? (
              <span className="ml-2 px-2 py-1 text-xs bg-red-200 text-red-600 rounded-full">
                Lỗi tải dữ liệu
              </span>
            ) : null}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleReload}
              className="text-sm"
            >
              🔄 Làm mới
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsInquiryPresetsModalOpen(true)}
              className="text-sm flex items-center gap-2 hover:bg-blue-50"
            >
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                Preset câu hỏi
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch={true}
            enableStatusFilter={true}
            enableSingleDateFilter={true}
            enableDateRangeFilter={true}
            enableEmployeeFilter={!isPMUser}
            enableDepartmentFilter={!isPMUser}
            enableWarningLevelFilter={true} // Thêm warning level filter
            enableConversationTypeFilter={true}
            enablePageSize={true}
            enableGoToPage={true}
            availableStatuses={statusOptions}
            availableEmployees={isPMUser ? [] : filteredEmployeeOptions}
            availableDepartments={isPMUser ? [] : departmentOptions}
            availableWarningLevels={warningLevelOptions} // Thay thế availableBrands
            enableQuantityFilter={true} // Bật bộ lọc số lượng
            quantityLabel="Số lượng"
            defaultQuantity={1} // Mặc định là 1
            enableProductCodeFilter={true} // Bật bộ lọc mã sản phẩm
            productCodeLabel="Mã sản phẩm"
            singleDateLabel="Ngày tạo đơn"
            dateRangeLabel="Khoảng thời gian"
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onFilterChange={handleFilterChange}
            onClearSearch={() => {
              // Clear search and exit customer search mode - giống PM
              if (isInCustomerSearchMode) {
                // Restore previous state when clearing customer search
                handleRestorePrevious();
              } else {
                // Just clear search without affecting other filters
                setSearch("");
              }
            }}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onResetFilter={handleResetFilter}
            isRestoring={isRestoring}
            loading={isLoading}
            canExport={
              canExportInDepartment &&
              canExportInDepartment(user?.departments?.[0]?.slug || "")
            }
            getExportData={() => {
              const filtersDescription = (
                <div className="flex items-center justify-start gap-4">
                  {(isAdmin || isPMUser) && (
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label="Bao gồm đơn ẩn"
                        checked={includeHiddenExport}
                        onCheckedChange={(v: any) =>
                          setIncludeHiddenExport(Boolean(v))
                        }
                      />
                      <div className="text-sm">Bao gồm đơn ẩn</div>
                    </div>
                  )}
                </div>
              );

              return {
                headers: [
                  "STT",
                  "Mã Đơn",
                  "Gia Hạn",
                  "Thời Gian Tạo Đơn Hàng",
                  "Tên Nhân Viên",
                  "Tên Khách Hàng",
                  "Mã Sản Phẩm",
                  "Tên Mặt Hàng",
                  "Số Lượng",
                  "Đơn Giá",
                  "Trạng Thái",
                  "Ghi Chú",
                ],
                data: orders.map((orderDetail, idx) => [
                  idx + 1,
                  orderDetail.id ?? "--",
                  calculateDynamicExtended(
                    orderDetail.created_at,
                    orderDetail.extended
                  ),
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
                  orderDetail.product?.productCode || "--",
                  orderDetail.raw_item || "--",
                  orderDetail.quantity ?? "--",
                  orderDetail.unit_price
                    ? Number(orderDetail.unit_price).toLocaleString("vi-VN") +
                      "₫"
                    : "--",
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
                filtersDescription,
              };
            }}
            getExportAllData={getExportAllData}
            initialFilters={memoizedInitialFilters}
          >
            <OrderManagement
              orders={orders}
              expectedRowCount={filters.pageSize}
              startIndex={(filters.page - 1) * filters.pageSize}
              onReload={handleReload}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDeleteProductCode={handleDeleteProductCode}
              onEditCustomerName={handleEditCustomerName}
              onAddToBlacklist={handleAddToBlacklist}
              onAnalysisBlock={handleAnalysisBlock}
              onSendInquiry={handleSendInquiry}
              checkContactBlocked={checkContactBlocked}
              onBulkDelete={handleBulkDelete}
              onBulkExtend={handleBulkExtend}
              onBulkNotes={handleBulkNotes}
              onHide={handleHide}
              onBulkHide={handleBulkHide}
              onSearch={handleSearch}
              onSort={handleSort}
              currentSortField={filters.sortField}
              currentSortDirection={filters.sortDirection}
              loading={isLoading}
              showProductCode={true}
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

      {/* Dialog danh sách khách hàng */}
      <CustomerListDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        filters={{
          fromDate: filters.dateRange?.start,
          toDate: filters.dateRange?.end,
          employeeId: isPMUser
            ? user?.id
            : filters.employees
            ? Number(filters.employees.split(",")[0])
            : undefined,
          departmentId: isPMUser
            ? undefined // PM user không cần department
            : filters.departments
            ? Number(filters.departments.split(",")[0])
            : undefined,
          // Forward all manager filters so list matches
          search: filters.search,
          status: filters.status,
          date: filters.date,
          dateRange: filters.dateRange,
          employee: filters.employee,
          employees: isPMUser
            ? user?.id
              ? String(user.id)
              : undefined
            : filters.employees,
          departments: isPMUser
            ? undefined // PM user không cần department
            : filters.departments,
          products: filters.products,
          warningLevel: filters.warningLevel,
          quantity:
            typeof filters.quantity === "number"
              ? String(filters.quantity)
              : filters.quantity,
        }}
        onSelectCustomer={(payload) => {
          // Close dialog
          setCustomerDialogOpen(false);

          // Build a single merged filters object from modal-applied filters + sale info
          const mergedBase: Partial<OrderFilters> = {};

          if (payload.appliedFilters) {
            const af = payload.appliedFilters;
            mergedBase.search = af.search ?? undefined;
            mergedBase.status = af.status ?? undefined;
            mergedBase.date = af.date ?? undefined;
            mergedBase.dateRange = af.dateRange ?? undefined;
            mergedBase.employees = af.employees ?? undefined;
            mergedBase.employee = af.employee ?? undefined;
            mergedBase.departments = af.departments ?? undefined;
            mergedBase.products = af.products ?? undefined;
            mergedBase.warningLevel = af.warningLevel ?? undefined;
            if (af.quantity !== undefined)
              mergedBase.quantity =
                typeof af.quantity === "string"
                  ? Number(af.quantity)
                  : af.quantity;
          }

          // Ensure sale is represented in employees (CSV of ids) so the select shows it as selected
          if (isPMUser) {
            // PM đơn thuần luôn chỉ hiển thị đơn hàng của chính họ (giống như user thường)
            mergedBase.employees = user?.id ? String(user.id) : undefined;
            mergedBase.employee = undefined;
          } else if (payload.saleId !== undefined) {
            mergedBase.employees = String(payload.saleId);
            // prefer employees over employee field
            mergedBase.employee = undefined;
          } else if (payload.saleName) {
            // if we don't have id, set employee name as fallback
            mergedBase.employee = payload.saleName;
          }

          // Always reset to first page when applying modal filters
          mergedBase.page = 1;

          // Apply merged filters once (updates URL and internal state)
          setFilters(mergedBase);

          // Trigger customer search and pass the exact base filters so performCustomerSearch sees same state
          performCustomerSearch(payload.customerName, mergedBase);
        }}
      />

      {/* Inquiry Presets Modal */}
      <InquiryPresetsModal
        isOpen={isInquiryPresetsModalOpen}
        onClose={() => setIsInquiryPresetsModalOpen(false)}
      />
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
