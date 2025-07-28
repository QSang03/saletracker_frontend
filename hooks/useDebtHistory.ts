import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { getAccessToken } from "@/lib/auth";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface UseDebtHistoryOptions {
  debtConfigId: string | null;
  initialPageSize?: number;
  enabled?: boolean;
}

interface UseDebtHistoryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  fetchData: (page?: number, pageSize?: number) => Promise<void>; // ✅ Thêm pageSize parameter
  reset: () => void;
  setPageSize: (pageSize: number) => void; // ✅ Thêm method để set pageSize
}

export function useDebtHistory<T = any>(
  options: UseDebtHistoryOptions
): UseDebtHistoryResult<T> {
  const { debtConfigId, initialPageSize = 10, enabled = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitializedRef = useRef(false);

  const reset = useCallback(() => {
    setData([]);
    setError(null);
    setPagination({
      page: 1,
      pageSize: initialPageSize,
      total: 0,
      totalPages: 0,
    });
    isInitializedRef.current = false;
  }, [initialPageSize]);

  // ✅ Method để update pageSize
  const setPageSize = useCallback((newPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: newPageSize,
      page: 1, // Reset về page 1 khi thay đổi pageSize
    }));
  }, []);

  // ✅ Cập nhật fetchData để nhận cả page và pageSize
  const fetchData = useCallback(
    async (page: number = 1, pageSize?: number) => {
      if (!enabled || !debtConfigId) {
        reset();
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      // ✅ Sử dụng pageSize từ parameter hoặc từ current pagination
      const currentPageSize = pageSize || pagination.pageSize;

      try {
        const token = getAccessToken();
        if (!token) {
          throw new Error("No access token available");
        }

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/debt-histories/by-debt-config/${debtConfigId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page,
              limit: currentPageSize, // ✅ Sử dụng currentPageSize
            },
            signal: abortControllerRef.current.signal,
          }
        );

        // Handle different response structures
        if (
          response.data &&
          typeof response.data === "object" &&
          "data" in response.data
        ) {
          // Response with pagination
          const {
            data: historyData,
            total,
            page: currentPage,
            limit,
            totalPages,
          } = response.data;
          setData(Array.isArray(historyData) ? historyData : []);
          setPagination({
            page: currentPage || page,
            pageSize: limit || currentPageSize, // ✅ Sử dụng currentPageSize
            total: total || 0,
            totalPages:
              totalPages ||
              Math.ceil((total || 0) / (limit || currentPageSize)),
          });
        } else if (Array.isArray(response.data)) {
          // Response without pagination - create client-side pagination
          const allData = response.data;
          const startIndex = (page - 1) * currentPageSize;
          const endIndex = startIndex + currentPageSize;
          const pageData = allData.slice(startIndex, endIndex);

          setData(pageData);
          setPagination({
            page,
            pageSize: currentPageSize,
            total: allData.length,
            totalPages: Math.ceil(allData.length / currentPageSize),
          });
        } else {
          setData([]);
          setPagination({
            page: 1,
            pageSize: currentPageSize,
            total: 0,
            totalPages: 0,
          });
        }

        isInitializedRef.current = true;
      } catch (error: any) {
        if (error.name !== "CanceledError") {
          console.error("Error fetching debt histories:", error);
          setError(error.message || "Failed to fetch debt histories");
          setData([]);
          setPagination({
            page: 1,
            pageSize: currentPageSize,
            total: 0,
            totalPages: 0,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [enabled, debtConfigId, pagination.pageSize, reset]
  );

  // Auto-fetch when enabled and debtConfigId changes
  useEffect(() => {
    if (enabled && debtConfigId) {
      fetchData(1); // Always start from page 1 when config changes
    } else {
      reset();
    }
  }, [enabled, debtConfigId]);

  // ✅ Auto-fetch when pageSize changes
  useEffect(() => {
    if (enabled && debtConfigId && isInitializedRef.current) {
      fetchData(1, pagination.pageSize); // Fetch với pageSize mới
    }
  }, [pagination.pageSize, enabled, debtConfigId, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    pagination,
    fetchData,
    reset,
    setPageSize, // ✅ Export setPageSize method
  };
}
