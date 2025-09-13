"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getAccessToken, getUserFromToken } from "@/lib/auth";
import { 
  TransactionStatsApiResponse, 
  TransactionSummaryStats,
  TransactionChartPoint,
  TransactionCustomerStat,
  TransactionEmployeeStat 
} from "@/types/transaction-stats";
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
import CountUpAnimation from "@/components/order/order-statistic/CountUpAnimation";
import ProgressLine from "@/components/order/order-statistic/ProgressLine";
import StatDot from "@/components/order/order-statistic/StatDot";
import ElegantStatusBadge from "@/components/order/order-statistic/ElegantStatusBadge";
import MiniKPI from "@/components/order/order-statistic/MiniKPI";
import ElegantKPI from "@/components/order/order-statistic/ElegantKPI";
import ElegantBarChart, {
  chartConfig,
  ChartPoint,
} from "@/components/order/order-statistic/ElegantBarChart";
import {
  endOfDay,
  formatCurrency,
  numberCompact,
  startOfDay,
} from "@/lib/order-helper";
import { useOrderStats } from "@/hooks/useOrderStats";
import { useHolidays } from "@/hooks/useHolidays";

type Period = "day" | "week" | "quarter";

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

function getLastNDaysExcludingSundays(n: number, end?: Date) {
  const endDate = end ? new Date(end) : new Date();
  // If endDate is Sunday, move to Saturday
  if (endDate.getDay() === 0) {
    endDate.setDate(endDate.getDate() - 1);
  }
  const dates: Date[] = [];
  const cursor = new Date(endDate);
  while (dates.length < n) {
    if (cursor.getDay() !== 0) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  const from = dates[dates.length - 1];
  const to = dates[0];
  return { from: startOfDay(from), to: endOfDay(to) };
}

function getPresetRange(period: Period): DateRange {
  const now = new Date();
  const to = endOfDay(now);
  if (period === "day") {
    // Last 7 days rolling, skipping Sundays
    return getLastNDaysExcludingSundays(7, now);
  }
  if (period === "week") {
    // Last 7 days rolling, skipping Sundays
    return getLastNDaysExcludingSundays(7, now);
  }
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), q * 3, 1);
  const last = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { from: startOfDay(from), to: endOfDay(last) };
}

