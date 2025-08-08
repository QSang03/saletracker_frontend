"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading/loading-spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { OrderDetail, User } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Target,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Crown,
  Award,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  MoreVertical,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AxiosResponse } from "axios";

type Period = "day" | "week" | "quarter";

type ChartPoint = {
  name: string;
  timestamp: number;
  demand: number;
  completed: number;
  quoted: number;
  pending: number;
};

// Elegant color palette - softer but still noble
const chartConfig = {
  demand: {
    label: "Nhu cầu",
    color: "#0ea5e9", // Sky 500 (xanh biển)
    lightColor: "#7dd3fc", // Sky 300
    bgColor: "#f0f9ff", // Sky 50
  },
  completed: {
    label: "Đã chốt",
    color: "#10b981", // Emerald 500
    lightColor: "#6ee7b7", // Emerald 300
    bgColor: "#ecfdf5", // Emerald 50
  },
  quoted: {
    label: "Chưa chốt",
    color: "#ef4444", // Red 500
    lightColor: "#fca5a5", // Red 300
    bgColor: "#fef2f2", // Red 50
  },
  pending: {
    label: "Chờ xử lý",
    color: "#2dd4bf", // Mint/Teal 400
    lightColor: "#99f6e4", // Mint/Teal 200
    bgColor: "#f0fdfa", // Mint/Teal 50
  },
};

// Fixed series order to ensure columns never change order
const seriesOrder: Array<keyof ChartPoint> = [
  "demand",
  "completed",
  "quoted",
  "pending",
];

// Refined animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// Utility functions (keeping existing ones)
function formatVN(dt: Date) {
  return dt
    .toLocaleString("vi-VN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(",", "");
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getPresetRange(period: Period): DateRange {
  const now = new Date();
  const to = endOfDay(now);
  if (period === "day") {
    const from = startOfDay(now);
    return { from, to };
  }
  if (period === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: startOfDay(from), to };
  }
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), q * 3, 1);
  const last = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { from: startOfDay(from), to: endOfDay(last) };
}

function getPreviousRange(period: Period, current: DateRange): DateRange {
  const to = current.to ? new Date(current.to) : new Date();
  const from = current.from ? new Date(current.from) : new Date();
  if (period === "day") {
    const prev = new Date(from);
    prev.setDate(prev.getDate() - 1);
    return { from: startOfDay(prev), to: endOfDay(prev) };
  }
  if (period === "week") {
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 7);
    const prevTo = new Date(to);
    prevTo.setDate(prevTo.getDate() - 7);
    return { from: startOfDay(prevFrom), to: endOfDay(prevTo) };
  }
  // quarter
  const now = from;
  const q = Math.floor(now.getMonth() / 3);
  const prevQ = q - 1;
  const year = prevQ < 0 ? now.getFullYear() - 1 : now.getFullYear();
  const quarterIndex = ((prevQ % 4) + 4) % 4;
  const pf = new Date(year, quarterIndex * 3, 1);
  const pt = new Date(year, quarterIndex * 3 + 3, 0);
  return { from: startOfDay(pf), to: endOfDay(pt) };
}

function calcDynamicExtended(
  createdAt?: string | Date,
  originalExtended?: number
) {
  try {
    if (!createdAt || originalExtended == null) return originalExtended ?? 0;
    const created = new Date(createdAt);
    created.setHours(0, 0, 0, 0);
    const expired = new Date(created);
    expired.setDate(expired.getDate() + (originalExtended || 0));
    const today = startOfDay(new Date());
    const diff = Math.floor(
      (expired.getTime() - today.getTime()) / (1000 * 3600 * 24)
    );
    return diff;
  } catch {
    return originalExtended ?? 0;
  }
}

