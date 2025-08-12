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
  productName: string | null;
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
  
  if (!token) {
    console.error('🚨 No token available!');
    throw new Error("No token available");
  }
  
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
    console.error('🚨 Fetch failed - Full details:', {
      status: res.status,
      statusText: res.statusText,
      responseText: text,
      url: res.url,
      responseHeaders: Object.fromEntries(res.headers.entries())
    });
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
  }
  
  const data = await res.json();
  return data;
}

export function useOrderStats() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const call = useCallback(async <T,>(path: string, params?: StatsParams) => {
    const qs = buildQuery(params);
    const fullUrl = `${baseUrl}${path}${qs}`;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<T>(fullUrl);
      return data;
    } catch (e: any) {
      console.error('🚨 API Error for path:', path);
      console.error('🚨 Error details:', {
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        url: fullUrl,
        timestamp: new Date().toISOString()
      });
      setError(e?.message || "Có lỗi xảy ra");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const getOverviewStats = useCallback(
    (params?: StatsParams) => {
      return call<OverviewStatsResponse>("/orders/stats/overview", params);
    },
    [call]
  );

  const getStatusStats = useCallback(
    (params?: StatsParams) => {
      return call<StatusStatsResponse>("/orders/stats/by-status", params);
    },
    [call]
  );

  const getEmployeeStats = useCallback(
    (params?: StatsParams) => {
      return call<EmployeeStatsResponse>("/orders/stats/by-employee", params);
    },
    [call]
  );

  const getCustomerStats = useCallback(
    (params?: StatsParams) => {
      return call<CustomerStatsResponse>("/orders/stats/by-customer", params);
    },
    [call]
  );

  // ✅ THÊM LOG RIÊNG CHO EXPIRED STATS
  const getExpiredTodayStats = useCallback(
    (params?: StatsParams) => {
      const result = call<ExpiredTodayStatsResponse>("/orders/stats/expired-today", params);
      return result;
    },
    [call]
  );

  const getDetailedStats = useCallback(
    (params?: StatsParams) => {
      return call<DetailedStatsResponse>("/order-details/stats/detailed", params);
    },
    [call]
  );

  // ✅ THÊM LOG CHO RETURN OBJECT
  const returnObject = {
    loading,
    error,
    getOverviewStats,
    getStatusStats,
    getEmployeeStats,
    getCustomerStats,
    getExpiredTodayStats,
    getDetailedStats,
  };

  return returnObject;
}
