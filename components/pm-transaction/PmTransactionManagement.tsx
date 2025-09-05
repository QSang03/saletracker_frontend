"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderManagement from "@/components/order/manager-order/OrderManagement";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Download,
  Search,
  Filter,
  Calendar,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import PaginatedTable, {
  Filters as PaginatedFilters,
} from "@/components/ui/pagination/PaginatedTable";
import { getAccessToken } from "@/lib/auth";

interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  employee_code?: string;
  department_name?: string;
}

interface OrderStats {
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}

interface PmTransactionManagementProps {
  isAnalysisUser?: boolean;
}

export default function PmTransactionManagement({ isAnalysisUser = false }: PmTransactionManagementProps) {
  const {
    isPM,
    getPMDepartments,
    isAdmin,
    isViewRole,
    getAccessibleDepartments,
  } = useDynamicPermission();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [dateRangeState, setDateRangeState] = useState<{
    start?: string;
    end?: string;
  } | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [employeesSelected, setEmployeesSelected] = useState<
    (string | number)[]
  >([]);
  const [warningLevelFilter, setWarningLevelFilter] = useState("");
  const [minQuantity, setMinQuantity] = useState<number | undefined>(3);
  const [conversationTypesSelected, setConversationTypesSelected] = useState<
    string[]
  >([]);
  const [showModal, setShowModal] = useState(false);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [modalMessages, setModalMessages] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    departments: any[];
    products?: any[];
  }>({ departments: [], products: [] });
  const [departmentsSelected, setDepartmentsSelected] = useState<
    (string | number)[]
  >([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const filtersLoadingRef = useRef(false);
  // Back/restore state
  const [isRestoring, setIsRestoring] = useState(false);
  const isRestoringRef = useRef(false);
  const [isInCustomerSearchMode, setIsInCustomerSearchMode] = useState(false);

  type PmFilters = {
    page: number;
    pageSize: number;
    search?: string;
    status?: string; // CSV
    date?: string; // single date token
    dateRange?: { start: string; end: string } | undefined;
    departments?: string; // CSV
    employees?: string; // CSV
    warningLevel?: string; // CSV
    quantity?: number;
    conversationType?: string; // CSV
  };

  // LocalStorage helpers for PM filters
  const PM_FILTERS_KEY = "pmTransactionFilters";
  const savePmFiltersToStorage = (filters: PmFilters | null) => {
    try {
      if (filters == null) localStorage.removeItem(PM_FILTERS_KEY);
      else localStorage.setItem(PM_FILTERS_KEY, JSON.stringify(filters));
    } catch (e) {
      // ignore
    }
  };
  const getPmFiltersFromStorage = (): PmFilters | null => {
    try {
      const raw = localStorage.getItem(PM_FILTERS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PmFilters;
    } catch (e) {
      return null;
    }
  };
  const clearPmFiltersFromStorage = () => {
    try {
      localStorage.removeItem(PM_FILTERS_KEY);
    } catch (e) {
      // ignore
    }
  };

  // ✅ Helper function để clear pageSize từ localStorage (giống useOrders)
  const clearPmPageSizeFromStorage = (): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem("pmPageSize");
    } catch (error) {
      console.warn("Error clearing PM pageSize from localStorage:", error);
    }
  };

  const getCurrentPmFilters = (): PmFilters => {
    let departmentsCsv = "";
    let employeesCsv = "";
    
    // Luôn lưu departments và employees vào localStorage để restore
    departmentsCsv =
      Array.isArray(departmentsSelected) && departmentsSelected.length > 0
        ? departmentsSelected.join(",")
        : isPM && !isViewRole && Array.isArray(pmDepartments) && pmDepartments.length > 0
        ? pmDepartments.join(",")
        : "";
    
    employeesCsv =
      Array.isArray(employeesSelected) && employeesSelected.length > 0
        ? employeesSelected.join(",")
        : "";
    
    return {
      page: currentPage,
      pageSize,
      search: searchTerm || "",
      status: statusFilter !== "all" ? statusFilter : "",
      date: dateFilter && dateFilter !== "all" && dateFilter !== "custom" ? dateFilter : "",
      dateRange:
        dateRangeState && dateRangeState.start && dateRangeState.end
          ? { start: dateRangeState.start, end: dateRangeState.end }
          : undefined,
      departments: departmentsCsv,
      employees: employeesCsv,
      warningLevel: warningLevelFilter || "",
      quantity: typeof minQuantity === "number" ? minQuantity : undefined,
      conversationType:
        Array.isArray(conversationTypesSelected) && conversationTypesSelected.length > 0
          ? conversationTypesSelected.join(",")
          : "",
    };
  };

  const applyPmFilters = (f: PmFilters, skipSave?: boolean) => {
    // Prevent loops and flickers during restore
    isRestoringRef.current = true;
    setIsRestoring(true);
    
    try {
      // Use flushSync to force immediate state updates like useOrders
      flushSync(() => {
        setPageSize(f.pageSize ?? 10);
        setCurrentPage(f.page ?? 1);
        setSearchTerm(f.search || "");
        setStatusFilter(f.status && f.status.length > 0 ? f.status : "all");

        // Apply dateRange if present
        if (f.dateRange && f.dateRange.start && f.dateRange.end) {
          setDateRangeState({ start: f.dateRange.start, end: f.dateRange.end });
        } else {
          setDateRangeState(null);
        }
        
        // Apply single date if present (independent of dateRange)
        if (f.date && f.date.length > 0) {
          setDateFilter(f.date);
        } else {
          setDateFilter("all");
        }

        if (f.departments) {
          const vals = f.departments.split(",").filter(Boolean);
          setDepartmentsSelected(vals);
        } else {
          setDepartmentsSelected([]);
        }

        if (f.employees) {
          const vals = f.employees.split(",").filter(Boolean);
          setEmployeesSelected(vals);
        } else {
          setEmployeesSelected([]);
        }

        setWarningLevelFilter(f.warningLevel || "");
        setMinQuantity(typeof f.quantity === "number" ? f.quantity : undefined);
        setConversationTypesSelected(
          f.conversationType ? f.conversationType.split(",").filter(Boolean) : []
        );
      });
      
      // Persist filters to localStorage unless caller explicitly asks to skip
      try {
        if (!skipSave) savePmFiltersToStorage(f);
      } catch (e) {
        // ignore storage errors
      }
    } finally {
      // Small delay to let effects settle, then reset restoring flag
      setTimeout(() => {
        isRestoringRef.current = false;
        setIsRestoring(false);
      }, 100);
    }
  };

  // Nếu là admin, dùng danh sách departments khả dụng; nếu không, dùng pm-{dept}
  const pmDepartments =
    isAdmin || isViewRole ? getAccessibleDepartments() : getPMDepartments();
  // Admin hoặc view role luôn được xem toàn bộ phòng ban — nếu là admin/view bỏ qua kiểm tra pm-specific
  const hasSpecificPMRole =
    isAdmin || isViewRole || (pmDepartments && pmDepartments.length > 0);

  // Compute available employees based on selected departments (or PM-accessible departments for non-admin)
  const availableEmployees = useMemo(() => {
    // Nếu là analysis user, không cần danh sách employees
    if (isAnalysisUser) {
      return [];
    }
    
    const depts = Array.isArray(filterOptions?.departments)
      ? filterOptions.departments
      : [];

    const normalize = (v: any) => (v == null ? "" : String(v).toLowerCase());
    const pmSet = new Set(
      (Array.isArray(pmDepartments) ? pmDepartments : []).map((x: any) =>
        normalize(x)
      )
    );

    // Determine which departments to pull employees from
    const selectedValues = new Set(
      (departmentsSelected || []).map((v) => String(v))
    );
    const filteredDepts =
      departmentsSelected && departmentsSelected.length > 0
        ? depts.filter(
            (d: any) => String(d?.value) && selectedValues.has(String(d.value))
          )
        : isAdmin
        ? depts
        : depts.filter((d: any) => {
            const val = normalize(d?.value);
            const slug = normalize(d?.slug);
            const label = normalize(d?.label);
            // match against pm-allowed list by value/slug/label contains
            if (pmSet.has(val) || pmSet.has(slug)) return true;
            for (const pm of pmSet) {
              if (pm && label.includes(pm)) return true;
            }
            return false;
          });

    // Flatten and dedupe users
    const map = new Map<string, { label: string; value: string | number }>();
    filteredDepts.forEach((d: any) => {
      const users = Array.isArray(d?.users) ? d.users : [];
      users.forEach((u: any) => {
        const key = String(u?.value);
        if (!map.has(key)) map.set(key, { label: u?.label ?? key, value: key });
      });
    });
    return Array.from(map.values());
  }, [filterOptions.departments, departmentsSelected, isAdmin, pmDepartments, isAnalysisUser]);

  // removed: moved pmDepartments/hasSpecificPMRole above to avoid temporal dead zone

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("pageSize", pageSize.toString());

      // only add search/status when provided to avoid sending empty values
      if (searchTerm && String(searchTerm).trim()) {
        params.set("search", String(searchTerm).trim());
      }

      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      // date handling: send both date and dateRange if they have values
      if (dateFilter && dateFilter !== "all" && dateFilter !== "custom") {
        params.set("date", dateFilter);
      }
      
      if (dateRangeState && dateRangeState.start && dateRangeState.end) {
        const dateRangeParam = JSON.stringify({ start: dateRangeState.start, end: dateRangeState.end });
        params.set("dateRange", dateRangeParam);
      }

      // optional filters for departments / employees (CSV)
      // prefer explicit selection; for PM users (not view/admin) default to pmDepartments when none selected
      if (
        Array.isArray(departmentsSelected) &&
        departmentsSelected.length > 0
      ) {
        params.set("departments", departmentsSelected.join(","));
      } else if (
        isPM &&
        !isViewRole &&
        Array.isArray(pmDepartments) &&
        pmDepartments.length > 0
      ) {
        params.set("departments", pmDepartments.join(","));
      }
      
      // Nếu là analysis user, chỉ lấy đơn hàng của chính họ
      if (isAnalysisUser) {
        // Không set departments để backend có thể filter theo user hiện tại
        // Không set employees để backend có thể filter theo user hiện tại
      } else if (Array.isArray(employeesSelected) && employeesSelected.length > 0) {
        params.set("employees", employeesSelected.join(","));
      }

      if (warningLevelFilter && warningLevelFilter !== "") {
        params.set("warningLevel", warningLevelFilter);
      }

      // PM-only filters: min quantity and conversation type
      if (typeof minQuantity === "number") {
        params.set("quantity", String(minQuantity));
      }
      if (
        Array.isArray(conversationTypesSelected) &&
        conversationTypesSelected.length > 0
      ) {
        params.set("conversationType", conversationTypesSelected.join(","));
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const url = `${baseUrl}/orders?${params.toString()}`;
      // Debug: log request URL and token presence
      // eslint-disable-next-line no-console
      console.debug(
        "[PM] fetchOrders URL:",
        url,
        "departmentsSelected=",
        departmentsSelected
      );
      // eslint-disable-next-line no-console
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Không thể tải dữ liệu giao dịch");
      }

      // capture body for debugging when necessary
      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        // eslint-disable-next-line no-console
        const text = await response.text();
        // eslint-disable-next-line no-console
        throw e;
      }
      setOrders(data.data || []);
      const total = Number(data.total || 0);
      setTotalItems(total);
      setTotalPages(Math.ceil(total / pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const response = await fetch(
        `${baseUrl}/orders/stats/overview?period=day`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    // Nếu là PM, admin hoặc view role thì tải dữ liệu
    if (isPM || isAdmin || isViewRole) {
      // Wait until filter options are loaded/mapped to departments to avoid
      // firing an initial fetch before default departments are applied.
      if (!filtersLoaded) return;
      fetchOrders();
      fetchStats();
    }
    // consolidate triggers: include pageSize and dateRangeState and employees/warning filters
  }, [
    isPM,
    isAdmin,
    isViewRole,
    currentPage,
    searchTerm,
    statusFilter,
    dateFilter,
    departmentsSelected,
    pageSize,
    dateRangeState,
    employeesSelected,
    warningLevelFilter,
    filtersLoaded,
    minQuantity,
    conversationTypesSelected,
  ]);

  // removed duplicate sync effect — pageSize/dateRangeState/departments/employees/warningLevel are handled
  // in the consolidated main effect above to avoid multiple fetches.

  // Load filter options (departments/employees) similar to Order page
  useEffect(() => {
    const load = async () => {
      // Prevent concurrent duplication (React Strict Mode / fast re-renders)
      if (filtersLoadingRef.current) return;
      filtersLoadingRef.current = true;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const token = getAccessToken();
        const foUrl = `${baseUrl}/orders/filter-options`;
        // eslint-disable-next-line no-console
        console.debug(
          "[PM] fetch filter-options URL:",
          foUrl,
          " token present:",
          !!token
        );
        const res = await fetch(foUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const departments = json.departments || [];
        setFilterOptions({ departments, products: json.products || [] });

        // If user is PM (non-admin) and hasn't selected departments explicitly,
        // try to map their pm-<slug> roles to department values and apply as default selection
        // Only auto-map pmDepartments for actual PM users (not for admin/view which see all)
        if (
          isPM &&
          !isAdmin &&
          !isViewRole &&
          Array.isArray(pmDepartments) &&
          pmDepartments.length > 0
        ) {
          // don't overwrite if user already selected departments
          if (!departmentsSelected || departmentsSelected.length === 0) {
            const mapped: (string | number)[] = [];

            pmDepartments.forEach((pm: any) => {
              // pm might be slug (string)
              const slug = String(pm).toLowerCase();
              const found = departments.find((d: any) => {
                // try matching value, label or slug fields
                if (d == null) return false;
                const val =
                  d.value != null ? String(d.value).toLowerCase() : "";
                const label =
                  d.label != null ? String(d.label).toLowerCase() : "";
                const deptSlug =
                  d.slug != null ? String(d.slug).toLowerCase() : "";
                return (
                  val === slug ||
                  label === slug ||
                  deptSlug === slug ||
                  label.includes(slug)
                );
              });
              if (found) mapped.push(found.value != null ? found.value : slug);
              else mapped.push(pm);
            });

            if (mapped.length > 0) {
              // eslint-disable-next-line no-console
              // just set state; the consolidated effect will trigger fetchOrders
              setDepartmentsSelected(mapped);
            }
          }
        }
      } catch (err) {
        console.error("Error loading filter options", err);
      } finally {
        filtersLoadingRef.current = false;
        // mark that filter options have been loaded so main fetch can run
        setFiltersLoaded(true);
      }
    };

    if (isPM || isAdmin || isViewRole) {
      // reset loaded flag and then load filter options
      setFiltersLoaded(false);
      load();
    }
  }, [isPM, isAdmin]);

  // Initialize history state on mount for consistent back behavior
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Wait for filter options to be loaded before applying stored filters
    if (!filtersLoaded) return;
    
    const stored = getPmFiltersFromStorage();
    if (stored) {
      // prefer stored filters and do not reset
      applyPmFilters(stored, true);
      window.history.replaceState({ pmFilters: stored, isCustomerSearch: false, timestamp: Date.now() }, "", window.location.href);
    } else {
      const state = window.history.state as any;
      if (!state || !state.pmFilters) {
        const pmFilters = getCurrentPmFilters();
        window.history.replaceState({ pmFilters, isCustomerSearch: false, timestamp: Date.now() }, "", window.location.href);
        // Không lưu vào localStorage khi không có stored filters
      }
    }
  }, [filtersLoaded]); // Add filtersLoaded as dependency

  // Handle browser back/forward to restore filters like Order management
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      // Prefer stored filters from localStorage to avoid accidental resets
      const stored = getPmFiltersFromStorage();
      if (stored) {
        setIsInCustomerSearchMode(false);
        applyPmFilters(stored);
        window.history.replaceState({ pmFilters: stored, isCustomerSearch: false, timestamp: Date.now() }, "", window.location.href);
        return;
      }

      const hs = (event.state || {}) as any;
      if (!hs) return;
      const prev = hs.previousFilters as PmFilters | undefined;
      const filters = (hs.pmFilters as PmFilters) || undefined;

      if (prev) {
        setIsInCustomerSearchMode(false);
        applyPmFilters(prev);
        savePmFiltersToStorage(prev);
        const newState = { pmFilters: prev, isCustomerSearch: false, timestamp: Date.now() };
        window.history.replaceState(newState, "", window.location.href);
      } else if (filters) {
        setIsInCustomerSearchMode(!!hs.isCustomerSearch);
        applyPmFilters(filters);
        savePmFiltersToStorage(filters);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const performCustomerSearch = (customerName: string) => {
    if (!customerName || !customerName.trim()) return;
  // Prefer stored filters as the previous snapshot to ensure 'back' restores user's last saved filters
  const storedPrev = getPmFiltersFromStorage();
  const previous = storedPrev || getCurrentPmFilters();
    // Build next filters from previous but explicitly clear date filters so
    // customer search does not accidentally keep a date/dateRange filter.
    const next: PmFilters = {
      ...previous,
      page: 1,
      search: customerName.trim(),
      // Keep single `date` token from previous filters, but ensure any custom range is cleared
      dateRange: undefined,
    };

    setIsInCustomerSearchMode(true);
    // Push history state so Back restores the previous filters
    const state = {
      pmFilters: next,
      isCustomerSearch: true,
      previousFilters: previous,
      timestamp: Date.now(),
    };
    window.history.pushState(state, "", window.location.href);

    // Apply next filters to UI
  applyPmFilters(next, true);
  };

  // When departments change, remove any selected employees that no longer belong to the available set
  useEffect(() => {
    if (!employeesSelected || employeesSelected.length === 0) return;
    if (isRestoringRef.current) return; // Skip during restore to avoid clearing restored employees
    if (!filtersLoaded) return; // Skip until filters are loaded
    
    const allowed = new Set(availableEmployees.map((e) => String(e.value)));
    const filtered = employeesSelected.filter((v) => allowed.has(String(v)));
    // Only update when actually changed to avoid render loops
    const isSame =
      filtered.length === employeesSelected.length &&
      filtered.every((v, i) => String(v) === String(employeesSelected[i]));
    if (!isSame) {
      console.log("[PM] Filtering employees after department change:", { 
        available: availableEmployees.length, 
        selected: employeesSelected.length, 
        filtered: filtered.length 
      });
      setEmployeesSelected(filtered);
    }
  }, [availableEmployees, employeesSelected, filtersLoaded]);

  // Update filters and save to localStorage (similar to useOrders pattern)
  const updatePmFiltersAndStorage = useCallback((newFilters: Partial<PmFilters>) => {
    if (isRestoringRef.current) return; // Skip during restore
    
    try {
      const currentFilters = getCurrentPmFilters();
      const updatedFilters = { ...currentFilters, ...newFilters };
      savePmFiltersToStorage(updatedFilters);
    } catch (err) {
      // ignore storage errors
    }
  }, []);

  // Auto-save filters to localStorage when they change (except during restore)
  useEffect(() => {
    if (isRestoringRef.current) return; // Skip saving during restore to avoid loops
    if (!filtersLoaded) return; // Skip saving until filters are loaded
    if (isRestoring) return; // Skip saving during restore state
    
    try {
      const currentFilters = getCurrentPmFilters();
      savePmFiltersToStorage(currentFilters);
    } catch (err) {
      // ignore storage errors
    }
  }, [
    currentPage,
    pageSize,
    searchTerm,
    statusFilter,
    dateFilter,
    dateRangeState,
    departmentsSelected,
    employeesSelected,
    warningLevelFilter,
    minQuantity,
    conversationTypesSelected,
    filtersLoaded,
    isRestoring,
  ]);

  const handleFilterChange = (f: PaginatedFilters) => {
    try {
      // eslint-disable-next-line no-console
      // search
      setSearchTerm(f.search || "");

      // statuses -> join CSV or set 'all'
      if (f.statuses && f.statuses.length > 0) {
        setStatusFilter((f.statuses as string[]).join(","));
      } else {
        setStatusFilter("all");
      }

      // employees / departments
      // employees / departments
      if (f.employees && f.employees.length > 0) {
        const emps = f.employees as (string | number)[];
        const same =
          emps.length === employeesSelected.length &&
          emps.every((v, i) => String(v) === String(employeesSelected[i]));
        if (!same) setEmployeesSelected(emps);
      } else {
        if (employeesSelected.length > 0) setEmployeesSelected([]);
      }

      // departments selected by user in the filter UI
      if (f.departments && f.departments.length > 0) {
        const incoming = f.departments as (string | number)[];
        const same =
          incoming.length === departmentsSelected.length &&
          incoming.every(
            (v, i) => String(v) === String(departmentsSelected[i])
          );
        if (!same) setDepartmentsSelected(incoming as string[]);
      } else {
        if (departmentsSelected.length > 0) setDepartmentsSelected([]);
      }

      // date handling - independent date and dateRange
      if (f.singleDate) {
        try {
          const d =
            f.singleDate instanceof Date
              ? f.singleDate
              : new Date(f.singleDate as string);
          
          if (!isNaN(d.getTime())) {
            const val = d.toLocaleDateString("en-CA");
            setDateFilter(val);
            // Save immediately to localStorage
            updatePmFiltersAndStorage({ date: val });
          } else {
            setDateFilter("all");
            updatePmFiltersAndStorage({ date: "" });
          }
        } catch (error) {
          setDateFilter("all");
          updatePmFiltersAndStorage({ date: "" });
        }
      }
      
      if (f.dateRange && (f.dateRange as any).from && (f.dateRange as any).to) {
        try {
          const fromDate = (f.dateRange as any).from instanceof Date
            ? (f.dateRange as any).from
            : new Date((f.dateRange as any).from);
          const toDate = (f.dateRange as any).to instanceof Date
            ? (f.dateRange as any).to
            : new Date((f.dateRange as any).to);

          if (fromDate && toDate && !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
            const from = fromDate.toLocaleDateString("en-CA");
            const to = toDate.toLocaleDateString("en-CA");
            setDateRangeState({ start: from, end: to });
            // Save immediately to localStorage
            updatePmFiltersAndStorage({ dateRange: { start: from, end: to } });
          } else {
            setDateRangeState(null);
            updatePmFiltersAndStorage({ dateRange: undefined });
          }
        } catch (error) {
          setDateRangeState(null);
          updatePmFiltersAndStorage({ dateRange: undefined });
        }
      }

      // warning levels mapping (PaginatedTable passes labels)
      if (f.warningLevels && f.warningLevels.length > 0) {
        const mappedLevels = (f.warningLevels as (string | number)[]).map(
          (w) => {
            const found = warningLevelOptions.find(
              (opt) =>
                String(opt.label) === String(w) ||
                String(opt.value) === String(w)
            );
            return found ? String(found.value) : String(w);
          }
        );
        // eslint-disable-next-line no-console
        setWarningLevelFilter(mappedLevels.join(","));
      } else {
        setWarningLevelFilter("");
      }

      // quantity (Số lượng tối thiểu)
      if (
        typeof (f as any).quantity === "number" &&
        !Number.isNaN((f as any).quantity)
      ) {
        setMinQuantity((f as any).quantity as number);
      } else {
        setMinQuantity(undefined);
      }

      // conversation type (group / private)
      if (
        (f as any).conversationType &&
        (f as any).conversationType.length > 0
      ) {
        setConversationTypesSelected((f as any).conversationType as string[]);
      } else {
        setConversationTypesSelected([]);
      }

      // reset to page 1 after filter change
      setCurrentPage(1);
    } catch (e) {
      console.error("Error handling filters", e);
    }
    // Persist the updated filters snapshot so popstate and mount can read latest state
    // Use setTimeout to ensure state updates are applied before saving
    setTimeout(() => {
      try {
        const snapshot = getCurrentPmFilters();
        savePmFiltersToStorage(snapshot);
      } catch (err) {
        // ignore storage errors
      }
    }, 0);
  };

  // Export data
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm && String(searchTerm).trim())
        params.set("search", String(searchTerm).trim());
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      if (dateFilter && dateFilter !== "all")
        params.set("date_filter", dateFilter);
      params.set("export", "true");

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const response = await fetch(`${baseUrl}/orders/export?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `giao-dich-pm-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Error exporting data:", err);
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="secondary">Chờ xử lý</Badge>;
      case "processing":
        return <Badge variant="default">Đang xử lý</Badge>;
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            Hoàn thành
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return format(date, "dd/MM/yyyy HH:mm", { locale: vi });
      } else {
        console.warn("[PM] Invalid date string in formatDate:", dateString);
        return "N/A";
      }
    } catch (error) {
      console.warn("[PM] Error formatting date:", error);
      return "N/A";
    }
  };

  // Resolve employee/sale display name from multiple possible shapes
  const getEmployeeDisplay = (o: any) => {
    const candidates = [
      // nested order.sale_by
      o?.order?.sale_by?.fullName,
      o?.order?.sale_by?.username,
      // top-level sale_by
      o?.sale_by?.fullName,
      o?.sale_by?.username,
      // common legacy fields
      o?.sale_name_raw,
      o?.sale_name,
      o?.saleByName,
      o?.saleBy?.fullName,
      o?.saleBy?.username,
      // employee objects
      o?.employee?.fullName,
      o?.employee?.username,
      o?.employee_name,
      o?.employeeName,
      o?.employee_code_raw,
      o?.employee_code,
      // created/actor/user
      o?.created_by?.fullName,
      o?.created_by?.username,
      o?.user?.fullName,
      o?.user?.username,
      o?.actor?.fullName,
      o?.actor?.username,
      // flat strings sometimes used
      o?.sale || o?.sale_name_raw || o?.sale_name || o?.saleBy || o?.employee || o?.creator,
    ];

    for (const c of candidates) {
      if (c && (typeof c === "string" ? c.trim() : true)) {
        return typeof c === "string" ? c.trim() : String(c);
      }
    }

    return "--";
  };

  // Status options and warning levels (match Order page labels)
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

  // Reset filters handler (giống useOrders hoàn toàn)
  const handleResetFilter = useCallback(() => {
    const defaultPageSize = 10;

    // ✅ BLOCK tất cả operations khác ngay lập tức (giống useOrders)
    isRestoringRef.current = true;
    setIsRestoring(true);

    // ✅ Clear localStorage TRƯỚC (giống useOrders)
    clearPmPageSizeFromStorage();
    clearPmFiltersFromStorage();

    const resetFiltersData: PmFilters = {
      page: 1,
      pageSize: defaultPageSize,
      search: "",
      status: "",
      date: "",
      dateRange: undefined,
      departments: "",
      employees: "",
      warningLevel: "",
      quantity: undefined,
      conversationType: "",
    };

    // ✅ FORCE update state trước với flushSync (giống useOrders)
    flushSync(() => {
      setPageSize(defaultPageSize);
      setCurrentPage(1);
      setSearchTerm("");
      setStatusFilter("all");
      setDateFilter("all");
      setDateRangeState(null);
      setEmployeesSelected([]);
      setDepartmentsSelected([]);
      setWarningLevelFilter("");
      setMinQuantity(undefined);
      setConversationTypesSelected([]);
      
      // ✅ Save reset data vào localStorage (giống useOrders)
      savePmFiltersToStorage(resetFiltersData);
    });

    // ✅ MANUAL history management để tránh router interference
    const newUrl = window.location.pathname; // Clean URL
    const resetHistoryState = {
      pmFilters: resetFiltersData,
      page: 1,
      pageSize: defaultPageSize,
      timestamp: Date.now(),
      isCustomerSearch: false,
      isReset: true,
    };

    // ✅ FORCE push reset state với manual history API
    window.history.pushState(resetHistoryState, "", newUrl);

    // ✅ Delay để prevent interference từ các components khác
    setTimeout(() => {
      isRestoringRef.current = false;
      setIsRestoring(false);
    }, 500);
  }, []);

  // Export data helper (returns headers + mapped rows for current visible orders)
  // Match the manager-order export column order and formatting so PM exports are identical to Order exports
  const getExportData = () => {
  // getExportData uses the component-level resolver `getEmployeeDisplay`

    const headers = [
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
    ];

    const data = orders.map((o: any, idx) => [
      idx + 1,
      o.id ?? o.order_code ?? "--",
      // Gia Hạn - PM orders may not include 'extended' field; keep as '--' when missing
      o.extended ?? "--",
      // Thời Gian Tạo Đơn Hàng - format similar to manager-order
      o.created_at
        ? (() => {
            try {
              const d = new Date(o.created_at);
              if (!isNaN(d.getTime())) {
                return d
                  .toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "");
              } else {
                console.warn("[PM] Invalid created_at date in export:", o.created_at);
                return "--";
              }
            } catch (e) {
              console.warn("[PM] Error parsing created_at in export:", e);
              return "--";
            }
          })()
        : "--",
      // Tên Nhân Viên
  getEmployeeDisplay(o),
      // Tên Khách Hàng
      o.customer_name || "--",
      // Tên Mặt Hàng
      o.raw_item || o.items?.map((it: any) => it.name).join(", ") || "--",
      // Số Lượng
      o.quantity ?? "--",
      // Đơn Giá - format as VND like manager-order
      o.unit_price ? Number(o.unit_price).toLocaleString("vi-VN") + "₫" : (o.total_amount != null ? Number(o.total_amount).toLocaleString("vi-VN") + "₫" : "--"),
      // Trạng Thái - try to map common statuses
      (() => {
        const st = (o.status || "").toString();
        switch (st) {
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
          case "processing":
            return "Đang xử lý";
          case "cancelled":
            return "Đã hủy";
          default:
            return st || "--";
        }
      })(),
      // Ghi Chú
      o.notes || "--",
    ]);

    return { headers, data };
  };

  // Export all data helper - fetches all rows from backend respecting current filters
  const getExportAllData = async () => {
  // Use shared getEmployeeDisplay helper defined at component scope

    const params = new URLSearchParams({
      page: "1",
      pageSize: "1000000",
      search: searchTerm || "",
      status: statusFilter !== "all" ? statusFilter : "",
    });

    if (dateRangeState && dateRangeState.start && dateRangeState.end) {
      params.set("dateRange", JSON.stringify({ start: dateRangeState.start, end: dateRangeState.end }));
    } else if (dateFilter && dateFilter !== "all") {
      params.set("date", dateFilter);
    }

    // prefer explicit selection, otherwise for non-admin use pmDepartments
    if (Array.isArray(departmentsSelected) && departmentsSelected.length > 0) {
      params.set("departments", departmentsSelected.join(","));
    } else if (
      isPM &&
      !isViewRole &&
      Array.isArray(pmDepartments) &&
      pmDepartments.length > 0
    ) {
      params.set("departments", pmDepartments.join(","));
    }

    // Nếu là analysis user, không set departments và employees để backend filter theo user hiện tại
    if (!isAnalysisUser && Array.isArray(employeesSelected) && employeesSelected.length > 0) {
      params.set("employees", employeesSelected.join(","));
    }

    if (warningLevelFilter && warningLevelFilter !== "") {
      params.set("warningLevel", warningLevelFilter);
    }

    if (typeof minQuantity === "number") {
      params.set("quantity", String(minQuantity));
    }
    if (
      Array.isArray(conversationTypesSelected) &&
      conversationTypesSelected.length > 0
    ) {
      params.set("conversationType", conversationTypesSelected.join(","));
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const token = getAccessToken();
    const res = await fetch(`${baseUrl}/orders?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
      ? json.data
      : [];
    // Map to the same shape as manager-order export
    return list.map((o: any, idx: number) => [
      idx + 1,
      o.id ?? o.order_code ?? "--",
      o.extended ?? "--",
      o.created_at
        ? (() => {
            try {
              const d = new Date(o.created_at);
              if (!isNaN(d.getTime())) {
                return d
                  .toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "");
              } else {
                console.warn("[PM] Invalid created_at date in exportAll:", o.created_at);
                return "--";
              }
            } catch (e) {
              console.warn("[PM] Error parsing created_at in exportAll:", e);
              return "--";
            }
          })()
        : "--",
  // Tên Nhân Viên - use shared resolver to find best candidate
  getEmployeeDisplay(o),
      o.customer_name || "--",
      o.raw_item || (o.items ? o.items.map((it: any) => it.name).join(", ") : "--") || "--",
      o.quantity ?? "--",
      o.unit_price ? Number(o.unit_price).toLocaleString("vi-VN") + "₫" : (o.total_amount != null ? Number(o.total_amount).toLocaleString("vi-VN") + "₫" : "--"),
      (() => {
        const st = (o.status || "").toString();
        switch (st) {
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
          case "processing":
            return "Đang xử lý";
          case "cancelled":
            return "Đã hủy";
          default:
            return st || "--";
        }
      })(),
      o.notes || "--",
    ]);
  };

  if (!isPM && !isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Bạn không có quyền truy cập vào chức năng này.
        </AlertDescription>
      </Alert>
    );
  }

  // Nếu không phải admin và cũng không có role PM cụ thể thì hiện thông báo
  if (!isAdmin && !hasSpecificPMRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không có dữ liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn chưa được phân quyền cho phòng ban cụ thể nào. Dữ liệu sẽ được
              hiển thị khi bạn được cấp quyền xem phòng ban.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full overflow-hidden relative">
      {/* Statistics Cards removed per request */}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Danh sách giao dịch
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => fetchOrders()}
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
            enableEmployeeFilter={!isAnalysisUser}
            enableDepartmentFilter={!isAnalysisUser}
            enableDateRangeFilter={true}
            enableSingleDateFilter={true}
            enableWarningLevelFilter={true}
            enablePageSize={true}
            enableGoToPage={true}
            page={currentPage}
            total={totalItems}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => setPageSize(s)}
            onFilterChange={handleFilterChange}
            onDepartmentChange={(vals) => {
              // immediate handler when user changes departments in the toolbar
              // eslint-disable-next-line no-console
              setDepartmentsSelected(vals as (string | number)[]);
              setCurrentPage(1);
              
              // do not call fetchOrders() here; consolidated effect will react to state changes
            }}
            onEmployeeChange={(vals) => {
              // immediate handler when user changes employees in the toolbar
              // eslint-disable-next-line no-console
              setEmployeesSelected(vals as (string | number)[]);
              setCurrentPage(1);
              
              // do not call fetchOrders() here; consolidated effect will react to state changes
            }}
            onWarningLevelChange={(vals) => {
              // immediate handler when user changes warning levels in the toolbar
              // eslint-disable-next-line no-console
              
              // PaginatedTable có thể truyền values trực tiếp, không cần map
              const warningLevels = (vals as (string | number)[]).map(w => String(w));
              
              setWarningLevelFilter(warningLevels.join(","));
              setCurrentPage(1);
              
              // do not call fetchOrders() here; consolidated effect will react to state changes
            }}
            onDateRangeChange={(dateRange) => {
              if (dateRange && dateRange.from && dateRange.to) {
                const from = dateRange.from instanceof Date 
                  ? dateRange.from.toLocaleDateString("en-CA")
                  : new Date(dateRange.from).toLocaleDateString("en-CA");
                const to = dateRange.to instanceof Date 
                  ? dateRange.to.toLocaleDateString("en-CA")
                  : new Date(dateRange.to).toLocaleDateString("en-CA");
                
                setDateRangeState({ start: from, end: to });
                setCurrentPage(1);
                
                // Immediately save to localStorage with both date and dateRange
                updatePmFiltersAndStorage({
                  dateRange: { start: from, end: to }
                });
              } else {
                setDateRangeState(null);
                setCurrentPage(1);
                
                // Clear dateRange from localStorage
                updatePmFiltersAndStorage({
                  dateRange: undefined
                });
              }
            }}
            onResetFilter={handleResetFilter}
            loading={loading}
            canExport={true}
            getExportData={getExportData}
            getExportAllData={getExportAllData}
            availableStatuses={statusOptions}
            availableDepartments={
              isAnalysisUser
                ? [] // Analysis user không cần filter theo phòng ban
                : isAdmin || isViewRole
                ? (filterOptions.departments || []).map((d: any) => ({
                    value: d.value,
                    label: d.label,
                  }))
                : ((): any => {
                    const depts = (filterOptions.departments || []).map(
                      (d: any) => ({ value: d.value, label: d.label })
                    );
                    const matched = depts.filter(
                      (d: any) =>
                        pmDepartments.includes(String(d.value)) ||
                        pmDepartments.includes(
                          (d.label || "").toString().toLowerCase()
                        )
                    );
                    return matched.length > 0
                      ? matched
                      : Array.isArray(pmDepartments)
                      ? pmDepartments
                      : [];
                  })()
            }
            availableWarningLevels={warningLevelOptions}
            availableEmployees={availableEmployees}
            singleDateLabel="Ngày tạo"
            dateRangeLabel="Khoảng thời gian"
                         isRestoring={isRestoring}
             initialFilters={useMemo(() => {
               return {
                 search: searchTerm,
                 // Hiển thị departments đã chọn từ localStorage
                 departments: departmentsSelected,
                 statuses:
                   statusFilter && statusFilter !== "all"
                     ? statusFilter.split(",")
                     : [],
                 // Hiển thị warning levels đã chọn từ localStorage
                 warningLevels: warningLevelFilter
                   ? warningLevelFilter.split(",")
                   : [],
                 dateRange: dateRangeState
                   ? (() => {
                       try {
                         const fromDate = new Date(dateRangeState.start || "");
                         const toDate = new Date(dateRangeState.end || "");
                         
                         // Kiểm tra xem các ngày có hợp lệ không
                         if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
                           return {
                             from: fromDate,
                             to: toDate,
                           };
                         } else {
                           console.warn("[PM] Invalid dateRange in initialFilters:", dateRangeState);
                           return { from: undefined, to: undefined };
                         }
                       } catch (error) {
                         console.warn("[PM] Error parsing dateRange in initialFilters:", error);
                         return { from: undefined, to: undefined };
                       }
                     })()
                   : { from: undefined, to: undefined },
                 singleDate:
                   dateFilter && dateFilter !== "all"
                     ? (() => {
                         try {
                           const date = new Date(dateFilter);
                           if (!isNaN(date.getTime())) {
                             return date;
                           } else {
                             console.warn("[PM] Invalid singleDate in initialFilters:", dateFilter);
                             return undefined;
                           }
                         } catch (error) {
                           console.warn("[PM] Error parsing singleDate in initialFilters:", error);
                           return undefined;
                         }
                       })()
                     : undefined,
                 // Hiển thị employees đã chọn từ localStorage
                 employees: employeesSelected,
                 quantity: minQuantity,
                 conversationType: conversationTypesSelected,
               };
             }, [
               searchTerm,
               statusFilter,
               warningLevelFilter,
               departmentsSelected,
               employeesSelected,
               minQuantity,
               dateRangeState,
               dateFilter,
               conversationTypesSelected,
             ])}
             enableQuantityFilter={true}
             enableConversationTypeFilter={true}
             defaultQuantity={3}
          >
            {error && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <OrderManagement
              orders={orders as any}
              expectedRowCount={pageSize}
              startIndex={(currentPage - 1) * pageSize}
              onReload={fetchOrders}
              loading={loading}
              showActions={true}
              actionMode="view-only"
              viewRequireAnalysis={false}
              onSearch={(s) => {
                performCustomerSearch(s || "");
              }}
            />
          </PaginatedTable>
        </CardContent>
      </Card>
      {/* Simple modal for viewing messages */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="bg-white rounded shadow-lg z-60 max-w-3xl w-full p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">
                Tin nhắn liên quan - {modalOrder?.order_code}
              </h3>
              <button className="px-2 py-1" onClick={() => setShowModal(false)}>
                Đóng
              </button>
            </div>
            <div className="max-h-80 overflow-auto">
              {modalMessages.length === 0 ? (
                <div className="text-muted-foreground">
                  Không có tin nhắn nào.
                </div>
              ) : (
                <ul className="space-y-2">
                  {modalMessages.map((m, idx) => (
                    <li key={idx} className="p-2 border rounded">
                      <div className="text-sm text-muted-foreground">
                        {m.from}
                      </div>
                      <div className="mt-1">
                        {m.text || m.message || JSON.stringify(m)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {m.created_at}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
