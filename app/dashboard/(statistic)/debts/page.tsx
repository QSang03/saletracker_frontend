"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import StatsCard from "@/components/debt/debt-statistic/StatsCard";
import { FilterSection } from "@/components/debt/debt-statistic/FilterSection";
import ChartSection, {
  chartConfig,
} from "@/components/debt/debt-statistic/ChartSection";
import DebtModal from "@/components/debt/debt-statistic/DebtModal";
import AgingChart from "@/components/debt/debt-statistic/AgingChart";
import EmployeePerformanceChart from "@/components/debt/debt-statistic/EmployeePerformanceChart";
import { Debt } from "@/types";
import { DateRange } from "react-day-picker";
import { 
  debtStatisticsAPI, 
  DebtStatsOverview, 
  AgingData, 
  TrendData,
  EmployeePerformance,
  StatisticsFilters,
  DebtListFilters 
} from "@/lib/debt-statistics-api";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { PDynamic } from "@/components/common/PDynamic";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounce } from "@/hooks/useDebounce";

interface ChartDataItem {
  name: string;
  paid: number;
  pay_later: number;
  no_info: number;
}

interface PieDataItem {
  name: string;
  value: number;
  fill: string;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-96 w-full">
          <h2 className="text-xl font-bold text-red-600 mb-4">Có lỗi xảy ra</h2>
          <p className="text-gray-600 mb-4">Vui lòng tải lại trang</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Circuit breaker for API calls
const useCircuitBreaker = () => {
  const attempts = useRef(0);
  const lastFailure = useRef<number>(0);
  const isOpen = useRef(false);
  const isCallInProgress = useRef(false);

  const call = useCallback(async (fn: () => Promise<void>) => {
    const now = Date.now();
    
    // Prevent simultaneous calls
    if (isCallInProgress.current) {
      return;
    }
    
    // Circuit is open and cooling down
    if (isOpen.current && now - lastFailure.current < 10000) {
      return;
    }

    // Reset circuit if cooldown period passed
    if (isOpen.current && now - lastFailure.current >= 10000) {
      isOpen.current = false;
      attempts.current = 0;
    }

    isCallInProgress.current = true;
    
    try {
      await fn();
      attempts.current = 0; // Reset on success
    } catch (error) {
      attempts.current += 1;
      lastFailure.current = now;
      
      if (attempts.current >= 3) {
        isOpen.current = true;
      }
      throw error;
    } finally {
      isCallInProgress.current = false;
    }
  }, []);

  return { call, isOpen: isOpen.current, isCallInProgress: isCallInProgress.current };
};

// Main Dashboard Component
const DebtStatisticsDashboard: React.FC = () => {
  const { call: callWithCircuitBreaker, isCallInProgress } = useCircuitBreaker();
  
  // Check permissions for debt statistics
  const { 
    canReadDepartment, 
    user 
  } = useDynamicPermission();

  // Check if user has read access to debt department
  const canAccessDebtStatistics = canReadDepartment('cong-no');

  const [chartType, setChartTypeState] = useState<'bar' | 'line' | 'radial'>("bar");
  const [timeRange, setTimeRangeState] = React.useState<"week" | "month" | "quarter">("week");
  
  // Initialize date range with stable values
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      from: weekAgo,
      to: today,
    };
  });
  
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDebts, setSelectedDebts] = useState<Debt[]>([]);
  const [loadingModalData, setLoadingModalData] = useState<boolean>(false);

  // Thêm refs cho auto-refresh và component management
  const isComponentMounted = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Memoized setters to prevent unnecessary re-renders
  const setChartType = useCallback((type: 'bar' | 'line' | 'radial') => {
    setChartTypeState(type);
  }, []);

  const setTimeRange = useCallback((range: "week" | "month" | "quarter") => {
    setTimeRangeState(range);
  }, []);

  // API Data States
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DebtStatsOverview | null>(null);
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeePerformance[]>([]);

  // Use ref to track if initial fetch is done and prevent duplicate calls
  const initialFetchDone = useRef(false);
  const lastFetchParams = useRef<string>('');
  const fetchingRef = useRef(false);

  // Stable filters for memoization with debounce
  const filters = useMemo(() => {
    const apiFilters: StatisticsFilters = {};
    if (range?.from) apiFilters.from = range.from.toISOString().split('T')[0];
    if (range?.to) apiFilters.to = range.to.toISOString().split('T')[0];
    return apiFilters;
  }, [range?.from?.getTime(), range?.to?.getTime()]);

  // Debounce filters to prevent too many API calls - giảm từ 500ms xuống 300ms
  const debouncedFilters = useDebounce(filters, 300);

  // Fetch data function with proper memoization - cải thiện
  const fetchData = useCallback(async (silent = false) => {
    // Prevent multiple simultaneous calls
    if (!isComponentMounted.current || fetchingRef.current || isCallInProgress) {
      return;
    }

    try {
      fetchingRef.current = true;
      await callWithCircuitBreaker(async () => {
        const paramsKey = JSON.stringify(debouncedFilters);
        if (lastFetchParams.current === paramsKey && initialFetchDone.current && silent) {
          return;
        }

        if (!isComponentMounted.current) return;

        if (!silent) setLoading(true);
        lastFetchParams.current = paramsKey;

        const [overviewRes, agingRes, trendsRes, employeeRes] = await Promise.all([
          debtStatisticsAPI.getOverview(debouncedFilters),
          debtStatisticsAPI.getAgingAnalysis(debouncedFilters),
          debtStatisticsAPI.getTrends(debouncedFilters),
          debtStatisticsAPI.getEmployeePerformance(debouncedFilters),
        ]);

        if (isComponentMounted.current) {
          setOverview(overviewRes);
          setAgingData(agingRes);
          setTrendData(trendsRes);
          setEmployeeData(employeeRes);
          initialFetchDone.current = true;
        }
      });
    } catch (error) {
      if (isComponentMounted.current) {
        setSelectedDebts([]);
      }
    } finally {
      fetchingRef.current = false;
      if (isComponentMounted.current && !silent) {
        setLoading(false);
      }
    }
  }, [debouncedFilters, callWithCircuitBreaker, isCallInProgress]);

  useEffect(() => {
    const startAutoRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setInterval(() => {
        if (isComponentMounted.current && initialFetchDone.current && !document.hidden) {
          fetchData(true); // silent refresh only when tab is visible
        }
      }, 60000); // 60 seconds - reduced frequency
    };

    if (initialFetchDone.current) {
      startAutoRefresh();
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && initialFetchDone.current && isComponentMounted.current) {
        fetchData(true); // refresh when tab becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, initialFetchDone.current]);

  // Single effect for initial data loading only
  useEffect(() => {
    if (!initialFetchDone.current && isComponentMounted.current) {
      fetchData();
    }
  }, []);

  // Separate effect for filter changes - now using debounced filters
  useEffect(() => {
    if (!initialFetchDone.current) return;

    if (isComponentMounted.current) {
      fetchData();
    }
  }, [debouncedFilters, fetchData]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Transform API data for existing components
  const chartData: ChartDataItem[] = useMemo(() => {
    return trendData.map(item => ({
      name: item.name,
      paid: item.paid,
      pay_later: item.pay_later,
      no_info: item.no_info,
    }));
  }, [trendData]);

  const pieData: PieDataItem[] = useMemo(() => {
    if (!overview) return [];
    return [
      {
        name: chartConfig.paid.label as string,
        value: overview.paid,
        fill: chartConfig.paid.color,
      },
      {
        name: chartConfig.promised.label as string,
        value: overview.payLater,
        fill: chartConfig.promised.color,
      },
      {
        name: chartConfig.no_info.label as string,
        value: overview.noInfo,
        fill: chartConfig.no_info.color,
      },
    ];
  }, [overview]);

  // Fetch debts for modal based on category and current filters
  const fetchDebtsForModal = useCallback(async (category: string) => {
    if (!isComponentMounted.current) return;

    setLoadingModalData(true);
    try {
      // First try to get all debts and filter by status on frontend
      const modalFilters: DebtListFilters = {
        ...debouncedFilters,
        limit: 1000 // Get more to filter on frontend
      };

      const response = await debtStatisticsAPI.getDetailedDebts(modalFilters);
      
      // Filter by category on frontend based on debt properties
      let filteredData: Debt[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        // Sample first few debts to understand structure
        response.data.slice(0, 5).forEach((debt: any, index: number) => {
          // Debt structure analysis removed for performance
        });
        
        // Count by categories for verification
        let paidCount = 0, promisedCount = 0, noInfoCount = 0;
        response.data.forEach((debt: any) => {
          const remaining = Number(debt.remaining) || 0;
          const payLater = debt.pay_later;
          
          if (remaining < 1000) {
            paidCount++;
          } else if (payLater && payLater.trim && payLater.trim() !== '') {
            promisedCount++;
          } else {
            noInfoCount++;
          }
        });
        
        filteredData = response.data.filter((debt: any) => {
          // Get relevant fields with proper type checking
          const remaining = Number(debt.remaining) || 0;
          const totalAmount = Number(debt.total_amount) || 0;
          const payLater = debt.pay_later; // Could be date string, null, or undefined
          const billCode = debt.bill_code || debt.invoice_code;
          
          switch (category) {
            case 'paid':
              // Đã thanh toán - remaining = 0 (hoặc < 1000 để account cho rounding)
              const isPaid = remaining < 1000; // Small threshold for rounding errors
              return isPaid;
              
            case 'promised':
            case 'pay_later':
              // Khách hẹn trả - có pay_later date VÀ remaining > 0
              const hasPayLaterDate = payLater && payLater.trim && payLater.trim() !== '';
              const hasDebt = remaining >= 1000;
              const isPromised = hasPayLaterDate && hasDebt;
              return isPromised;
              
            case 'no_info':
              // Chưa có thông tin - KHÔNG có pay_later date VÀ remaining > 0
              const hasNoPayLaterDate = !payLater || (typeof payLater === 'string' && payLater.trim() === '');
              const hasDebtNoInfo = remaining >= 1000;
              const isNoInfo = hasNoPayLaterDate && hasDebtNoInfo;
              return isNoInfo;
              
            default:
              return true;
          }
        });
        
      }
      
      if (isComponentMounted.current) {
        setSelectedDebts(filteredData);
      }
    } catch (error) {
      if (isComponentMounted.current) {
        setSelectedDebts([]);
      }
    } finally {
      if (isComponentMounted.current) {
        setLoadingModalData(false);
      }
    }
  }, [debouncedFilters]);

  const handleChartClick = useCallback((data: unknown, category: string) => {
    setSelectedCategory(category);
    setModalOpen(true);
    fetchDebtsForModal(category);
  }, [fetchDebtsForModal]);

  const getCategoryDisplayName = useCallback((category: string): string => {
    const categoryMap: Record<string, string> = {
      'paid': 'Đã thanh toán',
      'promised': 'Khách hẹn trả',
      'pay_later': 'Khách hẹn trả',
      'no_info': 'Chưa có thông tin'
    };
    return categoryMap[category] || category;
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }, []);

  if (!user) {
    return (
      <main className="flex flex-col gap-4 pt-0 pb-0">
        <div className="bg-muted text-muted-foreground rounded-xl md:min-h-min">
          <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size={32} />
              <span className="ml-2">Đang kiểm tra quyền truy cập...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!canAccessDebtStatistics) {
    return (
      <main className="flex flex-col gap-4 pt-0 pb-0">
        <div className="bg-muted text-muted-foreground rounded-xl md:min-h-min">
          <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="text-6xl">🚫</div>
              <div className="text-xl font-semibold text-red-600">Không có quyền truy cập</div>
              <div className="text-gray-600">Bạn không có quyền xem thống kê công nợ</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-4 pt-0 pb-0">
        <div className="bg-muted text-muted-foreground rounded-xl md:min-h-min">
          <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Thống kê công nợ
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Đang tải dữ liệu...
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 pt-0 pb-0">
      <div className="bg-muted text-muted-foreground rounded-xl md:min-h-min">
        <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Thống kê công nợ
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Theo dõi và phân tích tình trạng công nợ khách hàng
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatsCard
              title="Tổng số phiếu nợ"
              value={overview?.total || 0}
              icon={Users}
              color="text-blue-600"
              trend={5}
              description="Tổng phiếu trong kỳ"
            />
            <StatsCard
              title="Đã thanh toán"
              value={overview?.paid || 0}
              icon={CheckCircle}
              color="text-green-600"
              trend={12}
              description={formatCurrency(overview?.collectedAmount || 0)}
            />
            <StatsCard
              title="Khách hẹn trả"
              value={overview?.payLater || 0}
              icon={Clock}
              color="text-yellow-600"
              trend={-3}
              description="Có cam kết thanh toán"
            />
            <StatsCard
              title="Chưa có thông tin"
              value={overview?.noInfo || 0}
              icon={AlertCircle}
              color="text-gray-600"
              trend={0}
              description="Chưa có phản hồi"
            />
          </div>

          {/* Filters */}
          <FilterSection
            range={range}
            setRange={setRange}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />

          {/* Advanced Analytics Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="aging">Phân tích nợ quá hạn</TabsTrigger>
              <TabsTrigger value="performance">Hiệu suất nhân viên</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ChartSection
                chartType={chartType}
                setChartType={setChartType}
                chartData={chartData.map(item => ({
                  ...item,
                  promised: item.pay_later, // Map pay_later to promised for compatibility
                }))}
                pieData={pieData}
                onChartClick={handleChartClick}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="aging">
              <AgingChart
                data={agingData}
                loading={loading}
                onBarClick={(data) => {
                  // You can implement drill-down here
                }}
              />
            </TabsContent>

            <TabsContent value="performance">
              <EmployeePerformanceChart
                data={employeeData}
                loading={loading}
                onEmployeeClick={(employee) => {
                  // You can implement drill-down here
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Modal */}
          <DebtModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedDebts([]);
              setSelectedCategory("");
            }}
            category={getCategoryDisplayName(selectedCategory)}
            debts={selectedDebts}
            loading={loadingModalData}
          />
        </div>
      </div>
    </main>
  );
};

// Safe wrapper component to prevent crashes
const SafeDebtStatisticsDashboard: React.FC = () => {
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (errorCount > 3) {
      setHasError(true);
    }
  }, [errorCount]);

  const handleError = useCallback(() => {
    setErrorCount(prev => prev + 1);
  }, []);

  if (hasError) {
    return (
      <main className="flex flex-col gap-4 pt-0 pb-0">
        <div className="bg-muted text-muted-foreground rounded-xl md:min-h-min">
          <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Có lỗi xảy ra
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Không thể tải trang thống kê công nợ. Vui lòng thử lại sau.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tải lại trang
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  try {
    return <DebtStatisticsDashboard />;
  } catch (error) {
    handleError();
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Đang khắc phục lỗi...</h2>
          <p className="text-gray-600 mt-2">Hệ thống sẽ tự động thử lại</p>
        </div>
      </div>
    );
  }
};

export default function App() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thống kê công nợ...</p>
        </div>
      </div>
    }>
      <ErrorBoundary>
        <SafeDebtStatisticsDashboard />
      </ErrorBoundary>
    </React.Suspense>
  );
}
