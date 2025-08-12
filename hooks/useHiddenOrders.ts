"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { getAccessToken } from "@/lib/auth";

// ✅ Simplified interface - chỉ 4 filters cần thiết
interface HiddenOrderFilters {
  page: number;
  pageSize: number;
  employees: string; // CSV của employee IDs
  departments: string; // CSV của department IDs
  status: string; // CSV của statuses
  search: string;
  hiddenDateRange?: { from?: Date; to?: Date }; // Range ngày ẩn
  sortField: "quantity" | "unit_price" | "hidden_at" | null;
  sortDirection: "asc" | "desc" | null;
}

// ✅ LocalStorage helper function - ĐẶT TRƯỚC useState
function loadFiltersFromStorage(): Partial<HiddenOrderFilters> {
  try {
    const saved = localStorage.getItem("hiddenOrderFilters");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function useHiddenOrders() {
  const [filters, setFilters] = useState<HiddenOrderFilters>(() => {
    const saved = loadFiltersFromStorage();
    return {
      page: 1,
      pageSize: 20,
      search: saved.search || "",
      employees: saved.employees || "",
      departments: saved.departments || "",
      status: saved.status || "",
      hiddenDateRange: saved.hiddenDateRange || {
        from: undefined,
        to: undefined,
      },
      sortField: null,
      sortDirection: null,
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterOptions, setFilterOptions] = useState<any>({
    departments: [],
    products: [],
  });

  const filterTimeout = useRef<NodeJS.Timeout | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  // ✅ LocalStorage persistence
  const saveFiltersToStorage = useCallback(
    (filters: Partial<HiddenOrderFilters>) => {
      try {
        localStorage.setItem("hiddenOrderFilters", JSON.stringify(filters));
      } catch (error) {
        console.warn("Error saving hidden order filters:", error);
      }
    },
    []
  );

  // ✅ Debounced fetch
  const debouncedFetch = useCallback((newFilters: HiddenOrderFilters) => {
    if (filterTimeout.current) clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => {
      fetchData(newFilters);
    }, 300);
  }, []);

  // ✅ Simplified fetchData - chỉ 4 parameters
  const fetchData = useCallback(
    async (currentFilters = filters) => {
      const token = getAccessToken();
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(currentFilters.page));
        params.set("pageSize", String(currentFilters.pageSize));

        // ✅ Chỉ 4 filters cần thiết
        if (currentFilters.search.trim()) {
          params.set("search", currentFilters.search.trim());
        }
        if (currentFilters.employees)
          params.set("employees", currentFilters.employees);
        if (currentFilters.departments)
          params.set("departments", currentFilters.departments);
        if (currentFilters.status) params.set("status", currentFilters.status);
        if (currentFilters.sortField)
          params.set("sortField", currentFilters.sortField);
        if (currentFilters.sortDirection)
          params.set("sortDirection", currentFilters.sortDirection);

        // Hidden date range
        if (
          currentFilters.hiddenDateRange?.from &&
          currentFilters.hiddenDateRange?.to
        ) {
          params.set(
            "hiddenDateRange",
            JSON.stringify({
              start: currentFilters.hiddenDateRange.from
                .toISOString()
                .split("T")[0],
              end: currentFilters.hiddenDateRange.to
                .toISOString()
                .split("T")[0],
            })
          );
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
    [apiBase, filters]
  );

  // ✅ Load filter options (giữ nguyên)
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

  // ✅ Update filters
  const updateFilters = useCallback(
    (newFilters: Partial<HiddenOrderFilters>) => {
      setFilters((prev) => {
        const updated = { ...prev, ...newFilters, page: 1 };
        saveFiltersToStorage(updated);
        debouncedFetch(updated);
        return updated;
      });
    },
    [saveFiltersToStorage, debouncedFetch]
  );

  // ✅ Initialize
  useEffect(() => {
    fetchData();
    fetchFilterOptions();
  }, []);

  // ✅ Selection management (giữ nguyên)
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

  // ✅ Bulk operations (giữ nguyên)
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
          fetchData(); // Reload data
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

  // Bulk soft delete operation
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

  // Single soft delete operation
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
    refreshData: () => fetchData(),
  };
}
