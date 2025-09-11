import { useState, useCallback, useEffect, useRef } from "react";
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
      // Khi có users được chọn, chỉ lấy các phòng ban tương ứng với users
      const params =
        filters.users.length > 0 ? `?users=${filters.users.join(",")}` : "";
      const response = await api.get(
        `/order-blacklist/filter-options/departments${params}`
      );
      setDepartmentOptions(response.data);
    } catch (err) {
      console.error("Error fetching department options:", err);
    }
  }, [filters.users]);

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

  // ✅ THÊM: Function để fetch departments dựa trên users
  // Fetch department options specifically for selected users (returns the options for chaining logic)
  const fetchDepartmentOptionsForUsers = useCallback(
    async (userIds: number[]) => {
      if (!userIds.length) return [] as Array<{ value: number; label: string }>;
      try {
        const params = `?users=${userIds.join(",")}`;
        const response = await api.get(
          `/order-blacklist/filter-options/departments${params}`
        );
        const data = response.data as Array<{ value: number; label: string }>;
        setDepartmentOptions(data);
        return data;
      } catch (err) {
        console.error(
          "Error fetching department options for users:",
          err
        );
        return [] as Array<{ value: number; label: string }>;
      }
    },
    []
  );

  const prevDepartmentsRef = useRef<number[] | null>(null);

  const setDepartments = useCallback((departments: number[]) => {
    prevDepartmentsRef.current = filters.departments;
    // Giữ lại users hiện tại, sẽ lọc lại sau khi userOptions mới tải về
    setFilters((prev) => ({ ...prev, departments, page: 1 }));
  }, [filters.departments]);

  const setUsers = useCallback(
    (users: number[]) => {
      setFilters((prev) => ({ ...prev, users, page: 1 }));

      // ✅ LOGIC: Khi chọn nhân viên → cập nhật lại danh sách phòng ban phù hợp
      if (users.length > 0) {
        fetchDepartmentOptionsForUsers(users).then((depOptions) => {
          if (!depOptions.length) return; // nothing to sync
          const depIds = depOptions.map((d) => d.value);
          setFilters((prev) => {
            // Nếu chưa chọn phòng ban nào → tự động chọn tất cả phòng ban thuộc các nhân viên đã chọn
            if (prev.departments.length === 0) {
              return { ...prev, departments: depIds };
            }
            // Nếu đã chọn nhưng có phòng ban không còn hợp lệ → lọc lại
            const filtered = prev.departments.filter((id) => depIds.includes(id));
            if (filtered.length !== prev.departments.length) {
              return { ...prev, departments: filtered };
            }
            return prev; // không thay đổi
          });
        });
      } else {
  // Nếu bỏ chọn hết nhân viên → clear luôn departments và load lại toàn bộ options
  setFilters((prev) => ({ ...prev, users: [], departments: [], page: 1 }));
  fetchDepartmentOptions();
      }
    },
    [fetchDepartmentOptionsForUsers, fetchDepartmentOptions]
  );

  // Khi departments thay đổi và userOptions đã cập nhật → lọc lại danh sách users đang chọn nếu không còn hợp lệ
  useEffect(() => {
    const prevDepartments = prevDepartmentsRef.current;
    if (!prevDepartments) return; // skip first mount
    // Nếu không có department nào -> giữ nguyên (toàn bộ users khả dụng sẽ được load)
    if (filters.departments.length === 0) return;
    if (filters.users.length === 0) return;
    if (userOptions.length === 0) return; // chưa tải xong options

    const validUserIds = new Set(userOptions.map((u) => u.value));
    const filtered = filters.users.filter((uid) => validUserIds.has(uid));
    if (filtered.length !== filters.users.length) {
      setFilters((prev) => ({ ...prev, users: filtered }));
    }
  }, [filters.departments, userOptions]);

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

  // Fetch department options when component mounts and when users change
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
