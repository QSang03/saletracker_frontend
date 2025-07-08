"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MultiSelectCombobox,
  Option,
} from "@/components/ui/MultiSelectCombobox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";

interface PaginatedTableProps {
  emptyText?: string;
  enableSearch?: boolean;
  enableDepartmentFilter?: boolean;
  enableRoleFilter?: boolean;
  enableStatusFilter?: boolean;
  enableDateRangeFilter?: boolean;
  enablePageSize?: boolean;
  availableDepartments?: string[];
  availableRoles?: string[];
  availableStatuses?: { value: string; label: string }[] | string[];
  availableCategories?: string[];
  availableBrands?: string[];
  dateRangeLabel?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  page?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  children: React.ReactNode;
  onFilterChange?: (filters: Filters) => void;
  loading?: boolean;
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
}

interface Filters {
  search: string;
  departments: (string | number)[];
  roles: (string | number)[];
  statuses: (string | number)[];
  categories: (string | number)[];
  brands: (string | number)[];
  dateRange: DateRange;
}

export default function PaginatedTable({
  emptyText,
  enableSearch,
  enableDepartmentFilter,
  enableRoleFilter,
  enableStatusFilter,
  enableDateRangeFilter,
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
  children,
  onFilterChange,
  loading = false,
  filterClassNames = {},
  buttonClassNames = {},
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
      availableStatuses.map((s) =>
        typeof s === "string"
          ? { label: s, value: s }
          : { label: s.label, value: s.value }
      ),
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

  const [filters, setFilters] = useState<Filters>({
    search: "",
    departments: [],
    roles: [],
    statuses: [],
    categories: [],
    brands: [],
    dateRange: { from: undefined, to: undefined },
  });

  const [internalPage, setInternalPage] = useState(0);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
  const currentPage = page !== undefined ? page - 1 : internalPage;
  const currentPageSize = pageSize ?? internalPageSize;
  const totalRows = total ?? 0;
  const totalPages = Math.ceil(totalRows / currentPageSize);

  useEffect(() => {
    if (onFilterChange) onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      if (onPageChange) onPageChange(1);
      else setInternalPage(0);
    },
    [onPageChange]
  );

  const handleResetFilter = useCallback(() => {
    const reset: Filters = {
      search: "",
      departments: [],
      roles: [],
      statuses: [],
      categories: [],
      brands: [],
      dateRange: { from: undefined, to: undefined },
    };
    setFilters(reset);
    if (onPageChange) onPageChange(1);
    else setInternalPage(0);
  }, [onPageChange]);

  const handleExportCSV = useCallback(() => {
    alert("Phát triển sau!");
  }, []);

  const goToPage = useCallback(
    (newPage: number) => {
      if (onPageChange) onPageChange(newPage + 1);
      else setInternalPage(newPage);
    },
    [onPageChange]
  );

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value);
      if (onPageChange) onPageChange(1);
      if (pageSize === undefined) setInternalPage(0);
      if (pageSize === undefined) setInternalPageSize(newSize);
    },
    [onPageChange, pageSize]
  );

  return (
    <div className="flex flex-col h-full min-h-[500px] space-y-4">
      <div className="mb-4">
        <div className="grid grid-cols-6 gap-3">
          {enableSearch && (
            <Input
              className={`min-w-0 w-full ${filterClassNames.search ?? ''}`}
              placeholder="Tìm kiếm..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          )}
          {enableDepartmentFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.departments ?? ''}`}
              placeholder="Phòng ban"
              value={filters.departments}
              options={departmentOptions}
              onChange={(vals) => updateFilter("departments", vals)}
            />
          )}
          {enableRoleFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.roles ?? ''}`}
              placeholder="Vai trò"
              value={filters.roles}
              options={roleOptions}
              onChange={(vals) => updateFilter("roles", vals)}
            />
          )}
          {enableStatusFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.statuses ?? ''}`}
              placeholder="Trạng thái"
              value={filters.statuses}
              options={statusOptions}
              onChange={(vals) => updateFilter("statuses", vals)}
            />
          )}
          <Button
            variant="gradient"
            size="sm"
            className={`min-w-0 w-full ${buttonClassNames.export ?? ''}`}
            onClick={handleExportCSV}
          >
            Xuất CSV
          </Button>
          <Button
            variant="delete"
            size="sm"
            className={`min-w-0 w-full ${buttonClassNames.reset ?? ''}`}
            onClick={handleResetFilter}
          >
            Xoá filter
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          {availableCategories.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.categories ?? ''}`}
              placeholder="Danh mục"
              value={filters.categories}
              options={categoryOptions}
              onChange={(vals) => updateFilter("categories", vals)}
            />
          )}
          {availableBrands.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.brands ?? ''}`}
              placeholder="Brand"
              value={filters.brands}
              options={brandOptions}
              onChange={(vals) => updateFilter("brands", vals)}
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
          children
        )}
      </div>

      <div className="flex justify-center gap-2 pt-2 mt-2">
        <Button
          variant="gradient"
          size="sm"
          className={buttonClassNames.prev ?? ''}
          onClick={() => goToPage(Math.max(currentPage - 1, 0))}
          disabled={currentPage === 0}
        >
          Trước
        </Button>
        <span className="text-sm px-2 mt-1.5">
          Trang {currentPage + 1} / {totalPages || 1}
        </span>
        <Button
          variant="gradient"
          size="sm"
          className={buttonClassNames.next ?? ''}
          onClick={() => goToPage(Math.min(currentPage + 1, totalPages - 1))}
          disabled={currentPage >= totalPages - 1}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
