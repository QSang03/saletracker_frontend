import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export interface BlacklistItem {
  id: number;
  userId: number;
  zaloContactId: string;
  reason?: string;
  created_at: string;
  updated_at: string;
  customerName?: string;
  user?: {
    id: number;
    fullName: string;
    username: string;
  };
}

interface BlacklistFilters {
  page: number;
  pageSize: number;
  search: string;
  departments: number[];
  users: number[];
}

interface BlacklistResponse {
  data: BlacklistItem[];
  total: number;
}

export const useBlacklist = () => {
  const [blacklists, setBlacklists] = useState<BlacklistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [userOptions, setUserOptions] = useState<
    Array<{ value: number; label: string }>
  >([]);

  const [filters, setFilters] = useState<BlacklistFilters>({
    page: 1,
    pageSize: 10,
    search: "",
    departments: [],
    users: [],
  });

  // Fetch blacklist data
  const fetchBlacklists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        pageSize: filters.pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.departments.length > 0 && {
          departments: filters.departments.join(","),
        }),
        ...(filters.users.length > 0 && { users: filters.users.join(",") }),
      });

      const response = await api.get(`/order-blacklist?${params}`);
      setBlacklists(response.data.data);
      setTotal(response.data.total);
    } catch (err: any) {
      console.error("Error fetching blacklists:", err);
      setError(
        err.response?.data?.message || "Lỗi khi tải danh sách blacklist"
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchDepartmentOptions = useCallback(async () => {
    try {
      const response = await api.get(
        "/order-blacklist/filter-options/departments"
      );
      setDepartmentOptions(response.data);
    } catch (err) {
      console.error("Error fetching department options:", err);
    }
  }, []);

  const fetchUserOptions = useCallback(async () => {
    try {
      const params =
        filters.departments.length > 0
          ? `?departments=${filters.departments.join(",")}`
          : "";
      const response = await api.get(
        `/order-blacklist/filter-options/users${params}`
      );
      setUserOptions(response.data);
    } catch (err) {
      console.error("Error fetching user options:", err);
    }
  }, [filters.departments]);

  const setDepartments = useCallback((departments: number[]) => {
    setFilters((prev) => ({ ...prev, departments, users: [], page: 1 })); // Reset users khi đổi departments
  }, []);

  const setUsers = useCallback((users: number[]) => {
    setFilters((prev) => ({ ...prev, users, page: 1 }));
  }, []);

  // Update blacklist item (edit reason)
  const updateBlacklist = useCallback(
    async (id: number, updateData: { reason?: string }) => {
      try {
        const response = await api.patch(`/order-blacklist/${id}`, updateData);

        // Update local state
        setBlacklists((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, ...response.data } : item
          )
        );

        return response.data;
      } catch (err: any) {
        console.error("Error updating blacklist:", err);
        throw new Error(
          err.response?.data?.message || "Lỗi khi cập nhật blacklist"
        );
      }
    },
    []
  );

  // Delete blacklist item
  const deleteBlacklist = useCallback(async (id: number) => {
    try {
      await api.delete(`/order-blacklist/${id}`);

      // Update local state
      setBlacklists((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      console.error("Error deleting blacklist:", err);
      throw new Error(err.response?.data?.message || "Lỗi khi xóa blacklist");
    }
  }, []);

  // Add new blacklist item
  const addBlacklist = useCallback(
    async (data: { zaloContactId: string; reason?: string }) => {
      try {
        const response = await api.post("/order-blacklist", data);

        // Refresh data after adding
        await fetchBlacklists();

        return response.data;
      } catch (err: any) {
        console.error("Error adding blacklist:", err);
        throw new Error(
          err.response?.data?.message || "Lỗi khi thêm vào blacklist"
        );
      }
    },
    [fetchBlacklists]
  );

  // Filter handlers
  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      page: 1,
      pageSize: 10,
      search: "",
      departments: [],
      users: [],
    });
  }, []);

  // Refetch data
  const refetch = useCallback(() => {
    fetchBlacklists();
  }, [fetchBlacklists]);

  // Fetch data when filters change
  useEffect(() => {
    fetchBlacklists();
  }, [fetchBlacklists]);

  // Fetch options when component mounts
  useEffect(() => {
    fetchDepartmentOptions();
  }, [fetchDepartmentOptions]);

  // Fetch user options when departments change
  useEffect(() => {
    fetchUserOptions();
  }, [fetchUserOptions]);

  return {
    // Data
    blacklists,
    total,
    isLoading,
    error,

    // Filters
    filters,
    setPage,
    setPageSize,
    setSearch,
    setDepartments,
    setUsers,
    resetFilters,

    // Options
    departmentOptions,
    userOptions,

    // Actions
    updateBlacklist,
    deleteBlacklist,
    addBlacklist,
    refetch,
  };
};
