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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import CSVExportPanel from "@/components/ui/tables/CSVExportPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaginatedTableProps {
  emptyText?: string;
  enableSearch?: boolean;
  enableDepartmentFilter?: boolean;
  enableRoleFilter?: boolean;
  enableStatusFilter?: boolean;
  enableManagerFilter?: boolean; // Thêm filter cho trưởng nhóm
  enableEmployeeFilter?: boolean;
  enableZaloLinkStatusFilter?: boolean;
  enableCategoriesFilter?: boolean;
  availableEmployees?: Option[];
  enableDateRangeFilter?: boolean;
  enableSingleDateFilter?: boolean;
  enablePageSize?: boolean;
  // Hiển thị input "đi tới trang"
  enableGoToPage?: boolean;
  availableDepartments?:
    | string[]
    | { value: number | string; label: string }[] // ✅ Support cả number và string
    | readonly { readonly value: number | string; readonly label: string }[];
  availableRoles?: string[];
  availableManagers?: // Thêm danh sách trưởng nhóm
    | string[]
    | { value: number | string; label: string; departments?: any[] }[]
    | readonly { readonly value: number | string; readonly label: string; departments?: any[] }[];
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
  // Enable a conversation type filter (e.g., group/private) — optional
  enableConversationTypeFilter?: boolean;
  availableWarningLevels?:
    | string[]
    | { value: string; label: string }[]
    | readonly { readonly value: string; readonly label: string }[];
  // Thêm props cho quantity filter
  enableQuantityFilter?: boolean;
  quantityLabel?: string;
  defaultQuantity?: number;
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
    managers?: string;
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
  // Optional async getter to fetch ALL rows for export (backend paging)
  getExportAllData?: () => Promise<(string | number)[][]>;
  canExport?: boolean;
  onResetFilter?: () => void;
  // Optional callback when the search tag is cleared (e.g., exit customer search mode)
  onClearSearch?: () => void;
  preventEmptyFilterCall?: boolean;
  onDepartmentChange?: (departments: (string | number)[]) => void;
  onEmployeeChange?: (employees: (string | number)[]) => void;
  onWarningLevelChange?: (warningLevels: (string | number)[]) => void;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
  // When true, render only the controls (filters + pagination) without a content area
  controlsOnly?: boolean;
  // Hide the built-in pager (Prev/Next + page indicator). Useful when embedding this toolbar at the top
  // and rendering a separate pager at the bottom near the table list.
  hidePager?: boolean;
  // Optional small toggles rendered on the right side of the filter toolbar, each with optional tooltip
  toggles?: Array<{
    id: string;
    label: string;
    tooltip?: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
  }>;
}

export type Filters = {
  search: string;
  departments: (string | number)[];
  roles: (string | number)[];
  statuses: (string | number)[];
  managers?: (string | number)[]; // Thêm filter cho trưởng nhóm
  zaloLinkStatuses?: (string | number)[];
  categories: (string | number)[];
  brands: (string | number)[];
  warningLevels: (string | number)[]; // Thêm warning levels
  quantity?: number; // Thêm quantity filter
  minQuantity?: number; // Số lượng tối thiểu
  conversationType?: string[]; // Thêm conversation type filter
  dateRange: DateRange;
  singleDate?: Date | string; // Support both Date and string
  employees: (string | number)[];
  sort?: { field: string; direction: "asc" | "desc" } | undefined; // Cập nhật type sort
};

