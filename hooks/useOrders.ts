import { useState, useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { Order, OrderDetail } from "@/types";
import { getAccessToken } from "@/lib/auth";
import {
  saveNavigationHistory,
  popNavigationHistory,
  hasNavigationHistory,
} from "@/lib/navigation-history";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildUrlWithFilters,
  getCurrentHistoryState,
  HistoryState,
  pushToHistory,
  replaceHistory,
} from "@/lib/browser-history";

interface OrderFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  date?: string;
  dateRange?: { start: string; end: string };
  employee?: string;
  employees?: string;
  departments?: string;
  products?: string;
  warningLevel?: string;
  sortField?: "quantity" | "unit_price" | null;
  sortDirection?: "asc" | "desc" | null;
}

export type { OrderFilters };

interface OrdersResponse {
  data: OrderDetail[];
  total: number;
  page: number;
  pageSize: number;
}

interface UseOrdersReturn {
  // State
  orders: OrderDetail[];
  total: number;
  filters: OrderFilters;

  // State setters
  setFilters: (filters: Partial<OrderFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string, resetPage?: boolean) => void;
  setStatus: (status: string, resetPage?: boolean) => void;
  setDate: (date: string, resetPage?: boolean) => void;
  setDateRange: (
    dateRange: { start: string; end: string } | undefined,
    resetPage?: boolean
  ) => void;
  setEmployee: (employee: string, resetPage?: boolean) => void;
  setEmployees: (employees: string, resetPage?: boolean) => void;
  setDepartments: (departments: string, resetPage?: boolean) => void;
  setProducts: (products: string, resetPage?: boolean) => void;
  setWarningLevel: (warningLevel: string, resetPage?: boolean) => void;
  setSortField: (
    sortField: "quantity" | "unit_price" | null,
    resetPage?: boolean
  ) => void;
  setSortDirection: (
    sortDirection: "asc" | "desc" | null,
    resetPage?: boolean
  ) => void;

  // Actions
  refetch: () => Promise<void>;
  resetFilters: () => void;
  getFilterOptions: () => Promise<{ departments: any[]; products: any[] }>;

  // CRUD methods
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrder: (id: number, orderData: Partial<Order>) => Promise<Order>;
  deleteOrder: (id: number) => Promise<void>;
  getOrderById: (id: number) => Promise<Order>;

  // Order Details methods
  fetchOrderDetails: (orderId: number) => Promise<OrderDetail[]>;
  createOrderDetail: (
    orderDetailData: Partial<OrderDetail>
  ) => Promise<OrderDetail>;
  updateOrderDetail: (
    id: number,
    orderDetailData: Partial<OrderDetail>
  ) => Promise<OrderDetail>;
  updateOrderDetailCustomerName: (
    id: number,
    customerName: string
  ) => Promise<OrderDetail>;
  deleteOrderDetail: (id: number) => Promise<void>;
  getOrderDetailById: (id: number) => Promise<OrderDetail>;

  // Bulk operations
  bulkDeleteOrderDetails: (ids: number[], reason: string) => Promise<void>;
  bulkUpdateOrderDetails: (ids: number[], updates: Partial<OrderDetail>) => Promise<void>;
  bulkExtendOrderDetails: (ids: number[]) => Promise<void>;
  bulkAddNotesOrderDetails: (ids: number[], notes: string) => Promise<void>;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // ✅ Customer search navigation functions
  performCustomerSearch: (customerName: string) => void;
  restorePreviousState: () => Promise<void>;
  isInCustomerSearchMode: boolean;
  setIsInCustomerSearchMode: (value: boolean) => void;
  canGoBack: boolean;
  isRestoring: boolean;
  
  // ✅ Debug functions
  forceResetRestoration: () => void;
}

// ✅ Helper function để get pageSize từ localStorage - LOẠI BỎ giới hạn upper limit
const getPageSizeFromStorage = (defaultSize: number = 10): number => {
  if (typeof window === "undefined") return defaultSize;

  try {
    const saved = localStorage.getItem("orderPageSize");
    if (saved) {
      const parsed = parseInt(saved);
      // ✅ CHỈ check > 0, KHÔNG giới hạn trên
      return parsed > 0 ? parsed : defaultSize;
    }
  } catch (error) {
    console.warn("Error reading orderPageSize from localStorage:", error);
  }

  return defaultSize;
};

