"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MultiSelectCombobox,
  Option,
} from "@/components/ui/MultiSelectCombobox";
import { DatePicker } from "@/components/ui/date-picker";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
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
  enableCategoriesFilter?: boolean;
  availableEmployees?: Option[];
  enableDateRangeFilter?: boolean;
  enableSingleDateFilter?: boolean;
  enablePageSize?: boolean;
  availableDepartments?:
    | string[]
    | { value: number | string; label: string }[] // ✅ Support cả number và string
    | readonly { readonly value: number | string; readonly label: string }[];
  availableRoles?: string[];
  availableStatuses?:
    | string[]
    | { value: string; label: string }[]
    | readonly { readonly value: string; readonly label: string }[];
  availableZaloLinkStatuses?: { value: string | number; label: string }[];
  availableCategories?:
    | string[]
    | { value: string; label: string }[]
    | readonly { readonly value: string; readonly label: string }[];
  availableBrands?: string[];
  // Thêm props cho warning levels
  enableWarningLevelFilter?: boolean;
  availableWarningLevels?:
    | string[]
    | { value: string; label: string }[]
    | readonly { readonly value: string; readonly label: string }[];
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
  // Thêm flag để biết khi đang restore state
  isRestoring?: boolean;
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
  preventEmptyFilterCall?: boolean;
  onDepartmentChange?: (departments: (string | number)[]) => void;
}

export type Filters = {
  search: string;
  departments: (string | number)[];
  roles: (string | number)[];
  statuses: (string | number)[];
  zaloLinkStatuses?: (string | number)[];
  categories: (string | number)[];
  brands: (string | number)[];
  warningLevels: (string | number)[]; // Thêm warning levels
  dateRange: DateRange;
  singleDate?: Date | string; // Support both Date and string
  employees: (string | number)[];
  sort?: { field: string; direction: "asc" | "desc" } | undefined;
};

