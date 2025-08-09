"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderDetail } from "@/types";
import { getAccessToken } from "@/lib/auth";

export type TrashedOrderFilters = {
  page: number;
  pageSize: number;
  search?: string;
  employees?: string; // CSV ids
  departments?: string; // CSV ids
  products?: string; // CSV product ids
  sortField?: "quantity" | "unit_price" | null;
  sortDirection?: "asc" | "desc" | null;
};

export type TrashedOrdersResponse = {
  data: OrderDetail[];
  total: number;
  page: number;
  pageSize: number;
};

type FilterOptions = {
  departments: Array<{ value: number; label: string; users: Array<{ value: number; label: string }> }>;
  products: Array<{ value: number; label: string }>;
};

type UseTrashedOrdersReturn = {
  // data
  data: OrderDetail[];
  total: number;
  isLoading: boolean;
  error: string | null;

  // filters
  filters: TrashedOrderFilters;
  setFilters: (patch: Partial<TrashedOrderFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // options
  getFilterOptions: () => Promise<FilterOptions>;

  // actions
  reload: () => Promise<void>;
  bulkRestoreOrderDetails: (ids: number[]) => Promise<void>;
};

const LS_KEY_FILTERS = "trashed_orders_filters_v1";

function loadFiltersFromStorage(): Partial<TrashedOrderFilters> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY_FILTERS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<TrashedOrderFilters>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function saveFiltersToStorage(filters: TrashedOrderFilters) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY_FILTERS, JSON.stringify(filters));
  } catch {}
}

export function useTrashedOrders(): UseTrashedOrdersReturn {
  // Reuse APIs from useOrders, but keep isolated state here
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = getAccessToken();
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }, []);

  const [filters, setFiltersState] = useState<TrashedOrderFilters>(() => {
    const fromLS = loadFiltersFromStorage();
    return {
      page: typeof fromLS.page === "number" ? fromLS.page : 1,
      pageSize: typeof fromLS.pageSize === "number" ? fromLS.pageSize : 10,
      search: fromLS.search ?? "",
      employees: fromLS.employees ?? "",
      departments: fromLS.departments ?? "",
      products: fromLS.products ?? "",
      sortField: fromLS.sortField ?? null,
      sortDirection: fromLS.sortDirection ?? null,
    };
  });

  const [data, setData] = useState<OrderDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setFilters = useCallback((patch: Partial<TrashedOrderFilters>) => {
    setFiltersState((prev) => {
      const next: TrashedOrderFilters = {
        ...prev,
        ...patch,
        page: typeof patch.page === "number" ? patch.page : prev.page,
        pageSize: typeof patch.pageSize === "number" ? patch.pageSize : prev.pageSize,
      };
      saveFiltersToStorage(next);
      return next;
    });
  }, []);

  const setPage = useCallback((page: number) => setFilters({ page }), [setFilters]);
  const setPageSize = useCallback(
    (size: number) => setFilters({ pageSize: size, page: 1 }),
    [setFilters]
  );

  const fetchTrashed = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    params.set("page", String(filters.page));
    params.set("pageSize", String(filters.pageSize));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.employees?.trim()) params.set("employees", filters.employees.trim());
    if (filters.departments?.trim()) params.set("departments", filters.departments.trim());
    if (filters.products?.trim()) params.set("products", filters.products.trim());
    if (filters.sortField) params.set("sortField", filters.sortField);
    if (filters.sortDirection) params.set("sortDirection", filters.sortDirection);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/order-details/trashed?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    );
    if (!res.ok) throw new Error(`Failed to fetch trashed orders: ${res.status}`);
    const json = (await res.json()) as TrashedOrdersResponse;
    return json;
  }, [filters, getAuthHeaders]);

  const reload = useCallback(async () => {
    // debounce rapid successive calls
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    return new Promise<void>((resolve) => {
      fetchTimeoutRef.current = setTimeout(async () => {
        // Abort in-flight request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsLoading(true);
        setError(null);
        try {
          const res = await fetchTrashed(controller.signal);
          setData(res.data || []);
          setTotal(res.total || 0);
        } catch (e: any) {
          if (e?.name !== "AbortError") {
            console.error(e);
            setError(e?.message || "Fetch failed");
          }
        } finally {
          setIsLoading(false);
          resolve();
        }
      }, 250);
    });
  }, [fetchTrashed]);

  // Initial load and when filters change
  useEffect(() => {
    reload();
    // Cleanup debounce and abort controller on unmount
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [reload]);

  const getFilterOptions = useCallback(async (): Promise<FilterOptions> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/orders/filter-options`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) throw new Error(`Failed to fetch filter options: ${res.status}`);
    const json = await res.json();
    // Expecting shape { departments: [...], products: [...] }
    return {
      departments: Array.isArray(json?.departments) ? json.departments : [],
      products: Array.isArray(json?.products) ? json.products : [],
    } as FilterOptions;
  }, [getAuthHeaders]);

  const bulkRestoreOrderDetails = useCallback(async (ids: number[]) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/order-details/bulk-restore`,
      {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }
    );
    if (!res.ok) throw new Error(`Failed to bulk restore order details: ${res.status}`);
  }, [getAuthHeaders]);

  return {
    data,
    total,
    isLoading,
    error,

    filters,
    setFilters,
    setPage,
    setPageSize,

  getFilterOptions,

    reload,
    bulkRestoreOrderDetails,
  };
}

export default useTrashedOrders;
