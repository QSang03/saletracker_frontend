"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { getUserRolesWithPermissions } from "@/lib/api";
import { CustomerSearchIndicator } from "@/components/order/manager-order/CustomerSearchIndicator";
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
    getPMPermissions,
    hasPMSpecificRoles,
    hasPMPermissions,
    isAdmin,
    isViewRole,
    getAccessibleDepartments,
    user,
  } = useDynamicPermission();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Customer search navigation states (giống manager order)
  const [isInCustomerSearchMode, setIsInCustomerSearchMode] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const isRestoringRef = useRef(false);
  const [previousFilters, setPreviousFilters] = useState<any>(null);
  
  const [searchTerm, setSearchTerm] = useState(() => {
    // ✅ Restore search term từ localStorage ngay khi component mount (giống useOrders)
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.search || "";
      }
    } catch (e) {
      // ignore
    }
    return "";
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    // ✅ Restore status filter từ localStorage ngay khi component mount
    if (typeof window === "undefined") return "all";
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.status && parsed.status.length > 0 ? parsed.status : "all";
      }
    } catch (e) {
      // ignore
    }
    return "all";
  });
  const [dateFilter, setDateFilter] = useState(() => {
    // ✅ Restore date filter từ localStorage ngay khi component mount
    if (typeof window === "undefined") return "all";
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.date || "all";
      }
    } catch (e) {
      // ignore
    }
    return "all";
  });
  const [currentPage, setCurrentPage] = useState(() => {
    // ✅ Restore current page từ localStorage ngay khi component mount
    if (typeof window === "undefined") return 1;
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.page || 1;
      }
    } catch (e) {
      // ignore
    }
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [dateRangeState, setDateRangeState] = useState<{
    start?: string;
    end?: string;
  } | null>(() => {
    // ✅ Restore date range từ localStorage ngay khi component mount
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.dateRange || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [employeesSelected, setEmployeesSelected] = useState<
    (string | number)[]
  >([]);
  const [warningLevelFilter, setWarningLevelFilter] = useState(() => {
    // ✅ Restore warning level filter từ localStorage ngay khi component mount
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.warningLevel || "";
      }
    } catch (e) {
      // ignore
    }
    return "";
  });
  const [minQuantity, setMinQuantity] = useState<number | undefined>(() => {
    // ✅ Restore min quantity từ localStorage ngay khi component mount
    if (typeof window === "undefined") return undefined;
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.quantity ? Number(parsed.quantity) : undefined;
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  });
  const [conversationTypesSelected, setConversationTypesSelected] = useState<
    string[]
  >(() => {
    // ✅ Restore conversation types từ localStorage ngay khi component mount
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("pmTransactionFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.conversationType ? parsed.conversationType.split(',').filter(Boolean) : [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [showModal, setShowModal] = useState(false);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [modalMessages, setModalMessages] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    departments: any[];
    products?: any[];
    brands?: any[];
    categories?: any[];
    brandCategories?: any[];
  }>({ departments: [], products: [], brands: [], categories: [], brandCategories: [] });
  
  // State để lưu dữ liệu cho role view
  const [allCategoriesForView, setAllCategoriesForView] = useState<{ value: string; label: string }[]>([]);
  const [allBrandsForView, setAllBrandsForView] = useState<{ value: string; label: string }[]>([]);
  // Toggle: admin or PM may include hidden items when exporting
  const [includeHiddenExport, setIncludeHiddenExport] = useState(false);
  // Toggle: show hidden orders from last N days
  const [showHiddenOrders, setShowHiddenOrders] = useState(false);
  const [hiddenOrdersDays, setHiddenOrdersDays] = useState(7); // Default 7 days
  const [departmentsSelected, setDepartmentsSelected] = useState<
    (string | number)[]
  >([]);
  const [brandsSelected, setBrandsSelected] = useState<
    (string | number)[]
  >([]);
  const [categoriesSelected, setCategoriesSelected] = useState<
    (string | number)[]
  >([]);
  const [brandCategoriesSelected, setBrandCategoriesSelected] = useState<
    (string | number)[]
  >([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const filtersLoadingRef = useRef(false);
  // Back/restore state
  const [userRolesWithPermissions, setUserRolesWithPermissions] = useState<any[]>([]);
  const [filtersRestored, setFiltersRestored] = useState(false);
  const previousPmFiltersRef = useRef<PmFilters | null>(null);

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
    showHiddenOrders?: boolean;
    hiddenOrdersDays?: number;
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
      showHiddenOrders,
      hiddenOrdersDays,
    };
  };

  const applyPmFilters = (f: PmFilters, skipSave?: boolean) => {
    // Prevent loops and flickers during restore
    isRestoringRef.current = true;
    setIsRestoring(true);
    
    console.log('🔍 [PM Transaction] applyPmFilters called with:', f);
    
    try {
      // Use setTimeout to avoid calling flushSync from lifecycle methods
      setTimeout(() => {
        flushSync(() => {
          setPageSize(f.pageSize ?? 10);
          setCurrentPage(f.page ?? 1);
          console.log('🔍 [PM Transaction] Setting searchTerm to:', f.search || "");
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
          // ✅ SỬA: Apply conversation types từ CSV string
          setConversationTypesSelected(
            f.conversationType ? f.conversationType.split(",").filter(Boolean) : []
          );

          // Apply hidden orders settings
          setShowHiddenOrders(f.showHiddenOrders || false);
          setHiddenOrdersDays(f.hiddenOrdersDays || 7);
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

  // Nếu là admin, dùng danh sách departments khả dụng; nếu không, dùng pm-{dept}
  const pmDepartments =
    isAdmin || isViewRole ? getAccessibleDepartments() : getPMDepartments();
  
  // ✅ TÁCH RIÊNG: PM có role phụ (pm-phongban)
  const isPMWithDepartmentRole = isPM && hasPMSpecificRoles();
  
  // ✅ TÁCH RIÊNG: PM có quyền riêng (pm_permissions)
  const isPMWithPermissionRole = isPM && hasPMPermissions() && !hasPMSpecificRoles();

  // Kiểm tra PM có quyền truy cập
  const hasSpecificPMRole =
    isAdmin || 
    isViewRole || 
    isPMWithDepartmentRole ||
    isPMWithPermissionRole;



  // Helper: lấy tất cả permissions từ các PM custom roles
  
  // API functions cho role view
  const fetchAllCategories = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const response = await fetch(`${baseUrl}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      const categories = data.map((cat: any) => ({
        value: String(cat.slug || cat.catName || cat.name || cat.id),
        label: String(cat.catName || cat.name || cat.slug || cat.id)
      }));
      
      // Đảm bảo unique values
      const uniqueCategories = categories.filter((cat: any, index: number, self: any[]) => 
        index === self.findIndex((c: any) => c.value === cat.value)
      );
      
      // Lưu vào state để sử dụng trong handleFilterChange
      setAllCategoriesForView(uniqueCategories);
      
      return uniqueCategories;
    } catch (error) {
      console.error('Error fetching all categories:', error);
      return [];
    }
  };

  const fetchAllBrands = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const response = await fetch(`${baseUrl}/brands`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const data = await response.json();
      const brands = data.map((brand: any) => ({
        value: String(brand.slug || brand.name || brand.brandName || brand.id),
        label: String(brand.name || brand.brandName || brand.slug || brand.id)
      }));
      
      // Đảm bảo unique values
      const uniqueBrands = brands.filter((brand: any, index: number, self: any[]) => 
        index === self.findIndex((b: any) => b.value === brand.value)
      );
      
      // Lưu vào state để sử dụng trong handleFilterChange
      setAllBrandsForView(uniqueBrands);
      
      return uniqueBrands;
    } catch (error) {
      console.error('Error fetching all brands:', error);
      return [];
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const response = await fetch(`${baseUrl}/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const data = await response.json();
      const employees = data.data
        .filter((user: any) => {
          // Lọc bỏ user có role "view"
          const userRoles = user.roles || [];
          return !userRoles.some((role: any) => 
            role.name?.toLowerCase() === 'view' || 
            role.roleName?.toLowerCase() === 'view'
          );
        })
        .map((user: any) => ({
          value: String(user.id),
          label: String(`${user.fullName || user.full_name || user.username} (${user.employee_code || user.id})`)
        }));
      
      // Đảm bảo unique values
      const uniqueEmployees = employees.filter((emp: any, index: number, self: any[]) => 
        index === self.findIndex((e: any) => e.value === emp.value)
      );
      
      return uniqueEmployees;
    } catch (error) {
      console.error('Error fetching all employees:', error);
      return [];
    }
  };

  const fetchAllDepartments = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const response = await fetch(`${baseUrl}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      
      const result = await response.json();
      // API departments trả về { data: [...], total: number, page: number, pageSize: number }
      const data = result.data || result;
      const departments = data.map((dept: any) => ({
        value: String(dept.id),
        label: String(dept.name || dept.department_name || dept.id)
      }));
      
      // Đảm bảo unique values
      const uniqueDepartments = departments.filter((dept: any, index: number, self: any[]) => 
        index === self.findIndex((d: any) => d.value === dept.value)
      );
      
      return uniqueDepartments;
    } catch (error) {
      console.error('Error fetching all departments:', error);
      return [];
    }
  };
  const getAllPMCustomPermissions = (): string[] => {
    const pmPermissions = getPMPermissions();
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
    
    return converted;
  };

  // Helper: kiểm tra có phải PM custom mode không
  const isPMCustomMode = (): boolean => {
    // Kiểm tra xem user có các role pm_username_n không
    const userRoles = user?.roles || [];
    const pmCustomRoles = userRoles.filter((role: any) => 
      role.name && role.name.startsWith('pm_') && role.name !== 'pm_username'
    );
    
    
    // Nếu có role pm_username_n thì là custom mode
    return pmCustomRoles.length > 0;
  };

  // Compute available employees based on selected departments (or PM-accessible departments for non-admin)
  const availableEmployees = useMemo(() => {
    // Nếu là analysis user, không cần danh sách employees
    if (isAnalysisUser) {
      return [];
    }
    
    // ✅ PM có quyền riêng (pm_permissions) không hiện employees
    if (isPMWithPermissionRole) {
      return [];
    }
    
    const depts = Array.isArray(filterOptions?.departments)
      ? filterOptions.departments
      : [];

    const normalize = (v: any) => (v == null ? "" : String(v).toLowerCase());
    
    // Tạo pmSet từ slug của PM (chỉ cho PM có role phụ pm-phongban)
    const pmSlugs = isAdmin || isViewRole ? [] : getPMDepartments();
    const pmSet = new Set(
      (Array.isArray(pmSlugs) ? pmSlugs : []).map((x: any) =>
        normalize(x)
      )
    );

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
    } else if (isAdmin || isViewRole) {
      // Admin hoặc view role: hiện tất cả
      filteredDepts = depts;
    } else if (isPMWithDepartmentRole && pmSet.size > 0) {
      // ✅ PM có role phụ (pm-phongban): hiện employees từ departments mà họ có quyền
      filteredDepts = depts.filter((d: any) => {
        const slug = normalize(d?.slug);
        return pmSet.has(slug);
      });
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
    
    const result = Array.from(map.values());
    return result;
  }, [filterOptions.departments, departmentsSelected, isAdmin, pmDepartments, isAnalysisUser, isPMWithPermissionRole, isPMWithDepartmentRole, isViewRole]);

  // removed: moved pmDepartments/hasSpecificPMRole above to avoid temporal dead zone

  // Fetch orders data (optionally with an override snapshot of filters)
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
      const effShowHiddenOrders = eff ? eff.showHiddenOrders : showHiddenOrders;
      const effHiddenOrdersDays = eff ? eff.hiddenOrdersDays : hiddenOrdersDays;

      const params = new URLSearchParams();
      params.set('page', String(effPage));
      params.set('pageSize', String(effPageSize));
      if (effSearch && effSearch.trim()) params.set('search', effSearch.trim());
      if (effStatus) params.set('status', effStatus);
      if (effDate) params.set('date', effDate);
      if (effDateRange) params.set('dateRange', JSON.stringify(effDateRange));

      // ✅ SỬA: Chỉ truyền departments khi user đã chọn, không auto-fill
      if (effDepartmentsCsv) {
        params.set('departments', effDepartmentsCsv);
      }
      // Note: PM với chỉ permissions (pm_{permission}) sẽ được backend xử lý tự động

      if (!isAnalysisUser && effEmployeesCsv) {
        params.set('employees', effEmployeesCsv);
      }
      
      // ✅ PM có quyền riêng (pm_permissions): thêm brands và categories riêng biệt
      
      if (isPMWithPermissionRole) {
        // ✅ SỬA: Gửi brands và categories riêng biệt để backend xử lý tổ hợp
        if (effBrandsCsv) {
          params.set('brands', effBrandsCsv);
        }
        if (effCategoriesCsv) {
          params.set('categories', effCategoriesCsv);
        }
        
        // Vẫn giữ logic cũ cho brandCategories nếu cần
        if (effBrandCategoriesCsv) {
          params.set('brandCategories', effBrandCategoriesCsv);
        } else {
          // ✅ SỬA: Luôn gửi rolePermissions cho PM Custom Mode, bất kể có chọn brands/categories hay không
          // Kiểm tra chế độ PM
          if (isPMCustomMode()) {
            // Chế độ tổ hợp riêng: gửi thông tin chi tiết từng role
            
            // Lấy thông tin từng role từ API (đã có permissions từ database)
            const pmCustomRoles = userRolesWithPermissions.filter((role: any) => 
              role.name && role.name.startsWith('pm_') && role.name !== 'pm_username'
            );
            
            
            // Tạo object chứa thông tin từng role từ database
            const rolePermissions: { [roleName: string]: { brands: string[], categories: string[] } } = {};
            
            // Tạm thời: chia permissions theo logic cụ thể vì rolePermissions chưa được load từ database
            const allUserPermissions = getPMPermissions();
            const convertedPermissions = allUserPermissions.map(p => {
              if (p.toLowerCase().startsWith('cat_')) {
                return `pm_${p}`;
              } else if (p.toLowerCase().startsWith('brand_')) {
                return `pm_${p}`;
              }
              return p;
            });
            
            const brands = convertedPermissions.filter(p => p.toLowerCase().startsWith('pm_brand_'));
            const categories = convertedPermissions.filter(p => p.toLowerCase().startsWith('pm_cat_'));
            
            pmCustomRoles.forEach((role: any, index: number) => {
              const roleName = role.name;
              
              // ✅ SỬA: Lấy permissions thực tế từ database cho từng role
              
              // ✅ SỬA: Lấy permissions thực tế của role này từ database
              // Mỗi role đã có permissions riêng trong bảng roles_permissions
              let rolePermissionsList: string[] = [];
              
              // Lấy permissions từ rolePermissions array
              if (role.rolePermissions && Array.isArray(role.rolePermissions)) {
                rolePermissionsList = role.rolePermissions
                  .filter((rp: any) => rp.isActive && rp.permission)
                  .map((rp: any) => rp.permission.name);
              }
              
              // ✅ SỬA: Chỉ lấy permissions thực tế từ database, không có fallback
              if (!rolePermissionsList || rolePermissionsList.length === 0) {
                rolePermissionsList = []; // Chỉ lấy từ database, không fallback
              }
              
              // Convert permissions thành brands và categories
              const convertedRolePermissions = rolePermissionsList.map((p: string) => {
                if (p.toLowerCase().startsWith('cat_')) {
                  return `pm_${p}`;
                } else if (p.toLowerCase().startsWith('brand_')) {
                  return `pm_${p}`;
                }
                return p;
              });
              
              const roleBrands = convertedRolePermissions.filter((p: string) => p.toLowerCase().startsWith('pm_brand_'));
              const roleCategories = convertedRolePermissions.filter((p: string) => p.toLowerCase().startsWith('pm_cat_'));
              
              rolePermissions[roleName] = { 
                brands: roleBrands, 
                categories: roleCategories 
              };
              
            });
            
            // Gửi thông tin từng role
            params.set('pmCustomMode', 'true');
            params.set('rolePermissions', JSON.stringify(rolePermissions));
            
          } else {
            // Chế độ tổ hợp chung: gửi tất cả permissions
            const allPMPermissions = getAllPMCustomPermissions();
            if (allPMPermissions.length > 0) {
              params.set('brandCategories', allPMPermissions.join(','));
            }
            params.set('pmCustomMode', 'false');
          }
        }
      } else if (isViewRole) {
        // ✅ Role "view": xử lý brands và categories riêng biệt
        if (effBrandsCsv) {
          params.set('brands', effBrandsCsv);
        }
        if (effCategoriesCsv) {
          params.set('categories', effCategoriesCsv);
        }
      }
      
      
      if (effWarning) params.set('warningLevel', effWarning);
      if (typeof effQty === 'number') params.set('quantity', String(effQty));
      // ✅ SỬA: Conversation type filter - xử lý tương tự như manager order
      if (effConversationType) params.set('conversationType', effConversationType);

      // ✅ Add hidden orders parameter
      if (effShowHiddenOrders) {
        params.set('includeHidden', '1');
        // Calculate date range for hidden orders (last N days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (effHiddenOrdersDays || 7));
        
        // Format dates as YYYY-MM-DD
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // ✅ SỬA: Không override date filters hiện tại, chỉ thêm hidden orders date range
        // Backend sẽ xử lý logic kết hợp date filters với hidden orders
        params.set('hiddenOrdersDateRange', JSON.stringify({ start: startDateStr, end: endDateStr }));
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const token = getAccessToken();
      const url = `${baseUrl}/orders/pm-transactions?${params.toString()}`;
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

  // ✅ Tối ưu: Sử dụng ref để tránh fetch nhiều lần
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);
  const hasInitialFetchRef = useRef(false); // ✅ Flag để tránh fetch lần đầu khi restore

  useEffect(() => {
    // Nếu là PM, admin hoặc view role thì tải dữ liệu
    if (isPM || isAdmin || isViewRole) {
      // Wait until filter options are loaded/mapped to departments to avoid
      // firing an initial fetch before default departments are applied.
      if (!filtersLoaded) return;
      // Also wait for filters to be restored from localStorage
      if (!filtersRestored) return;
      
      // ✅ Debounce fetch để tránh multiple calls - tăng thời gian debounce
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (isFetchingRef.current) return; // Skip nếu đang fetch
      if (isRestoringRef.current) return; // Skip nếu đang restore filters
      
      // ✅ Tránh fetch lần đầu khi restore từ localStorage
      if (!hasInitialFetchRef.current) {
        hasInitialFetchRef.current = true;
        // Fetch ngay lập tức cho lần đầu
        isFetchingRef.current = true;
        Promise.all([fetchOrders(), fetchStats()])
          .finally(() => {
            isFetchingRef.current = false;
          });
        return;
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        isFetchingRef.current = true;
        Promise.all([fetchOrders(), fetchStats()])
          .finally(() => {
            isFetchingRef.current = false;
          });
      }, 300); // Tăng từ 100ms lên 300ms
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
    showHiddenOrders,
    hiddenOrdersDays,
    // ✅ SỬA: Thêm isPMWithPermissionRole để tránh fetch khi role thay đổi
    isPMWithPermissionRole,
    isRestoring, // Thêm để tránh fetch khi đang restore
  ]);

  // removed duplicate sync effect — pageSize/dateRangeState/departments/employees/warningLevel are handled
  // in the consolidated main effect above to avoid multiple fetches.

  // ✅ Tối ưu: Load filter options với debounce
  const filterOptionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load user roles with permissions when component mounts
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const response = await getUserRolesWithPermissions();
        setUserRolesWithPermissions(response.roles || []);
      } catch (error) {
        console.error('❌ [Frontend PM] Error loading user roles with permissions:', error);
      }
    };
    
    fetchUserRoles();
  }, []);
  
  useEffect(() => {
    const load = async () => {
      // Prevent concurrent duplication (React Strict Mode / fast re-renders)
      if (filtersLoadingRef.current) return;
      filtersLoadingRef.current = true;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const token = getAccessToken();
        const foUrl = `${baseUrl}/orders/pm-transactions/filter-options`;
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
        console.log("Debug departments:", departments);
        
        // ✅ PM có quyền riêng (pm_permissions): tạo brandCategories gộp từ permissions
        let brands: any[] = [];
        let categories: any[] = [];
        let brandCategories: any[] = [];
        
        if (isPMWithPermissionRole) {
          // ✅ PM có quyền riêng: tạo 2 dropdown riêng biệt (Danh mục + Thương hiệu)
          // Đơn giản: lấy tất cả unique brands và categories từ permissions
          const allPMPermissions = getAllPMCustomPermissions();
          
          // Tách brands và categories từ permissions
          const pmBrands = allPMPermissions.filter(p => p.toLowerCase().startsWith('pm_brand_'));
          const pmCategories = allPMPermissions.filter(p => p.toLowerCase().startsWith('pm_cat_'));
          
          
          // Tạo filter options cho brands (loại bỏ trùng lặp)
          const uniqueBrands = new Set(pmBrands);
          brands = Array.from(uniqueBrands).map(brand => ({
            value: brand.replace('pm_brand_', '').toLowerCase(),
            label: brand.replace('pm_brand_', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          }));
          
          // Tạo filter options cho categories (loại bỏ trùng lặp)
          const uniqueCategories = new Set(pmCategories);
          categories = Array.from(uniqueCategories).map(category => ({
            value: category.replace('pm_cat_', '').toLowerCase(),
            label: category.replace('pm_cat_', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          }));
          
          // Không cần brandCategories combinations nữa, để trống
          brandCategories = [];
          
        }
        
        setFilterOptions({ 
          departments, 
          products: json.products || [],
          brands,
          categories,
          brandCategories
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
      }, 100); // Tăng từ 50ms lên 100ms
    }
    
    // Cleanup timeout
    return () => {
      if (filterOptionsTimeoutRef.current) {
        clearTimeout(filterOptionsTimeoutRef.current);
      }
    };
  }, [isPM, isAdmin, isPMWithPermissionRole]);

  // Initialize history state on mount for consistent back behavior
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const state = window.history.state as any;
    
    // ✅ Khi F5, history state bị mất → restore từ localStorage
    if (!state || (!state.pmFilters && !state.filters)) {
      const stored = getPmFiltersFromStorage();
      
      if (stored) {
        console.log('🔄 [PM Init] Restoring from localStorage on F5:', stored);
        
        // ✅ CRITICAL: Apply filters vào state TRƯỚC KHI set filtersRestored
        applyPmFilters(stored, true); // skipSave = true để tránh loop
        
        // Replace history state với filters từ localStorage
        window.history.replaceState({ 
          filters: stored,
          pmFilters: stored, 
          isCustomerSearch: false, 
          timestamp: Date.now() 
        }, "", window.location.pathname);
      } else {
        console.log('🔄 [PM Init] No stored filters, using current state');
        const current = getCurrentPmFilters();
        window.history.replaceState({ 
          filters: current,
          pmFilters: current, 
          isCustomerSearch: false, 
          timestamp: Date.now() 
        }, "", window.location.pathname);
      }
    } else {
      console.log('🔄 [PM Init] History state exists:', state.pmFilters);
    }
    
    // ✅ Delay để đảm bảo applyPmFilters đã hoàn tất
    setTimeout(() => {
      setFiltersRestored(true); // Mark that initialization is complete
    }, 150);
  }, []); // ✅ Chạy ngay khi component mount

  // ✅ Handle browser back/forward to restore filters (giống manager order)
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      // Block during restore
      isRestoringRef.current = true;
      setIsRestoring(true);

      const hs = (event.state || {}) as any;

      const applySnapshot = (snap: PmFilters, isCustomerSearchFlag: boolean, hasPrev: boolean) => {
        flushSync(() => {
          setPageSize(snap.pageSize ?? 10);
          setCurrentPage(snap.page ?? 1);
          setSearchTerm(snap.search || "");
          setStatusFilter(snap.status && snap.status.length > 0 ? snap.status : "all");
          if (snap.dateRange && snap.dateRange.start && snap.dateRange.end) {
            setDateRangeState({ start: snap.dateRange.start, end: snap.dateRange.end });
          } else {
            setDateRangeState(null);
          }
          if (snap.date && snap.date.length > 0) {
            setDateFilter(snap.date);
          } else {
            setDateFilter("all");
          }
          setDepartmentsSelected(snap.departments ? snap.departments.split(',').filter(Boolean) : []);
          setEmployeesSelected(snap.employees ? snap.employees.split(',').filter(Boolean) : []);
          setBrandsSelected(snap.brands ? snap.brands.split(',').filter(Boolean) : []);
          setCategoriesSelected(snap.categories ? snap.categories.split(',').filter(Boolean) : []);
          setBrandCategoriesSelected(snap.brandCategories ? snap.brandCategories.split(',').filter(Boolean) : []);
          setWarningLevelFilter(snap.warningLevel || "");
          setMinQuantity(typeof snap.quantity === 'number' ? snap.quantity : undefined);
          setConversationTypesSelected(snap.conversationType ? snap.conversationType.split(',').filter(Boolean) : []);
          setShowHiddenOrders(snap.showHiddenOrders || false);
          setHiddenOrdersDays(snap.hiddenOrdersDays || 7);
          // Customer-search flags
          if (isCustomerSearchFlag) {
            setIsInCustomerSearchMode(true);
            setCanGoBack(!!hasPrev);
          } else {
            setIsInCustomerSearchMode(false);
            setCanGoBack(false);
          }
        });
        try { savePmFiltersToStorage(snap); } catch {}
      };

      if (hs && hs.isReset === true && (hs.pmFilters || hs.filters)) {
        // Reset state branch
        const f = (hs.pmFilters || hs.filters) as PmFilters;
        applySnapshot(f, false, false);

        // Build URL and replace as non-reset
        const params = new URLSearchParams();
        params.set('page', String(f.page));
        params.set('pageSize', String(f.pageSize));
        if (f.search?.trim()) params.set('search', f.search.trim());
        if (f.status) params.set('status', f.status);
        if (f.date) params.set('date', f.date);
        if (f.dateRange) params.set('dateRange', JSON.stringify(f.dateRange));
        // PM filters không dùng 'employee' đơn lẻ
        if (f.employees) params.set('employees', f.employees);
        if (f.departments) params.set('departments', f.departments);
        if (f.brands) params.set('brands', f.brands);
        if (f.categories) params.set('categories', f.categories);
        if (f.brandCategories) params.set('brandCategories', f.brandCategories);
        if (f.warningLevel) params.set('warningLevel', f.warningLevel);
        if (typeof f.quantity === 'number') params.set('quantity', String(f.quantity));
        if (f.conversationType) params.set('conversationType', f.conversationType);
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({ pmFilters: f, page: f.page, pageSize: f.pageSize, timestamp: Date.now(), isReset: false }, '', newUrl);
      } else if (hs && hs.previousFilters) {
        // Back from customer search → apply previousFilters immediately
        const prev = hs.previousFilters as PmFilters;
        applySnapshot(prev, false, false);

        // Replace URL to previous snapshot
        const params = new URLSearchParams();
        params.set('page', String(prev.page));
        params.set('pageSize', String(prev.pageSize));
        if (prev.search?.trim()) params.set('search', prev.search.trim());
        if (prev.status) params.set('status', prev.status);
        if (prev.date) params.set('date', prev.date);
        if (prev.dateRange) params.set('dateRange', JSON.stringify(prev.dateRange));
        // PM filters không dùng 'employee' đơn lẻ
        if (prev.employees) params.set('employees', prev.employees);
        if (prev.departments) params.set('departments', prev.departments);
        if (prev.brands) params.set('brands', prev.brands);
        if (prev.categories) params.set('categories', prev.categories);
        if (prev.brandCategories) params.set('brandCategories', prev.brandCategories);
        if (prev.warningLevel) params.set('warningLevel', prev.warningLevel);
        if (typeof prev.quantity === 'number') params.set('quantity', String(prev.quantity));
        if (prev.conversationType) params.set('conversationType', prev.conversationType);
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({ pmFilters: prev, page: prev.page, pageSize: prev.pageSize, timestamp: Date.now() }, '', newUrl);
      } else if (hs && (hs.pmFilters || hs.filters)) {
        // Generic filters branch
        const snap = (hs.pmFilters || hs.filters) as PmFilters;
        const hasPrev = !!hs.previousFilters;
        applySnapshot(snap, !!hs.isCustomerSearch, hasPrev);
      }

      setTimeout(() => {
        isRestoringRef.current = false;
        setIsRestoring(false);
        // Post-restore fetch giống manager order
        try {
          fetchOrders((hs.previousFilters as PmFilters) || (hs.pmFilters as PmFilters) || (hs.filters as PmFilters));
        } catch {}
      }, 200);
    };
    
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ✅ Restore previous state function (giống manager order) - di chuyển lên trước để tránh hoisting issue
  const restorePreviousState = useCallback(async () => {
    if (previousFilters) {
      // ✅ Prevent any interference
      setIsRestoring(true);

      // ✅ Update state atomic
      setSearchTerm(previousFilters.search || "");
      setStatusFilter(previousFilters.status || "all");
      setDateFilter(previousFilters.date || "all");
      setDepartmentsSelected(previousFilters.departments ? previousFilters.departments.split(',').filter(Boolean) : []);
      setEmployeesSelected(previousFilters.employees ? previousFilters.employees.split(',').filter(Boolean) : []);
      setCurrentPage(previousFilters.page || 1);
      setIsInCustomerSearchMode(false);
      setCanGoBack(false);

      // ✅ Save to storage
      savePmFiltersToStorage(previousFilters);

      // ✅ Clean up
      setPreviousFilters(null);

      // ✅ Delay để đảm bảo state đã stable
      setTimeout(() => {
        setIsRestoring(false);
      }, 200);
    } else {
      console.warn("⚠️ No previous filters to restore");
      if (window.history.length > 1) {
        window.history.back();
      }
    }
  }, [previousFilters]);

  // ✅ Handle restore previous (giống manager order) - di chuyển lên trước để tránh hoisting issue
  const handleRestorePrevious = useCallback(async () => {
    await restorePreviousState();
  }, [restorePreviousState]);

  

  const performCustomerSearch = (customerName: string) => {
    if (!customerName || !customerName.trim()) return;
    
    // ✅ Snapshot current filters to previousFilters (giống manager order)
    const currentFilters = getCurrentPmFilters();
    setPreviousFilters(currentFilters);

    // ✅ Trước khi push customer search state, replace current state với previousFilters info
    try {
      const currentState: any = window.history.state || {};
      window.history.replaceState(
        {
          ...currentState,
          previousFilters: currentFilters,
          isCustomerSearch: false,
        },
        "",
        window.location.href
      );
    } catch {}

    // Set flags giống manager order
    flushSync(() => {
      setIsInCustomerSearchMode(true);
      setCanGoBack(true);
    });

    // Build exact search and push state mới
    const exactSearchTerm = `"${customerName.trim()}"`;
    const searchFilters: Partial<PmFilters> = {
      ...currentFilters,
      search: exactSearchTerm,
      page: 1,
    };

    // ✅ Push entry mới với flag isCustomerSearch và previousFilters
    updatePmFiltersAndUrl(searchFilters, false, true, currentFilters, false);
  };


  // When departments change, remove any selected employees that no longer belong to the available set
  useEffect(() => {
    if (!employeesSelected || employeesSelected.length === 0) return;
    if (isRestoringRef.current) return; // Skip during restore to avoid clearing restored employees
    if (!filtersLoaded) return; // Skip until filters are loaded
    
    // ✅ SỬA: Sử dụng đúng danh sách employees cho từng role
    let allowedEmployees: { value: string | number; label: string }[] = [];
    if (isViewRole) {
      // Role "view": không filter employees theo departments, cho phép tất cả
      // Vì role "view" có thể xem tất cả employees từ API /users
      allowedEmployees = employeesSelected.map(id => ({ value: id, label: String(id) }));
    } else {
      // Role khác: sử dụng availableEmployees (từ departments)
      allowedEmployees = availableEmployees;
    }
    
    const allowed = new Set(allowedEmployees.map((e) => String(e.value)));
    const filtered = employeesSelected.filter((v) => allowed.has(String(v)));
    // Only update when actually changed to avoid render loops
    const isSame =
      filtered.length === employeesSelected.length &&
      filtered.every((v, i) => String(v) === String(employeesSelected[i]));
    if (!isSame) {
      console.log("[PM] Filtering employees after department change:", { 
        available: allowedEmployees.length, 
        selected: employeesSelected.length, 
        filtered: filtered.length,
        isViewRole
      });
      setEmployeesSelected(filtered);
    }
  }, [availableEmployees, employeesSelected, filtersLoaded, isViewRole]);

  // Helper: build query string from PM filters
  const buildPmQueryString = (f: PmFilters): string => {
    const params = new URLSearchParams();
    params.set('page', String(f.page));
    params.set('pageSize', String(f.pageSize));
    if (f.search && f.search.trim()) params.set('search', f.search.trim());
    if (f.status) params.set('status', f.status);
    if (f.date) params.set('date', f.date);
    if (f.dateRange) params.set('dateRange', JSON.stringify(f.dateRange));
    if (f.departments) params.set('departments', f.departments);
    if (f.employees) params.set('employees', f.employees);
    if (f.brands) params.set('brands', f.brands);
    if (f.categories) params.set('categories', f.categories);
    if (f.brandCategories) params.set('brandCategories', f.brandCategories);
    if (f.warningLevel) params.set('warningLevel', f.warningLevel);
    if (typeof f.quantity === 'number') params.set('quantity', String(f.quantity));
    if (f.conversationType) params.set('conversationType', f.conversationType);
    if (f.showHiddenOrders) params.set('includeHidden', '1');
    if (typeof f.hiddenOrdersDays === 'number') params.set('hiddenOrdersDays', String(f.hiddenOrdersDays));
    return params.toString();
  };

  // Parse filters from current URL as fallback when history.state is missing
  // removed URL fallback to match manager-order behavior exactly

  // ✅ Update filters + URL + History (mirror manager order)
  const updatePmFiltersAndUrl = useCallback((
    newFilters: Partial<PmFilters>,
    skipHistory = false,
    isCustomerSearch = false,
    previousFilters?: PmFilters,
    isReset = false
  ) => {
    if (isRestoringRef.current) return;

    const current = getCurrentPmFilters();
    const updated: PmFilters = { ...current, ...newFilters } as PmFilters;

    try {
      savePmFiltersToStorage(updated);
    } catch {}

    const query = buildPmQueryString(updated);
    const newUrl = window.location.pathname + (query ? `?${query}` : '');

    const historyState = {
      filters: updated,
      pmFilters: updated,
      page: updated.page,
      pageSize: updated.pageSize,
      timestamp: Date.now(),
      isCustomerSearch,
      previousFilters: previousFilters || undefined,
      isReset,
    };

    if (isReset) {
      window.history.pushState(historyState, '', newUrl);
    } else if (skipHistory) {
      window.history.replaceState(historyState, '', newUrl);
    } else {
      window.history.pushState(historyState, '', newUrl);
    }
  }, [getCurrentPmFilters]);

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
    if (!filtersRestored) return; // ✅ Skip saving until initial restoration is complete
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
    conversationTypesSelected, // ✅ SỬA: Include conversation types in auto-save
    showHiddenOrders,
    hiddenOrdersDays,
    filtersLoaded,
    filtersRestored, // ✅ Thêm dependency để effect chạy lại khi restoration complete
    isRestoring,
  ]);


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
      // Convert IDs to names for backend
      const brandsArr = f.brands && f.brands.length > 0 ? [...(f.brands as (string|number)[])] : [];
      const categoriesArr = f.categories && f.categories.length > 0 ? [...(f.categories as (string|number)[])] : [];
      
      // Convert brand IDs to names
      let brandNames = '';
      if (brandsArr.length > 0) {
        if (isViewRole) {
          // For view role, we have all brands in allBrandsForView
          const brandSlugsList = brandsArr.map(id => {
            const brand = allBrandsForView.find(b => b.value === id.toString());
            return brand ? brand.value : id.toString(); // Use value (slug) not label (name)
          }).filter(Boolean);
          brandNames = brandSlugsList.join(',');
        } else {
          // For other roles, use filterOptions.brands from props
          const brandNamesList = brandsArr.map(id => {
            const brand = filterOptions.brands?.find((b: any) => b === id.toString());
            return brand || id.toString();
          }).filter(Boolean);
          brandNames = brandNamesList.join(',');
        }
      }
      
      // Convert category IDs to names
      let categoryNames = '';
      if (categoriesArr.length > 0) {
        if (isViewRole) {
          // For view role, we have all categories in allCategoriesForView
          const categorySlugsList = categoriesArr.map(id => {
            const category = allCategoriesForView.find(c => c.value === id.toString());
            return category ? category.value : id.toString(); // Use value (slug) not label (name)
          }).filter(Boolean);
          categoryNames = categorySlugsList.join(',');
        } else {
          // For other roles, use filterOptions.categories from props
          const categoryNamesList = categoriesArr.map(id => {
            const category = filterOptions.categories?.find((c: any) => c.value === id.toString());
            return category ? category.label : id.toString();
          }).filter(Boolean);
          categoryNames = categoryNamesList.join(',');
        }
      }

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
        brands: brandNames,
        categories: categoryNames,
        warningLevel: warningLevelCsv,
        quantity: quantityVal,
        conversationType: conversationTypeCsv,
        showHiddenOrders,
        hiddenOrdersDays,
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

    // ✅ Persist snapshot AND push to history (giống manager order)
    // Chỉ attach previousFilters khi bắt đầu customer search (đã làm trong performCustomerSearch)
    updatePmFiltersAndUrl(newSnapshot, false, false, undefined, false);

    // Rely on the consolidated effect to fetch data when state changes.
    // This prevents duplicate fetches (one from handler + one from effect).
    } catch (e) {
      console.error('[PM] Error in handleFilterChange', e);
    }
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
      brandCategories: "",
      warningLevel: "",
      quantity: undefined,
      conversationType: "", // ✅ SỬA: Reset conversation type
      showHiddenOrders: false,
      hiddenOrdersDays: 7,
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
        setShowHiddenOrders(false);
        setHiddenOrdersDays(7);
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
      // Mã Sản Phẩm
      o.product?.productCode || o.productCode || "--",
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

    // Provide a small filtersDescription node that will be rendered inside the
    // CSVExportPanel dialog. For admins we expose the switch to include hidden
    // orders when exporting all data.
    const filtersDescription = (
      <div className="flex items-center justify-start gap-4">
  { (isAdmin || isPM || isViewRole) && (
          <div className="flex items-center gap-2">
            <Switch
              aria-label="Bao gồm đơn ẩn"
              checked={includeHiddenExport}
              onCheckedChange={(v: any) => setIncludeHiddenExport(Boolean(v))}
            />
            <div className="text-sm">Bao gồm đơn ẩn</div>
          </div>
        )}
      </div>
    );

    return { headers, data, filtersDescription };
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

    // ✅ SỬA: Chỉ truyền departments khi user đã chọn
    if (Array.isArray(departmentsSelected) && departmentsSelected.length > 0) {
      params.set("departments", departmentsSelected.join(","));
    }
    // Note: PM với chỉ permissions (pm_{permission}) sẽ được backend xử lý tự động

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
    // ✅ SỬA: Conversation type filter trong export
    if (
      Array.isArray(conversationTypesSelected) &&
      conversationTypesSelected.length > 0
    ) {
      params.set("conversationType", conversationTypesSelected.join(","));
    }

    // ✅ PM có quyền riêng (pm_permissions): thêm brandCategories trong export
    if (isPMWithPermissionRole) {
      // ✅ SỬA: Áp dụng cùng logic tổ hợp brands + categories như fetchOrders
      const effBrandsCsv = brandsSelected.length > 0 ? brandsSelected.join(',') : '';
      const effCategoriesCsv = categoriesSelected.length > 0 ? categoriesSelected.join(',') : '';
      
      // ✅ SỬA: Gửi brands và categories riêng biệt để backend xử lý tổ hợp
      if (effBrandsCsv) {
        params.set('brands', effBrandsCsv);
      }
      if (effCategoriesCsv) {
        params.set('categories', effCategoriesCsv);
      }
      
       if (Array.isArray(brandCategoriesSelected) && brandCategoriesSelected.length > 0) {
         // Sử dụng brandCategories đã chọn trực tiếp
         params.set('brandCategories', brandCategoriesSelected.join(','));
       } else {
         // ✅ SỬA: Luôn gửi rolePermissions cho PM Custom Mode trong export
         // Kiểm tra chế độ PM
         if (isPMCustomMode()) {
          // Chế độ tổ hợp riêng: gửi thông tin chi tiết từng role
          
          // Lấy thông tin từng role từ API (đã có permissions từ database)
          const pmCustomRoles = userRolesWithPermissions.filter((role: any) => 
            role.name && role.name.startsWith('pm_') && role.name !== 'pm_username'
          );
          
          
          // Tạo object chứa thông tin từng role từ database
          const rolePermissions: { [roleName: string]: { brands: string[], categories: string[] } } = {};
          
          // Tạm thời: chia permissions theo logic cụ thể vì rolePermissions chưa được load từ database
          const allUserPermissions = getPMPermissions();
          const convertedPermissions = allUserPermissions.map(p => {
            if (p.toLowerCase().startsWith('cat_')) {
              return `pm_${p}`;
            } else if (p.toLowerCase().startsWith('brand_')) {
              return `pm_${p}`;
            }
            return p;
          });
          
          const brands = convertedPermissions.filter(p => p.toLowerCase().startsWith('pm_brand_'));
          const categories = convertedPermissions.filter(p => p.toLowerCase().startsWith('pm_cat_'));
          
           pmCustomRoles.forEach((role: any, index: number) => {
             const roleName = role.name;
             
             // ✅ SỬA: Lấy permissions thực tế từ database cho từng role
             
             // ✅ SỬA: Lấy permissions thực tế của role này từ database
             // Mỗi role đã có permissions riêng trong bảng roles_permissions
             let rolePermissionsList: string[] = [];
             
             // Lấy permissions từ rolePermissions array
             if (role.rolePermissions && Array.isArray(role.rolePermissions)) {
               rolePermissionsList = role.rolePermissions
                 .filter((rp: any) => rp.isActive && rp.permission)
                 .map((rp: any) => rp.permission.name);
             }
             
             // ✅ SỬA: Chỉ lấy permissions thực tế từ database, không có fallback
             if (!rolePermissionsList || rolePermissionsList.length === 0) {
               rolePermissionsList = []; // Chỉ lấy từ database, không fallback
             }
             
             // Convert permissions thành brands và categories
             const convertedRolePermissions = rolePermissionsList.map((p: string) => {
               if (p.toLowerCase().startsWith('cat_')) {
                 return `pm_${p}`;
               } else if (p.toLowerCase().startsWith('brand_')) {
                 return `pm_${p}`;
               }
               return p;
             });
             
             const roleBrands = convertedRolePermissions.filter((p: string) => p.toLowerCase().startsWith('pm_brand_'));
             const roleCategories = convertedRolePermissions.filter((p: string) => p.toLowerCase().startsWith('pm_cat_'));
             
             rolePermissions[roleName] = { 
               brands: roleBrands, 
               categories: roleCategories 
             };
             
           });
          
          // Gửi thông tin từng role
          params.set('pmCustomMode', 'true');
          params.set('rolePermissions', JSON.stringify(rolePermissions));
          
        } else {
          // Chế độ tổ hợp chung: gửi tất cả permissions
          const allPMPermissions = getAllPMCustomPermissions();
          if (allPMPermissions.length > 0) {
            params.set('brandCategories', allPMPermissions.join(','));
          }
          params.set('pmCustomMode', 'false');
        }
      }
    }

    // ✅ Role "view": xử lý brands và categories riêng biệt trong export
    if (isViewRole) {
      const effBrandsCsv = brandsSelected.length > 0 ? brandsSelected.join(',') : '';
      const effCategoriesCsv = categoriesSelected.length > 0 ? categoriesSelected.join(',') : '';
      
      if (effBrandsCsv) {
        params.set('brands', effBrandsCsv);
      }
      if (effCategoriesCsv) {
        params.set('categories', effCategoriesCsv);
      }
    }

    // Admin, PM, or view role can include hidden items when exporting all
    if ((isAdmin || isPM || isViewRole) && includeHiddenExport) {
      params.set("includeHidden", "1");
    }

    // Include hidden orders from last N days if toggle is enabled
    if (showHiddenOrders) {
      params.set("includeHidden", "1");
      // Calculate date range for hidden orders (last N days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (hiddenOrdersDays || 7));
      
      // Format dates as YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // ✅ SỬA: Không override date filters hiện tại, chỉ thêm hidden orders date range
      // Backend sẽ xử lý logic kết hợp date filters với hidden orders
      params.set("hiddenOrdersDateRange", JSON.stringify({ start: startDateStr, end: endDateStr }));
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const token = getAccessToken();
    const res = await fetch(`${baseUrl}/orders/pm-transactions?${params.toString()}`, {
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
      // Mã Sản Phẩm
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

  // Handle edit product code
  const handleEditProductCode = useCallback(async (orderDetail: any, data: any) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/${orderDetail.id}`, {
        method: 'PUT',
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

  // Handle delete product code
  const handleDeleteProductCode = useCallback(async (orderDetail: any, reason?: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token');
      }

      console.log('🗑️ [PM] Xóa mã sản phẩm khỏi đơn hàng:', orderDetail.id, 'Lý do:', reason);

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

      console.log('✅ [PM] Xóa mã sản phẩm thành công');
      
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
      setError('Có lỗi khi xóa mã sản phẩm');
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, dateFilter, dateRangeState, departmentsSelected, employeesSelected, warningLevelFilter, minQuantity, conversationTypesSelected]);

  if (!isPM && !isAdmin && !isViewRole) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Bạn không có quyền truy cập vào chức năng này.
        </AlertDescription>
      </Alert>
    );
  }

  // Nếu không phải admin, view role và cũng không có role PM cụ thể thì hiện thông báo
  if (!isAdmin && !isViewRole && !hasSpecificPMRole) {
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
      {/* Statistics Cards removed per request */}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Danh sách giao dịch
          </CardTitle>
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              variant="outline"
              onClick={() => fetchOrders()}
              className="text-sm"
            >
              🔄 Làm mới
            </Button>
            
            {/* Hidden Orders Toggle */}
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
              <Switch
                checked={showHiddenOrders}
                onCheckedChange={(checked) => {
                  setShowHiddenOrders(checked);
                  setCurrentPage(1);
                  // ✅ Push to history (thay vì chỉ lưu localStorage)
                  updatePmFiltersAndUrl({
                    showHiddenOrders: checked,
                    page: 1
                  });
                }}
              />
              <Label className="text-sm font-medium">
                Hiển thị đơn ẩn
              </Label>
              
              {showHiddenOrders && (
                <div className="flex items-center gap-2 ml-2">
                  <Label className="text-xs text-muted-foreground">
                    Trong
                  </Label>
                  <Select
                    value={String(hiddenOrdersDays)}
                    onValueChange={(value) => {
                      const days = parseInt(value, 10);
                      setHiddenOrdersDays(days);
                      setCurrentPage(1);
                      // ✅ Push to history (thay vì chỉ lưu localStorage)
                      updatePmFiltersAndUrl({
                        hiddenOrdersDays: days,
                        page: 1
                      });
                    }}
                  >
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 ngày</SelectItem>
                      <SelectItem value="7">7 ngày</SelectItem>
                      <SelectItem value="14">14 ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* include hidden option moved into Export modal */}
          </div>
        </CardHeader>
        
        {/* ✅ Customer Search Indicator (giống manager order) */}
        {isInCustomerSearchMode && searchTerm && (
          <CustomerSearchIndicator
            customerName={searchTerm}
            onRestorePrevious={handleRestorePrevious}
            onClearSearch={() => {
              // Clear search and exit customer search mode
              setSearchTerm("");
              handleRestorePrevious(); // Or just restore to previous state
            }}
          />
        )}
        
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch={true}
            enableStatusFilter={true}
            enableEmployeeFilter={!isAnalysisUser && (isPMWithDepartmentRole || isViewRole)}
            enableDepartmentFilter={!isAnalysisUser && (isPMWithDepartmentRole || isViewRole)}
            enableCategoriesFilter={isPMWithPermissionRole}
            enableBrandsFilter={isPMWithPermissionRole}
            // Thêm props cho role view
            enableCategoriesFilterForViewRole={isViewRole}
            enableBrandsFilterForViewRole={isViewRole}
            enableEmployeeFilterForViewRole={isViewRole}
            enableDepartmentFilterForViewRole={isViewRole}
            enableDateRangeFilter={true}
            enableSingleDateFilter={true}
            enableWarningLevelFilter={true}
            enablePageSize={true}
            enableGoToPage={true}
            page={currentPage}
            total={totalItems}
            pageSize={pageSize}
            // ✅ Add isRestoring and initialFilters props (giống manager order)
            isRestoring={isRestoring}
            initialFilters={{
              search: searchTerm,
              statuses: statusFilter === "all" ? [] : [statusFilter],
              employees: employeesSelected,
              departments: departmentsSelected,
              dateRange: dateRangeState ? {
                from: dateRangeState.start ? new Date(dateRangeState.start) : undefined,
                to: dateRangeState.end ? new Date(dateRangeState.end) : undefined,
              } : undefined,
              singleDate: dateFilter === "all" ? undefined : dateFilter,
              warningLevels: warningLevelFilter ? warningLevelFilter.split(',').filter(Boolean) : [],
              quantity: minQuantity,
              conversationType: conversationTypesSelected,
            }}
            onPageChange={(p) => {
              setCurrentPage(p);
              // ✅ Push to history khi đổi trang
              updatePmFiltersAndUrl({ page: p });
            }}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
              // ✅ Push to history khi đổi page size
              updatePmFiltersAndUrl({ pageSize: s, page: 1 });
            }}
            onFilterChange={handleFilterChange}
            availableCategories={filterOptions.categories}
            availableBrands={filterOptions.brands}
            // Thêm API functions cho role view
            onFetchAllCategories={isViewRole ? fetchAllCategories : undefined}
            onFetchAllBrands={isViewRole ? fetchAllBrands : undefined}
            onFetchAllEmployees={isViewRole ? fetchAllEmployees : undefined}
            onFetchAllDepartments={isViewRole ? fetchAllDepartments : undefined}
            onDepartmentChange={(vals) => {
              // immediate handler when user changes departments in the toolbar
              setDepartmentsSelected(vals as (string | number)[]);
              setCurrentPage(1);
              // Only persist snapshot; onFilterChange will push history
              updatePmFiltersAndStorage({
                departments: vals.length > 0 ? vals.join(',') : ''
              });
            }}
            onEmployeeChange={(vals) => {
              // immediate handler when user changes employees in the toolbar
              setEmployeesSelected(vals as (string | number)[]);
              setCurrentPage(1);
              // Only persist snapshot; onFilterChange will push history
              updatePmFiltersAndStorage({
                employees: vals.length > 0 ? vals.join(',') : ''
              });
            }}
            onBrandsChange={(vals) => {
              // immediate handler when user changes brands in the toolbar
              setBrandsSelected(vals as (string | number)[]);
              setCurrentPage(1);
              // Only persist snapshot; onFilterChange will push history
              updatePmFiltersAndStorage({
                brands: vals.length > 0 ? vals.join(',') : ''
              });
            }}
            onCategoriesChange={(vals) => {
              // immediate handler when user changes categories in the toolbar
              setCategoriesSelected(vals as (string | number)[]);
              setCurrentPage(1);
              // Only persist snapshot; onFilterChange will push history
              updatePmFiltersAndStorage({
                categories: vals.length > 0 ? vals.join(',') : ''
              });
            }}
            onBrandCategoryChange={(vals: (string | number)[]) => {
              // immediate handler when user changes brand categories in the toolbar
              setBrandCategoriesSelected(vals as (string | number)[]);
              setCurrentPage(1);
              // Only persist snapshot; onFilterChange will push history
              updatePmFiltersAndStorage({
                brandCategories: vals.length > 0 ? vals.join(',') : ''
              });
            }}
            onWarningLevelChange={(vals) => {
              // immediate handler when user changes warning levels in the toolbar
              const warningLevels = (vals as (string | number)[]).map(w => String(w));
              setWarningLevelFilter(warningLevels.join(","));
              setCurrentPage(1);
              // Only persist snapshot; onFilterChange will push history
              updatePmFiltersAndStorage({
                warningLevel: warningLevels.join(",")
              });
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
                // Only persist snapshot; onFilterChange will push history
                updatePmFiltersAndStorage({
                  dateRange: { start: from, end: to }
                });
              } else {
                setDateRangeState(null);
                setCurrentPage(1);
                // Only persist snapshot; onFilterChange will push history
                updatePmFiltersAndStorage({
                  dateRange: undefined
                });
              }
            }}
            onResetFilter={handleResetFilter}
            onClearSearch={() => {
              try {
                // Only restore previous state if we're in customer search mode
                if (isInCustomerSearchMode) {
                  // Force-clear storage first to avoid autosave races
                  try {
                    const stored = getPmFiltersFromStorage();
                    if (stored) {
                      stored.search = "";
                      savePmFiltersToStorage(stored);
                    } else {
                      const snapshot = getCurrentPmFilters();
                      snapshot.search = "";
                      savePmFiltersToStorage(snapshot);
                    }
                  } catch (e) {
                    // ignore storage errors
                  }

                  // Use setTimeout to avoid calling flushSync from lifecycle methods
                  setTimeout(() => {
                    flushSync(() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                      setIsInCustomerSearchMode(false);
                    });
                  }, 0);

                  // If we have a previous snapshot, restore it; otherwise apply the cleared snapshot
                  const prev = previousPmFiltersRef.current;
                  if (prev) {
                    // restore previous snapshot (which should be the filters before customer-search)
                    applyPmFilters(prev);
                    try {
                      savePmFiltersToStorage(prev);
                    } catch (e) {
                      // ignore
                    }
                    window.history.replaceState({ pmFilters: prev, isCustomerSearch: false, timestamp: Date.now() }, "", window.location.href);
                    previousPmFiltersRef.current = null;
                  } else {
                    // No previous snapshot: apply current snapshot with search cleared to ensure backend sees cleared search
                    try {
                      const cleared = getCurrentPmFilters();
                      cleared.search = "";
                      applyPmFilters(cleared);
                      try {
                        savePmFiltersToStorage(cleared);
                      } catch (e) {
                        // ignore
                      }
                      window.history.replaceState({ pmFilters: cleared, isCustomerSearch: false, timestamp: Date.now() }, "", window.location.href);
                      // Extra guard: some other effect may re-save an older snapshot; ensure we overwrite shortly after
                      try {
                        setTimeout(() => {
                          try {
                            const nowStored = getPmFiltersFromStorage() || getCurrentPmFilters();
                            nowStored.search = "";
                            savePmFiltersToStorage(nowStored);
                          } catch (e) {
                            // ignore
                          }
                        }, 120);
                      } catch (e) {
                        // ignore
                      }
                    } catch (e) {
                      // ignore
                    }
                  }
                } else {
                  // For normal search tag clearing, just clear the search term and let the filter change handle the rest
                  setSearchTerm("");
                  setCurrentPage(1);
                }
              } catch (e) {
                // swallow any errors
              }
            }}
            loading={loading}
            canExport={true}
            getExportData={getExportData}
            getExportAllData={getExportAllData}
            availableStatuses={statusOptions}
            availableDepartments={
              isAnalysisUser || isPMWithPermissionRole
                ? [] // Analysis user hoặc PM có quyền riêng không cần filter theo phòng ban
                : isAdmin || isViewRole
                ? (filterOptions.departments || []).map((d: any) => ({
                    value: d.value,
                    label: d.label,
                  }))
                : isPMWithDepartmentRole
                ? ((): any => {
                    const depts = (filterOptions.departments || []).map(
                      (d: any) => ({ value: d.value, label: d.label, slug: d.slug })
                    );
                    const matched = depts.filter(
                      (d: any) =>
                        pmDepartments.includes(d.slug) ||
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
                : []
            }
            availableWarningLevels={warningLevelOptions}
            availableEmployees={availableEmployees}
            availableBrandCategories={filterOptions.brandCategories || []}
            singleDateLabel="Ngày tạo"
            dateRangeLabel="Khoảng thời gian"
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
              actionMode={isViewRole ? "view-only" : "edit"}
              viewRequireAnalysis={false}
              showProductCode={true}
              skipOwnerCheck={true}
              onEdit={handleEditProductCode}
              onDeleteProductCode={handleDeleteProductCode}
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