// ✅ Helper function để save pageSize vào localStorage
const savePageSizeToStorage = (pageSize: number): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("orderPageSize", pageSize.toString());
  } catch (error) {
    console.warn("Error saving orderPageSize to localStorage:", error);
  }
};

// ✅ Helper function để clear pageSize từ localStorage
const clearPageSizeFromStorage = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("orderPageSize");
  } catch (error) {
    console.warn("Error clearing orderPageSize from localStorage:", error);
  }
};

// ✅ Helper functions để save/load tất cả filters từ localStorage
const saveFiltersToStorage = (filters: OrderFilters): void => {
  if (typeof window === "undefined") return;

  try {
    const filtersToSave = {
      search: filters.search || "",
      status: filters.status || "",
      date: filters.date || "",
      dateRange: filters.dateRange || null,
      employee: filters.employee || "",
      employees: filters.employees || "",
      departments: filters.departments || "",
      products: filters.products || "",
      warningLevel: filters.warningLevel || "",
      sortField: filters.sortField || null,
      sortDirection: filters.sortDirection || null,
    };
    localStorage.setItem("orderFilters", JSON.stringify(filtersToSave));
  } catch (error) {
    console.warn("Error saving filters to localStorage:", error);
  }
};

const getFiltersFromStorage = (): Partial<OrderFilters> => {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem("orderFilters");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn("Error reading filters from localStorage:", error);
  }
  return {};
};

const clearFiltersFromStorage = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("orderFilters");
  } catch (error) {
    console.warn("Error clearing filters from localStorage:", error);
  }
};

