import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export interface AnalysisBlockItem {
  id: number;
  userId: number;
  zaloContactId: string;
  reason?: string;
  blockType: 'analysis' | 'reporting' | 'stats';
  created_at: string;
  updated_at?: string;
  user?: {
    id: number;
    fullName?: string;
    username?: string;
  };
  customerName?: string;
}

export interface AnalysisBlockFilters {
  page: number;
  pageSize: number;
  search: string;
  departments: number[];
  users: number[];
  blockType?: string;
}

export const useAnalysisBlock = () => {
  const [analysisBlocks, setAnalysisBlocks] = useState<AnalysisBlockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AnalysisBlockFilters>({
    page: 1,
    pageSize: 10,
    search: "",
    departments: [],
    users: [],
    blockType: undefined,
  });

  // Filter options
  const [departmentOptions, setDepartmentOptions] = useState<Array<{
    value: number;
    label: string;
  }>>([]);
  const [userOptions, setUserOptions] = useState<Array<{
    value: number;
    label: string;
  }>>([]);

  // Fetch analysis blocks
  const fetchAnalysisBlocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("page", filters.page.toString());
      params.append("pageSize", filters.pageSize.toString());
      
      if (filters.search) params.append("search", filters.search);
      if (filters.departments.length > 0) {
        params.append("departments", filters.departments.join(","));
      }
      if (filters.users.length > 0) {
        params.append("users", filters.users.join(","));
      }
      if (filters.blockType) {
        params.append("blockType", filters.blockType);
      }

      const response = await api.get(`/analysis-block?${params.toString()}`);
      setAnalysisBlocks(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err: any) {
      console.error("Error fetching analysis blocks:", err);
      setError(err.response?.data?.message || "Lỗi khi tải danh sách analysis blocks");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch department options
  const fetchDepartmentOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.users.length > 0) {
        params.append("users", filters.users.join(","));
      }

      const response = await api.get(`/analysis-block/filter-options/departments?${params.toString()}`);
      setDepartmentOptions(response.data || []);
    } catch (err: any) {
      console.error("Error fetching department options:", err);
    }
  }, [filters.users]);

  // Fetch user options
  const fetchUserOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.departments.length > 0) {
        params.append("departments", filters.departments.join(","));
      }

      const response = await api.get(`/analysis-block/filter-options/users?${params.toString()}`);
      setUserOptions(response.data || []);
    } catch (err: any) {
      console.error("Error fetching user options:", err);
    }
  }, [filters.departments]);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchAnalysisBlocks();
  }, [fetchAnalysisBlocks]);

  useEffect(() => {
    fetchDepartmentOptions();
  }, [fetchDepartmentOptions]);

  useEffect(() => {
    fetchUserOptions();
  }, [fetchUserOptions]);

  // Update analysis block (edit reason or block type)
  const updateAnalysisBlock = useCallback(
    async (id: number, updateData: { reason?: string; blockType?: string }) => {
      try {
        const response = await api.patch(`/analysis-block/${id}`, updateData);

        // Update local state
        setAnalysisBlocks((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, ...response.data } : item
          )
        );

        return response.data;
      } catch (err: any) {
        console.error("Error updating analysis block:", err);
        throw new Error(
          err.response?.data?.message || "Lỗi khi cập nhật analysis block"
        );
      }
    },
    []
  );

  // Delete analysis block
  const deleteAnalysisBlock = useCallback(async (id: number) => {
    try {
      await api.delete(`/analysis-block/${id}`);

      // Update local state
      setAnalysisBlocks((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      console.error("Error deleting analysis block:", err);
      throw new Error(err.response?.data?.message || "Lỗi khi xóa analysis block");
    }
  }, []);

  // Add new analysis block
  const addAnalysisBlock = useCallback(
    async (data: {
      zaloContactId: string;
      reason?: string;
      blockType: 'analysis' | 'reporting' | 'stats';
    }) => {
      try {
        const response = await api.post("/analysis-block", data);

        // Update local state
        setAnalysisBlocks((prev) => [response.data, ...prev]);
        setTotal((prev) => prev + 1);

        return response.data;
      } catch (err: any) {
        console.error("Error adding analysis block:", err);
        const errorMessage = err.response?.data?.message || "Lỗi khi thêm analysis block";
        if (errorMessage.includes("admin")) {
          throw new Error("Chỉ admin mới có quyền sử dụng tính năng này");
        }
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Check if contact is blocked for specific type
  const checkAnalysisBlock = useCallback(
    async (zaloContactId: string, blockType: string) => {
      try {
        const response = await api.get(`/analysis-block/check/${zaloContactId}/${blockType}`);
        return response.data.isBlocked;
      } catch (err: any) {
        console.error("Error checking analysis block:", err);
        return false;
      }
    },
    []
  );

  // Get blocked contacts for current user
  const getMyBlockedContacts = useCallback(
    async (blockType?: string) => {
      try {
        const params = new URLSearchParams();
        if (blockType) {
          params.append("blockType", blockType);
        }

        const response = await api.get(`/analysis-block/my-blocked-contacts?${params.toString()}`);
        return response.data || [];
      } catch (err: any) {
        console.error("Error getting my blocked contacts:", err);
        return [];
      }
    },
    []
  );

  // Bulk add analysis blocks
  const bulkAddAnalysisBlocks = useCallback(
    async (data: {
      zaloContactIds: string[];
      reason?: string;
      blockType: 'analysis' | 'reporting' | 'stats';
    }) => {
      try {
        const response = await api.post("/analysis-block/bulk-add", data);
        return response.data;
      } catch (err: any) {
        console.error("Error bulk adding analysis blocks:", err);
        throw new Error(
          err.response?.data?.message || "Lỗi khi thêm hàng loạt analysis blocks"
        );
      }
    },
    []
  );

  // Filter setters
  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setDepartments = useCallback((departments: number[]) => {
    setFilters((prev) => ({ ...prev, departments, page: 1 }));
  }, []);

  const setUsers = useCallback((users: number[]) => {
    setFilters((prev) => ({ ...prev, users, page: 1 }));
  }, []);

  const setBlockType = useCallback((blockType?: string) => {
    setFilters((prev) => ({ ...prev, blockType, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      page: 1,
      pageSize: 10,
      search: "",
      departments: [],
      users: [],
      blockType: undefined,
    });
  }, []);

  return {
    // Data
    analysisBlocks,
    total,
    loading,
    error,
    filters,

    // Filter options
    departmentOptions,
    userOptions,

    // Actions
    addAnalysisBlock,
    updateAnalysisBlock,
    deleteAnalysisBlock,
    checkAnalysisBlock,
    getMyBlockedContacts,
    bulkAddAnalysisBlocks,
    refetch: fetchAnalysisBlocks,

    // Filter setters
    setPage,
    setPageSize,
    setSearch,
    setDepartments,
    setUsers,
    setBlockType,
    resetFilters,
  };
};
