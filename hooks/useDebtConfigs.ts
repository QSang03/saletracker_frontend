import { useState, useCallback, useRef, useEffect } from "react";
import { getAccessToken } from "@/lib/auth";
import type { Filters } from "@/components/ui/pagination/PaginatedTable";

interface DebtConfigResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmployeeOption {
  value: string;
  label: string;
}

interface UseDebtConfigsReturn {
  data: any[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  forceUpdate: () => void;
  employeeOptions: EmployeeOption[];
  loadingEmployees: boolean;
}

export function useDebtConfigs(
  filters: Filters,
  page: number,
  pageSize: number,
  user?: any
): UseDebtConfigsReturn {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Employee options state
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch employees function
  const fetchEmployees = useCallback(async () => {
    if (!isMounted.current) return;
    setLoadingEmployees(true);
    try {
      const token = getAccessToken();
      if (!token) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/debt-configs`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) return;

      const result: DebtConfigResponse = await res.json();

      if (!isMounted.current) return;

      // Xác định quyền
      const isAdminOrManager = user?.roles?.some(
        (r: any) =>
          r.name?.toLowerCase() === "admin" ||
          r.name?.toLowerCase() === "manager-cong-no"
      );

      let options: EmployeeOption[] = [];
      if (isAdminOrManager) {
        const employeeMap = new Map();
        result.data?.forEach((item: any) => {
          if (item.employee && item.employee.id && item.employee.fullName) {
            employeeMap.set(
              item.employee.id.toString(),
              item.employee.fullName
            );
          }
        });
        options = Array.from(employeeMap.entries()).map(([id, fullName]) => ({
          value: id,
          label: fullName,
        }));
      } else if (user?.id) {
        options = [
          {
            value: user.id.toString(),
            label: user.fullName || user.username,
          },
        ];
      }
      setEmployeeOptions(options);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      if (isMounted.current) {
        setLoadingEmployees(false);
      }
    }
  }, [user]);

  // Fetch function
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No token available");
      }

      // Build query parameters
      const params = new URLSearchParams();

      // Pagination
      params.append("page", page.toString());
      params.append("limit", pageSize.toString());

      // Filters - chỉ gửi khi thực sự có giá trị
      if (filters?.search && filters.search.trim() !== "") {
        params.append("search", filters.search.trim());
      }

      if (
        filters?.statuses &&
        Array.isArray(filters.statuses) &&
        filters.statuses.length > 0
      ) {
        filters.statuses.forEach((status) => {
          if (status && status.toString().trim() !== "") {
            params.append("statuses", status.toString());
          }
        });
      }

      if (
        filters?.employees &&
        Array.isArray(filters.employees) &&
        filters.employees.length > 0
      ) {
        filters.employees.forEach((emp) => {
          if (emp && emp.toString().trim() !== "") {
            params.append("employees", emp.toString());
          }
        });
      }

      // Chỉ gửi singleDate khi thực sự có giá trị (không phải undefined, null, hoặc empty string)
      if (
        filters?.singleDate !== undefined &&
        filters?.singleDate !== null &&
        filters?.singleDate !== ""
      ) {
        const dateStr =
          typeof filters.singleDate === "string"
            ? filters.singleDate
            : filters.singleDate.toISOString().split("T")[0];

        // Kiểm tra dateStr có hợp lệ không
        if (dateStr && dateStr.trim() !== "") {
          params.append("singleDate", dateStr);
        }
      }
      if (filters?.sort) {
        params.append("sort", filters.sort);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/debt-configs?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch debt configs");
      }

      const result: DebtConfigResponse = await res.json();

      if (!isMounted.current) return;

      setData(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 0);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [filters, page, pageSize]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Effect to fetch employees once on mount
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const forceUpdate = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    // Also refresh employees when force updating
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    data,
    total,
    totalPages,
    isLoading,
    error,
    forceUpdate,
    employeeOptions,
    loadingEmployees,
  };
}
