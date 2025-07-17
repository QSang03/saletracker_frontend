"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MultiSelectCombobox,
  Option,
} from "@/components/ui/MultiSelectCombobox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DatePicker } from "@/components/ui/date-picker";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import CSVExportPanel from "@/components/ui/tables/CSVExportPanel";

interface PaginatedTableProps {
  emptyText?: string;
  enableSearch?: boolean;
  enableDepartmentFilter?: boolean;
  enableRoleFilter?: boolean;
  enableStatusFilter?: boolean;
  enableEmployeeFilter?: boolean;
  enableZaloLinkStatusFilter?: boolean;
  availableEmployees?: Option[];
  enableDateRangeFilter?: boolean;
  enableSingleDateFilter?: boolean;
  enablePageSize?: boolean;
  availableDepartments?: string[];
  availableRoles?: string[];
  availableStatuses?: { value: string; label: string }[] | string[];
  availableZaloLinkStatuses?: { value: string | number; label: string }[];
  availableCategories?: string[];
  availableBrands?: string[];
  dateRangeLabel?: string;
  singleDateLabel?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  page?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  children: React.ReactNode;
  onFilterChange?: (filters: Filters) => void;
  loading?: boolean;
  // Thêm prop để pass initial filters từ parent
  initialFilters?: Partial<Filters>;
  // Thêm flag để kiểm soát việc sync
  preserveFiltersOnEmpty?: boolean;
  filterClassNames?: {
    search?: string;
    departments?: string;
    roles?: string;
    statuses?: string;
    categories?: string;
    brands?: string;
    dateRange?: string;
  };
  buttonClassNames?: {
    export?: string;
    reset?: string;
    prev?: string;
    next?: string;
  };
  getExportData?: () => { headers: string[]; data: (string | number)[][] };
  canExport?: boolean;
  onResetFilter?: () => void;
}

export type Filters = {
  search: string;
  departments: (string | number)[];
  roles: (string | number)[];
  statuses: (string | number)[];
  zaloLinkStatuses?: (string | number)[];
  categories: (string | number)[];
  brands: (string | number)[];
  dateRange: DateRange;
  singleDate?: Date;
  employees: (string | number)[];
};

