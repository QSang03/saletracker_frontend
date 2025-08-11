import { useCallback, useState } from "react";
import { getAccessToken } from "@/lib/auth";

// Shared types
export type Period = "day" | "week" | "month" | "quarter" | "custom";

export interface PeriodInfo {
  period: Period;
  from: string; // ISO
  to: string;   // ISO
}

export interface OverviewStatsResponse {
  period: PeriodInfo;
  totals: {
    orders: number;
    orderDetails: number;
    quantity: number;
    revenue: number;
  };
  byStatus: Array<{ status: string; count: number; quantity: number; revenue: number }>;
  timeline: Array<{
    bucket: string;
    from: string;
    to: string;
    orders: number;
    orderDetails: number;
    quantity: number;
    revenue: number;
  }>;
}

export interface StatusStatsResponse {
  period: PeriodInfo;
  items: Array<{ status: string; count: number; quantity: number; revenue: number }>;  
}

export interface EmployeeStatsItem {
  userId: number;
  fullName: string;
  count: number;
  orders: number;
  quantity: number;
  revenue: number;
  byStatus?: Array<{ status: string; count: number }>;
}

export interface EmployeeStatsResponse {
  period: PeriodInfo;
  items: EmployeeStatsItem[];
}

export interface CustomerStatsItem {
  customerId: string | null;
  customerName: string | null;
  count: number;
  orders: number;
  quantity: number;
  revenue: number;
}

export interface CustomerStatsResponse {
  period: PeriodInfo;
  items: CustomerStatsItem[];
}

export interface ExpiredTodayStatsResponse {
  date: string; // YYYY-MM-DD
  totals: { expiredToday: number; overdue: number };
  byEmployee: Array<{ userId: number; fullName: string; expiredToday: number; overdue: number }>; 
}

export interface DetailedRow {
  id: number;
  orderId: number;
  productId: number | null;
  status: string;
  quantity: number;
  unit_price: number;
  revenue: number;
  sale_by: { id: number; fullName: string };
  customer: { id: string | null; name: string | null };
  created_at: string;
  dynamicExtended: number | null;
}

export interface DetailedStatsResponse {
  period: PeriodInfo;
  filtersEcho?: {
    status?: string[];
    employees?: number[];
    departments?: number[];
    products?: number[];
  };
  rows: DetailedRow[];
}

export interface StatsParams {
  period?: Period;
  date?: string;         // YYYY-MM-DD
  dateFrom?: string;     // YYYY-MM-DD
  dateTo?: string;       // YYYY-MM-DD
  employees?: string | number[];
  departments?: string | number[];
  products?: string | number[];
  status?: string | string[]; // for status-related endpoints
}

function buildQuery(params?: StatsParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  if (params.period) sp.set("period", params.period);
  if (params.date) sp.set("date", params.date);
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);

  const toCsv = (v?: string | number[] | string[]) => {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) return v.join(",");
    return v;
  };

  const employees = toCsv(params.employees as any);
  const departments = toCsv(params.departments as any);
  const products = toCsv(params.products as any);
  const status = toCsv(params.status as any);

  if (employees) sp.set("employees", employees);
  if (departments) sp.set("departments", departments);
  if (products) sp.set("products", products);
  if (status) sp.set("status", status);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("No token available");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export function useOrderStats() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const call = useCallback(async <T,>(path: string, params?: StatsParams) => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery(params);
      const data = await fetchJson<T>(`${baseUrl}${path}${qs}`);
      return data;
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const getOverviewStats = useCallback(
    (params?: StatsParams) => call<OverviewStatsResponse>("/orders/stats/overview", params),
    [call]
  );

  const getStatusStats = useCallback(
    (params?: StatsParams) => call<StatusStatsResponse>("/orders/stats/by-status", params),
    [call]
  );

  const getEmployeeStats = useCallback(
    (params?: StatsParams) => call<EmployeeStatsResponse>("/orders/stats/by-employee", params),
    [call]
  );

  const getCustomerStats = useCallback(
    (params?: StatsParams) => call<CustomerStatsResponse>("/orders/stats/by-customer", params),
    [call]
  );

  const getExpiredTodayStats = useCallback(
    (params?: StatsParams) => call<ExpiredTodayStatsResponse>("/orders/stats/expired-today", params),
    [call]
  );

  const getDetailedStats = useCallback(
    (params?: StatsParams) => call<DetailedStatsResponse>("/order-details/stats/detailed", params),
    [call]
  );

  return {
    loading,
    error,
    getOverviewStats,
    getStatusStats,
    getEmployeeStats,
    getCustomerStats,
    getExpiredTodayStats,
    getDetailedStats,
  };
}
