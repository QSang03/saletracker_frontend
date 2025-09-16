"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import ProductCodeEditor from "../ui/ProductCodeEditor";
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

interface OrderDetail {
  id: number | string;
  order_id: number | string;
  quantity: number;
  unit_price: number | string;
  customer_name?: string;
  status?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  employee_code?: string;
  department_name?: string;
  product?: any;
  order?: any;
  sale_by?: any;
}

interface OrderStats {
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}

interface PmOrdersNoProductManagementProps {
  isAnalysisUser?: boolean;
}

export default function PmOrdersNoProductManagement({ isAnalysisUser = false }: PmOrdersNoProductManagementProps) {
  const {
    isPM,
    getPMDepartments,
    getPMPermissions,
    hasPMSpecificRoles,
    hasPMPermissions,
    isAdmin,
    isViewRole,
    getAccessibleDepartments,
    user,
  } = useDynamicPermission();
  
  // State management
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRangeState, setDateRangeState] = useState<{
    start?: string;
    end?: string;
  } | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [employeesSelected, setEmployeesSelected] = useState<(string | number)[]>([]);
  const [warningLevelFilter, setWarningLevelFilter] = useState("");
  const [minQuantity, setMinQuantity] = useState<number | undefined>(undefined);
  const [conversationTypesSelected, setConversationTypesSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalOrder, setModalOrder] = useState<OrderDetail | null>(null);
  const [modalMessages, setModalMessages] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    departments: any[];
    products?: any[];
    brands?: any[];
    categories?: any[];
    brandCategories?: any[];
  }>({ departments: [], products: [], brands: [], categories: [], brandCategories: [] });
  
  // Toggle: admin or PM may include hidden items when exporting
  const [includeHiddenExport, setIncludeHiddenExport] = useState(false);
  const [departmentsSelected, setDepartmentsSelected] = useState<(string | number)[]>([]);
  const [brandsSelected, setBrandsSelected] = useState<(string | number)[]>([]);
  const [categoriesSelected, setCategoriesSelected] = useState<(string | number)[]>([]);
  const [brandCategoriesSelected, setBrandCategoriesSelected] = useState<(string | number)[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const filtersLoadingRef = useRef(false);
  
  // Back/restore state
  const [isRestoring, setIsRestoring] = useState(false);
  const isRestoringRef = useRef(false);
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [isInCustomerSearchMode, setIsInCustomerSearchMode] = useState(false);
  const previousPmFiltersRef = useRef<PmFilters | null>(null);

  // Types
  type PmFilters = {
    page: number;
    pageSize: number;
    search?: string;
    status?: string; // CSV
    date?: string; // single date token
    dateRange?: { start: string; end: string } | undefined;
    departments?: string; // CSV
    employees?: string; // CSV
    brands?: string; // CSV
    categories?: string; // CSV
    brandCategories?: string; // CSV
    warningLevel?: string; // CSV
    quantity?: number;
    conversationType?: string; // CSV
  };

  // LocalStorage helpers for PM filters
  const PM_FILTERS_KEY = "pmOrdersNoProductFilters";
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

  // Helper function để clear pageSize từ localStorage
  const clearPmPageSizeFromStorage = (): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("pmOrdersNoProductPageSize");
    } catch (error) {
      console.warn("Error clearing PM pageSize from localStorage:", error);
    }
  };

  // Permission logic - simplified for no-product orders
  const pmDepartments = isAdmin || isViewRole ? getAccessibleDepartments() : getPMDepartments();
  const isPMWithDepartmentRole = isPM && hasPMSpecificRoles();
  const isPMWithPermissionRole = isPM && hasPMPermissions() && !hasPMSpecificRoles();
  const hasSpecificPMRole = isAdmin || isViewRole || isPMWithDepartmentRole || isPMWithPermissionRole;

  // Helper: lấy tất cả permissions từ các PM custom roles
  const getAllPMCustomPermissions = (): string[] => {
    const pmPermissions = getPMPermissions();
    console.log('🔍 [Frontend PM Debug] getPMPermissions() returned:', pmPermissions);
    const filtered = pmPermissions.filter(p => 
      typeof p === 'string' && (p.toLowerCase().startsWith('pm_') || p.toLowerCase().startsWith('cat_') || p.toLowerCase().startsWith('brand_'))
    );
    
    // Convert cat_xxx và brand_xxx thành pm_cat_xxx và pm_brand_xxx
    const converted = filtered.map(p => {
      if (p.toLowerCase().startsWith('cat_')) {
        return `pm_${p}`;
      } else if (p.toLowerCase().startsWith('brand_')) {
        return `pm_${p}`;
      }
      return p; // Giữ nguyên nếu đã có pm_
    });
    
    console.log('🔍 [Frontend PM Debug] Filtered PM permissions:', filtered);
    console.log('🔍 [Frontend PM Debug] Converted PM permissions:', converted);
    return converted;
  };

  // Helper: kiểm tra có phải PM custom mode không
  const isPMCustomMode = (): boolean => {
    const userRoles = user?.roles || [];
    const pmCustomRoles = userRoles.filter((role: any) => 
      role.name && role.name.startsWith('pm_') && role.name !== 'pm_username'
    );
    
    console.log('🔍 [Frontend PM Debug] User roles:', userRoles.map((r: any) => r.name));
    console.log('🔍 [Frontend PM Debug] PM Custom roles found:', pmCustomRoles.map((r: any) => r.name));
    
    return pmCustomRoles.length > 0;
  };

  // Filter Functions
  const getCurrentPmFilters = (): PmFilters => {
    let departmentsCsv = "";
    let employeesCsv = "";
    let brandsCsv = "";
    let categoriesCsv = "";
    
    // ✅ SỬA: Chỉ lưu departments khi user đã chọn, không auto-fill từ pmDepartments
    departmentsCsv =
      Array.isArray(departmentsSelected) && departmentsSelected.length > 0
        ? departmentsSelected.join(",")
        : "";
    
    employeesCsv =
      Array.isArray(employeesSelected) && employeesSelected.length > 0
        ? employeesSelected.join(",")
        : "";
    
    brandsCsv =
      Array.isArray(brandsSelected) && brandsSelected.length > 0
        ? brandsSelected.join(",")
        : "";
    
    categoriesCsv =
      Array.isArray(categoriesSelected) && categoriesSelected.length > 0
        ? categoriesSelected.join(",")
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
      brands: brandsCsv,
      categories: categoriesCsv,
      brandCategories: Array.isArray(brandCategoriesSelected) && brandCategoriesSelected.length > 0
        ? brandCategoriesSelected.join(",")
        : "",
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
      // Use setTimeout to avoid calling flushSync from lifecycle methods
      setTimeout(() => {
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

          if (f.brands) {
            const vals = f.brands.split(",").filter(Boolean);
            setBrandsSelected(vals);
          } else {
            setBrandsSelected([]);
          }

          if (f.categories) {
            const vals = f.categories.split(",").filter(Boolean);
            setCategoriesSelected(vals);
          } else {
            setCategoriesSelected([]);
          }

          if (f.brandCategories) {
            const vals = f.brandCategories.split(",").filter(Boolean);
            setBrandCategoriesSelected(vals);
          } else {
            setBrandCategoriesSelected([]);
          }

          setWarningLevelFilter(f.warningLevel || "");
          setMinQuantity(typeof f.quantity === "number" ? f.quantity : undefined);
          setConversationTypesSelected(
            f.conversationType ? f.conversationType.split(",").filter(Boolean) : []
          );
        });
      }, 0);
      
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

  // API Functions
  const fetchOrders = async (override?: PmFilters) => {
    try {
      setLoading(true);
      setError(null);
      // Determine effective values (state vs override snapshot)
      const eff = override;
      const effPage = eff ? eff.page : currentPage;
      const effPageSize = eff ? eff.pageSize : pageSize;
      const effSearch = eff ? eff.search : searchTerm;
      const effStatus = eff ? (eff.status || '') : (statusFilter === 'all' ? '' : statusFilter);
      const effDate = eff ? eff.date : (dateFilter === 'all' || dateFilter === 'custom' ? '' : dateFilter);
      const effDateRange = eff ? eff.dateRange : (dateRangeState && dateRangeState.start && dateRangeState.end ? { start: dateRangeState.start, end: dateRangeState.end } : undefined);
      const effDepartmentsCsv = eff ? eff.departments : (departmentsSelected.length > 0 ? departmentsSelected.join(',') : '');
      const effEmployeesCsv = eff ? eff.employees : (employeesSelected.length > 0 ? employeesSelected.join(',') : '');
      const effBrandsCsv = eff ? eff.brands : (brandsSelected.length > 0 ? brandsSelected.join(',') : '');
      const effCategoriesCsv = eff ? eff.categories : (categoriesSelected.length > 0 ? categoriesSelected.join(',') : '');
      const effBrandCategoriesCsv = eff ? eff.brandCategories : (brandCategoriesSelected.length > 0 ? brandCategoriesSelected.join(',') : '');
      const effWarning = eff ? eff.warningLevel : warningLevelFilter;
      const effQty = eff ? eff.quantity : minQuantity;
      const effConversationType = eff ? eff.conversationType : (conversationTypesSelected.length > 0 ? conversationTypesSelected.join(',') : '');

      const params = new URLSearchParams();
      params.set('page', String(effPage));
      params.set('pageSize', String(effPageSize));
      if (effSearch && effSearch.trim()) params.set('search', effSearch.trim());
      if (effStatus) params.set('status', effStatus);
      if (effDate) params.set('date', effDate);
      if (effDateRange) params.set('dateRange', JSON.stringify(effDateRange));

      // ✅ KEY DIFFERENCE: Tất cả PM xem được tất cả dữ liệu - không filter theo permissions
      if (effDepartmentsCsv) {
        params.set('departments', effDepartmentsCsv);
      }

      if (!isAnalysisUser && effEmployeesCsv) {
        params.set('employees', effEmployeesCsv);
      }
      
      // ✅ KEY DIFFERENCE: Bỏ logic PM permissions filtering - tất cả PM xem được tất cả
      console.log('🔍 [Frontend PM No-Product] All PM can see all data - no permission filtering');
      
      if (effWarning) params.set('warningLevel', effWarning);
      if (typeof effQty === 'number') params.set('quantity', String(effQty));
      if (effConversationType) params.set('conversationType', effConversationType);

      // Debug: in ra tất cả params trước khi gửi
      console.log('🔍 [Frontend PM No-Product] Final params:', Object.fromEntries(params.entries()));
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const url = `${baseUrl}/orders/pm-transactions/no-product?${params.toString()}`;
      
      // Debug: log request URL and token presence
      console.debug(
        "[PM No-Product] fetchOrders URL:",
        url,
        "departmentsSelected=",
        departmentsSelected
      );
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Không thể tải dữ liệu đơn hàng không có mã sản phẩm");
      }

      // capture body for debugging when necessary
      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        throw e;
      }
      
      setOrders(data.data || []);
      const total = Number(data.total || 0);
      setTotalItems(total);
      setTotalPages(Math.ceil(total / effPageSize));
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

  // Effects và Event Handlers
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Nếu là PM, admin hoặc view role thì tải dữ liệu
    if (isPM || isAdmin || isViewRole) {
      // Wait until filter options are loaded/mapped to departments to avoid
      // firing an initial fetch before default departments are applied.
      if (!filtersLoaded) return;
      // Also wait for filters to be restored from localStorage
      if (!filtersRestored) return;
      
      // ✅ Debounce fetch để tránh multiple calls
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (isFetchingRef.current) return; // Skip nếu đang fetch
      
      fetchTimeoutRef.current = setTimeout(() => {
        isFetchingRef.current = true;
        Promise.all([fetchOrders(), fetchStats()])
          .finally(() => {
            isFetchingRef.current = false;
          });
      }, 100);
    }
    
    // Cleanup timeout
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
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
    brandsSelected,
    categoriesSelected,
    warningLevelFilter,
    filtersLoaded,
    filtersRestored,
    minQuantity,
    conversationTypesSelected,
  ]);

  // Load filter options với debounce
  const filterOptionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const load = async () => {
      // Prevent concurrent duplication (React Strict Mode / fast re-renders)
      if (filtersLoadingRef.current) return;
      filtersLoadingRef.current = true;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const token = getAccessToken();
        const foUrl = `${baseUrl}/orders/pm-transactions/no-product/filter-options`;
        
        console.debug(
          "[PM No-Product] fetch filter-options URL:",
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
        
        // ✅ KEY DIFFERENCE: Tất cả PM xem được tất cả departments - không filter theo permissions
        console.log('🔍 [Frontend PM No-Product Filter] All PM can see all departments');
        
        setFilterOptions({ 
          departments, 
          products: [], // Không có products vì đây là đơn hàng không có product_id
          brands: [],
          categories: [],
          brandCategories: []
        });

        // ✅ SỬA: Không auto-map departments nữa, để user tự chọn
        // PM users sẽ thấy departments của họ trong dropdown và có thể chọn
        // Backend sẽ tự động filter theo permissions của PM
      } catch (err) {
        console.error("Error loading filter options", err);
      } finally {
        filtersLoadingRef.current = false;
        // mark that filter options have been loaded so main fetch can run
        setFiltersLoaded(true);
      }
    };

    if (isPM || isAdmin || isViewRole) {
      // ✅ Debounce filter options loading
      if (filterOptionsTimeoutRef.current) {
        clearTimeout(filterOptionsTimeoutRef.current);
      }
      
      filterOptionsTimeoutRef.current = setTimeout(() => {
        // reset loaded flag and then load filter options
        setFiltersLoaded(false);
        load();
      }, 50);
    }
    
    // Cleanup timeout
    return () => {
      if (filterOptionsTimeoutRef.current) {
        clearTimeout(filterOptionsTimeoutRef.current);
      }
    };
  }, [isPM, isAdmin, isViewRole]);

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
      setFiltersRestored(true); // Mark that filters have been restored
    } else {
      const state = window.history.state as any;
      if (!state || !state.pmFilters) {
        const pmFilters = getCurrentPmFilters();
        window.history.replaceState({ pmFilters, isCustomerSearch: false, timestamp: Date.now() }, "", window.location.href);
        // Không lưu vào localStorage khi không có stored filters
      }
      setFiltersRestored(true); // Mark that initialization is complete
    }
  }, [filtersLoaded]);

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
    brandsSelected,
    categoriesSelected,
    warningLevelFilter,
    minQuantity,
    conversationTypesSelected,
    filtersLoaded,
    isRestoring,
  ]);

  // Additional helper functions for UI
  const performCustomerSearch = (customerName: string) => {
    if (!customerName || !customerName.trim()) return;
    
    setSearchTerm(customerName.trim());
    setCurrentPage(1);
    
    // Lưu vào localStorage
    const currentFilters = getCurrentPmFilters();
    const updatedFilters = { ...currentFilters, search: customerName.trim(), page: 1 };
    savePmFiltersToStorage(updatedFilters);
    
    // ✅ Trigger fetch data ngay lập tức để search realtime
    fetchOrders({
      page: 1,
      pageSize: pageSize,
      search: customerName.trim(),
      status: statusFilter === 'all' ? '' : statusFilter,
      date: dateFilter === 'all' || dateFilter === 'custom' ? '' : dateFilter,
      dateRange: dateRangeState?.start && dateRangeState?.end ? dateRangeState as { start: string; end: string } : undefined,
      departments: departmentsSelected.join(','),
      employees: employeesSelected.join(','),
      warningLevel: warningLevelFilter,
      quantity: minQuantity,
      conversationType: conversationTypesSelected.join(','),
    });
  };

  // Update filters and save to localStorage
  // Event handlers
  const handleRefresh = useCallback(() => {
    fetchOrders();
  }, []);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    fetchOrders();
  }, []);

  const handleOrderClick = useCallback((order: OrderDetail) => {
    setModalOrder(order);
    setShowModal(true);
  }, []);

  const handleFilterChange = (f: PaginatedFilters) => {
    try {
      // Build new snapshot directly from incoming filters (source of truth)
      const statusesCsv = f.statuses && f.statuses.length > 0 ? (f.statuses as string[]).join(',') : '';
      const employeesArr = f.employees && f.employees.length > 0 ? [...(f.employees as (string|number)[])] : [];
      const departmentsArr = f.departments && f.departments.length > 0 ? [...(f.departments as (string|number)[])] : [];

      // Date (single)
      let singleDateToken = '';
      if (f.singleDate) {
        try {
          const d = f.singleDate instanceof Date ? f.singleDate : new Date(f.singleDate as any);
          if (!isNaN(d.getTime())) singleDateToken = d.toLocaleDateString('en-CA');
        } catch { /* ignore */ }
      }

      // Date range
      let dateRangeVal: { start: string; end: string } | undefined = undefined;
      if (f.dateRange && (f.dateRange as any).from && (f.dateRange as any).to) {
        try {
          const fromDate = (f.dateRange as any).from instanceof Date ? (f.dateRange as any).from : new Date((f.dateRange as any).from);
          const toDate = (f.dateRange as any).to instanceof Date ? (f.dateRange as any).to : new Date((f.dateRange as any).to);
            if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
              dateRangeVal = {
                start: fromDate.toLocaleDateString('en-CA'),
                end: toDate.toLocaleDateString('en-CA'),
              };
            }
        } catch { /* ignore */ }
      }

      // Handle warning levels (now stored as value codes directly)
      let warningLevelCsv = '';
      if (f.warningLevels && f.warningLevels.length > 0) {
        warningLevelCsv = (f.warningLevels as (string|number)[]).map(String).join(',');
      }

      // Quantity
      const quantityVal = typeof (f as any).quantity === 'number' && !Number.isNaN((f as any).quantity) ? (f as any).quantity as number : undefined;

      // ✅ SỬA: Conversation type - xử lý tương tự như manager order
      let conversationTypeCsv = '';
      if (Array.isArray(f.conversationType) && f.conversationType.length > 0) {
        conversationTypeCsv = f.conversationType.join(',');
      }

      // ✅ Brands và Categories (từ 2 dropdown riêng biệt)
      const brandsArr = f.brands && f.brands.length > 0 ? [...(f.brands as (string|number)[])] : [];
      const categoriesArr = f.categories && f.categories.length > 0 ? [...(f.categories as (string|number)[])] : [];

      // Construct new PmFilters snapshot
      const newSnapshot: PmFilters = {
        page: 1,
        pageSize,
        search: f.search || '',
        status: statusesCsv,
        date: singleDateToken,
        dateRange: dateRangeVal,
        departments: departmentsArr.join(','),
        employees: employeesArr.join(','),
        brands: brandsArr.join(','),
        categories: categoriesArr.join(','),
        warningLevel: warningLevelCsv,
        quantity: quantityVal,
        conversationType: conversationTypeCsv,
      };

      // Use setTimeout to avoid calling flushSync from lifecycle methods
      setTimeout(() => {
        flushSync(() => {
          setCurrentPage(1);
          setSearchTerm(newSnapshot.search || "");
          setStatusFilter(newSnapshot.status && newSnapshot.status.length > 0 ? newSnapshot.status : 'all');
          setEmployeesSelected(employeesArr);
          setDepartmentsSelected(departmentsArr);
          setBrandsSelected(brandsArr);
          setCategoriesSelected(categoriesArr);
          setDateFilter(newSnapshot.date && newSnapshot.date.length > 0 ? newSnapshot.date : 'all');
          setDateRangeState(newSnapshot.dateRange ? { ...newSnapshot.dateRange } : null);
          setWarningLevelFilter(newSnapshot.warningLevel || '');
          setMinQuantity(typeof quantityVal === 'number' ? quantityVal : undefined);
          // ✅ SỬA: Set conversation types từ CSV string
          setConversationTypesSelected(conversationTypeCsv ? conversationTypeCsv.split(',').filter(Boolean) : []);
        });
      }, 0);

    // Persist snapshot immediately (overwrite any previous)
    savePmFiltersToStorage(newSnapshot);

    // Rely on the consolidated effect to fetch data when state changes.
    // This prevents duplicate fetches (one from handler + one from effect).
    } catch (e) {
      console.error('[PM] Error in handleFilterChange', e);
    }
  };

  // Export data helper (returns headers + mapped rows for current visible orders)
  const getExportData = () => {
    const headers = [
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
    ];

    const data = orders.map((o: any, idx) => [
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
                return "--";
              }
            } catch (e) {
              return "--";
            }
          })()
        : "--",
      getEmployeeDisplay(o),
      o.customer_name || "--",
      o.product?.productCode || o.productCode || "--",
      o.raw_item || o.items?.map((it: any) => it.name).join(", ") || "--",
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

    return { headers, data, filtersDescription: null };
  };

  // Export all data helper - fetches all rows from backend respecting current filters
  const getExportAllData = async () => {
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

    if (Array.isArray(departmentsSelected) && departmentsSelected.length > 0) {
      params.set("departments", departmentsSelected.join(","));
    }

    if (Array.isArray(employeesSelected) && employeesSelected.length > 0) {
      params.set("employees", employeesSelected.join(","));
    }

    if (warningLevelFilter && warningLevelFilter !== "") {
      params.set("warningLevel", warningLevelFilter);
    }

    if (typeof minQuantity === "number") {
      params.set("quantity", String(minQuantity));
    }

    if (Array.isArray(conversationTypesSelected) && conversationTypesSelected.length > 0) {
      params.set("conversationType", conversationTypesSelected.join(","));
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const token = getAccessToken();
    const res = await fetch(`${baseUrl}/orders/pm-transactions/no-product?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
    
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
                return "--";
              }
            } catch (e) {
              return "--";
            }
          })()
        : "--",
      getEmployeeDisplay(o),
      o.customer_name || "--",
      o.product?.productCode || o.productCode || "--",
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

  const handleEditProductCode = useCallback(async (orderDetail: OrderDetail, data: any) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/${orderDetail.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: data.product_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product code');
      }

      // Refresh data after successful update
      await fetchOrders();
    } catch (error) {
      console.error('Error updating product code:', error);
      setError('Có lỗi khi cập nhật mã sản phẩm');
    }
  }, []);

  const handleDeleteProductCode = useCallback(async (orderDetail: OrderDetail, reason?: string) => {
    console.log('🚀 handleDeleteProductCode được gọi với:', { orderDetail: orderDetail.id, reason });
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token');
      }

      console.log('🗑️ Xóa mã sản phẩm khỏi đơn hàng:', orderDetail.id, 'Lý do:', reason);

      // Sử dụng endpoint PUT để update order detail (backend chỉ hỗ trợ PUT)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/${orderDetail.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: null, // Xóa mã sản phẩm bằng cách set product_id = null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to delete product code: ${response.status}`);
      }

      console.log('✅ Xóa mã sản phẩm thành công');
      
      // Lưu vị trí scroll hiện tại
      const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;
      
      // Refresh data after successful deletion - giữ nguyên trang hiện tại
      await fetchOrders({
        page: currentPage,
        pageSize: pageSize,
        search: searchTerm,
        status: statusFilter === 'all' ? '' : statusFilter,
        date: dateFilter === 'all' || dateFilter === 'custom' ? '' : dateFilter,
        dateRange: dateRangeState?.start && dateRangeState?.end ? dateRangeState as { start: string; end: string } : undefined,
        departments: departmentsSelected.join(','),
        employees: employeesSelected.join(','),
        warningLevel: warningLevelFilter,
        quantity: minQuantity,
        conversationType: conversationTypesSelected.join(','),
      });
      
      // Khôi phục vị trí scroll sau khi data đã load
      setTimeout(() => {
        window.scrollTo(0, currentScrollPosition);
      }, 100);
    } catch (error) {
      console.error('Error deleting product code:', error);
      setError('Có lỗi khi xóa mã sản phẩm. Vui lòng thử lại hoặc liên hệ quản trị viên.');
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, dateFilter, dateRangeState, departmentsSelected, employeesSelected, warningLevelFilter, minQuantity, conversationTypesSelected]);

  const getEmployeeDisplay = useCallback((employee: any) => {
    if (!employee) return 'N/A';
    return employee.fullName || employee.username || 'N/A';
  }, []);

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

  // Compute available employees based on selected departments (or PM-accessible departments for non-admin)
  const availableEmployees = useMemo(() => {
    // Nếu là analysis user, không cần danh sách employees
    if (isAnalysisUser) {
      return [];
    }
    
    // ✅ KEY DIFFERENCE: Tất cả PM xem được tất cả employees - không filter theo permissions
    const depts = Array.isArray(filterOptions?.departments)
      ? filterOptions.departments
      : [];

    const normalize = (v: any) => (v == null ? "" : String(v).toLowerCase());
    
    // Determine which departments to pull employees from
    const selectedValues = new Set(
      (departmentsSelected || []).map((v) => String(v))
    );
    
    let filteredDepts;
    if (departmentsSelected && departmentsSelected.length > 0) {
      // User đã chọn departments cụ thể
      filteredDepts = depts.filter(
        (d: any) => String(d?.value) && selectedValues.has(String(d.value))
      );
    } else if (isAdmin || isViewRole || isPM) {
      // ✅ KEY DIFFERENCE: Admin, view role hoặc PM: hiện tất cả departments
      filteredDepts = depts;
    } else {
      // Fallback: không hiện employees nào
      filteredDepts = [];
    }

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
  }, [filterOptions.departments, departmentsSelected, isAdmin, isViewRole, isPM, isAnalysisUser]);

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
      console.log("[PM No-Product] Filtering employees after department change:", { 
        available: availableEmployees.length, 
        selected: employeesSelected.length, 
        filtered: filtered.length 
      });
      setEmployeesSelected(filtered);
    }
  }, [availableEmployees, employeesSelected, filtersLoaded]);

  const initialFilters = useMemo(() => {
    return {
      search: searchTerm,
      // Hiển thị departments đã chọn từ localStorage
      departments: departmentsSelected,
      // Hiển thị brand categories đã chọn từ localStorage
      brandCategories: brandCategoriesSelected,
      statuses:
        statusFilter && statusFilter !== "all"
          ? statusFilter.split(",")
          : [],
      // Store raw warning level values (match option.value); MultiSelectCombobox will map to labels
      warningLevels: warningLevelFilter
        ? warningLevelFilter.split(",").filter((w) => w)
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
      // Hiển thị brands đã chọn từ localStorage
      brands: brandsSelected,
      // Hiển thị categories đã chọn từ localStorage
      categories: categoriesSelected,
      quantity: minQuantity,
      // ✅ SỬA: Conversation type từ array thành string array
      conversationType: conversationTypesSelected,
    };
  }, [
    searchTerm,
    statusFilter,
    warningLevelFilter,
    departmentsSelected,
    employeesSelected,
    brandsSelected,
    categoriesSelected,
    minQuantity,
    dateRangeState,
    dateFilter,
    conversationTypesSelected,
  ]);

  // Permission checks
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
      brands: "",
      categories: "",
      brandCategories: "",
      warningLevel: "",
      quantity: undefined,
      conversationType: "",
    };

    // ✅ Use setTimeout to avoid calling flushSync from lifecycle methods
    setTimeout(() => {
      flushSync(() => {
        setPageSize(defaultPageSize);
        setCurrentPage(1);
        setSearchTerm("");
        setStatusFilter("all");
        setDateFilter("all");
        setDateRangeState(null);
        setEmployeesSelected([]);
        setDepartmentsSelected([]);
        setBrandsSelected([]);
        setCategoriesSelected([]);
        setBrandCategoriesSelected([]);
        setWarningLevelFilter("");
        setMinQuantity(undefined);
        setConversationTypesSelected([]);
      });
    }, 0);
    
    // ✅ Save reset data vào localStorage
    savePmFiltersToStorage(resetFiltersData);

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
              Bạn chưa được phân quyền cho phòng ban cụ thể nào hoặc không có quyền xem categories/brands. 
              Dữ liệu sẽ được hiển thị khi bạn được cấp quyền xem phòng ban hoặc permissions phù hợp.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full overflow-hidden relative">
      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            📦 Đơn hàng 
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
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <PaginatedTable
            enableSearch={true}
            enableStatusFilter={true}
            enableEmployeeFilter={true}
            enableDepartmentFilter={true}
            enableCategoriesFilter={false}
            enableBrandsFilter={false}
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
            availableEmployees={availableEmployees.map((emp: any, index: number) => ({
              ...emp,
              key: `emp-${emp.value || index}` // Ensure unique key
            }))}
            availableBrands={[]}
            availableCategories={[]}
            availableBrandCategories={[]}
            initialFilters={initialFilters}
            loading={loading}
            canExport={true}
            getExportData={getExportData}
            getExportAllData={getExportAllData}
            availableStatuses={statusOptions}
            availableDepartments={(filterOptions.departments || []).map((dept: any, index: number) => ({
              ...dept,
              key: `dept-${dept.value || index}` // Ensure unique key
            }))}
            availableWarningLevels={warningLevelOptions}
            singleDateLabel="Ngày tạo"
            dateRangeLabel="Khoảng thời gian"
            enableQuantityFilter={true}
            enableConversationTypeFilter={true}
            defaultQuantity={3}
            onResetFilter={handleResetFilter}
            isRestoring={isRestoring}
          >
            <OrderManagement
              orders={orders}
              expectedRowCount={pageSize}
              startIndex={(currentPage - 1) * pageSize}
              onReload={handleRefresh}
              onEdit={handleEditProductCode}
              onDeleteProductCode={handleDeleteProductCode}
              showProductCode={true}
              skipOwnerCheck={true}
            />
          </PaginatedTable>
        </CardContent>
      </Card>
    </div>
  );
}
