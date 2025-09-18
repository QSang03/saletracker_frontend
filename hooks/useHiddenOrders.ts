"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { getAccessToken } from "@/lib/auth";

interface HiddenOrderFilters {
  page: number;
  pageSize: number;
  employees: string;
  departments: string;
  status: string;
  search: string;
  hiddenDateRange?: { from?: Date; to?: Date };
  sortField: "quantity" | "unit_price" | "hidden_at" | null;
  sortDirection: "asc" | "desc" | null;
}

// ✅ THÊM: Key cho localStorage
const STORAGE_KEY = "hiddenOrderFilters";

// ✅ SỬA: Enhanced localStorage helper - lưu ALL filters including page & pageSize
function loadFiltersFromStorage(): Partial<HiddenOrderFilters> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // ✅ Convert date strings back to Date objects
      if (parsed.hiddenDateRange) {
        if (parsed.hiddenDateRange.from) {
          parsed.hiddenDateRange.from = new Date(parsed.hiddenDateRange.from);
        }
        if (parsed.hiddenDateRange.to) {
          parsed.hiddenDateRange.to = new Date(parsed.hiddenDateRange.to);
        }
      }
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

// ✅ THÊM: Helper to save ALL filters to localStorage
function saveAllFiltersToStorage(filters: HiddenOrderFilters): void {
  try {
    const toSave = {
      ...filters,
      // ✅ Convert Date objects to strings for storage
      hiddenDateRange: filters.hiddenDateRange
        ? {
            from: filters.hiddenDateRange.from?.toISOString(),
            to: filters.hiddenDateRange.to?.toISOString(),
          }
        : undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.warn("Error saving hidden order filters:", error);
  }
}

export function useHiddenOrders() {
  // ✅ SỬA: Load ALL saved filters including page & pageSize
  const [filters, setFilters] = useState<HiddenOrderFilters>(() => {
    const saved = loadFiltersFromStorage();
    return {
      // ✅ THÊM: Restore page & pageSize from localStorage
      page: saved.page || 1,
      pageSize: saved.pageSize || 20,
      search: saved.search || "",
      employees: saved.employees || "",
      departments: saved.departments || "",
      status: saved.status || "",
      hiddenDateRange: saved.hiddenDateRange || {
        from: undefined,
        to: undefined,
      },
      sortField: saved.sortField || null,
      sortDirection: saved.sortDirection || null,
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    products: [],
  });

  const filterTimeout = useRef<NodeJS.Timeout | null>(null);
  const restoringTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  // ✅ SỬA: Di chuyển clearFiltersFromStorage vào trong component
  const clearFiltersFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Error clearing hidden order filters:", error);
    }
  }, []);

  // ✅ SỬA: Auto-save ALL filters to localStorage whenever filters change
  useEffect(() => {
    saveAllFiltersToStorage(filters);
  }, [filters]);

  // ✅ SỬA: Fetchdata function - loại bỏ dependency filters để tránh loop
  const fetchData = useCallback(
    async (currentFilters?: HiddenOrderFilters) => {
      const token = getAccessToken();
      if (!token) return;

      // ✅ SỬA: Sử dụng filters từ state nếu không có currentFilters
      const filtersToUse = currentFilters || filters;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(filtersToUse.page));
        params.set("pageSize", String(filtersToUse.pageSize));

        if (filtersToUse.search.trim()) {
          params.set("search", filtersToUse.search.trim());
        }
        if (filtersToUse.employees)
          params.set("employees", filtersToUse.employees);
        if (filtersToUse.departments)
          params.set("departments", filtersToUse.departments);
        if (filtersToUse.status) params.set("status", filtersToUse.status);
        if (filtersToUse.sortField)
          params.set("sortField", filtersToUse.sortField);
        if (filtersToUse.sortDirection)
          params.set("sortDirection", filtersToUse.sortDirection);

        // Hidden date range với validation 14 ngày
        if (
          filtersToUse.hiddenDateRange?.from &&
          filtersToUse.hiddenDateRange?.to
        ) {
          // ✅ THÊM: Validation giới hạn 14 ngày
          const daysDiff = Math.ceil(
            (filtersToUse.hiddenDateRange.to.getTime() - filtersToUse.hiddenDateRange.from.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff > 14) {
            // Nếu vượt quá 14 ngày, giới hạn về 14 ngày từ ngày bắt đầu
            const adjustedTo = new Date(filtersToUse.hiddenDateRange.from);
            adjustedTo.setDate(adjustedTo.getDate() + 14);
            
            params.set(
              "hiddenDateRange",
              JSON.stringify({
                start: filtersToUse.hiddenDateRange.from
                  .toISOString()
                  .split("T")[0],
                end: adjustedTo
                  .toISOString()
                  .split("T")[0],
              })
            );
          } else {
            params.set(
              "hiddenDateRange",
              JSON.stringify({
                start: filtersToUse.hiddenDateRange.from
                  .toISOString()
                  .split("T")[0],
                end: filtersToUse.hiddenDateRange.to
                  .toISOString()
                  .split("T")[0],
              })
            );
          }
        }

        const res = await fetch(
          `${apiBase}/order-details/hidden?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(Array.isArray(data.data) ? data.data : []);
        setTotal(Number(data.total || 0));
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [apiBase] // ✅ SỬA: Chỉ dependency apiBase, không có filters
  );

  // ✅ Debounced fetch - thêm dependency fetchData
  const debouncedFetch = useCallback((newFilters: HiddenOrderFilters) => {
    if (filterTimeout.current) clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => {
      fetchData(newFilters);
    }, 300);
  }, [fetchData]);

  // ✅ Load filter options
  const fetchFilterOptions = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${apiBase}/orders/filter-options`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFilterOptions(data);
      }
    } catch (error) {
      console.warn("Failed to fetch filter options:", error);
    }
  }, [apiBase]);

  // ✅ SỬA: Update filters - NO auto-save here (handled by useEffect)
  const updateFilters = useCallback(
    (newFilters: Partial<HiddenOrderFilters>) => {
      setFilters((prev) => {
        const shouldResetPage = Object.keys(newFilters).some(
          (key) => key !== "page" && key !== "pageSize"
        );

        // ✅ THÊM: Validation cho hiddenDateRange
        let validatedFilters = { ...newFilters };
        if (newFilters.hiddenDateRange?.from && newFilters.hiddenDateRange?.to) {
          const daysDiff = Math.ceil(
            (newFilters.hiddenDateRange.to.getTime() - newFilters.hiddenDateRange.from.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff > 14) {
            // Nếu vượt quá 14 ngày, giới hạn về 14 ngày từ ngày bắt đầu
            const adjustedTo = new Date(newFilters.hiddenDateRange.from);
            adjustedTo.setDate(adjustedTo.getDate() + 14);
            
            validatedFilters.hiddenDateRange = {
              from: newFilters.hiddenDateRange.from,
              to: adjustedTo
            };
          }
        }

        const updated = {
          ...prev,
          ...validatedFilters,
          page: shouldResetPage ? 1 : newFilters.page || prev.page,
        };

        // ✅ Auto-save will be handled by useEffect
        debouncedFetch(updated);
        return updated;
      });
    },
    [debouncedFetch]
  );

  // ✅ THÊM: Reset filters function - clear localStorage
  const resetFilters = useCallback(() => {
    const defaultFilters: HiddenOrderFilters = {
      page: 1,
      pageSize: 20,
      search: "",
      employees: "",
      departments: "",
      status: "",
      hiddenDateRange: {
        from: undefined,
        to: undefined,
      },
      sortField: null,
      sortDirection: null,
    };

    // Clear localStorage
    clearFiltersFromStorage();

    // Reset state
    // Clear any pending debounced fetch to avoid it reapplying old filters after reset
    if (filterTimeout.current) {
      clearTimeout(filterTimeout.current);
      filterTimeout.current = null;
    }
    // mark restoring so child PaginatedTable will force-reset its internal UI
    setIsRestoring(true);

    setFilters(defaultFilters);
    setSelectedIds(new Set());

    // Fetch with default filters immediately
    fetchData(defaultFilters).finally(() => {
      // keep restoring true for a short moment so PaginatedTable can sync
      if (restoringTimeout.current) clearTimeout(restoringTimeout.current);
      restoringTimeout.current = setTimeout(() => {
        setIsRestoring(false);
        restoringTimeout.current = null;
  // increment resetKey so child tables remount and clear internal UI state
  setResetKey((k) => k + 1);
      }, 350);
    });
  }, [clearFiltersFromStorage, fetchData]);

  // cleanup restoring timeout on unmount
  useEffect(() => {
    return () => {
      if (restoringTimeout.current) clearTimeout(restoringTimeout.current);
    };
  }, []);

  // ✅ Initialize - chỉ gọi 1 lần khi mount
  useEffect(() => {
    fetchData();
    fetchFilterOptions();
  }, [fetchFilterOptions]); // ✅ SỬA: Loại bỏ fetchData khỏi dependency

  // ✅ Selection management (keep existing)
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (rows.length === 0) return new Set();
      const allSelected = rows.every((r) => prev.has(r.id));
      return allSelected ? new Set() : new Set(rows.map((r) => r.id));
    });
  }, [rows]);

  const isAllSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selectedIds.has(r.id)),
    [rows, selectedIds]
  );

  // ✅ Keep existing bulk operations
  const bulkUnhide = useCallback(async () => {
    const token = getAccessToken();
    if (!token || selectedIds.size === 0)
      return { success: false, message: "Không có mục nào được chọn" };

    try {
      const res = await fetch(`${apiBase}/order-details/hidden/bulk-unhide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedIds(new Set());
        fetchData();
        return {
          success: true,
          message: `Đã hiện ${data.unhidden} mục thành công`,
        };
      } else {
        throw new Error("Lỗi khi hiện các mục đã chọn");
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }, [selectedIds, apiBase, fetchData]);

  const singleUnhide = useCallback(
    async (id: number) => {
      const token = getAccessToken();
      if (!token) return { success: false, message: "Không có token" };

      try {
        const res = await fetch(`${apiBase}/order-details/${id}/unhide`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          fetchData();
          return { success: true, message: "Đã hiện đơn hàng thành công" };
        } else {
          throw new Error("Lỗi khi hiện đơn hàng");
        }
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },
    [apiBase, fetchData]
  );

  const bulkSoftDelete = useCallback(async () => {
    const token = getAccessToken();
    if (!token || selectedIds.size === 0)
      return { success: false, message: "Không có mục nào được chọn" };

    try {
      const res = await fetch(`${apiBase}/order-details/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          reason: "Xóa từ trang Hidden Orders",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedIds(new Set());
        fetchData();
        return {
          success: true,
          message: `Đã xóa ${data.deleted} mục thành công`,
        };
      } else {
        throw new Error("Lỗi khi xóa các mục đã chọn");
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }, [selectedIds, apiBase, fetchData]);

  const singleSoftDelete = useCallback(
    async (id: number) => {
      const token = getAccessToken();
      if (!token) return { success: false, message: "Không có token" };

      try {
        const res = await fetch(`${apiBase}/order-details/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: "Xóa từ trang Hidden Orders" }),
        });

        if (res.ok) {
          fetchData();
          return { success: true, message: "Đã xóa đơn hàng thành công" };
        } else {
          throw new Error("Lỗi khi xóa đơn hàng");
        }
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },
    [apiBase, fetchData]
  );

  return {
    // Data
    rows,
    total,
    loading,
    error,
    // Filters
    filters,
    updateFilters,
    filterOptions,
    // ✅ THÊM: Export reset function
    resetFilters,
    // Selection
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    isAllSelected,
    // Pagination helpers
    setPage: (page: number) => updateFilters({ page }),
    setPageSize: (pageSize: number) => updateFilters({ pageSize }),
    // Actions
    bulkUnhide,
    singleUnhide,
    bulkSoftDelete,
    singleSoftDelete,
  // Ensure refreshData always uses the latest filters from state
  refreshData: () => fetchData(filters),
  // Indicate to child table components that we're forcing a restore/reset
  isRestoring,
  resetKey,
  };
}