export default function PaginatedTable({
  enableSearch,
  enableDepartmentFilter,
  enableRoleFilter,
  enableStatusFilter,
  enableManagerFilter,
  enableEmployeeFilter,
  availableEmployees = [],
  // Thêm các props mới
  enableZaloLinkStatusFilter,
  enableCategoriesFilter,
  enableGoToPage = false,
  enableConversationTypeFilter,
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
  availableManagers = [],
  availableStatuses = [
    { value: "active", label: "Đang hoạt động" },
    { value: "inactive", label: "Ngưng hoạt động" },
  ],
  availableCategories = [],
  availableBrands = [],
  // Thêm props cho warning levels
  enableWarningLevelFilter,
  availableWarningLevels = [],
  // Thêm props cho quantity filter
  enableQuantityFilter,
  quantityLabel = "Số lượng",
  defaultQuantity = 1,
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
  getExportAllData,
  canExport = true,
  onResetFilter,
  onClearSearch,
  preventEmptyFilterCall = true,
  onDepartmentChange,
  onEmployeeChange,
  onWarningLevelChange,
  onDateRangeChange,
  isRestoring = false,
  controlsOnly = false,
  hidePager = false,
  toggles = [],
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
      managers: initialFilters?.managers || [], // Thêm filter trưởng nhóm
      zaloLinkStatuses: initialFilters?.zaloLinkStatuses || [],
      categories: initialFilters?.categories || [],
      brands: initialFilters?.brands || [],
  warningLevels: initialFilters?.warningLevels || [], // Thêm warning levels
  quantity: (initialFilters && "quantity" in initialFilters)
    ? (initialFilters.quantity as number | undefined)
    : defaultQuantity, // Tôn trọng initial quantity nếu được set, ngược lại dùng mặc định
  conversationType: initialFilters?.conversationType || [], // Thêm conversation type
      dateRange: initialFilters?.dateRange || {
        from: undefined,
        to: undefined,
      },
      singleDate: initialFilters?.singleDate || undefined, // Không set mặc định
      employees: initialFilters?.employees || [],
      sort: initialFilters?.sort || undefined, // Thêm property sort
    };
  });

  const managerOptions = useMemo(() => {
    if (!availableManagers || availableManagers.length === 0) {
      return [];
    }

    // Lọc danh sách trưởng nhóm dựa trên phòng ban được chọn
    let filteredManagers: any[] = [...availableManagers];
    if (filters.departments && filters.departments.length > 0) {
      const selectedDeptId = filters.departments[0];
      filteredManagers = availableManagers.filter((manager: any) => {
        if (typeof manager === 'string') return true; // Nếu là string thì không filter
        if (typeof manager === 'object' && 'departments' in manager) {
          const managerDepts = manager.departments;
          return managerDepts && managerDepts.some((dept: any) => dept.id === selectedDeptId);
        }
        return true;
      });
    }

    const firstItem = filteredManagers[0];
    if (typeof firstItem === "string") {
      return filteredManagers.map((m: any) => ({ label: m, value: m }));
    } else {
      return filteredManagers.map((m: any) => ({
        label: m.label,
        value: m.value,
      }));
    }
  }, [availableManagers, filters.departments]);

  const isFiltersEmpty = useCallback((filters: Filters): boolean => {
    return (
      !filters.search.trim() &&
      filters.departments.length === 0 &&
      filters.roles.length === 0 &&
      filters.statuses.length === 0 &&
      (filters.managers?.length || 0) === 0 &&
      (filters.zaloLinkStatuses?.length || 0) === 0 &&
      filters.categories.length === 0 &&
      filters.brands.length === 0 &&
      filters.warningLevels.length === 0 && // Thêm warning levels
  (!filters.quantity || filters.quantity === defaultQuantity) && // Thêm quantity check
  (filters.conversationType?.length || 0) === 0 &&
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
      JSON.stringify(initialFilters?.managers),
      JSON.stringify(initialFilters?.zaloLinkStatuses),
      JSON.stringify(initialFilters?.categories),
      JSON.stringify(initialFilters?.brands),
      JSON.stringify(initialFilters?.warningLevels), // Thêm warning levels
  initialFilters?.quantity, // Thêm quantity
  JSON.stringify(initialFilters?.conversationType),
      JSON.stringify(initialFilters?.dateRange),
      initialFilters?.singleDate,
      JSON.stringify(initialFilters?.employees),
      JSON.stringify(initialFilters?.sort), // Thêm property sort
    ]
  );

  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const userModifiedFieldsRef = useRef<Set<keyof Filters>>(new Set()); // Track which fields user modified
  const previousInitialFiltersRef = useRef<Partial<Filters> | undefined>(
    undefined
  );

  useEffect(() => {
    // Sync filters when initialFilters changes
    if (memoizedInitialFilters) {
      setFilters(prevFilters => ({
        ...prevFilters,
        ...memoizedInitialFilters
      }));
    }
  }, [memoizedInitialFilters]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      // Prime lastFiltersRef to avoid immediate feedback to parent.
      try {
        const merged = initialFilters ? { ...filters, ...initialFilters } : filters;
        lastFiltersRef.current = JSON.stringify(merged);
      } catch (e) {
        // ignore stringify errors
      }
    }
  }, []);

  // ✅ IMPROVED: Selective sync logic based on user modifications
  useEffect(() => {
    if (memoizedInitialFilters && isInitializedRef.current) {
      setFilters((prev) => {
        // ✅ Force sync nếu đang restore hoặc user chưa tương tác
        if (!hasUserInteracted || isRestoring) {
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
            managers:
              memoizedInitialFilters.managers !== undefined
                ? memoizedInitialFilters.managers
                : prev.managers,
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
            quantity:
              memoizedInitialFilters.quantity !== undefined
                ? memoizedInitialFilters.quantity
                : prev.quantity,
                conversationType:
                  memoizedInitialFilters.conversationType !== undefined
                    ? memoizedInitialFilters.conversationType
                    : prev.conversationType,
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
            sort:
              memoizedInitialFilters.sort !== undefined
                ? memoizedInitialFilters.sort
                : prev.sort,
          };

          // Only update if actually different
          const isEqual = JSON.stringify(prev) === JSON.stringify(newFilters);
          return isEqual ? prev : newFilters;
        } else {
          // Chỉ sync những field chưa bị user modify
          const newFilters = { ...prev };
          let hasChanges = false;

          const fieldsToCheck = [
            "search",
            "departments",
            "roles",
            "statuses",
            "managers",
            "zaloLinkStatuses",
            "categories",
            "brands",
            "warningLevels",
            "quantity",
            "dateRange",
            "singleDate",
            "employees",
            "sort",
          ] as (keyof Filters)[];

          fieldsToCheck.forEach((field) => {
            if (
              !userModifiedFieldsRef.current.has(field) &&
              memoizedInitialFilters[field] !== undefined
            ) {
              const currentValue = prev[field];
              const incomingValue = memoizedInitialFilters[field];

              // More precise comparison
              const isDifferent =
                JSON.stringify(currentValue) !== JSON.stringify(incomingValue);

              if (isDifferent) {
                (newFilters as any)[field] = incomingValue;
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
  const [pendingPageSize, setPendingPageSize] = useState<number | "10">(
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
      managers: [],
      zaloLinkStatuses: [],
      categories: [],
      brands: [],
  warningLevels: [], // Thêm warning levels
  quantity: defaultQuantity || 1, // Reset về mặc định
  conversationType: [],
      dateRange: { from: undefined, to: undefined },
      singleDate: undefined,
      employees: [],
      sort: undefined, // Thêm property sort
    };

    setFilters(reset);
    setHasUserInteracted(false); // ✅ THÊM: Reset user interaction flag

    // ✅ THÊM: Reset department selection trong parent component
    if (onDepartmentChange) {
      onDepartmentChange([]);
    }

    // ✅ THÊM: Reset employee selection trong parent component
    if (onEmployeeChange) {
      onEmployeeChange([]);
    }

    // ✅ THÊM: Reset warning level selection trong parent component
    if (onWarningLevelChange) {
      onWarningLevelChange([]);
    }

    if (onFilterChange) {
      onFilterChange(reset);
    }

    if (onPageChange) onPageChange(1);
    else setInternalPage(0);

    setPendingPageSize("10");

    // Gọi callback reset filter ở trang cha nếu có
    if (typeof onResetFilter === "function") {
      onResetFilter();
    }
  }, [onPageChange, onResetFilter, onFilterChange, onDepartmentChange, onEmployeeChange, onWarningLevelChange]);

  // ✅ FIXED: Debounce filter với sync state management
  const debouncedSetFilters = useCallback(
    (newFilters: Filters) => {
      if (filterTimeout.current) clearTimeout(filterTimeout.current);
      filterTimeout.current = setTimeout(() => {
        if (onFilterChange) {
          try {
            const json = JSON.stringify(newFilters);
            // Avoid calling parent if filters identical to last sent (prevents update cycles)
            if (lastFiltersRef.current === json) return;
            lastFiltersRef.current = json;
          } catch (e) {
            // If stringify fails, just proceed
          }
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
        try {
          const a = prev[key];
          const b = value;
          const same = JSON.stringify(a) === JSON.stringify(b);
          if (same) return prev;
        } catch (e) {
          // fallback to strict equality
          if (prev[key] === value) return prev;
        }

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

  // Immediate clear for search tag - update internal state and call parent immediately
  const clearSearch = useCallback(() => {
    try {
      const newFilters = { ...filters, search: "", page: 1 } as Filters;
      setSearchInput("");
      // Immediately notify parent to refetch (bypass debounce)
      if (onFilterChange) onFilterChange(newFilters);

      // If parent provides onPageChange, reset to page 1
      if (typeof onPageChange === "function") {
        onPageChange(1);
      }
      // Notify parent to clear customer-search mode / restore previous filters if available
      if (typeof onClearSearch === "function") {
        try {
          onClearSearch();
        } catch (err) {
          // ignore
        }
      }
      // Also update localStorage: remove only the search value from saved orderFilters
      try {
        const raw = localStorage.getItem("orderFilters");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            parsed.search = "";
            localStorage.setItem("orderFilters", JSON.stringify(parsed));
          }
        }
      } catch (err) {
        // ignore localStorage errors
      }
    } catch (err) {
      // ignore
    }
  }, [filters, onFilterChange, onPageChange, onClearSearch]);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value); // Update UI immediately

      // If user cleared the input entirely, clear immediately and trigger fetch
      if (value === "") {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        // Use clearSearch to reset local state and notify parent immediately
        clearSearch();
        return;
      }

      // Clear previous timeout for debounced updates
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce the actual filter update for non-empty values
      searchTimeoutRef.current = setTimeout(() => {
        updateFilter("search", value); // This will save to localStorage via debouncedSetFilters
      }, 300);
    },
    [updateFilter, clearSearch]
  );

  // Handle Enter key to commit search (wrap into tag UI)
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const value = searchInput.trim();
  const newFilters = { ...filters, search: value, page: 1 } as Filters;
  setSearchInput(value);
  if (onFilterChange) onFilterChange(newFilters);
        // prevent form submit or default
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        clearSearch();
      }
    },
    [searchInput, filters, onFilterChange, clearSearch]
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
        console.log("🔄 Syncing internalPage from prop:", {
          page,
          expectedInternalPage,
          currentInternalPage: internalPage,
        });
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
      
      // Trigger employee change callback
      if (onEmployeeChange) {
        onEmployeeChange(vals);
      }
    },
    [updateFilter, onEmployeeChange]
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

      // Reset trưởng nhóm nếu trưởng nhóm hiện tại không thuộc phòng ban mới được chọn
      if (filters.managers && filters.managers.length > 0 && departments.length > 0) {
        const selectedDeptId = departments[0];
        const currentManagerId = filters.managers[0];
        
        const currentManager = availableManagers?.find((m: any) => {
          if (typeof m === 'string') return m === currentManagerId.toString();
          return m.value === currentManagerId;
        });
        
        if (currentManager && typeof currentManager === 'object' && 'departments' in currentManager) {
          const managerDepts = (currentManager as any).departments;
          const isManagerInSelectedDept = managerDepts && managerDepts.some((dept: any) => dept.id === selectedDeptId);
          
          if (!isManagerInSelectedDept) {
            updateFilter("managers", []);
          }
        }
      } else if (departments.length === 0 && filters.managers && filters.managers.length > 0) {
        // Nếu không chọn phòng ban nào, reset trưởng nhóm
        updateFilter("managers", []);
      }

      // Trigger department change callback
      if (onDepartmentChange) {
        onDepartmentChange(departments);
      }
    },
    [updateFilter, onDepartmentChange, availableDepartments, availableManagers, filters.managers]
  );

  const handleRolesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("roles", vals);
    },
    [updateFilter]
  );

  const handleManagersChange = useCallback(
    (vals: (string | number)[]) => {
      console.log("handleManagersChange called with:", vals);
      updateFilter("managers", vals);
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
      
      // Trigger warning level change callback
      if (onWarningLevelChange) {
        onWarningLevelChange(vals);
      }
    },
    [updateFilter, onWarningLevelChange]
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
        console.warn("Invalid page size:", newSize);
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
    if (pendingPageSize === "10" && !isRestoring) {
      const sizeMismatch = isBackendPaging
        ? currentPageSize !== defaultPageSize
        : internalPageSize !== defaultPageSize;
      if (sizeMismatch) {
        if (isBackendPaging && onPageSizeChange)
          onPageSizeChange(defaultPageSize);
        else setInternalPageSize(defaultPageSize);
        if (onPageChange && currentPage !== 1) onPageChange(1);
        else if (!isBackendPaging) setInternalPage(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPageSize, isRestoring]);

  // If parent signals a restoring/resetting state, force clear internal filters UI immediately
  useEffect(() => {
    if (isRestoring) {
      const reset: Filters = {
        search: "",
        departments: [],
        roles: [],
        statuses: [],
        managers: [],
        zaloLinkStatuses: [],
        categories: [],
        brands: [],
        warningLevels: [],
        quantity: defaultQuantity || 1,
        conversationType: [],
        dateRange: { from: undefined, to: undefined },
        singleDate: undefined,
        employees: [],
        sort: undefined,
      };

      // Force update internal UI state
      setFilters(reset);
      setHasUserInteracted(false);

      // Notify parent immediately so external state can sync as well
      if (onFilterChange) {
        try {
          const json = JSON.stringify(reset);
          if (lastFiltersRef.current !== json) {
            lastFiltersRef.current = json;
            onFilterChange(reset);
          }
        } catch (e) {
          // ignore
          onFilterChange(reset);
        }
      }
    }
    // Only trigger when isRestoring flips
  }, [isRestoring, defaultQuantity, onFilterChange]);

  // State cho input "đi tới trang"
  const [gotoPageInput, setGotoPageInput] = useState<string>("");
  useEffect(() => {
    // Đồng bộ input mỗi khi currentPage thay đổi bên ngoài
    setGotoPageInput(String(currentPage || 1));
  }, [currentPage]);

  const commitGotoPage = useCallback(() => {
    const raw = gotoPageInput.trim();
    if (!raw) return;
    const parsed = Number(raw);
    if (isNaN(parsed)) return;
    // Clamp về khoảng hợp lệ
    const target = Math.max(1, Math.min(parsed, totalPages));
    if (target !== currentPage) {
      goToPage(target);
    }
  }, [gotoPageInput, totalPages, currentPage, goToPage]);

  return (
    <div
      className={`flex flex-col w-full space-y-4 ${
        controlsOnly ? "" : "h-full min-h-[500px]"
      }`}
    >
      <div className="mb-4">
        <div className="grid grid-cols-6 gap-3">
          {enableSearch && (
            <div className="min-w-0 w-full">
              <div>
                <Input
                  className={`min-w-0 w-full ${filterClassNames.search ?? ""}`}
                  placeholder="Tìm kiếm..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    if (v === "") {
                      // Catch browser clear (the little ×) which sometimes triggers input but not change
                      try {
                        clearSearch();
                      } catch (err) {
                        // ignore
                      }
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                />

                {/* Streaming tag shown below the input */}
                {searchInput && searchInput.trim() !== "" && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm w-auto">
                    <span className="truncate max-w-[14rem]">{`"${searchInput}"`}</span>
                    <button
                      type="button"
                      aria-label="Xóa tìm kiếm"
                      onClick={() => {
                        // Always clear local input first so UI updates immediately
                        try {
                          clearSearch();
                        } catch (e) {
                          // ignore
                        }
                        // Then notify parent to restore previous filters (if provided)
                        if (typeof onClearSearch === "function") {
                          onClearSearch();
                        }
                      }}
                      className="p-0.5 rounded hover:bg-blue-200"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
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
          {enableConversationTypeFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full`}
              placeholder="Loại hội thoại"
              value={filters.conversationType || []}
              options={[
                { label: "Nhóm", value: "group" },
                { label: "Cá nhân", value: "personal" },
              ]}
              onChange={(vals) => updateFilter("conversationType", vals as any)}
            />
          )}
          {enableDepartmentFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.departments ?? ""}`}
              placeholder="Phòng ban"
              value={filters.departments.map((d) => d.toString())}
              options={departmentOptions}
              onChange={handleDepartmentsChange}
            />
          )}
          {enableManagerFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.managers ?? ""}`}
              placeholder="Trưởng nhóm"
              value={filters.managers || []}
              options={managerOptions}
              onChange={handleManagersChange}
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
          {enableQuantityFilter && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  type="number"
                  min={1}
                  className="min-w-0 w-full border rounded px-2 py-1 text-sm"
                  placeholder={`${quantityLabel} (tối thiểu)`}
                  title={`Lọc: ${quantityLabel} (số lượng tối thiểu)`}
                  aria-label={`Lọc ${quantityLabel}`}
                  // show empty string when undefined to allow clearing the input
                  value={filters.quantity !== undefined ? String(filters.quantity) : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      // user cleared input -> reset to default quantity
                      updateFilter("quantity", defaultQuantity as any);
                      return;
                    }
                    const n = parseInt(raw, 10);
                    updateFilter("quantity", Number.isNaN(n) ? defaultQuantity as any : n as any);
                  }}
                  onBlur={(e) => {
                    // Ensure parent receives filter immediately on blur (bypass debounce)
                    try {
                      const raw = e.currentTarget.value;
                      const parsed = raw === "" ? defaultQuantity : parseInt(raw, 10);
                      const n = Number.isNaN(parsed as any) ? defaultQuantity : (parsed as any);
                      const newFilters = { ...filters, quantity: n } as Filters;
                      if (onFilterChange) {
                        const json = JSON.stringify(newFilters);
                        if (lastFiltersRef.current !== json) {
                          lastFiltersRef.current = json;
                          onFilterChange(newFilters);
                        }
                      }
                    } catch (err) {
                      // ignore
                    }
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Chọn số lượng tối thiểu để lọc các đơn có số lượng &ge; giá trị này.</p>
              </TooltipContent>
            </Tooltip>
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
                          {format(filters.dateRange.from, "dd/MM/yyyy", {
                            locale: vi,
                          })}{" "}
                          -{" "}
                          {format(filters.dateRange.to, "dd/MM/yyyy", {
                            locale: vi,
                          })}
                        </>
                      ) : (
                        format(filters.dateRange.from, "dd/MM/yyyy", {
                          locale: vi,
                        })
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
                      updateFilter(
                        "dateRange",
                        dateRange || { from: undefined, to: undefined }
                      );
                      
                      // Call onDateRangeChange callback if provided
                      if (onDateRangeChange) {
                        onDateRangeChange(dateRange);
                      }
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
            <div className="flex gap-2 min-w-0 w-full">
              <select
                className="min-w-0 w-3/5 border rounded px-2 py-1 text-sm bg-white"
                value={currentPageSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    if (isBackendPaging && onPageSizeChange) {
                      onPageSizeChange(val);
                    } else {
                      setInternalPage(0);
                      setInternalPageSize(val);
                    }
                  }
                }}
              >
                {[5, 10, 20, 50, 100].map((size: number) => (
                  <option key={size} value={size}>
                    {size} dòng/trang
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                className="min-w-0 w-2/5 border rounded px-2 py-1 text-sm"
                value={pendingPageSize}
                placeholder="Tùy chỉnh"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPendingPageSize(
                    e.target.value === "" ? "10" : val > 0 ? val : "10"
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
            </div>
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
                Xuất Excel
              </Button>
            )}
            <Button
              type="button"
              variant="delete"
              className={`min-w-0 ${
                canExport && getExportData ? "w-1/2" : "w-full"
              } ${buttonClassNames.reset ?? ""}`}
              onClick={() => {
                handleResetFilter();
                if (onResetFilter) {
                  onResetFilter();
                }
              }}
            >
              Xóa filter
            </Button>
          </div>
        </div>
        {/* Tổng số dòng dưới filter */}
        <div className="mt-4 ml-0.5 text font-medium">
          Tổng số dòng: <span className="text-red-500">{totalRows}</span>
        </div>
        {/* Right-aligned compact toggles with tooltip */}
        {toggles && toggles.length > 0 && (
          <div className="col-span-6 mt-2 flex items-center justify-end gap-4">
            {toggles.map((tg) => (
              <div key={tg.id} className="flex items-center gap-2">
                {tg.tooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-gray-600 select-none cursor-help">
                        {tg.label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>{tg.tooltip}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-xs text-gray-600 select-none">
                    {tg.label}
                  </span>
                )}
                <input
                  type="checkbox"
                  className="accent-orange-500 h-4 w-4"
                  checked={tg.checked}
                  onChange={(e) => tg.onChange(e.target.checked)}
                  disabled={tg.disabled}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {!controlsOnly && (
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
      )}

      {!hidePager && (
        <div className="flex justify-center items-center gap-3 pt-4 mt-4 p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 rounded-2xl shadow-lg backdrop-blur-sm border border-white/20">
          {/* Previous Button */}
          <Button
            variant="gradient"
            size="sm"
            className={`
      ${buttonClassNames.prev ?? ""} 
      group relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 
      hover:from-purple-600 hover:to-pink-600 text-white font-semibold
      transform transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      px-6 py-2 rounded-full border-0
      before:absolute before:inset-0 before:bg-white before:opacity-0 
      before:transition-opacity before:duration-300 hover:before:opacity-10
    `}
            onClick={() => {
              goToPage(Math.max(currentPage - 1, 1));
            }}
            disabled={currentPage === 1}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Trước
            </span>
          </Button>

          {/* Page Indicator with Animation */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full shadow-inner border border-gray-200/50">
            <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Trang
            </span>
            <div className="relative">
              <span className="text-lg font-bold text-gray-800 px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                {currentPage}
              </span>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur opacity-30 animate-pulse"></div>
            </div>
            <span className="text-gray-400 font-medium">/</span>
            <span className="text-lg font-semibold text-gray-600">
              {totalPages || 1}
            </span>
          </div>

          {/* Go to Page Section */}
          {enableGoToPage && (
            <div className="flex items-center gap-3 p-2 bg-white/60 backdrop-blur-md rounded-xl border border-white/30 shadow-sm">
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={gotoPageInput}
                onChange={(e) => setGotoPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitGotoPage();
                  }
                }}
                className="
          w-20 h-9 text-center text-sm font-semibold
          bg-white/90 border-2 border-purple-200 rounded-lg
          focus:border-purple-400 focus:ring-2 focus:ring-purple-200
          transition-all duration-300 focus:scale-105
          placeholder-gray-400
        "
                placeholder="Trang"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={commitGotoPage}
                disabled={totalPages <= 1}
                className="
          group bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold
          hover:from-indigo-600 hover:to-purple-600 border-0 px-4 py-2 rounded-lg
          transform transition-all duration-300 hover:scale-105 hover:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        "
              >
                <span className="flex items-center gap-1">
                  Đến
                  <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </Button>
            </div>
          )}

          {/* Next Button */}
          <Button
            variant="gradient"
            size="sm"
            className={`
      ${buttonClassNames.next ?? ""} 
      group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-500 
      hover:from-indigo-600 hover:to-purple-600 text-white font-semibold
      transform transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      px-6 py-2 rounded-full border-0
      before:absolute before:inset-0 before:bg-white before:opacity-0 
      before:transition-opacity before:duration-300 hover:before:opacity-10
    `}
            onClick={() => {
              goToPage(Math.min(currentPage + 1, totalPages));
            }}
            disabled={currentPage >= totalPages}
          >
            <span className="flex items-center gap-2">
              Sau
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </Button>
        </div>
      )}

      {/* Panel xuất CSV */}
      {canExport && getExportData && (
        <CSVExportPanel
          open={openExport}
          onClose={() => setOpenExport(false)}
          defaultExportCount={currentPageSize}
          {...getExportData()}
          fetchAllData={getExportAllData}
        />
      )}
    </div>
  );
}