export default function PaginatedTable({
  emptyText,
  enableSearch,
  enableDepartmentFilter,
  enableRoleFilter,
  enableStatusFilter,
  enableEmployeeFilter,
  availableEmployees = [],
  // Thêm các props mới
  enableZaloLinkStatusFilter,
  availableZaloLinkStatuses = [
    { value: 0, label: "Chưa liên kết" },
    { value: 1, label: "Đã liên kết" },
    { value: 2, label: "Lỗi liên kết" },
  ],
  enableDateRangeFilter,
  enableSingleDateFilter,
  singleDateLabel,
  enablePageSize,
  availableDepartments = [],
  availableRoles = [],
  availableStatuses = [
    { value: "active", label: "Đang hoạt động" },
    { value: "inactive", label: "Ngưng hoạt động" },
  ],
  availableCategories = [],
  availableBrands = [],
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  children,
  onFilterChange,
  loading = false,
  initialFilters,
  preserveFiltersOnEmpty = true,
  filterClassNames = {},
  buttonClassNames = {},
  getExportData,
  canExport = true,
  onResetFilter,
}: PaginatedTableProps) {
  const departmentOptions = useMemo(
    () => availableDepartments.map((d) => ({ label: d, value: d })),
    [availableDepartments]
  );
  const roleOptions = useMemo(
    () => availableRoles.map((r) => ({ label: r, value: r })),
    [availableRoles]
  );
  const statusOptions = useMemo(
    () =>
      availableStatuses.map((s) => {
        let label: string;
        let value: string;
        if (typeof s === "string") {
          value = s;
        } else {
          value = s.value;
        }
        // Map lại label cho các trạng thái đặc biệt
        if (value === "paid") label = "Đã thanh toán";
        else if (value === "pay_later") label = "Đã hẹn thanh toán";
        else if (value === "no_information_available") label = "Không có thông tin";
        else if (typeof s === "string") label = s;
        else label = s.label;
        return { label, value };
      }),
    [availableStatuses]
  );
  const categoryOptions = useMemo(
    () => availableCategories.map((c) => ({ label: c, value: c })),
    [availableCategories]
  );
  const brandOptions = useMemo(
    () => availableBrands.map((b) => ({ label: b, value: b })),
    [availableBrands]
  );
  const employeeOptions = useMemo(
    () => availableEmployees.map((e) => ({ label: e.label, value: e.value })),
    [availableEmployees]
  );

  // Thêm useMemo cho zaloLinkStatusOptions
  const zaloLinkStatusOptions = useMemo(
    () => availableZaloLinkStatuses.map((s) => ({ label: s.label, value: s.value })),
    [availableZaloLinkStatuses]
  );

  const [filters, setFilters] = useState<Filters>(() => ({
    search: initialFilters?.search || "",
    departments: initialFilters?.departments || [],
    roles: initialFilters?.roles || [],
    statuses: initialFilters?.statuses || [],
    zaloLinkStatuses: initialFilters?.zaloLinkStatuses || [],
    categories: initialFilters?.categories || [],
    brands: initialFilters?.brands || [],
    dateRange: initialFilters?.dateRange || { from: undefined, to: undefined },
    singleDate: initialFilters?.singleDate || undefined,
    employees: initialFilters?.employees || [],
  }));

  // Sync filters when initialFilters changes - but only if preserveFiltersOnEmpty is true
  const memoizedInitialFilters = useMemo(() => initialFilters, [
    initialFilters?.search,
    JSON.stringify(initialFilters?.departments),
    JSON.stringify(initialFilters?.roles),
    JSON.stringify(initialFilters?.statuses),
    JSON.stringify(initialFilters?.zaloLinkStatuses),
    JSON.stringify(initialFilters?.categories),
    JSON.stringify(initialFilters?.brands),
    JSON.stringify(initialFilters?.dateRange),
    initialFilters?.singleDate,
    JSON.stringify(initialFilters?.employees),
  ]);

  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (memoizedInitialFilters && !hasUserInteracted) {
      setFilters(prev => {
        const newFilters = {
          search: memoizedInitialFilters.search !== undefined ? memoizedInitialFilters.search : prev.search,
          departments: memoizedInitialFilters.departments !== undefined ? memoizedInitialFilters.departments : prev.departments,
          roles: memoizedInitialFilters.roles !== undefined ? memoizedInitialFilters.roles : prev.roles,
          statuses: memoizedInitialFilters.statuses !== undefined ? memoizedInitialFilters.statuses : prev.statuses,
          zaloLinkStatuses: memoizedInitialFilters.zaloLinkStatuses !== undefined ? memoizedInitialFilters.zaloLinkStatuses : prev.zaloLinkStatuses,
          categories: memoizedInitialFilters.categories !== undefined ? memoizedInitialFilters.categories : prev.categories,
          brands: memoizedInitialFilters.brands !== undefined ? memoizedInitialFilters.brands : prev.brands,
          dateRange: memoizedInitialFilters.dateRange !== undefined ? memoizedInitialFilters.dateRange : prev.dateRange,
          singleDate: memoizedInitialFilters.singleDate !== undefined ? memoizedInitialFilters.singleDate : prev.singleDate,
          employees: memoizedInitialFilters.employees !== undefined ? memoizedInitialFilters.employees : prev.employees,
        };
        
        // Only update if actually different
        const isEqual = JSON.stringify(prev) === JSON.stringify(newFilters);
        return isEqual ? prev : newFilters;
      });
    }
  }, [memoizedInitialFilters, hasUserInteracted]);

  // Xác định chế độ phân trang: backend (có page, pageSize, total) hay frontend (không có)
  const isBackendPaging = page !== undefined && pageSize !== undefined && total !== undefined;

  // State cho frontend pagination
  const [internalPage, setInternalPage] = useState(0); // 0-based
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);

  // Tính toán page/pageSize hiện tại
  const currentPage = isBackendPaging ? page! : internalPage + 1; // 1-based
  const currentPageSize = isBackendPaging ? pageSize! : internalPageSize;
  const totalRows = isBackendPaging ? total! : children && Array.isArray(children) ? children.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / currentPageSize));

  // State tạm cho input pageSize (chỉ áp dụng cho input nhập số dòng/trang)
  const [pendingPageSize, setPendingPageSize] = useState<number | "">(currentPageSize);
  useEffect(() => {
    setPendingPageSize(currentPageSize);
  }, [currentPageSize]);

  // Debounce filter cho backend: giảm thời gian xuống 150ms để responsive hơn
  const filterTimeout = useRef<NodeJS.Timeout | null>(null);

  const debouncedSetFilters = useCallback((newFilters: Filters) => {
    if (filterTimeout.current) clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => {
      if (onFilterChange) onFilterChange(newFilters);
    }, 150); // giảm từ 300ms xuống 150ms để responsive hơn
  }, [onFilterChange]);

  // updateFilter chỉ cập nhật filter, không reset page
  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setHasUserInteracted(true); // Mark that user has interacted
      setFilters((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        debouncedSetFilters(next);
        return next;
      });
    },
    [debouncedSetFilters]
  );

  // Memoized onChange handlers to prevent re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter("search", e.target.value);
  }, [updateFilter]);

  const handleEmployeesChange = useCallback((vals: (string | number)[]) => {
    updateFilter("employees", vals);
  }, [updateFilter]);

  const handleDepartmentsChange = useCallback((vals: (string | number)[]) => {
    updateFilter("departments", vals);
  }, [updateFilter]);

  const handleRolesChange = useCallback((vals: (string | number)[]) => {
    updateFilter("roles", vals);
  }, [updateFilter]);

  const handleStatusesChange = useCallback((vals: (string | number)[]) => {
    updateFilter("statuses", vals);
  }, [updateFilter]);

  const handleZaloLinkStatusesChange = useCallback((vals: (string | number)[]) => {
    updateFilter("zaloLinkStatuses", vals);
  }, [updateFilter]);

  const handleCategoriesChange = useCallback((vals: (string | number)[]) => {
    updateFilter("categories", vals);
  }, [updateFilter]);

  const handleBrandsChange = useCallback((vals: (string | number)[]) => {
    updateFilter("brands", vals);
  }, [updateFilter]);

  // useEffect này KHÔNG gọi onFilterChange trực tiếp nữa
  // handleResetFilter: reset filter, đồng thời reset page về 1 nếu là backend paging
  const handleResetFilter = useCallback(() => {
    const reset: Filters = {
      search: "",
      departments: [],
      roles: [],
      statuses: [],
      // Thêm field mới vào reset
      zaloLinkStatuses: [],
      categories: [],
      brands: [],
      dateRange: { from: undefined, to: undefined },
      singleDate: undefined,
      employees: [],
    };
    setFilters(reset);
    // Gọi debouncedSetFilters để thông báo cho parent component
    debouncedSetFilters(reset);
    if (onPageChange) onPageChange(1);
    else setInternalPage(0);
    setPendingPageSize("");
    // Gọi callback reset filter ở trang cha nếu có
    if (typeof onResetFilter === 'function') {
      onResetFilter();
    }
  }, [onPageChange, onResetFilter, debouncedSetFilters]);

  // State cho panel xuất CSV
  const [openExport, setOpenExport] = useState(false);

  // Đổi page size
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value);
      if (isBackendPaging && onPageSizeChange) {
        onPageSizeChange(newSize);
      } else {
        setInternalPage(0);
        setInternalPageSize(newSize);
      }
    },
    [isBackendPaging, onPageSizeChange]
  );

  // Chuyển trang
  const goToPage = useCallback(
    (newPage: number) => {
      if (isBackendPaging && onPageChange) {
        onPageChange(newPage);
      } else {
        setInternalPage(newPage - 1);
      }
    },
    [isBackendPaging, onPageChange]
  );

  // Khi input số dòng/trang rỗng, tự động reset pageSize về mặc định
  useEffect(() => {
    if (pendingPageSize === "") {
      if (isBackendPaging && onPageSizeChange) onPageSizeChange(defaultPageSize);
      else setInternalPageSize(defaultPageSize);
      if (onPageChange) onPageChange(1);
      else setInternalPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPageSize]);

  return (
    <div className="flex flex-col h-full min-h-[500px] space-y-4 w-full">
      <div className="mb-4">
        <div className="grid grid-cols-6 gap-3">
          {enableSearch && (
            <Input
              className={`min-w-0 w-full ${filterClassNames.search ?? ''}`}
              placeholder="Tìm kiếm..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          )}
          {enableEmployeeFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full`}
              placeholder="Nhân viên"
              value={filters.employees}
              options={employeeOptions}
              onChange={handleEmployeesChange}
            />
          )}
          {enableDepartmentFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.departments ?? ''}`}
              placeholder="Phòng ban"
              value={filters.departments}
              options={departmentOptions}
              onChange={handleDepartmentsChange}
            />
          )}
          {enableRoleFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.roles ?? ''}`}
              placeholder="Vai trò"
              value={filters.roles}
              options={roleOptions}
              onChange={handleRolesChange}
            />
          )}
          {enableStatusFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.statuses ?? ''}`}
              placeholder="Trạng thái"
              value={filters.statuses}
              options={statusOptions}
              onChange={handleStatusesChange}
            />
          )}
          {enableZaloLinkStatusFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full`}
              placeholder="Trạng thái liên kết"
              value={filters.zaloLinkStatuses!}
              options={zaloLinkStatusOptions}
              onChange={handleZaloLinkStatusesChange}
            />
          )}
          {enableSingleDateFilter && (
            <DatePicker
              value={filters.singleDate}
              onChange={(date) => updateFilter("singleDate", date)}
              placeholder={singleDateLabel || "Chọn ngày"}
              className="min-w-0 w-full"
            />
          )}
          {/* Số dòng/trang nằm ngang hàng filter */}
          {enablePageSize && (
            <Input
              type="number"
              min={1}
              className="min-w-0 w-full border rounded px-2 py-1 text-sm"
              value={pendingPageSize}
              placeholder="Số dòng/trang"
              onChange={e => {
                const val = Number(e.target.value);
                setPendingPageSize(e.target.value === "" ? "" : (val > 0 ? val : ""));
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const val = Number(pendingPageSize);
                  if (!isNaN(val) && val > 0) {
                    if (isBackendPaging && onPageSizeChange) onPageSizeChange(val);
                    else {
                      setInternalPage(0);
                      setInternalPageSize(val);
                    }
                  }
                }
              }}
            />
          )}
          {/* Nút Xuất và Xoá filter chia đôi 1 cột */}
          <div className="flex gap-2 min-w-0 w-full">
            {canExport && getExportData && (
              <Button
                variant="export"
                className={`min-w-0 ${canExport ? 'w-1/2' : 'w-full'} ${buttonClassNames.export ?? ''}`}
                onClick={() => setOpenExport(true)}
                disabled={!getExportData}
              >
                Xuất CSV
              </Button>
            )}
            <Button
              type="button"
              variant="delete"
              className={`min-w-0 ${canExport && getExportData ? 'w-1/2' : 'w-full'} ${buttonClassNames.reset ?? ''}`}
              onClick={handleResetFilter}
            >
              Xóa filter
            </Button>
          </div>
        </div>
        {/* Tổng số dòng dưới filter */}
        <div className="mt-4 ml-0.5 text font-medium">
          Tổng số dòng: <span className="text-red-500">{totalRows}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {availableCategories.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.categories ?? ''}`}
              placeholder="Danh mục"
              value={filters.categories}
              options={categoryOptions}
              onChange={handleCategoriesChange}
            />
          )}
          {availableBrands.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.brands ?? ''}`}
              placeholder="Brand"
              value={filters.brands}
              options={brandOptions}
              onChange={handleBrandsChange}
            />
          )}
          {enableDateRangeFilter && (
            <DateRangePicker
              className={`min-w-0 w-full ${filterClassNames.dateRange ?? ''}`}
              initialDateRange={filters.dateRange}
              onUpdate={({ range }) =>
                updateFilter(
                  "dateRange",
                  range ?? { from: undefined, to: undefined }
                )
              }
              locale="vi"
              align="start"
            />
          )}
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: currentPageSize }).map((_, idx) => (
              <Skeleton key={idx} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          // Khi backend paging, luôn render nguyên vẹn children (không slice/cắt)
          children
        )}
      </div>

      <div className="flex justify-center gap-2 pt-2 mt-2">
        <Button
          variant="gradient"
          size="sm"
          className={buttonClassNames.prev ?? ''}
          onClick={() => {
            goToPage(Math.max(currentPage - 1, 1));
          }}
          disabled={currentPage === 1}
        >
          Trước
        </Button>
        <span className="text-sm px-2 mt-1.5">
          Trang {currentPage} / {totalPages || 1}
        </span>
        <Button
          variant="gradient"
          size="sm"
          className={buttonClassNames.next ?? ''}
          onClick={() => {
            goToPage(Math.min(currentPage + 1, totalPages));
          }}
          disabled={currentPage >= totalPages}
        >
          Sau
        </Button>
      </div>

      {/* Panel xuất CSV */}
      {canExport && getExportData && (
        <CSVExportPanel
          open={openExport}
          onClose={() => setOpenExport(false)}
          defaultExportCount={currentPageSize}
          {...getExportData()}
        />
      )}
    </div>
  );
}