function numberCompact(n: number) {
  return Intl.NumberFormat("vi-VN", { notation: "compact" }).format(n);
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function startOfWeekMonday(d: Date): Date {
  const date = startOfDay(d);
  const day = (date.getDay() + 6) % 7; // 0=Monday
  date.setDate(date.getDate() - day);
  return date;
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return startOfDay(new Date(d.getFullYear(), q * 3, 1));
}

function getPeriodStart(date: Date, period: Period): Date {
  if (period === "day") return startOfDay(date);
  if (period === "week") return startOfWeekMonday(date);
  return startOfQuarter(date);
}

function groupKeyByPeriod(date: Date, period: Period): string {
  const start = getPeriodStart(date, period);
  if (period === "day") {
    const d = start;
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  }
  if (period === "week") {
    const d = start;
    return `Tuần ${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  }
  const q = Math.floor(start.getMonth() / 3) + 1;
  return `Q${q} ${start.getFullYear()}`;
}

function getBucketRange(ts: number, period: Period): { from: Date; to: Date } {
  const start = new Date(ts);
  if (period === "day") {
    return { from: startOfDay(start), to: endOfDay(start) };
  }
  if (period === "week") {
    const from = startOfWeekMonday(start);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from, to: endOfDay(to) };
  }
  // quarter
  const from = startOfQuarter(start);
  const to = new Date(from.getFullYear(), from.getMonth() + 3, 0);
  return { from, to: endOfDay(to) };
}

// Enhanced data fetching
async function fetchOrderDetails(range: DateRange): Promise<OrderDetail[]> {
  try {
    const params: any = {
      page: 1,
      pageSize: 100,
      dateRange: JSON.stringify({
        start: range.from?.toISOString(),
        end: range.to?.toISOString(),
      }),
    };
    const first = await api.get("/orders", { params });
    const { data: firstData, total } = first.data || { data: [], total: 0 };
    let items: OrderDetail[] = (firstData as OrderDetail[]) || [];
    const totalPages = Math.ceil((total || items.length) / 100);

    const promises: Promise<AxiosResponse<any>>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      promises.push(api.get("/orders", { params: { ...params, page: p } }));
    }

    if (promises.length > 0) {
      const responses = await Promise.all(
        promises as Promise<AxiosResponse<any>>[]
      );
      for (const resp of responses) {
        items = items.concat((resp.data?.data as OrderDetail[]) || []);
      }
    }

    return items;
  } catch (error) {
    console.warn("API failed, using mock data:", error);
    return generateMockData(range);
  }
}

function generateMockData(range: DateRange): OrderDetail[] {
  const from = range.from ? startOfDay(range.from) : startOfDay(new Date());
  const to = range.to ? endOfDay(range.to) : endOfDay(new Date());
  const days = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1
  );
  const statuses = [
    "pending",
    "quoted",
    "completed",
    "demand",
    "confirmed",
  ] as const;

  const employees: Array<Pick<User, "id" | "fullName">> = [
    { id: 1, fullName: "Nguyễn Văn A" },
    { id: 2, fullName: "Trần Thị B" },
    { id: 3, fullName: "Lê Văn C" },
    { id: 4, fullName: "Phạm Thị D" },
    { id: 5, fullName: "Hoàng Văn E" },
    { id: 6, fullName: "Võ Thị F" },
    { id: 7, fullName: "Đỗ Văn G" },
    { id: 8, fullName: "Bùi Thị H" },
  ];

  const companies = [
    "Công ty TNHH ABC",
    "Tập đoàn XYZ",
    "Công ty Cổ phần DEF",
    "Doanh nghiệp 123",
    "Công ty TNHH Technology",
    "Startup Innovation",
    "Công ty Logistics",
    "Tập đoàn Manufacturing",
    "Công ty Digital Solutions",
    "Enterprise Global",
    "Công ty Smart Tech",
    "Corporation Alpha",
    "Công ty Beta Systems",
    "Gamma Industries",
    "Delta Services",
    "Epsilon Trading",
    "Zeta Corporation",
    "Eta Solutions",
    "Theta Group",
    "Iota Dynamics",
    "Kappa Enterprises",
    "Lambda Corporation",
    "Mu Technologies",
    "Nu Industries",
    "Xi Corporation",
    "Omicron Group",
  ];

  const list: OrderDetail[] = [];
  let id = 1;

  for (let d = 0; d < days; d++) {
    const date = new Date(from);
    date.setDate(from.getDate() + d);
    const count = 12 + Math.floor(Math.random() * 18);

    for (let k = 0; k < count; k++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];

      list.push({
        id: id++,
        order_id: id,
        quantity: 1 + Math.floor(Math.random() * 5),
        unit_price: 500000 + Math.floor(Math.random() * 19500000),
        extended: Math.floor(Math.random() * 10) + 1,
        customer_name: company,
        status,
        order: {
          id: id,
          sale_by: {
            id: employee.id,
            username: employee.fullName || `NV ${employee.id}`,
            fullName: employee.fullName,
            roles: [],
            departments: [],
            status: "active",
            isBlock: false,
          },
          created_at: new Date(date),
        },
        created_at: new Date(date),
      } as any);
    }
  }
  return list;
}

// Enhanced Bar Chart Component with better design and logic
function ElegantBarChart({
  data,
  visibleSeries,
  onToggleSeries,
  onBarClick,
}: {
  data: ChartPoint[];
  visibleSeries: Record<string, boolean>;
  onToggleSeries: (key: keyof typeof chartConfig) => void;
  onBarClick: (data: {
    name: string;
    type: string;
    value: number;
    timestamp: number;
  }) => void;
}) {
  // Limit to 7 data points for better readability
  const limitedData = useMemo(() => data.slice(-7), [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-3 shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {entry.name}:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {numberCompact(entry.value)}
              </span>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  const handleBarClick = (data: any, key: string) => {
    if (data && data.payload) {
      onBarClick({
        name: data.payload.name,
        type: key,
        value: data.payload[key],
        timestamp: data.payload.timestamp,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Series Toggle Controls */}
      <div className="flex flex-wrap gap-2">
        {seriesOrder.map((key) => {
          const config = chartConfig[key as keyof typeof chartConfig];
          if (!config) return null;
          return (
            <motion.button
              key={key}
              onClick={() => onToggleSeries(key as keyof typeof chartConfig)}
              className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 border
              ${visibleSeries[key as keyof typeof visibleSeries]
                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"
                }
            `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
            >
              <div className="flex items-center gap-2">
                {visibleSeries[key as keyof typeof visibleSeries] ? (
                  <Eye
                    className="w-3.5 h-3.5"
                    style={{ color: config.color }}
                  />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: visibleSeries[
                      key as keyof typeof visibleSeries
                    ]
                      ? config.color
                      : "#cbd5e1",
                  }}
                />
                <span
                  className={
                    visibleSeries[key as keyof typeof visibleSeries]
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400"
                  }
                >
                  {config.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Chart Container */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={limitedData}
            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              dx={-10}
            />
            <RechartsTooltip content={<CustomTooltip />} />

            {seriesOrder.map((key) => {
              const config = chartConfig[key as keyof typeof chartConfig];
              if (!config) return null;
              const isVisible =
                visibleSeries[key as keyof typeof visibleSeries];
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  hide={!isVisible}
                  fill={config.color}
                  radius={[2, 2, 0, 0]}
                  cursor={isVisible ? "pointer" : "default"}
                  onClick={
                    isVisible
                      ? (data) => handleBarClick(data, key as string)
                      : undefined
                  }
                >
                  {limitedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={config.color}
                      style={{
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {seriesOrder.map((key) => {
          const config = chartConfig[key as keyof typeof chartConfig];
          if (!config) return null;
          const total = limitedData.reduce(
            (sum, item) =>
              sum +
              (visibleSeries[key as keyof typeof visibleSeries]
                ? (item[key] as number)
                : 0),
            0
          );
          return (
            <div key={key} className="text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{
                  backgroundColor: visibleSeries[
                    key as keyof typeof visibleSeries
                  ]
                    ? config.color
                    : "#cbd5e1",
                }}
              />
              <div
                className={`text-sm font-semibold ${visibleSeries[key as keyof typeof visibleSeries]
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400"
                  }`}
              >
                {numberCompact(total)}
              </div>
              <div className="text-xs text-slate-500">{config.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main component
export default function ElegantTransactionsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [range, setRange] = useState<DateRange>(() => getPresetRange("week"));
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OrderDetail[]>([]);
  const [prevItems, setPrevItems] = useState<OrderDetail[]>([]);
  const [activeTab, setActiveTab] = useState("transactions");

  // Modal state
  const [open, setOpen] = useState(false);
  const [selectedBar, setSelectedBar] = useState<{
    name: string;
    type: string;
    value: number;
    timestamp: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Chart series visibility with intelligent defaults
  const [visibleSeries, setVisibleSeries] = useState({
    demand: true,
    completed: true,
    quoted: true,
    pending: false,
    confirmed: false,
  });

  useEffect(() => {
    setRange(getPresetRange(period));
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const prevRange = getPreviousRange(period, range);
      const [cur, prev] = await Promise.all([
        fetchOrderDetails(range),
        fetchOrderDetails(prevRange),
      ]);
      if (!cancelled) {
        setItems(cur || []);
        setPrevItems(prev || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range.from?.getTime(), range.to?.getTime(), period]);

  // Enhanced summary calculations
  const summary = useMemo(() => {
    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    let countDemand = 0,
      countCompleted = 0,
      countQuoted = 0,
      countPending = 0,
      countConfirmed = 0,
      gdToday = 0,
      gd1 = 0,
      gdExpireToday = 0,
      gd2 = 0,
      totalRevenue = 0;

    for (const it of items) {
      const created = it.order?.created_at
        ? new Date(it.order.created_at as any)
        : new Date(it.created_at as any);
      const createdDay = startOfDay(created).getTime();

      if (createdDay === today.getTime()) gdToday++;
      if (createdDay === startOfDay(yesterday).getTime()) gd1++;
      if (createdDay === startOfDay(twoDaysAgo).getTime()) gd2++;

      const dExt = calcDynamicExtended(
        it.order?.created_at as any,
        it.extended || 0
      );
      if (dExt === 0) gdExpireToday++;

      if (it.status === "completed") {
        totalRevenue += Number(it.unit_price || 0) * Number(it.quantity || 1);
      }

      if (it.status === "demand") countDemand++;
      else if (it.status === "completed") countCompleted++;
      else if (it.status === "quoted") countQuoted++;
      else if (it.status === "pending") countPending++;
      // confirmed bỏ khỏi hiển thị biểu đồ/chỉ số chính
    }

    return {
      chaoBan: countCompleted + countQuoted,
      completed: countCompleted,
      quoted: countQuoted,
      demand: countDemand,
      pending: countPending,
      // confirmed: countConfirmed,
      gdToday,
      gdYesterday: gd1,
      gd2DaysAgo: gd2,
      gdExpiredToday: gdExpireToday,
      totalRevenue,
      avgOrderValue: countCompleted > 0 ? totalRevenue / countCompleted : 0,
      conversionRate:
        (countCompleted / Math.max(1, countCompleted + countQuoted)) * 100,
    };
  }, [items]);

  const buildSummary = (data: OrderDetail[]) => {
    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    let countDemand = 0,
      countCompleted = 0,
      countQuoted = 0,
      countPending = 0,
      countConfirmed = 0,
      gdToday = 0,
      gd1 = 0,
      gdExpireToday = 0,
      gd2 = 0,
      totalRevenue = 0;

    for (const it of data) {
      const created = it.order?.created_at
        ? new Date(it.order.created_at as any)
        : new Date(it.created_at as any);
      const createdDay = startOfDay(created).getTime();

      if (createdDay === today.getTime()) gdToday++;
      if (createdDay === startOfDay(yesterday).getTime()) gd1++;
      if (createdDay === startOfDay(twoDaysAgo).getTime()) gd2++;

      const dExt = calcDynamicExtended(
        it.order?.created_at as any,
        it.extended || 0
      );
      if (dExt === 0) gdExpireToday++;

      if (it.status === "completed") {
        totalRevenue += Number(it.unit_price || 0) * Number(it.quantity || 1);
      }

      if (it.status === "demand") countDemand++;
      else if (it.status === "completed") countCompleted++;
      else if (it.status === "quoted") countQuoted++;
      else if (it.status === "pending") countPending++;
      // confirmed bỏ khỏi hiển thị biểu đồ/chỉ số chính
    }

    return {
      chaoBan: countCompleted + countQuoted,
      completed: countCompleted,
      quoted: countQuoted,
      demand: countDemand,
      pending: countPending,
      // confirmed: countConfirmed,
      gdToday,
      gdYesterday: gd1,
      gd2DaysAgo: gd2,
      gdExpiredToday: gdExpireToday,
      totalRevenue,
      avgOrderValue: countCompleted > 0 ? totalRevenue / countCompleted : 0,
      conversionRate:
        (countCompleted / Math.max(1, countCompleted + countQuoted)) * 100,
    };
  };

  const summaryPrev = useMemo(() => buildSummary(prevItems), [prevItems]);

  // Enhanced chart data - limit to 7 points
  const chartData: ChartPoint[] = useMemo(() => {
    const map = new Map<string, ChartPoint>();
    for (const it of items) {
      const created = it.order?.created_at
        ? new Date(it.order.created_at as any)
        : new Date(it.created_at as any);
      const key = groupKeyByPeriod(created, period);
      const ts = getPeriodStart(created, period).getTime();
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          timestamp: ts,
          demand: 0,
          completed: 0,
          quoted: 0,
          pending: 0,
        });
      }
      const pt = map.get(key)!;
      if (it.status === "demand") pt.demand += 1;
      else if (it.status === "completed") pt.completed += 1;
      else if (it.status === "quoted") pt.quoted += 1;
      else if (it.status === "pending") pt.pending += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [items, period]);

  // Customer statistics (for WOW customers tab)
  type CustomerStat = {
    name: string;
    total: number;
    completed: number;
    quoted: number;
    pending: number;
    demand: number;
    confirmed: number;
  };

  const customerStats = useMemo<CustomerStat[]>(() => {
    const map = new Map<string, CustomerStat>();
    for (const it of items) {
      const name = it.customer_name || "--";
      if (!map.has(name))
        map.set(name, {
          name,
          total: 0,
          completed: 0,
          quoted: 0,
          pending: 0,
          demand: 0,
          confirmed: 0,
        });
      const s = map.get(name)!;
      s.total += 1;
      if (it.status === "completed") s.completed += 1;
      else if (it.status === "quoted") s.quoted += 1;
      else if (it.status === "pending") s.pending += 1;
      else if (it.status === "demand") s.demand += 1;
      else if (it.status === "confirmed") s.confirmed += 1;
    }
    return Array.from(map.values());
  }, [items]);

  // Employee statistics (for WOW employees tab)
  type EmployeeStat = {
    id: number;
    name: string;
    orders: number;
    customers: number;
    completed: number;
    quoted: number;
    conversion: number;
  };

  const employeeStatsRaw = useMemo<EmployeeStat[]>(() => {
    const map = new Map<
      number,
      {
        name: string;
        orders: number;
        customers: Set<string>;
        completed: number;
        quoted: number;
      }
    >();
    for (const it of items) {
      const id = (it.order?.sale_by as any)?.id || 0;
      const name =
        (it.order?.sale_by as any)?.fullName ||
        (it.order?.sale_by as any)?.username ||
        `NV ${id}`;
      if (!map.has(id))
        map.set(id, {
          name,
          orders: 0,
          customers: new Set<string>(),
          completed: 0,
          quoted: 0,
        });
      const entry = map.get(id)!;
      entry.orders += 1;
      if (it.customer_name) entry.customers.add(it.customer_name);
      if (it.status === "completed") entry.completed += 1;
      else if (it.status === "quoted") entry.quoted += 1;
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      orders: v.orders,
      customers: v.customers.size,
      completed: v.completed,
      quoted: v.quoted,
      conversion: (v.completed / Math.max(1, v.completed + v.quoted)) * 100,
    }));
  }, [items]);

  const [employeeSort, setEmployeeSort] = useState<
    "orders" | "customers" | "conversion"
  >("orders");
  const employeeStats = useMemo(() => {
    const arr = employeeStatsRaw.slice();
    if (employeeSort === "orders") arr.sort((a, b) => b.orders - a.orders);
    else if (employeeSort === "customers")
      arr.sort((a, b) => b.customers - a.customers);
    else if (employeeSort === "conversion")
      arr.sort((a, b) => b.conversion - a.conversion);
    return arr.slice(0, 12);
  }, [employeeStatsRaw, employeeSort]);

  const handleToggleSeries = (key: keyof typeof chartConfig) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBarClick = (data: {
    name: string;
    type: string;
    value: number;
    timestamp: number;
  }) => {
    setSelectedBar(data);
    setPage(1);
    setOpen(true);
  };

  const detailRows = useMemo(() => {
    if (!selectedBar) return [] as OrderDetail[];
    const { from, to } = getBucketRange(selectedBar.timestamp, period);
    return items.filter((it) => {
      const created = it.order?.created_at
        ? new Date(it.order.created_at as any)
        : new Date(it.created_at as any);
      if (created < from || created > to) return false;
      if (!selectedBar.type) return true;
      if (selectedBar.type === "demand") return it.status === "demand";
      if (selectedBar.type === "completed") return it.status === "completed";
      if (selectedBar.type === "quoted") return it.status === "quoted";
      if (selectedBar.type === "pending") return it.status === "pending";
      return false;
    });
  }, [items, selectedBar, period]);

  const pagedDetailRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return detailRows.slice(start, start + pageSize);
  }, [detailRows, page]);

  return (
    <TooltipProvider>
      <motion.main
        className="flex flex-col gap-6 pt-0 pb-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Elegant Header */}
        <motion.div
          className="flex items-center justify-between flex-wrap gap-4 p-6 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg shadow-lg border border-slate-200/50 dark:border-slate-700/50"
          variants={itemVariants}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <BarChart3 className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
                <Sparkles className="inline w-6 h-6 mr-2 text-amber-500" />
                Thống kê giao dịch
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Thống kê giao dịch và khách hàng của bạn theo ngày, tuần hoặc quý.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(v) => v && setPeriod(v as Period)}
              className="rounded-lg border bg-white/80 dark:bg-slate-800/80 p-1 shadow-sm backdrop-blur-sm"
            >
              <ToggleGroupItem value="day" className="rounded-md text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                Ngày
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="rounded-md text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                Tuần
              </ToggleGroupItem>
              <ToggleGroupItem value="quarter" className="rounded-md text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                Quý
              </ToggleGroupItem>
            </ToggleGroup>

            <DateRangePicker
              locale="vi"
              initialDateRange={range}
              onUpdate={(r) => setRange(r.range || range)}
              align="start"
              numberOfMonths={2}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-lg shadow-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg"
              >
                <DropdownMenuItem
                  onClick={() => setRange(getPresetRange(period))}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Đặt lại khoảng ngày
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Elegant Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div variants={itemVariants}>
            <TabsList className="mb-6 p-1 rounded-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg shadow-md border border-slate-200/50 dark:border-slate-700/50">
              <TabsTrigger
                value="transactions"
                className="rounded-md px-4 py-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Thống kê giao dịch
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="rounded-md px-4 py-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Khách hàng
              </TabsTrigger>
              <TabsTrigger
                value="employees"
                className="rounded-md px-4 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                <Award className="w-4 h-4 mr-2" />
                Nhân viên
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            <TabsContent value="transactions" key="transactions">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Card className="border-0 shadow-lg rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg overflow-hidden border-slate-200/50 dark:border-slate-700/50">
                  <CardHeader className="pb-6 bg-gradient-to-r from-slate-50/50 to-indigo-50/50 dark:from-slate-800/50 dark:to-indigo-900/50">
                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                      <motion.div
                        className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600"
                        whileHover={{ rotate: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Target className="w-5 h-5 text-white" />
                      </motion.div>
                      Tổng quan chi tiết
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 p-6">
                    {loading ? (
                      <motion.div
                        className="flex justify-center py-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <LoadingSpinner size={48} />
                      </motion.div>
                    ) : (
                      <>
                        {/* Elegant KPI Grid */}
                        <motion.div
                          className={`grid grid-cols-1 md:grid-cols-2 ${visibleSeries.pending ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-6`}
                          variants={containerVariants}
                        >
                          <motion.div variants={itemVariants}>
                            <ElegantKPI
                              trendPrev={summaryPrev.chaoBan}
                              label="Tổng chào bán"
                              value={summary.chaoBan}
                              icon={<Target className="w-5 h-5" />}
                              color="blue"
                              description="Tổng số giao dịch đã chào bán"
                              accentFrom="#0ea5e9"
                              accentTo="#0284c7"
                              bg="#f0f9ff"
                              border="#bae6fd"
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <ElegantKPI
                              trendPrev={summaryPrev.completed}
                              label="Đã chốt thành công"
                              value={summary.completed}
                              icon={<Crown className="w-5 h-5" />}
                              color="emerald"
                              description="Giao dịch đã hoàn thành"
                              accentFrom="#10b981"
                              accentTo="#059669"
                              bg="#ecfdf5"
                              border="#a7f3d0"
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <ElegantKPI
                              trendPrev={summaryPrev.quoted}
                              label="Chưa chốt"
                              value={summary.quoted}
                              icon={<Clock className="w-5 h-5" />}
                              color="rose"
                              description="Đã báo giá, chờ phản hồi"
                              accentFrom="#ef4444"
                              accentTo="#b91c1c"
                              bg="#fef2f2"
                              border="#fecaca"
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <ElegantKPI
                              trendPrev={summaryPrev.demand}
                              label="Nhu cầu mới"
                              value={summary.demand}
                              icon={<Sparkles className="w-5 h-5" />}
                              color="blue"
                              description="Khách hàng có nhu cầu"
                              accentFrom="#0ea5e9"
                              accentTo="#0284c7"
                              bg="#f0f9ff"
                              border="#bae6fd"
                            />
                          </motion.div>
                          {visibleSeries.pending && (
                            <motion.div variants={itemVariants}>
                              <ElegantKPI
                                trendPrev={summaryPrev.pending}
                                label="Chờ xử lý"
                                value={summary.pending}
                                icon={<Clock className="w-5 h-5" />}
                                color="indigo"
                                description="Đang chờ xử lý"
                                accentFrom="#2dd4bf"
                                accentTo="#14b8a6"
                                bg="#f0fdfa"
                                border="#99f6e4"
                              />
                            </motion.div>
                          )}
                        </motion.div>

                        {/* Secondary KPIs */}
                        <motion.div
                          className="grid grid-cols-2 md:grid-cols-5 gap-4"
                          variants={containerVariants}
                        >
                          <motion.div variants={itemVariants}>
                            <MiniKPI
                              label="GD hôm nay"
                              value={summary.gdToday}
                              color="purple"
                              icon={<Calendar className="w-4 h-4" />}
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <MiniKPI
                              label="GD hôm qua"
                              value={summary.gdYesterday}
                              color="emerald"
                              icon={<Clock className="w-4 h-4" />}
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <MiniKPI
                              label="GD 2 ngày trước"
                              value={summary.gd2DaysAgo || 0}
                              color="blue"
                              icon={<Clock className="w-4 h-4" />}
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <MiniKPI
                              label="Hết hạn hôm nay"
                              value={summary.gdExpiredToday}
                              color="red"
                              icon={<Clock className="w-4 h-4" />}
                              isAlert={summary.gdExpiredToday > 0}
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <MiniKPI
                              label="Tỷ lệ chốt"
                              value={Math.round(summary.conversionRate)}
                              color="blue"
                              icon={<Target className="w-4 h-4" />}
                              suffix="%"
                            />
                          </motion.div>
                        </motion.div>

                        {/* Enhanced Chart Section */}
                        <motion.div
                          className="space-y-6"
                          variants={containerVariants}
                        >
                          <motion.div variants={itemVariants}>
                            <div className="p-6 rounded-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 shadow-md border border-slate-200/50 dark:border-slate-700/50">
                              <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600">
                                    <BarChart3 className="w-4 h-4 text-white" />
                                  </div>
                                  Biểu đồ tương tác
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  Hiển thị 7 điểm gần nhất
                                </Badge>
                              </div>

                              <ElegantBarChart
                                data={chartData}
                                visibleSeries={visibleSeries}
                                onToggleSeries={handleToggleSeries}
                                onBarClick={handleBarClick}
                              />
                            </div>
                          </motion.div>
                        </motion.div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Customers Tab - WOW version */}
            <TabsContent value="customers" key="customers">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Card className="border-0 shadow-lg rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg overflow-hidden">
                  <CardHeader className="pb-6 bg-gradient-to-r from-slate-50/50 to-emerald-50/50 dark:from-slate-800/50 dark:to-emerald-900/30">
                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                      <motion.div
                        className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600"
                        whileHover={{ rotate: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Users className="w-5 h-5 text-white" />
                      </motion.div>
                      Thống kê theo khách hàng
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    {loading ? (
                      <div className="flex justify-center py-16">
                        <LoadingSpinner size={48} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-4">
                          {customerStats
                            .slice()
                            .sort((a, b) => b.total - a.total)
                            .slice(0, 15)
                            .map((c, idx) => (
                              <motion.div key={c.name} variants={itemVariants}>
                                <div className="p-4 rounded-xl border bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium truncate max-w-[60%]">
                                      {c.name}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      {numberCompact(c.total)} GD
                                    </div>
                                  </div>
                                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                                      style={{
                                        width: `${(c.total /
                                          Math.max(
                                            1,
                                            customerStats[0]?.total || c.total
                                          )) *
                                          100
                                          }%`,
                                      }}
                                    />
                                  </div>
                                  <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                                    <StatDot
                                      label="Đã chốt"
                                      value={c.completed}
                                      color={chartConfig.completed.color}
                                    />
                                    <StatDot
                                      label="Chưa chốt"
                                      value={c.quoted}
                                      color={chartConfig.quoted.color}
                                    />
                                    <StatDot
                                      label="Chờ xử lý"
                                      value={c.pending}
                                      color={chartConfig.pending.color}
                                    />
                                    <StatDot
                                      label="Nhu cầu"
                                      value={c.demand}
                                      color={chartConfig.demand.color}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl border bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm shadow-sm">
                            <div className="font-semibold mb-3">
                              Tỉ lệ chốt cao
                            </div>
                            <ul className="space-y-3">
                              {customerStats
                                .filter((c) => c.completed + c.quoted >= 5)
                                .map((c) => ({
                                  ...c,
                                  conv: Math.round(
                                    (c.completed /
                                      Math.max(1, c.completed + c.quoted)) *
                                    100
                                  ),
                                }))
                                .sort((a, b) => b.conv - a.conv)
                                .slice(0, 10)
                                .map((c) => (
                                  <li
                                    key={c.name}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="truncate max-w-[60%]">
                                      {c.name}
                                    </span>
                                    <span className="text-sm font-semibold">
                                      {c.conv}%
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Employees Tab - WOW version */}
            <TabsContent value="employees" key="employees">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Card className="border-0 shadow-lg rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg overflow-hidden">
                  <CardHeader className="pb-6 bg-gradient-to-r from-slate-50/50 to-orange-50/50 dark:from-slate-800/50 dark:to-orange-900/30">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xl font-bold flex items-center gap-3">
                        <motion.div
                          className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600"
                          whileHover={{ rotate: 5 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Award className="w-5 h-5 text-white" />
                        </motion.div>
                        Thống kê theo nhân viên
                      </CardTitle>
                      <ToggleGroup
                        type="single"
                        value={employeeSort}
                        onValueChange={(v) => v && setEmployeeSort(v as any)}
                      >
                        <ToggleGroupItem value="orders">Đơn</ToggleGroupItem>
                        <ToggleGroupItem value="customers">KH</ToggleGroupItem>
                        <ToggleGroupItem value="conversion">
                          Tỉ lệ chốt
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    {loading ? (
                      <div className="flex justify-center py-16">
                        <LoadingSpinner size={48} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {employeeStats.map((e) => (
                          <div
                            key={e.id}
                            className="p-4 rounded-xl border bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium truncate max-w-[60%]">
                                {e.name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {e.customers} KH
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                              <StatDot
                                label="Đã chốt"
                                value={e.completed}
                                color={chartConfig.completed.color}
                              />
                              <StatDot
                                label="Chưa chốt"
                                value={e.quoted}
                                color={chartConfig.quoted.color}
                              />
                              <div className="text-right font-semibold">
                                {Math.round(e.conversion)}%
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <ProgressLine
                                label="Số đơn"
                                value={e.orders}
                                max={employeeStats[0]?.orders || e.orders}
                                color="from-emerald-500 to-green-500"
                              />
                              <ProgressLine
                                label="Số khách hàng"
                                value={e.customers}
                                max={employeeStats[0]?.customers || e.customers}
                                color="from-sky-500 to-indigo-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Other tabs would continue similarly with the elegant design pattern... */}
          </AnimatePresence>
        </Tabs>

        {/* Enhanced Detail Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="!max-w-6xl p-0 rounded-xl shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6"
            >
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div>{selectedBar?.name}</div>
                    {selectedBar?.type && (
                      <div className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                        {
                          chartConfig[
                            selectedBar.type as keyof typeof chartConfig
                          ]?.label
                        }{" "}
                        - {selectedBar.value} giao dịch
                      </div>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/80">
                        <th className="p-3 text-left font-semibold text-sm">
                          📅 Ngày
                        </th>
                        <th className="p-3 text-left font-semibold text-sm">
                          🏢 Khách hàng
                        </th>
                        <th className="p-3 text-left font-semibold text-sm">
                          👨‍💼 Nhân viên
                        </th>
                        <th className="p-3 text-left font-semibold text-sm">
                          📊 Trạng thái
                        </th>
                        <th className="p-3 text-right font-semibold text-sm">
                          💰 Giá trị
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDetailRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-12 text-center text-slate-500"
                          >
                            <div className="flex flex-col items-center gap-4">
                              <BarChart3 className="w-12 h-12 opacity-30" />
                              <p>Không có dữ liệu chi tiết</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedDetailRows.map((od, index) => (
                          <motion.tr
                            key={String(od.id)}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              transition: { delay: index * 0.05 },
                            }}
                          >
                            <td className="p-3 font-medium text-sm">
                              {new Date(od.created_at ?? 0).toLocaleString(
                                "vi-VN",
                                {
                                  hour12: false,
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                }
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {od.customer_name || "--"}
                            </td>
                            <td className="p-3 text-sm">
                              {(od.order?.sale_by as any)?.fullName ||
                                (od.order?.sale_by as any)?.username ||
                                "--"}
                            </td>
                            <td className="p-3">
                              <ElegantStatusBadge status={od.status || ""} />
                            </td>
                            <td className="p-3 text-right font-semibold text-emerald-600 text-sm">
                              {formatCurrency(Number(od.unit_price || 0))}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-slate-800/80 gap-4 flex-wrap">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Hiển thị{" "}
                    <span className="font-semibold">
                      {Math.min((page - 1) * pageSize + 1, detailRows.length)}
                    </span>{" "}
                    -
                    <span className="font-semibold">
                      {Math.min(page * pageSize, detailRows.length)}
                    </span>{" "}
                    trong tổng số
                    <span className="font-semibold">
                      {" "}
                      {detailRows.length}
                    </span>{" "}
                    giao dịch
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="rounded-md"
                    >
                      ← Trước
                    </Button>
                    <span className="text-sm font-medium px-3 py-1 bg-white/80 dark:bg-slate-800/80 rounded-md">
                      {page} /{" "}
                      {Math.max(1, Math.ceil(detailRows.length / pageSize))}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(
                          Math.min(
                            Math.ceil(detailRows.length / pageSize),
                            page + 1
                          )
                        )
                      }
                      disabled={page >= Math.ceil(detailRows.length / pageSize)}
                      className="rounded-md"
                    >
                      Sau →
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      </motion.main>
    </TooltipProvider>
  );
}

// Enhanced KPI Components with elegant design
function ElegantKPI({
  label,
  value,
  icon,
  color = "indigo",
  trendPrev,
  description,
  isCurrency = false,
  accentFrom,
  accentTo,
  bg,
  border,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "indigo" | "emerald" | "blue" | "rose";
  trendPrev?: number;
  description?: string;
  isCurrency?: boolean;
  accentFrom?: string;
  accentTo?: string;
  bg?: string;
  border?: string;
}) {
  const defaults = {
    indigo: {
      from: "#6366f1",
      to: "#4f46e5",
      bg: "#eef2ff",
      border: "#c7d2fe",
    },
    emerald: {
      from: "#10b981",
      to: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    },
    blue: { from: "#3b82f6", to: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    rose: { from: "#f43f5e", to: "#e11d48", bg: "#fff1f2", border: "#fecdd3" },
  } as const;

  const palette = defaults[color] || defaults.indigo;
  const fromHex = accentFrom || palette.from;
  const toHex = accentTo || palette.to;
  const bgHex = bg || palette.bg;
  const borderHex = border || palette.border;

  const percent = useMemo(() => {
    if (trendPrev == null) return null;
    const p =
      trendPrev === 0
        ? value > 0
          ? 100
          : 0
        : Math.round(((value - trendPrev) / Math.max(1, trendPrev)) * 100);
    return p;
  }, [value, trendPrev]);

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden shadow-sm border`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ backgroundColor: bgHex, borderColor: borderHex }}
    >
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <motion.div
            className={`p-3 rounded-lg shadow-sm`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            style={{
              background: `linear-gradient(to bottom right, ${fromHex}, ${toHex})`,
            }}
          >
            <div className="text-white">{icon}</div>
          </motion.div>
          {percent !== null && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${percent >= 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
            >
              {percent >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(percent)}%
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            <CountUpAnimation value={value} isCurrency={isCurrency} />
          </div>
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {label}
          </div>
          {description && (
            <div className="text-xs text-slate-500 dark:text-slate-500">
              {description}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MiniKPI({
  label,
  value,
  color = "indigo",
  icon,
  suffix = "",
  isAlert = false,
}: {
  label: string;
  value: number;
  color?: string;
  icon: React.ReactNode;
  suffix?: string;
  isAlert?: boolean;
}) {
  const colorClasses = {
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <motion.div
      className={`relative rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm border ${isAlert
        ? "border-red-200 dark:border-red-800"
        : "border-slate-200 dark:border-slate-700"
        }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div
            className={`p-2 rounded-md bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] ||
              colorClasses.indigo
              }`}
          >
            <div className="text-white text-sm">{icon}</div>
          </div>
          {isAlert && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-red-500 rounded-full"
            />
          )}
        </div>
        <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
          <CountUpAnimation value={value} />
          {suffix}
        </div>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

function CountUpAnimation({
  value,
  duration = 800,
  isCurrency = false,
}: {
  value: number;
  duration?: number;
  isCurrency?: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;

    const step = (timestamp: number) => {
      if (startRef.current == null) startRef.current = timestamp;
      const progress = Math.min(1, (timestamp - startRef.current) / duration);
      const easeOutQuart = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * easeOutQuart);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        startRef.current = null;
      }
    };

    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [value, duration]);

  if (isCurrency) {
    return <>{formatCurrency(display)}</>;
  }

  return <>{numberCompact(display)}</>;
}

function ElegantStatusBadge({ status }: { status: string }) {
  const config = {
    pending: {
      label: "Chờ xử lý",
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      icon: "⏳",
    },
    quoted: {
      label: "Đang Chưa chốt",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      icon: "💬",
    },
    completed: {
      label: "Đã chốt",
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      icon: "✅",
    },
    demand: {
      label: "Nhu cầu mới",
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
      icon: "🔥",
    },
    confirmed: {
      label: "Đã xác nhận",
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      icon: "📞",
    },
  };

  const statusConfig = config[status as keyof typeof config] || {
    label: status || "Không xác định",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    icon: "❓",
  };

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${statusConfig.color}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-xs">{statusConfig.icon}</span>
      <span>{statusConfig.label}</span>
    </motion.div>
  );
}

function StatDot({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs font-medium">{numberCompact(value)}</span>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percent = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{numberCompact(value)}</span>
      </div>
      <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