// Main component
export default function ElegantTransactionsPage() {
  // ✅ SỬA: Sử dụng getTransactionStats endpoint mới
  const { getTransactionStats, getTransactionDetails } = useOrderStats();
  // Dynamic holidays
  const { holidaysSet } = useHolidays();
  // Get user info for role-based UI
  const user = useMemo(() => {
    const token = getAccessToken();
    return token ? getUserFromToken(token) : null;
  }, []);
  
  const [period, setPeriod] = useState<Period>("day");
  const [range, setRange] = useState<DateRange>(() => getPresetRange("day"));
  const [loading, setLoading] = useState(true);
  
  // ✅ SỬA: State mới cho API response
  const [statsData, setStatsData] = useState<TransactionStatsApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState("transactions");

  // Modal state - giữ nguyên
  const [open, setOpen] = useState(false);
  const [selectedBar, setSelectedBar] = useState<{
    name: string;
    type: string;
    value: number;
    timestamp: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Chart series visibility with intelligent defaults - giữ nguyên
  const [visibleSeries, setVisibleSeries] = useState({
    demand: true,
    completed: true,
    quoted: true,
    pending: false,
    confirmed: false,
  });

  // ✅ SỬA: Lấy expiredStats từ API data thay vì state riêng
  const expiredStats = useMemo(() => {
    return statsData?.expiredStats || { expiredToday: 0, overdue: 0 };
  }, [statsData]);

  // ✅ Thêm state cho pagination khách hàng
  const [customerPage, setCustomerPage] = useState(1);
  const customerPageSize = 20; // Hiển thị 20 khách hàng mỗi trang

  useEffect(() => {
    setRange(getPresetRange(period));
  }, [period]);

  // ✅ SỬA: Single useEffect sử dụng getTransactionStats thay vì getDetailedStats
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        const buildParams = (r: DateRange) => {
          const dateFrom = r.from ? new Date(r.from) : undefined;
          const dateTo = r.to ? new Date(r.to) : undefined;
          const fmt = (d?: Date) => {
            if (!d) return undefined;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          };
          
          // ✅ SỬA: Gửi đúng period từ state
          return {
            period: period as any,
            dateFrom: fmt(dateFrom),
            dateTo: fmt(dateTo),
          };
        };

        // ✅ SỬA: Chỉ 1 API call thay vì 2 calls
        const result = await getTransactionStats(buildParams(range));

        if (cancelled) return;
        
        // ✅ SỬA: Lưu data từ API mới
        setStatsData(result);
        
      } catch (error) {
        console.warn("Transaction Stats API failed:", error);
        if (!cancelled) {
          setStatsData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range.from?.getTime(), range.to?.getTime(), period, getTransactionStats]);



  // ✅ SỬA: Sử dụng pre-calculated data từ API thay vì tính toán frontend
  const summary = useMemo<TransactionSummaryStats>(() => {
    if (!statsData) {
      return {
        chaoBan: 0, completed: 0, quoted: 0, demand: 0, pending: 0, confirmed: 0,
        totalRevenue: 0, avgOrderValue: 0, conversionRate: 0,
        gdToday: 0, gdYesterday: 0, gd2DaysAgo: 0,
        prevChaoBan: 0, prevCompleted: 0, prevQuoted: 0, prevDemand: 0, prevPending: 0,
        prevTotalRevenue: 0, prevAvgOrderValue: 0, prevConversionRate: 0,
      };
    }
    return statsData.summary;
  }, [statsData]);

  // ✅ SỬA: Tạo summaryPrev từ pre-calculated data thay vì tính toán
  const summaryPrev = useMemo<TransactionSummaryStats>(() => {
    if (!statsData) {
      return {
        chaoBan: 0, completed: 0, quoted: 0, demand: 0, pending: 0, confirmed: 0,
        totalRevenue: 0, avgOrderValue: 0, conversionRate: 0,
        gdToday: 0, gdYesterday: 0, gd2DaysAgo: 0,
        prevChaoBan: 0, prevCompleted: 0, prevQuoted: 0, prevDemand: 0, prevPending: 0,
        prevTotalRevenue: 0, prevAvgOrderValue: 0, prevConversionRate: 0,
      };
    }
    // Create previous summary from current summary's prev* fields
    return {
      chaoBan: statsData.summary.prevChaoBan,
      completed: statsData.summary.prevCompleted,
      quoted: statsData.summary.prevQuoted,
      demand: statsData.summary.prevDemand,
      pending: statsData.summary.prevPending,
      confirmed: 0,
      totalRevenue: statsData.summary.prevTotalRevenue,
      avgOrderValue: statsData.summary.prevAvgOrderValue,
      conversionRate: statsData.summary.prevConversionRate,
      gdToday: 0, gdYesterday: 0, gd2DaysAgo: 0, // not applicable for prev
      prevChaoBan: 0, prevCompleted: 0, prevQuoted: 0, prevDemand: 0, prevPending: 0,
      prevTotalRevenue: 0, prevAvgOrderValue: 0, prevConversionRate: 0,
    };
  }, [statsData]);

  // ✅ SỬA: Sử dụng pre-calculated chartData
  const chartData: TransactionChartPoint[] = useMemo(() => {
    return statsData?.chartData || [];
  }, [statsData]);

  // ✅ SỬA: Sử dụng pre-calculated customerStats
  const customerStats = useMemo<TransactionCustomerStat[]>(() => {
    return statsData?.customerStats || [];
  }, [statsData]);

  // ✅ SỬA: Sử dụng pre-calculated employeeStats
  const employeeStatsRaw = useMemo<TransactionEmployeeStat[]>(() => {
    return statsData?.employeeStats || [];
  }, [statsData]);

  const [employeeSort, setEmployeeSort] = useState<
    "orders" | "customers" | "conversion"
  >("orders");
  const employeeStats = useMemo(() => {
    const arr = employeeStatsRaw.slice();
    if (employeeSort === "orders") arr.sort((a, b) => b.orders - a.orders);
    else if (employeeSort === "customers") arr.sort((a, b) => b.customers - a.customers);
    else if (employeeSort === "conversion") arr.sort((a, b) => b.conversion - a.conversion);
    // return full sorted list; paging is handled separately so user can browse all employees
    return arr;
  }, [employeeStatsRaw, employeeSort]);

  // Pagination for employee stats (allow browsing full list)
  const [employeePage, setEmployeePage] = useState(1);
  const employeePageSize = 12;
  const pagedEmployeeStats = useMemo(() => {
    const start = (employeePage - 1) * employeePageSize;
    return employeeStats.slice(start, start + employeePageSize);
  }, [employeeStats, employeePage]);

  // Check if current user should see employee stats
  const shouldShowEmployeeTab = useMemo(() => {
    if (!user?.roles) return true; // Default show if no role info
    
    // Check if user has only 'user' role (pure user role without manager capabilities)
    const hasManagerRole = user.roles.some((r: any) => 
      r.name === 'manager' || r.name.includes('manager')
    );
    const hasAdminRole = user.roles.some((r: any) => 
      r.name === 'admin' || r.name === 'analysis'
    );
    const hasOnlyUserRole = user.roles.some((r: any) => r.name === 'user') && 
                            !hasManagerRole && !hasAdminRole;
    
    // Hide tab only if user has pure 'user' role (no manager/admin capabilities)
    return !hasOnlyUserRole;
  }, [user]);

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

  // ✅ SỬA: Tạm thời disable detailRows vì cần raw data để filter
  // ✅ NEW: State cho detail data
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPagination, setDetailPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pageSize: 0
  });

  // ✅ SỬA: Load detail data khi selectedBar thay đổi
  useEffect(() => {
    if (!selectedBar || !open) return;
    
    // ✅ Validate selectedBar data
    if (!selectedBar.timestamp || isNaN(selectedBar.timestamp)) {
      console.error('❌ Invalid selectedBar timestamp:', selectedBar);
      setDetailData([]);
      return;
    }
    
    let cancelled = false;
    (async () => {
      try {
        setDetailLoading(true);
        
        const buildParams = (r: DateRange) => {
          const dateFrom = r.from ? new Date(r.from) : undefined;
          const dateTo = r.to ? new Date(r.to) : undefined;
          const fmt = (d?: Date) => {
            if (!d) return undefined;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          };
          return {
            period: period as any,
            dateFrom: fmt(dateFrom),
            dateTo: fmt(dateTo),
            timestamp: selectedBar.timestamp,
            status: selectedBar.type, // filter by clicked status
          };
        };

        const result = await getTransactionDetails({
          ...buildParams(range),
          page: detailPagination.page,
          limit: detailPagination.limit
        });
        
        
        if (!cancelled) {
          setDetailData(result.items || []);
          setDetailPagination(prev => ({
            ...prev,
            total: result.total || 0,
            pageSize: result.pageSize || 0
          }));
        }
      } catch (error) {
        console.error("Detail data failed:", error);
        if (!cancelled) {
          setDetailData([]);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [selectedBar, open, period, range.from?.getTime(), range.to?.getTime(), detailPagination.page, detailPagination.limit, getTransactionDetails]);

  // Function to handle page changes
  const handlePageChange = (newPage: number) => {
    setDetailPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // Reset pagination when modal opens with new selectedBar
  useEffect(() => {
    if (open && selectedBar) {
      setDetailPagination(prev => ({
        ...prev,
        page: 1
      }));
    }
  }, [selectedBar]); // Only reset when selectedBar changes, not when modal state changes

  const detailRows = useMemo(() => {
    // ✅ SỬA: Sử dụng detailData từ API
    return detailData.map(item => ({
      id: item.id,
      order_id: item.order_id,
      customer_name: item.customer_name,
      status: item.status,
      unit_price: item.unit_price,
      quantity: item.quantity,
      created_at: item.created_at,
      order: {
        id: item.order_id,
        sale_by: {
          fullName: item.employee_name,
          username: item.employee_name,
        },
        created_at: item.order_created_at || item.created_at,
      },
      product: {
        name: item.product_name,
      }
    }));
  }, [detailData]);

  const pagedDetailRows = useMemo(() => {
    // ✅ Server-side pagination - just return the data from API directly
    return detailRows;
  }, [detailRows]);

  return (
    <TooltipProvider>
      <motion.main
        className="flex flex-col gap-6 m-4 pt-0 pb-6 min-h-screen via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Elegant Header */}
        <motion.div
          className="grid grid-cols-12 gap-4 p-6 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg shadow-lg border border-slate-200/50 dark:border-slate-700/50"
          variants={itemVariants}
        >
          {/* Phần Thống kê giao dịch - chiếm 4/12 cột */}
          <div className="col-span-4 flex items-center gap-4">
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
                Thống kê giao dịch và khách hàng của bạn theo ngày, tuần hoặc
                quý.
              </p>
            </div>
          </div>

          {/* Phần bộ lọc - chiếm 8/12 cột */}
          <div className="col-span-8 flex items-center justify-end gap-3">
            <div className="max-w-xs">
              <DateRangePicker
                locale="vi"
                initialDateRange={range}
                onUpdate={(r) => setRange(r.range || range)}
                align="start"
                className="p-5.5"
                numberOfMonths={2}
              />
            </div>
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(v) => v && setPeriod(v as Period)}
              className="rounded-lg border bg-white/80 dark:bg-slate-800/80 p-1 shadow-sm backdrop-blur-sm"
            >
              <ToggleGroupItem
                value="day"
                className="rounded-md text-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Ngày
              </ToggleGroupItem>
              <ToggleGroupItem
                value="week"
                className="rounded-md text-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Tuần
              </ToggleGroupItem>
              <ToggleGroupItem
                value="quarter"
                className="rounded-md text-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Quý
              </ToggleGroupItem>
            </ToggleGroup>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg shadow-sm py-5.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
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
                  className="cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4 mr-2" />
                    Đặt lại khoảng ngày
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Elegant Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div variants={itemVariants}>
            <TabsList className="mb-3 px-1 py-8 rounded-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg shadow-md border border-slate-200/50 dark:border-slate-700/50">
              <TabsTrigger
                value="transactions"
                className="rounded-md px-10 py-6 cursor-pointer data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Thống kê giao dịch
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="rounded-md px-10 py-6 cursor-pointer data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Khách hàng
              </TabsTrigger>
              {shouldShowEmployeeTab && (
                <TabsTrigger
                  value="employees"
                  className="rounded-md px-10 py-6 cursor-pointer data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Nhân viên
                </TabsTrigger>
              )}
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
                          className={`grid grid-cols-1 md:grid-cols-2 ${
                            visibleSeries.pending
                              ? "xl:grid-cols-5"
                              : "xl:grid-cols-4"
                          } gap-6`}
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
                            {/* ✅ SỬA: Dùng data từ API thay vì summary.gdExpiredToday */}
                            <MiniKPI
                              label="Hết hạn hôm nay"
                              value={expiredStats?.expiredToday || 0}
                              color="red"
                              icon={<Clock className="w-4 h-4" />}
                              isAlert={(expiredStats?.expiredToday || 0) > 0}
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
                      Thống kê theo khách hàng ({customerStats.length} khách hàng)
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
                          {/* Hiển thị toàn bộ khách hàng với pagination */}
                          {customerStats
                            .slice()
                            .sort((a, b) => b.total - a.total)
                            .slice((customerPage - 1) * customerPageSize, customerPage * customerPageSize)
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
                                        width: `${
                                          (c.total /
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

                          {/* Pagination cho khách hàng */}
                          {customerStats.length > customerPageSize && (
                            <div className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-slate-800/80 rounded-lg">
                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                Hiển thị {((customerPage - 1) * customerPageSize) + 1} - {Math.min(customerPage * customerPageSize, customerStats.length)} trong tổng số {customerStats.length} khách hàng
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCustomerPage(Math.max(1, customerPage - 1))}
                                  disabled={customerPage <= 1}
                                  className="rounded-md"
                                >
                                  ← Trước
                                </Button>
                                <span className="text-sm font-medium px-3 py-1 bg-white/80 dark:bg-slate-800/80 rounded-md">
                                  {customerPage} / {Math.ceil(customerStats.length / customerPageSize)}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCustomerPage(Math.min(Math.ceil(customerStats.length / customerPageSize), customerPage + 1))}
                                  disabled={customerPage >= Math.ceil(customerStats.length / customerPageSize)}
                                  className="rounded-md"
                                >
                                  Sau →
                                </Button>
                              </div>
                            </div>
                          )}
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
                        className="space-x-3"
                      >
                        <ToggleGroupItem
                          value="orders"
                          className="px-4 py-2 rounded-md text-sm cursor-pointer"
                        >
                          Đơn
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="customers"
                          className="px-4 py-2 rounded-md text-sm cursor-pointer"
                        >
                          KH
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="conversion"
                          className="px-4 py-2 rounded-md text-sm cursor-pointer"
                        >
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
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {pagedEmployeeStats.map((e) => (
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

                        {/* Pagination controls for employee list */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEmployeePage((p) => Math.max(1, p - 1))}
                            disabled={employeePage <= 1}
                          >
                            ← Trước
                          </Button>
                          <div className="text-sm">
                            Trang {employeePage} / {Math.max(1, Math.ceil(employeeStats.length / employeePageSize))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEmployeePage((p) => Math.min(Math.ceil(employeeStats.length / employeePageSize), p + 1))}
                            disabled={employeePage >= Math.ceil(employeeStats.length / employeePageSize)}
                          >
                            Sau →
                          </Button>
                        </div>
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
          <DialogContent className="!max-w-none w-[75vw] h-[80vh] !max-h-[80vh] overflow-hidden flex flex-col p-0 rounded-xl shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0">
            {/* Animate header separately so body can scroll */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 flex-shrink-0"
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
            </motion.div>

            {/* Scrollable body */}
            <div className="p-6 overflow-auto flex-1">
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
                          📦 Sản Phẩm
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
                            <td className="p-3 text-sm">
                              {od.product?.name || "--"}
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
                      {Math.min((detailPagination.page - 1) * detailPagination.limit + 1, detailPagination.total)}
                    </span>{" "}
                    -
                    <span className="font-semibold">
                      {Math.min(detailPagination.page * detailPagination.limit, detailPagination.total)}
                    </span>{" "}
                    trong tổng số
                    <span className="font-semibold">
                      {" "}
                      {detailPagination.total}
                    </span>{" "}
                    giao dịch
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, detailPagination.page - 1))}
                      disabled={detailPagination.page <= 1}
                      className="rounded-md"
                    >
                      ← Trước
                    </Button>
                    <span className="text-sm font-medium px-3 py-1 bg-white/80 dark:bg-slate-800/80 rounded-md">
                      {detailPagination.page} /{" "}
                      {Math.max(1, Math.ceil(detailPagination.total / detailPagination.limit))}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(
                          Math.min(
                            Math.ceil(detailPagination.total / detailPagination.limit),
                            detailPagination.page + 1
                          )
                        )
                      }
                      disabled={detailPagination.page >= Math.ceil(detailPagination.total / detailPagination.limit)}
                      className="rounded-md"
                    >
                      Sau →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.main>
    </TooltipProvider>
  );
}
