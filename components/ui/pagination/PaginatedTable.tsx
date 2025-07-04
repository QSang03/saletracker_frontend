"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MultiSelectCombobox,
  Option,
} from "@/components/ui/MultiSelectCombobox";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";

interface PaginatedTableProps {
  emptyText?: string;

  // Filter options
  enableSearch?: boolean;
  enableDepartmentFilter?: boolean;
  enableRoleFilter?: boolean;
  enableStatusFilter?: boolean;
  enableDateRangeFilter?: boolean;
  enablePageSize?: boolean;

  availableDepartments?: string[];
  availableRoles?: string[];
  availableStatuses?: { value: string; label: string }[] | string[];
  dateRangeLabel?: string;

  // Pagination
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  page?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;

  // Table content
  children: React.ReactNode;

  // Optional: callback to get filter state outside
  onFilterChange?: (filters: {
    search: string;
    departments: (string | number)[];
    roles: (string | number)[];
    statuses: (string | number)[];
    dateRange: DateRange;
  }) => void;
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
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  page,
  total,
  pageSize,
  onPageChange,
  children,
  onFilterChange,
}: PaginatedTableProps) {
  // Convert string[] or {value,label}[] to Option[] for combobox
  const departmentOptions: Option[] = availableDepartments.map((d) => ({
    label: d,
    value: d,
  }));
  const roleOptions: Option[] = availableRoles.map((r) => ({
    label: r,
    value: r,
  }));
  const statusOptions: Option[] = availableStatuses.map((s) =>
    typeof s === "string"
      ? { label: s, value: s }
      : { label: s.label, value: s.value }
  );

  // Filter states
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<(string | number)[]>([]);
  const [roles, setRoles] = useState<(string | number)[]>([]);
  const [statuses, setStatuses] = useState<(string | number)[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  // Pagination state (internal nếu không truyền props)
  const [internalPage, setInternalPage] = useState(0);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);

  const currentPage = page !== undefined ? page - 1 : internalPage;
  const currentPageSize = pageSize ?? internalPageSize;
  const totalRows = total ?? 0;
  const totalPages = Math.ceil(totalRows / currentPageSize);

  // Xuất CSV: bạn có thể truyền callback xuất CSV từ ngoài vào nếu muốn
  const handleExportCSV = () => {
    alert("Hàm xuất CSV nên được truyền từ component bảng con!");
  };

  // Reset filter
  const handleResetFilter = () => {
    setSearch("");
    setDepartments([]);
    setRoles([]);
    setStatuses([]);
    setDateRange({ from: undefined, to: undefined });
    if (onPageChange) onPageChange(1);
    else setInternalPage(0);
    if (onFilterChange)
      onFilterChange({
        search: "",
        departments: [],
        roles: [],
        statuses: [],
        dateRange: { from: undefined, to: undefined },
      });
  };

  // Chuyển trang
  const goToPage = (newPage: number) => {
    if (onPageChange) onPageChange(newPage + 1);
    else setInternalPage(newPage);
  };

  // Đổi pageSize
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    if (onPageChange) onPageChange(1);
    if (pageSize === undefined) setInternalPage(0);
    if (pageSize === undefined) setInternalPageSize(newSize);
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] space-y-4">
      {(enableSearch ||
        enableDepartmentFilter ||
        enableRoleFilter ||
        enableStatusFilter ||
        enableDateRangeFilter ||
        enablePageSize) && (
        <div className="mb-4">
          <div className="grid grid-cols-5 gap-2">
            {enableSearch && (
              <div className="w-full">
                <Input
                  placeholder="Tìm kiếm..."
                  className="w-full"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (onPageChange) onPageChange(1);
                    else setInternalPage(0);
                    if (onFilterChange)
                      onFilterChange({
                        search: e.target.value,
                        departments,
                        roles,
                        statuses,
                        dateRange,
                      });
                  }}
                  style={{ minWidth: 0 }}
                />
              </div>
            )}
            {enableDepartmentFilter && (
              <div className="w-full">
                <MultiSelectCombobox
                  placeholder="Chọn phòng ban"
                  value={departments}
                  options={departmentOptions}
                  onChange={(vals) => {
                    setDepartments(vals);
                    if (onPageChange) onPageChange(1);
                    else setInternalPage(0);
                    if (onFilterChange)
                      onFilterChange({
                        search,
                        departments: vals,
                        roles,
                        statuses,
                        dateRange,
                      });
                  }}
                />
              </div>
            )}
            {enableRoleFilter && (
              <div className="w-full">
                <MultiSelectCombobox
                  placeholder="Chọn vai trò"
                  value={roles}
                  options={roleOptions}
                  onChange={(vals) => {
                    setRoles(vals);
                    if (onPageChange) onPageChange(1);
                    else setInternalPage(0);
                    if (onFilterChange)
                      onFilterChange({
                        search,
                        departments,
                        roles: vals,
                        statuses,
                        dateRange,
                      });
                  }}
                />
              </div>
            )}
            {enableStatusFilter && (
              <div className="w-full">
                <MultiSelectCombobox
                  placeholder="Chọn trạng thái"
                  value={statuses}
                  options={statusOptions}
                  onChange={(vals) => {
                    setStatuses(vals);
                    if (onPageChange) onPageChange(1);
                    else setInternalPage(0);
                    if (onFilterChange)
                      onFilterChange({
                        search,
                        departments,
                        roles,
                        statuses: vals,
                        dateRange,
                      });
                  }}
                />
              </div>
            )}
            {/* 2 nút xuất file + xóa filter */}
            <div className="flex gap-2 w-full">
              <Button
                variant="gradient"
                size="sm"
                className="w-1/2 min-w-[100px]"
                onClick={handleExportCSV}
              >
                Xuất CSV (Trang {currentPage + 1})
              </Button>
              <Button
                variant="delete"
                size="sm"
                className="w-1/2 min-w-[100px]"
                onClick={handleResetFilter}
              >
                Xóa filter
              </Button>
            </div>
            {enableDateRangeFilter && (
              <div className="col-span-1 mt-2 w-full">
                <DateRangePicker
                  initialDateRange={dateRange}
                  onUpdate={({ range }) => {
                    setDateRange(range);
                    if (onPageChange) onPageChange(1);
                    else setInternalPage(0);
                    if (onFilterChange)
                      onFilterChange({
                        search,
                        departments,
                        roles,
                        statuses,
                        dateRange: range,
                      });
                  }}
                  locale="vi"
                  align="start"
                />
              </div>
            )}
            {enablePageSize && (
              <div className="col-span-1 mt-2 w-full">
                <select
                  className="p-2 border rounded w-full"
                  value={currentPageSize}
                  onChange={handlePageSizeChange}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size} dòng/trang
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render bảng động */}
      <div className="flex-1">{children}</div>

      {/* Pagination luôn ở cuối */}
      <div className="flex justify-center gap-2 pt-2 mt-2">
        <Button
          variant="gradient"
          size="sm"
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
          onClick={() => goToPage(Math.min(currentPage + 1, totalPages - 1))}
          disabled={currentPage >= totalPages - 1}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}