export const useOrders = (): UseOrdersReturn => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [total, setTotal] = useState(0);

  // ✅ Customer search navigation states
  const [isInCustomerSearchMode, setIsInCustomerSearchMode] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const isUpdatingUrl = useRef(false);
  const shouldResetPageRef = useRef<boolean>(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const isRestoringRef = useRef(false);
  const [previousFilters, setPreviousFilters] = useState<OrderFilters | null>(
    null
  );

  const [filters, setFiltersState] = useState<OrderFilters>(() => {
    // Ưu tiên URL params trước, sau đó mới là localStorage
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(
      searchParams.get("pageSize") || getPageSizeFromStorage(10).toString()
    );
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const date = searchParams.get("date") || "";
    const employees = searchParams.get("employees") || "";
    const departments = searchParams.get("departments") || "";
    const products = searchParams.get("products") || "";
    const warningLevel = searchParams.get("warningLevel") || "";
    const sortField = searchParams.get("sortField") as
      | "quantity"
      | "unit_price"
      | null;
    const sortDirection = searchParams.get("sortDirection") as
      | "asc"
      | "desc"
      | null;

    let dateRange: { start: string; end: string } | undefined;
    const dateRangeParam = searchParams.get("dateRange");
    if (dateRangeParam) {
      try {
        dateRange = JSON.parse(dateRangeParam);
      } catch (e) {
        console.warn("Invalid dateRange param:", dateRangeParam);
      }
    }

    // Nếu có params từ URL, return luôn
    if (searchParams.toString()) {
      return {
        page,
        pageSize,
        search,
        status,
        date,
        dateRange,
        employee: "",
        employees,
        departments,
        products,
        warningLevel,
        sortField,
        sortDirection,
      };
    }

    // Nếu không có URL params, load từ localStorage
    const savedFilters = getFiltersFromStorage();
    return {
      page: 1,
      pageSize: getPageSizeFromStorage(10),
      search: savedFilters.search || "",
      status: savedFilters.status || "",
      date: savedFilters.date || "",
      dateRange: savedFilters.dateRange || undefined,
      employee: savedFilters.employee || "",
      employees: savedFilters.employees || "",
      departments: savedFilters.departments || "",
      products: savedFilters.products || "",
      warningLevel: savedFilters.warningLevel || "",
      sortField: savedFilters.sortField || null,
      sortDirection: savedFilters.sortDirection || null,
    };
  });

  // ✅ Debug function để reset restoration state nếu bị stuck
  const forceResetRestoration = useCallback(() => {
    console.log("🔧 Force resetting restoration state");
    setIsRestoring(false);
    isRestoringRef.current = false;
  }, []);

  // ✅ Helper function để save filters conditionally
  const conditionalSaveFilters = useCallback(
    (filters: OrderFilters) => {
      // Chỉ save khi KHÔNG đang trong customer search mode
      if (!isInCustomerSearchMode) {
        saveFiltersToStorage(filters);
      }
    },
    [isInCustomerSearchMode]
  );

  const updateFiltersAndUrl = useCallback(
    (newFilters: OrderFilters, skipHistory = false, isCustomerSearch = false, previousFilters?: OrderFilters, skipRouterNavigation = false) => {
      console.log("📦 updateFiltersAndUrl called with:", { 
        newFilters, 
        skipHistory, 
        isCustomerSearch, 
        previousFilters,
        skipRouterNavigation,
        isRestoring: isRestoringRef.current,
        isRestoringState: isRestoring
      });

      // ✅ Skip URL update if we're currently restoring from popstate
      if (isRestoringRef.current) {
        console.log("⏸️ Skipping updateFiltersAndUrl during restoration");
        return;
      }

      // ✅ Debug: Log the filter changes that will be applied
      console.log("🔧 Applying filter changes:", {
        oldFilters: filters,
        newFilters,
        changes: Object.keys(newFilters).reduce((acc, key) => {
          if (filters[key as keyof OrderFilters] !== newFilters[key as keyof OrderFilters]) {
            acc[key] = { old: filters[key as keyof OrderFilters], new: newFilters[key as keyof OrderFilters] };
          }
          return acc;
        }, {} as any)
      });

      // Lưu vào localStorage
      conditionalSaveFilters(newFilters);

      // Update state
      setFiltersState(newFilters);

      // Update URL using Next.js router
      if (!isUpdatingUrl.current) {
        isUpdatingUrl.current = true;

        const searchParams = new URLSearchParams();
        
        // Build query parameters
        if (newFilters.page > 1) {
          searchParams.set("page", newFilters.page.toString());
        }
        
        if (newFilters.pageSize !== 10) {
          searchParams.set("pageSize", newFilters.pageSize.toString());
        }
        
        if (newFilters.search?.trim()) {
          searchParams.set("search", newFilters.search.trim());
        }
        
        if (newFilters.status?.trim()) {
          searchParams.set("status", newFilters.status.trim());
        }
        
        if (newFilters.date?.trim()) {
          searchParams.set("date", newFilters.date.trim());
        }
        
        if (newFilters.dateRange) {
          searchParams.set("dateRange", JSON.stringify(newFilters.dateRange));
        }
        
        if (newFilters.employee?.trim()) {
          searchParams.set("employee", newFilters.employee.trim());
        }
        
        if (newFilters.employees?.trim()) {
          searchParams.set("employees", newFilters.employees.trim());
        }
        
        if (newFilters.departments?.trim()) {
          searchParams.set("departments", newFilters.departments.trim());
        }
        
        if (newFilters.products?.trim()) {
          searchParams.set("products", newFilters.products.trim());
        }
        
        if (newFilters.warningLevel?.trim()) {
          searchParams.set("warningLevel", newFilters.warningLevel.trim());
        }
        
        if (newFilters.sortField) {
          searchParams.set("sortField", newFilters.sortField);
        }
        
        if (newFilters.sortDirection) {
          searchParams.set("sortDirection", newFilters.sortDirection);
        }

        const queryString = searchParams.toString();
        const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '');

        // Use Next.js router for navigation only if not skipping router navigation
        if (!skipRouterNavigation) {
          if (skipHistory) {
            router.replace(newUrl);
          } else {
            router.push(newUrl);
          }
        }

        // Also update browser history state for back/forward navigation
        const historyState = {
          filters: newFilters,
          page: newFilters.page,
          pageSize: newFilters.pageSize,
          timestamp: Date.now(),
          isCustomerSearch: isCustomerSearch,
          previousFilters: previousFilters || undefined,
        };

        if (skipHistory) {
          window.history.replaceState(historyState, '', newUrl);
        } else {
          window.history.pushState(historyState, '', newUrl);
        }

        // Reset flag sau một chút
        setTimeout(() => {
          isUpdatingUrl.current = false;
        }, 100);
      }
    },
    [router, conditionalSaveFilters]
  );

  // ✅ Debug: Track khi filters.page thay đổi
  useEffect(() => {
    console.log("📄 filters.page changed to:", filters.page);
    if (filters.page === 1 && !isRestoring) {
      console.log("🚨 Page reset to 1! Stack trace:");
      console.trace();
    }
  }, [filters.page, isRestoring]);

  const handleApiCall = useCallback(
    async <T>(apiCall: () => Promise<T>): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Đã xảy ra lỗi";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    if (!token) throw new Error("No token available");

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchOrdersInternal = useCallback(
    async (currentFilters: OrderFilters): Promise<void> => {
      return handleApiCall(async () => {
        const params = new URLSearchParams();

        params.append("page", currentFilters.page.toString());
        params.append("pageSize", currentFilters.pageSize.toString());

        if (currentFilters.search && currentFilters.search.trim()) {
          params.append("search", currentFilters.search.trim());
        }
        if (currentFilters.status && currentFilters.status.trim()) {
          params.append("status", currentFilters.status.trim());
        }
        if (currentFilters.date && currentFilters.date.trim()) {
          params.append("date", currentFilters.date.trim());
        }
        if (currentFilters.dateRange) {
          params.append("dateRange", JSON.stringify(currentFilters.dateRange));
        }
        if (currentFilters.employee && currentFilters.employee.trim()) {
          params.append("employee", currentFilters.employee.trim());
        }
        if (currentFilters.employees && currentFilters.employees.trim()) {
          params.append("employees", currentFilters.employees.trim());
        }
        if (currentFilters.departments && currentFilters.departments.trim()) {
          params.append("departments", currentFilters.departments.trim());
        }
        if (currentFilters.products && currentFilters.products.trim()) {
          params.append("products", currentFilters.products.trim());
        }
        if (currentFilters.warningLevel && currentFilters.warningLevel.trim()) {
          params.append("warningLevel", currentFilters.warningLevel.trim());
        }
        if (currentFilters.sortField) {
          params.append("sortField", currentFilters.sortField);
        }
        if (currentFilters.sortDirection) {
          params.append("sortDirection", currentFilters.sortDirection);
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/orders?${params.toString()}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);

        const result = await res.json();

        if (result.data && Array.isArray(result.data)) {
          setOrders(result.data);
          setTotal(result.total || result.data.length);
        } else if (Array.isArray(result)) {
          setOrders(result);
          setTotal(result.length);
        } else {
          setOrders([]);
          setTotal(0);
        }
      });
    },
    [getAuthHeaders, handleApiCall]
  );

  // State setters
  const setFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    console.log("🔧 setFilters called with:", newFilters);
    console.log("🔧 Final updated filters:", updatedFilters);
    updateFiltersAndUrl(updatedFilters);
  }, [filters, updateFiltersAndUrl]);

  const setPage = useCallback(
    (page: number) => {
      const newFilters = { ...filters, page };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (pageSize <= 0) {
        console.warn("❌ Invalid pageSize:", pageSize);
        return;
      }

      const newFilters = { ...filters, pageSize, page: 1 };
      savePageSizeToStorage(pageSize);
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setSearch = useCallback(
    (search: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        search,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setStatus = useCallback(
    (status: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        status,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setDate = useCallback(
    (date: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        date: date.trim() || undefined,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setEmployee = useCallback(
    (employee: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        employee,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setDateRange = useCallback(
    (
      dateRange: { start: string; end: string } | undefined,
      resetPage = true
    ) => {
      const newFilters = {
        ...filters,
        dateRange,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setEmployees = useCallback(
    (employees: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        employees,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setDepartments = useCallback(
    (departments: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        departments,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setProducts = useCallback(
    (products: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        products,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setWarningLevel = useCallback(
    (warningLevel: string, resetPage = true) => {
      const newFilters = {
        ...filters,
        warningLevel,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setSortField = useCallback(
    (sortField: "quantity" | "unit_price" | null, resetPage = true) => {
      const newFilters = {
        ...filters,
        sortField,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  const setSortDirection = useCallback(
    (sortDirection: "asc" | "desc" | null, resetPage = true) => {
      const newFilters = {
        ...filters,
        sortDirection,
        page: resetPage ? 1 : filters.page,
      };
      updateFiltersAndUrl(newFilters);
    },
    [filters, updateFiltersAndUrl]
  );

  // ✅ Cập nhật resetFilters để clear localStorage và update URL
  const resetFilters = useCallback(() => {
    const defaultPageSize = 10;

    // Clear localStorage
    clearPageSizeFromStorage();
    clearFiltersFromStorage();

    const resetFiltersData = {
      page: 1,
      pageSize: defaultPageSize,
      search: "",
      status: "",
      date: "",
      dateRange: undefined,
      employee: "",
      employees: "",
      departments: "",
      products: "",
      warningLevel: "",
      sortField: null,
      sortDirection: null,
    };

    // Update filters and URL using the new mechanism
    updateFiltersAndUrl(resetFiltersData, true);
  }, [updateFiltersAndUrl]);

  const refetch = useCallback(async () => {
    if (isFetching) {
      console.log("⏸️ Refetch skipped - already fetching");
      return;
    }
    
    setIsFetching(true);
    try {
      await fetchOrdersInternal(filters);
      console.log("✅ Manual refetch completed");
    } catch (error) {
      console.error("❌ Manual refetch failed:", error);
    } finally {
      setIsFetching(false);
    }
  }, [filters, fetchOrdersInternal, isFetching]);

  const getFilterOptions = useCallback(async (): Promise<{
    departments: any[];
    products: any[];
  }> => {
    return handleApiCall(async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders/filter-options`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok)
        throw new Error(`Failed to fetch filter options: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  // Auto fetch when filters change (but skip during restore)
  useEffect(() => {
    // Skip nếu đang restore
    if (isRestoring) {
      console.log("⏸️ Skipping auto-fetch during restore, page:", filters.page);
      return;
    }

    // Skip nếu đang fetch
    if (isFetching) {
      console.log("⏸️ Skipping auto-fetch while already fetching, page:", filters.page);
      return;
    }

    console.log("🔄 Auto-fetching orders due to filters change:", filters.page);
    
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Abort any existing fetch
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    
    // Debounce fetch để tránh multiple calls
    fetchTimeoutRef.current = setTimeout(() => {
      // Create new abort controller
      fetchAbortControllerRef.current = new AbortController();
      
      setIsFetching(true);
      fetchOrdersInternal(filters)
        .then(() => {
          console.log("✅ Fetch completed for page:", filters.page);
        })
        .catch((error) => {
          // Only log error if not aborted
          if (error.name !== 'AbortError') {
            console.error("❌ Fetch failed:", error);
          }
        })
        .finally(() => {
          setIsFetching(false);
          fetchAbortControllerRef.current = null;
        });
    }, 100);
    
    // Cleanup timeout và abort controller
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [filters, isRestoring, fetchOrdersInternal]);

  // ✅ Debug effect để track localStorage changes
  useEffect(() => {
    if (typeof window !== "undefined") {
    }
  }, [filters.pageSize]);

  // CRUD methods
  const createOrder = useCallback(
    async (orderData: Partial<Order>): Promise<Order> => {
      return handleApiCall(async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(orderData),
        });

        if (!res.ok) throw new Error(`Failed to create order: ${res.status}`);
        return res.json();
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const updateOrder = useCallback(
    async (id: number, orderData: Partial<Order>): Promise<Order> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(orderData),
          }
        );

        if (!res.ok) throw new Error(`Failed to update order: ${res.status}`);
        return res.json();
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const deleteOrder = useCallback(
    async (id: number): Promise<void> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok) throw new Error(`Failed to delete order: ${res.status}`);
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const getOrderById = useCallback(
    async (id: number): Promise<Order> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
        return res.json();
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  // Order Details API methods
  const fetchOrderDetails = useCallback(
    async (orderId: number): Promise<OrderDetail[]> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/order/${orderId}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to fetch order details: ${res.status}`);
        const result = await res.json();
        return Array.isArray(result) ? result : [];
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const createOrderDetail = useCallback(
    async (orderDetailData: Partial<OrderDetail>): Promise<OrderDetail> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(orderDetailData),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to create order detail: ${res.status}`);
        return res.json();
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const updateOrderDetail = useCallback(
    async (
      id: number,
      orderDetailData: Partial<OrderDetail>
    ): Promise<OrderDetail> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/${id}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(orderDetailData),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to update order detail: ${res.status}`);
        return res.json();
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const updateOrderDetailCustomerName = useCallback(
    async (
      id: number,
      customerName: string
    ): Promise<OrderDetail> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/${id}/customer-name`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ customer_name: customerName }),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to update customer name: ${res.status}`);
        return res.json();
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const deleteOrderDetail = useCallback(
    async (id: number): Promise<void> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/${id}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to delete order detail: ${res.status}`);
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const getOrderDetailById = useCallback(
    async (id: number): Promise<OrderDetail> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/${id}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to fetch order detail: ${res.status}`);
        return res.json();
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  // Bulk operations
  const bulkDeleteOrderDetails = useCallback(
    async (ids: number[], reason: string): Promise<void> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/bulk-delete`,
          {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids, reason }),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to bulk delete order details: ${res.status}`);
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const bulkUpdateOrderDetails = useCallback(
    async (ids: number[], updates: Partial<OrderDetail>): Promise<void> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/bulk-update`,
          {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids, updates }),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to bulk update order details: ${res.status}`);
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const bulkExtendOrderDetails = useCallback(
    async (ids: number[]): Promise<void> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/bulk-extend`,
          {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to bulk extend order details: ${res.status}`);
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  const bulkAddNotesOrderDetails = useCallback(
    async (ids: number[], notes: string): Promise<void> => {
      return handleApiCall(async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order-details/bulk-notes`,
          {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids, notes }),
          }
        );

        if (!res.ok)
          throw new Error(`Failed to bulk add notes to order details: ${res.status}`);
      });
    },
    [handleApiCall, getAuthHeaders]
  );

  // ✅ Customer search function
  const performCustomerSearch = useCallback(
    (customerName: string) => {
      console.log("🔍 Performing customer search for:", customerName);
      console.log("🔍 Current page before search:", filters.page);

      const currentFilters = { ...filters };
      setPreviousFilters(currentFilters);

      // ✅ Trước khi push customer search state, replace current state với previousFilters info
      const currentState = getCurrentHistoryState();
      if (currentState) {
        // Update current history entry với previousFilters info
        window.history.replaceState({
          ...currentState,
          previousFilters: currentFilters,
          isCustomerSearch: false, // Current state không phải customer search
        }, '', window.location.href);
      }

      flushSync(() => {
        setIsInCustomerSearchMode(true);
        setCanGoBack(true);
      });

      const searchFilters = {
        ...filters,
        search: customerName,
        page: 1,
      };

      // Update filters and URL using the new mechanism with customer search flag
      updateFiltersAndUrl(searchFilters, false, true, currentFilters);

      console.log(
        "✅ Customer search completed - search from page 1, saved previous page:",
        currentFilters.page
      );
    },
    [filters, updateFiltersAndUrl]
  );

  // ✅ Restore previous state function
  const restorePreviousState = useCallback(async () => {
    console.log("🔙 Attempting to restore previous state...");

    if (previousFilters) {
      console.log("🔄 Restoring to saved page:", previousFilters.page);

      // ✅ Prevent any interference
      setIsRestoring(true);
      isRestoringRef.current = true;

      // ✅ Update state atomic
      flushSync(() => {
        setIsInCustomerSearchMode(false);
      });

      // ✅ Use the new URL update mechanism with skipRouterNavigation = true
      updateFiltersAndUrl(previousFilters, true, false, undefined, true);

      // ✅ Clean up
      setPreviousFilters(null);

      // ✅ Delay để đảm bảo state đã stable
      setTimeout(() => {
        setIsRestoring(false);
        isRestoringRef.current = false;
      }, 200);

      console.log("✅ Restored to page:", previousFilters.page);
    } else {
      console.warn("⚠️ No previous filters to restore");
      if (window.history.length > 1) {
        window.history.back();
      }
    }
  }, [previousFilters, updateFiltersAndUrl]);

  // Trong file useOrders.ts
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log("🔄 Browser navigation detected:", event.state);

      const historyState = event.state as HistoryState;

      if (historyState) {
        console.log("🔄 Setting isRestoring to true to prevent auto-fetch");
        setIsRestoring(true);
        isRestoringRef.current = true;

        // ✅ Logic mới: Nếu state có previousFilters, có nghĩa là đang back từ customer search
        if (historyState.previousFilters) {
          console.log("🔄 Back from customer search - restoring previous filters with page:", historyState.previousFilters.page);
          
          // ✅ Update URL với previousFilters
          const searchParams = new URLSearchParams();
          if (historyState.previousFilters.page > 1) {
            searchParams.set("page", historyState.previousFilters.page.toString());
          }
          if (historyState.previousFilters.pageSize !== 10) {
            searchParams.set("pageSize", historyState.previousFilters.pageSize.toString());
          }
          // Add other filters...
          if (historyState.previousFilters.search?.trim()) {
            searchParams.set("search", historyState.previousFilters.search.trim());
          }
          if (historyState.previousFilters.status?.trim()) {
            searchParams.set("status", historyState.previousFilters.status.trim());
          }
          if (historyState.previousFilters.departments?.trim()) {
            searchParams.set("departments", historyState.previousFilters.departments.trim());
          }
          if (historyState.previousFilters.employees?.trim()) {
            searchParams.set("employees", historyState.previousFilters.employees.trim());
          }
          if (historyState.previousFilters.products?.trim()) {
            searchParams.set("products", historyState.previousFilters.products.trim());
          }
          if (historyState.previousFilters.warningLevel?.trim()) {
            searchParams.set("warningLevel", historyState.previousFilters.warningLevel.trim());
          }
          if (historyState.previousFilters.sortField) {
            searchParams.set("sortField", historyState.previousFilters.sortField);
          }
          if (historyState.previousFilters.sortDirection) {
            searchParams.set("sortDirection", historyState.previousFilters.sortDirection);
          }

          const queryString = searchParams.toString();
          const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '');
          
          // ✅ Update state directly without router navigation
          flushSync(() => {
            setFiltersState(historyState.previousFilters);
            conditionalSaveFilters(historyState.previousFilters);
            setIsInCustomerSearchMode(false);
            setPreviousFilters(null);
          });

          // ✅ Update URL manually
          window.history.replaceState({
            filters: historyState.previousFilters,
            page: historyState.previousFilters.page,
            pageSize: historyState.previousFilters.pageSize,
            timestamp: Date.now(),
          }, '', newUrl);
          
        } else if (historyState.filters) {
          console.log("🔄 Regular navigation - restoring filters with page:", historyState.filters.page);
          
          // ✅ Update state directly without router navigation
          flushSync(() => {
            setFiltersState(historyState.filters);
            conditionalSaveFilters(historyState.filters);
          });

          // ✅ Update customer search mode
          if (historyState.isCustomerSearch) {
            setIsInCustomerSearchMode(true);
            if (historyState.previousFilters) {
              setPreviousFilters(historyState.previousFilters);
            }
          } else {
            setIsInCustomerSearchMode(false);
            setPreviousFilters(null);
          }
        }

        // ✅ Delay longer để đảm bảo tất cả state đã stable, sau đó trigger fetch
        setTimeout(() => {
          console.log("🔄 Allowing auto-fetch again and triggering fetch");
          setIsRestoring(false);
          isRestoringRef.current = false;
          
          // ✅ Trigger fetch ngay sau khi restore để đảm bảo data được cập nhật
          const filtersToFetch = historyState?.previousFilters || historyState?.filters;
          if (filtersToFetch) {
            console.log("🚀 Triggering fetch after restore with page:", filtersToFetch.page);
            setIsFetching(true);
            fetchOrdersInternal(filtersToFetch)
              .then(() => {
                console.log("✅ Post-restore fetch completed for page:", filtersToFetch.page);
              })
              .catch((error) => {
                if (error.name !== 'AbortError') {
                  console.error("❌ Post-restore fetch failed:", error);
                }
              })
              .finally(() => {
                setIsFetching(false);
              });
          }
        }, 500);

        console.log("✅ PopState navigation completed");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [conditionalSaveFilters]);

  useEffect(() => {
    // Cleanup timeout, abort controller và reset fetching state khi component unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
      setIsFetching(false); // Reset fetching state
    };
  }, []);

  useEffect(() => {
    // Chỉ chạy khi component mount - đảm bảo có initial history state
    const currentState = getCurrentHistoryState();
    if (!currentState) {
      // Sử dụng window.history.replaceState để tránh infinite loop
      window.history.replaceState({
        filters,
        page: filters.page,
        pageSize: filters.pageSize,
        timestamp: Date.now(),
      }, '', window.location.href);
    }
  }, []);

  // // ✅ Update canGoBack state based on navigation history
  // useEffect(() => {
  //   setCanGoBack(hasNavigationHistory());
  // }, [filters]);

  return {
    // State
    orders,
    total,
    filters,

    // State setters
    setFilters,
    setPage,
    setPageSize, // ✅ Đã update để lưu localStorage và loại bỏ giới hạn
    setSearch,
    setStatus,
    setDate,
    setDateRange,
    setEmployee,
    setEmployees,
    setDepartments,
    setProducts,
    setWarningLevel,
    setSortField,
    setSortDirection,

    // Actions
    refetch,
    resetFilters, // ✅ Đã update để clear localStorage
    getFilterOptions,

    // CRUD methods
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,

    // Order Details methods
    fetchOrderDetails,
    createOrderDetail,
    updateOrderDetail,
    updateOrderDetailCustomerName,
    deleteOrderDetail,
    getOrderDetailById,

    // Bulk operations
    bulkDeleteOrderDetails,
    bulkUpdateOrderDetails,
    bulkExtendOrderDetails,
    bulkAddNotesOrderDetails,

    // Loading states
    isLoading,
    error,

    // ✅ Customer search navigation
    performCustomerSearch,
    restorePreviousState,
    isInCustomerSearchMode,
    setIsInCustomerSearchMode,
    canGoBack: true,
    isRestoring,
    
    // ✅ Debug functions
    forceResetRestoration,
  };
};

function parseFiltersFromUrl(params: URLSearchParams): Partial<OrderFilters> {
  const filters: Partial<OrderFilters> = {};

  const page = params.get("page");
  if (page) filters.page = parseInt(page);

  const pageSize = params.get("pageSize");
  if (pageSize) filters.pageSize = parseInt(pageSize);

  const search = params.get("search");
  if (search) filters.search = search;

  const status = params.get("status");
  if (status) filters.status = status;

  const date = params.get("date");
  if (date) filters.date = date;

  const dateRange = params.get("dateRange");
  if (dateRange) {
    try {
      filters.dateRange = JSON.parse(dateRange);
    } catch (e) {
      console.warn("Invalid dateRange param:", dateRange);
    }
  }

  const employee = params.get("employee");
  if (employee) filters.employee = employee;

  const employees = params.get("employees");
  if (employees) filters.employees = employees;

  const departments = params.get("departments");
  if (departments) filters.departments = departments;

  const products = params.get("products");
  if (products) filters.products = products;

  const warningLevel = params.get("warningLevel");
  if (warningLevel) filters.warningLevel = warningLevel;

  const sortField = params.get("sortField");
  if (sortField === "quantity" || sortField === "unit_price")
    filters.sortField = sortField as "quantity" | "unit_price";

  const sortDirection = params.get("sortDirection");
  if (sortDirection === "asc" || sortDirection === "desc")
    filters.sortDirection = sortDirection as "asc" | "desc";

  return filters;
}