export default function PaginatedTable({
  enableSearch,
  enableDepartmentFilter,
  enableRoleFilter,
  enableStatusFilter,
  enableEmployeeFilter,
  availableEmployees = [],
  // Thêm các props mới
  enableZaloLinkStatusFilter,
  enableCategoriesFilter,
  availableZaloLinkStatuses = [
    { value: 0, label: "Chưa liên kết" },
    { value: 1, label: "Đã liên kết" },
    { value: 2, label: "Lỗi liên kết" },
  ],
  enableSingleDateFilter,
  enableDateRangeFilter,
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
  // Thêm props cho warning levels
  enableWarningLevelFilter,
  availableWarningLevels = [],
  defaultPageSize = 10,
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  children,
  onFilterChange,
  loading = false,
  initialFilters,
  filterClassNames = {},
  buttonClassNames = {},
  getExportData,
  canExport = true,
  onResetFilter,
  preventEmptyFilterCall = true,
  onDepartmentChange,
  isRestoring = false,
}: PaginatedTableProps) {
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const lastFiltersRef = useRef<string>("");
  const previousTotalRef = useRef<number>(0);

  const departmentOptions = useMemo(() => {
    if (!availableDepartments || availableDepartments.length === 0) {
      return [];
    }

    const firstItem = availableDepartments[0];

    // ✅ SỬA: Kiểm tra type trước khi truy cập property
    if (
      typeof firstItem === "object" &&
      firstItem !== null &&
      "value" in firstItem &&
      "label" in firstItem
    ) {
      // Nếu là array of objects {value, label}
      return (
        availableDepartments as Array<{ value: number; label: string }>
      ).map((d) => ({
        label: d.label,
        value: d.value.toString(),
      }));
    } else {
      // Nếu là array of strings
      return (availableDepartments as string[]).map((d) => ({
        label: d,
        value: d,
      }));
    }
  }, [availableDepartments]);

  const roleOptions = useMemo(
    () => availableRoles.map((r) => ({ label: r, value: r })),
    [availableRoles]
  );
  const statusOptions = useMemo(() => {
    if (!availableStatuses || availableStatuses.length === 0) {
      return [];
    }

    return availableStatuses.map((s) => {
      let label: string;
      let value: string;

      if (typeof s === "string") {
        value = s;
        // Map đúng label cho string values
        if (s === "draft") label = "Bản nháp";
        else if (s === "scheduled") label = "Đã lên lịch";
        else if (s === "running") label = "Đang chạy";
        else if (s === "paused") label = "Tạm dừng";
        else if (s === "completed") label = "Hoàn thành";
        else if (s === "archived") label = "Đã lưu trữ";
        else if (s === "paid") label = "Đã thanh toán";
        else if (s === "pay_later") label = "Đã hẹn thanh toán";
        else if (s === "no_information_available") label = "Không có thông tin";
        else if (s === "active") label = "Đang hoạt động";
        else if (s === "inactive") label = "Ngưng hoạt động";
        else label = s; // Fallback
      } else if (
        typeof s === "object" &&
        s !== null &&
        "value" in s &&
        "label" in s
      ) {
        // ✅ SỬA: Type assertion cho object case
        const statusObj = s as { value: string; label: string };
        value = statusObj.value;
        label = statusObj.label;
      } else {
        // Fallback case
        value = String(s);
        label = String(s);
      }

      return { label, value };
    });
  }, [availableStatuses]);

  const categoryOptions = useMemo(() => {
    if (!availableCategories || availableCategories.length === 0) {
      return [];
    }

    return availableCategories.map((c) => {
      if (typeof c === "string") {
        return { label: c, value: c };
      } else if (
        typeof c === "object" &&
        c !== null &&
        "value" in c &&
        "label" in c
      ) {
        // ✅ SỬA: Type assertion để tránh lỗi TypeScript
        const categoryObj = c as { value: string; label: string };
        return { label: categoryObj.label, value: categoryObj.value };
      } else {
        // Fallback case
        return { label: String(c), value: String(c) };
      }
    });
  }, [availableCategories]);

  const brandOptions = useMemo(
    () => availableBrands.map((b) => ({ label: b, value: b })),
    [availableBrands]
  );
  
  // Thêm warningLevelOptions
  const warningLevelOptions = useMemo(() => {
    if (!availableWarningLevels || availableWarningLevels.length === 0) {
      return [];
    }

    return availableWarningLevels.map((w) => {
      if (typeof w === "string") {
        return { label: w, value: w };
      } else if (
        typeof w === "object" &&
        w !== null &&
        "value" in w &&
        "label" in w
      ) {
        const warningObj = w as { value: string; label: string };
        return { label: warningObj.label, value: warningObj.value };
      } else {
        return { label: String(w), value: String(w) };
      }
    });
  }, [availableWarningLevels]);
  
  const employeeOptions = useMemo(
    () => availableEmployees.map((e) => ({ label: e.label, value: e.value })),
    [availableEmployees]
  );

  // Thêm useMemo cho zaloLinkStatusOptions
  const zaloLinkStatusOptions = useMemo(
    () =>
      availableZaloLinkStatuses.map((s) => ({
        label: s.label,
        value: s.value,
      })),
    [availableZaloLinkStatuses]
  );

  const [filters, setFilters] = useState<Filters>(() => {
    return {
      search: initialFilters?.search || "",
      departments: initialFilters?.departments || [],
      roles: initialFilters?.roles || [],
      statuses: initialFilters?.statuses || [],
      zaloLinkStatuses: initialFilters?.zaloLinkStatuses || [],
      categories: initialFilters?.categories || [],
      brands: initialFilters?.brands || [],
      warningLevels: initialFilters?.warningLevels || [], // Thêm warning levels
      dateRange: initialFilters?.dateRange || { from: undefined, to: undefined },
      singleDate: initialFilters?.singleDate || undefined, // Không set mặc định
      employees: initialFilters?.employees || [],
    };
  });

  const isFiltersEmpty = useCallback((filters: Filters): boolean => {
    return (
      !filters.search.trim() &&
      filters.departments.length === 0 &&
      filters.roles.length === 0 &&
      filters.statuses.length === 0 &&
      (filters.zaloLinkStatuses?.length || 0) === 0 &&
      filters.categories.length === 0 &&
      filters.brands.length === 0 &&
      filters.warningLevels.length === 0 && // Thêm warning levels
      filters.employees.length === 0 &&
      !filters.dateRange.from &&
      !filters.dateRange.to &&
      !filters.singleDate
    );
  }, []);

  // Sync filters when initialFilters changes - but only if preserveFiltersOnEmpty is true
  const memoizedInitialFilters = useMemo(
    () => initialFilters,
    [
      initialFilters?.search,
      JSON.stringify(initialFilters?.departments),
      JSON.stringify(initialFilters?.roles),
      JSON.stringify(initialFilters?.statuses),
      JSON.stringify(initialFilters?.zaloLinkStatuses),
      JSON.stringify(initialFilters?.categories),
      JSON.stringify(initialFilters?.brands),
      JSON.stringify(initialFilters?.warningLevels), // Thêm warning levels
      JSON.stringify(initialFilters?.dateRange),
      initialFilters?.singleDate,
      JSON.stringify(initialFilters?.employees),
    ]
  );

  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const userModifiedFieldsRef = useRef<Set<keyof Filters>>(new Set()); // Track which fields user modified
  const previousInitialFiltersRef = useRef<Partial<Filters> | undefined>(undefined);

  useEffect(() => {
    // Only clear user modifications if initialFilters changed significantly
    // AND it's not just due to API response differences
    if (memoizedInitialFilters && previousInitialFiltersRef.current) {
      const currentStringified = JSON.stringify(previousInitialFiltersRef.current);
      const incomingStringified = JSON.stringify(memoizedInitialFilters);
      
      // More sophisticated comparison - ignore changes that look like API responses
      const significant = currentStringified !== incomingStringified;
      
      if (significant) {
        // Additional check: don't clear if the change is just about preserving user selections
        const isPreservingUserSelections = userModifiedFieldsRef.current.size > 0;
        
        if (!isPreservingUserSelections) {
          setHasUserInteracted(false);
          userModifiedFieldsRef.current.clear();
        } else {
        }
      }
    } else if (memoizedInitialFilters && !previousInitialFiltersRef.current) {
      setHasUserInteracted(false);
    }
    previousInitialFiltersRef.current = memoizedInitialFilters;
  }, [memoizedInitialFilters]);

  useEffect(() => {
    if (!isInitializedRef.current && initialFilters) {
      isInitializedRef.current = true;

      // ✅ Set initial filters without triggering change
      const merged = { ...filters, ...initialFilters };
      setFilters(merged);

      // ✅ Send initial filters to parent immediately but only once
      if (
        onFilterChange &&
        (!preventEmptyFilterCall || !isFiltersEmpty(merged))
      ) {
        onFilterChange(merged);
      }
    }
  }, []);

  // ✅ IMPROVED: Selective sync logic based on user modifications
  useEffect(() => {
    if (memoizedInitialFilters && isInitializedRef.current) {
      setFilters((prev) => {
        // ✅ Force sync nếu đang restore hoặc user chưa tương tác
        if (!hasUserInteracted || isRestoring) {
          console.log("🔄 Force syncing filters from initialFilters", { isRestoring, hasUserInteracted });
          // Sync tất cả nếu user chưa tương tác hoặc đang restore
          const newFilters = {
            search:
              memoizedInitialFilters.search !== undefined
                ? memoizedInitialFilters.search
                : prev.search,
            departments:
              memoizedInitialFilters.departments !== undefined
                ? memoizedInitialFilters.departments
                : prev.departments,
            roles:
              memoizedInitialFilters.roles !== undefined
                ? memoizedInitialFilters.roles
                : prev.roles,
            statuses:
              memoizedInitialFilters.statuses !== undefined
                ? memoizedInitialFilters.statuses
                : prev.statuses,
            zaloLinkStatuses:
              memoizedInitialFilters.zaloLinkStatuses !== undefined
                ? memoizedInitialFilters.zaloLinkStatuses
                : prev.zaloLinkStatuses,
            categories:
              memoizedInitialFilters.categories !== undefined
                ? memoizedInitialFilters.categories
                : prev.categories,
            brands:
              memoizedInitialFilters.brands !== undefined
                ? memoizedInitialFilters.brands
                : prev.brands,
            warningLevels:
              memoizedInitialFilters.warningLevels !== undefined
                ? memoizedInitialFilters.warningLevels
                : prev.warningLevels,
            dateRange:
              memoizedInitialFilters.dateRange !== undefined
                ? memoizedInitialFilters.dateRange
                : prev.dateRange,
            singleDate:
              memoizedInitialFilters.singleDate !== undefined
                ? memoizedInitialFilters.singleDate
                : prev.singleDate,
            employees:
              memoizedInitialFilters.employees !== undefined
                ? memoizedInitialFilters.employees
                : prev.employees,
          };

          // Only update if actually different
          const isEqual = JSON.stringify(prev) === JSON.stringify(newFilters);
          return isEqual ? prev : newFilters;
        } else {
          // Chỉ sync những field chưa bị user modify
          const newFilters = { ...prev };
          let hasChanges = false;

          const fieldsToCheck = [
            'search', 'departments', 'roles', 'statuses', 'zaloLinkStatuses',
            'categories', 'brands', 'warningLevels', 'dateRange', 'singleDate', 'employees'
          ] as (keyof Filters)[];

          fieldsToCheck.forEach(field => {
            if (!userModifiedFieldsRef.current.has(field) && 
                memoizedInitialFilters[field] !== undefined) {
              const currentValue = prev[field];
              const incomingValue = memoizedInitialFilters[field];
              
              // More precise comparison
              const isDifferent = JSON.stringify(currentValue) !== JSON.stringify(incomingValue);
              
              if (isDifferent) {
                newFilters[field] = incomingValue as any;
                hasChanges = true;
              }
            } else if (userModifiedFieldsRef.current.has(field)) {
            }
          });
          return hasChanges ? newFilters : prev;
        }
      });
    }
  }, [memoizedInitialFilters, hasUserInteracted, isRestoring]);

  // Xác định chế độ phân trang: backend (có page, pageSize, total) hay frontend (không có)
  const isBackendPaging =
    page !== undefined && pageSize !== undefined && total !== undefined;

  // State cho frontend pagination
  const [internalPage, setInternalPage] = useState(0); // 0-based
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);

  // Tính toán page/pageSize hiện tại
  const currentPage = isBackendPaging ? page! : internalPage + 1; // 1-based
  const currentPageSize = isBackendPaging ? pageSize! : internalPageSize;
  const totalRows = isBackendPaging
    ? total!
    : children && Array.isArray(children)
    ? children.length
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / currentPageSize));

  // State tạm cho input pageSize (chỉ áp dụng cho input nhập số dòng/trang)
  const [pendingPageSize, setPendingPageSize] = useState<number | "">(
    currentPageSize
  );
  useEffect(() => {
    setPendingPageSize(currentPageSize);
  }, [currentPageSize]);

  // Debounce filter cho backend: giảm thời gian xuống 300ms để responsive hơn
  const filterTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleResetFilter = useCallback(() => {
    const reset: Filters = {
      search: "",
      departments: [],
      roles: [],
      statuses: [],
      zaloLinkStatuses: [],
      categories: [],
      brands: [],
      warningLevels: [], // Thêm warning levels
      dateRange: { from: undefined, to: undefined },
      singleDate: undefined,
      employees: [],
    };

    setFilters(reset);
    setHasUserInteracted(false); // ✅ THÊM: Reset user interaction flag

    // ✅ THÊM: Reset department selection trong parent component
    if (onDepartmentChange) {
      onDepartmentChange([]);
    }

    if (onFilterChange) {
      onFilterChange(reset);
    }

    if (onPageChange) onPageChange(1);
    else setInternalPage(0);

    setPendingPageSize("");

    // Gọi callback reset filter ở trang cha nếu có
    if (typeof onResetFilter === "function") {
      onResetFilter();
    }
  }, [onPageChange, onResetFilter, onFilterChange, onDepartmentChange]);

  // ✅ FIXED: Debounce filter với sync state management
  const debouncedSetFilters = useCallback(
    (newFilters: Filters) => {
      if (filterTimeout.current) clearTimeout(filterTimeout.current);
      filterTimeout.current = setTimeout(() => {
        if (onFilterChange) {
          onFilterChange(newFilters);
        }
      }, 300);
    },
    [onFilterChange, preventEmptyFilterCall, isFiltersEmpty]
  );

  useEffect(() => {
    if (totalRows !== previousTotalRef.current) {
      previousTotalRef.current = totalRows;
    }
  }, [totalRows]);

  // updateFilter chỉ cập nhật filter, không reset page
  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setHasUserInteracted(true); // Mark that user has interacted
      userModifiedFieldsRef.current.add(key); // Track which field was modified
      
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
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value); // Update UI immediately
      
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Debounce the actual filter update - ALWAYS fire, even for empty values
      searchTimeoutRef.current = setTimeout(() => {
        updateFilter("search", value); // This will save to localStorage via debouncedSetFilters
      }, 300);
    },
    [updateFilter]
  );

  // Sync searchInput with filters.search when it changes externally
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // ✅ Sync internalPage with page prop when it changes externally (e.g., browser back)
  useEffect(() => {
    if (isBackendPaging && page !== undefined) {
      // Convert 1-based page prop to 0-based internalPage
      const expectedInternalPage = page - 1;
      if (internalPage !== expectedInternalPage) {
        console.log("🔄 Syncing internalPage from prop:", { page, expectedInternalPage, currentInternalPage: internalPage });
        setInternalPage(expectedInternalPage);
      }
    }
  }, [page, isBackendPaging, internalPage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (filterTimeout.current) {
        clearTimeout(filterTimeout.current);
      }
    };
  }, []);

  const handleEmployeesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("employees", vals);
    },
    [updateFilter]
  );

  const handleDepartmentsChange = useCallback(
    (vals: (string | number)[]) => {
      let departments: (string | number)[];

      if (availableDepartments && availableDepartments.length > 0) {
        const firstItem = availableDepartments[0];

        // ✅ SỬA: Kiểm tra type đúng cách
        if (
          typeof firstItem === "object" &&
          firstItem !== null &&
          "value" in firstItem
        ) {
          // Nếu availableDepartments là array of objects
          const deptArray = availableDepartments as Array<{
            value: number;
            label: string;
          }>;
          departments = vals
            .map((v) => {
              const dept = deptArray.find(
                (d) => d.value.toString() === v.toString()
              );
              return dept ? dept.value : parseInt(v.toString(), 10);
            })
            .filter((v) => !isNaN(Number(v)));
        } else {
          // Nếu availableDepartments là array of strings
          departments = vals;
        }
      } else {
        departments = vals;
      }

      updateFilter("departments", departments);

      // Trigger department change callback
      if (onDepartmentChange) {
        onDepartmentChange(departments);
      }
    },
    [updateFilter, onDepartmentChange, availableDepartments]
  );

  const handleRolesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("roles", vals);
    },
    [updateFilter]
  );

  const handleStatusesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("statuses", vals);
    },
    [updateFilter]
  );

  const handleZaloLinkStatusesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("zaloLinkStatuses", vals);
    },
    [updateFilter]
  );

  const handleCategoriesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("categories", vals);
    },
    [updateFilter]
  );

  const handleBrandsChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("brands", vals);
    },
    [updateFilter]
  );

  const handleWarningLevelsChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("warningLevels", vals);
    },
    [updateFilter]
  );

  // ...existing code...

  // State cho panel xuất CSV
  const [openExport, setOpenExport] = useState(false);

  // ✅ IMPROVED: Better page size management
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value);
      
      // Validate page size
      if (newSize <= 0 || isNaN(newSize)) {
        console.warn('Invalid page size:', newSize);
        return;
      }
      
      if (isBackendPaging && onPageSizeChange) {
        onPageSizeChange(newSize);
      } else {
        setInternalPage(0);
        setInternalPageSize(newSize);
      }
    },
    [isBackendPaging, onPageSizeChange]
  );

  // ✅ IMPROVED: Better page management
  const goToPage = useCallback(
    (newPage: number) => {
      // Ensure page is within valid range
      const validPage = Math.max(1, Math.min(newPage, totalPages));
      
      if (isBackendPaging && onPageChange) {
        onPageChange(validPage);
      } else {
        setInternalPage(validPage - 1);
      }
    },
    [isBackendPaging, onPageChange, totalPages]
  );

  // ✅ IMPROVED: Auto-correct page when pageSize changes to prevent empty pages
  useEffect(() => {
    if (totalRows > 0 && currentPage > totalPages) {
      const correctedPage = Math.max(1, totalPages);
      goToPage(correctedPage);
    }
  }, [totalPages, currentPage, totalRows, goToPage]);

  // Khi input số dòng/trang rỗng, tự động reset pageSize về mặc định (nhưng không khi đang restore)
  useEffect(() => {
    if (pendingPageSize === "" && !isRestoring) {
      if (isBackendPaging && onPageSizeChange)
        onPageSizeChange(defaultPageSize);
      else setInternalPageSize(defaultPageSize);
      if (onPageChange) onPageChange(1);
      else setInternalPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPageSize, isRestoring]);

  return (
    <div className="flex flex-col h-full min-h-[500px] space-y-4 w-full">
      <div className="mb-4">
        <div className="grid grid-cols-6 gap-3">
          {enableSearch && (
            <Input
              className={`min-w-0 w-full ${filterClassNames.search ?? ""}`}
              placeholder="Tìm kiếm..."
              value={searchInput}
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
              className={`min-w-0 w-full ${filterClassNames.departments ?? ""}`}
              placeholder="Phòng ban"
              value={filters.departments.map(d => d.toString())}
              options={departmentOptions}
              onChange={handleDepartmentsChange}
            />
          )}
          {enableRoleFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.roles ?? ""}`}
              placeholder="Vai trò"
              value={filters.roles}
              options={roleOptions}
              onChange={handleRolesChange}
            />
          )}
          {enableStatusFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.statuses ?? ""}`}
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
          {enableCategoriesFilter && availableCategories.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.categories ?? ""}`}
              placeholder="Danh mục"
              value={filters.categories}
              options={categoryOptions}
              onChange={handleCategoriesChange}
            />
          )}
          {availableBrands.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.brands ?? ""}`}
              placeholder="Brand"
              value={filters.brands}
              options={brandOptions}
              onChange={handleBrandsChange}
            />
          )}
          {enableWarningLevelFilter && warningLevelOptions.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full`}
              placeholder="Mức độ cảnh báo"
              value={filters.warningLevels}
              options={warningLevelOptions}
              onChange={handleWarningLevelsChange}
            />
          )}
          {enableSingleDateFilter && (
            <DatePicker
              value={
                filters.singleDate ? new Date(filters.singleDate) : undefined
              }
              onChange={(date) =>
                updateFilter(
                  "singleDate",
                  date ? date.toLocaleDateString("en-CA") : undefined
                )
              }
            />
          )}
          {enableDateRangeFilter && (
            <div className="min-w-0 w-full">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    {/* <CalendarDays className="mr-2 h-4 w-4" /> */}
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "dd/MM/yyyy", { locale: vi })} -{" "}
                          {format(filters.dateRange.to, "dd/MM/yyyy", { locale: vi })}
                        </>
                      ) : (
                        format(filters.dateRange.from, "dd/MM/yyyy", { locale: vi })
                      )
                    ) : (
                      <span>Chọn khoảng thời gian</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={filters.dateRange}
                    onSelect={(dateRange) => {
                      updateFilter("dateRange", dateRange || { from: undefined, to: undefined });
                    }}
                    numberOfMonths={2}
                    locale={vi}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          {/* Số dòng/trang nằm ngang hàng filter */}
          {enablePageSize && (
            <Input
              type="number"
              min={1}
              className="min-w-0 w-full border rounded px-2 py-1 text-sm"
              value={pendingPageSize}
              placeholder="Số dòng/trang"
              onChange={(e) => {
                const val = Number(e.target.value);
                setPendingPageSize(
                  e.target.value === "" ? "" : val > 0 ? val : ""
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = Number(pendingPageSize);
                  if (!isNaN(val) && val > 0) {
                    if (isBackendPaging && onPageSizeChange)
                      onPageSizeChange(val);
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
                className={`min-w-0 ${canExport ? "w-1/2" : "w-full"} ${
                  buttonClassNames.export ?? ""
                }`}
                onClick={() => setOpenExport(true)}
                disabled={!getExportData}
              >
                Xuất CSV
              </Button>
            )}
            <Button
              type="button"
              variant="delete"
              className={`min-w-0 ${
                canExport && getExportData ? "w-1/2" : "w-full"
              } ${buttonClassNames.reset ?? ""}`}
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
          className={buttonClassNames.prev ?? ""}
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
          className={buttonClassNames.next ?? ""}
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
