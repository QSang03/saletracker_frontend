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
  DebtListFilters,
  DebtListResponse,
  getDetailedDebtsByDate
} from "@/lib/debt-statistics-api";
import type { PayLaterDelayItem, ContactResponseItem, ContactDetailItem } from "@/lib/debt-statistics-api";
import { api } from "@/lib/api";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { useDebounce } from "@/hooks/useDebounce";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart as RBarChart, Bar as RBar, XAxis as RXAxis, YAxis as RYAxis, CartesianGrid as RCartesianGrid, ResponsiveContainer as RResponsiveContainer, Tooltip as RTooltip } from "recharts";

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
    
    // Circuit is open and cooling down - reduce cooldown from 10s to 3s
    if (isOpen.current && now - lastFailure.current < 3000) {
      return;
    }

    // Reset circuit if cooldown period passed - reduce from 10s to 3s
    if (isOpen.current && now - lastFailure.current >= 3000) {
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
      
      // Reduce from 3 attempts to 2 attempts
      if (attempts.current >= 2) {
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
  const [payLaterDelayData, setPayLaterDelayData] = useState<PayLaterDelayItem[]>([]);
  const [contactResponses, setContactResponses] = useState<ContactResponseItem[]>([]);

  // Contact details modal state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactModalTitle, setContactModalTitle] = useState<string>("");
  const [contactDetails, setContactDetails] = useState<ContactDetailItem[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactLimit, setContactLimit] = useState(50);
  const [contactTotal, setContactTotal] = useState(0);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("");

  // Use ref to track if initial fetch is done and prevent duplicate calls
  const initialFetchDone = useRef(false);
  const lastFetchParams = useRef<string>('');
  const fetchingRef = useRef(false);

  // Memoize expensive operations
  const filters = useMemo(() => {
    const apiFilters: StatisticsFilters = {};
    if (range?.from) apiFilters.from = range.from.toISOString().split('T')[0];
    if (range?.to) apiFilters.to = range.to.toISOString().split('T')[0];
    return apiFilters;
  }, [range?.from?.toDateString(), range?.to?.toDateString()]); // Use dateString instead of getTime for better performance

  // Debounce filters to prevent too many API calls
  const debouncedFilters = useDebounce(filters, 500); // Increase debounce to 500ms

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

        const [overviewRes, agingRes, trendsRes, employeeRes, payLaterRes, responsesRes] = await Promise.all([
          debtStatisticsAPI.getOverview(debouncedFilters),
          debtStatisticsAPI.getAgingAnalysis(debouncedFilters),
          debtStatisticsAPI.getTrends(debouncedFilters),
          debtStatisticsAPI.getEmployeePerformance(debouncedFilters),
          debtStatisticsAPI.getPayLaterDelay({ ...debouncedFilters, buckets: '7,14,30' }),
          debtStatisticsAPI.getContactResponses({ ...debouncedFilters, by: 'customer' }),
        ]);

        if (isComponentMounted.current) {
          console.log('🔍 [Dashboard] Setting aging data:', agingRes);
          setOverview(overviewRes);
          setAgingData(agingRes);
          setTrendData(trendsRes);
          setEmployeeData(employeeRes);
          setPayLaterDelayData(payLaterRes || []);
          setContactResponses(responsesRes || []);
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
    // Remove auto-refresh completely - causes performance issues
    // Only manual refresh on mount and filter changes
  }, []);

  // Single effect for initial data loading only
  useEffect(() => {
    if (!initialFetchDone.current && isComponentMounted.current) {
      fetchData();
    }
  }, []); // Empty dependency array - only run on mount

  // Separate effect for filter changes - now using debounced filters
  useEffect(() => {
    if (!initialFetchDone.current) return;

    if (isComponentMounted.current) {
      fetchData();
    }
  }, [debouncedFilters]); // Remove fetchData from deps to prevent infinite loops

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Transform API data for existing components
  const chartData: ChartDataItem[] = useMemo(() => {
    
    return trendData.map((item, index) => {
      // Ensure name is a valid date string
      let displayName = item.name;
      
      // If item has a date field, prefer that over name
      if (item.date) {
        displayName = item.date;
      }
      
      // Try to parse and format the date to ensure consistency
      try {
        const date = new Date(displayName);
        if (!isNaN(date.getTime())) {
          // Format as YYYY-MM-DD for consistency
          displayName = date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn('⚠️ Could not parse date for chart item:', { item, displayName });
        // Fallback to index-based naming if date parsing fails
        displayName = `Day ${index + 1}`;
      }
      
      const result = {
        name: displayName,
        paid: item.paid,
        pay_later: item.pay_later,
        no_info: item.no_info,
      };
      return result;
    });
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

  // Fetch debts for modal - separate from main circuit breaker to avoid blocking
  const fetchDebtsForModal = useCallback(async (category: string, dateFromChart?: string) => {
    
    if (!isComponentMounted.current) {
      return;
    }
    setLoadingModalData(true);
    try {
      // Don't use circuit breaker for modal - it should work independently
      const modalFilters: DebtListFilters = {
        ...debouncedFilters,
        limit: 1000 // Get reasonable amount for modal
      };

      // Default to today
      let targetDate = new Date();

      // If dateFromChart is provided, use it instead of current date filters
      if (dateFromChart) {
        
        try {
          // Handle different date formats that might come from chart
          let chartDate: Date;
          
          // Check if it's already a valid date string
          if (typeof dateFromChart === 'string') {
            // Try parsing as-is first
            chartDate = new Date(dateFromChart);
            
            // If invalid, try to parse as DD/MM/YYYY format (common in Vietnamese format)
            if (isNaN(chartDate.getTime()) && dateFromChart.includes('/')) {
              const parts = dateFromChart.split('/');
              if (parts.length === 3) {
                // Assume DD/MM/YYYY format and convert to YYYY-MM-DD
                const [day, month, year] = parts;
                chartDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
              }
            }
            
            // If still invalid, try other common formats
            if (isNaN(chartDate.getTime())) {
              console.warn('⚠️ Could not parse dateFromChart:', dateFromChart);
              chartDate = new Date(); // Fallback to today
            }
          } else {
            chartDate = new Date(); // Fallback to today
          }
          
          targetDate = chartDate;
          
          const dateStr = chartDate.toISOString().split('T')[0];
          modalFilters.from = dateStr;
          modalFilters.to = dateStr;
        } catch (error) {
          console.error('❌ Error parsing dateFromChart:', error);
        }
      }
      
      // Use the smart logic to get data from appropriate source
      const response = await getDetailedDebtsByDate(modalFilters, category, targetDate);
      
      // Process the response data
      let filteredData: Debt[] = [];
      if (response && response.data) {
        filteredData = response.data;
        console.log('📊 [fetchDebtsForModal] Got data:', filteredData.length, 'items');
      } else {
        console.warn('⚠️ [fetchDebtsForModal] No data in response:', response);
      }
      
      if (isComponentMounted.current) {
        setSelectedDebts(filteredData);
      }
    } catch (error) {
      console.error('❌ Error in fetchDebtsForModal:', error);
      if (isComponentMounted.current) {
        setSelectedDebts([]);
      }
    } finally {
      if (isComponentMounted.current) {
        setLoadingModalData(false);
      }
    }
  }, [debouncedFilters]);

  const handleChartClick = useCallback((data: any, category: string) => {
    
    // Extract date from chart data - data could be from Bar or RadialBar
    let dateFromChart: string | undefined;
    
    if (data && data.payload) {
      // For Bar chart, data has payload with name (date)
      dateFromChart = data.payload.name;
    } else if (data && data.name) {
      // For RadialBar chart, data has name directly
      dateFromChart = data.name;
    }
    
    // Additional fallback checks
    if (!dateFromChart && data) {
      // Try other possible date fields
      const possibleDateFields = ['date', 'label', 'x', 'key'];
      for (const field of possibleDateFields) {
        if (data[field]) {
          dateFromChart = data[field];
          break;
        }
      }
    }
    
    setSelectedCategory(category);
    setModalOpen(true);
    fetchDebtsForModal(category, dateFromChart);
  }, [fetchDebtsForModal]);

  // Helper: parse bucket label like "1-7" or ">30" into min/max days
  const parseBucketLabel = (label: string): { minDays?: number; maxDays?: number } => {
    if (!label) return {};
    const trimmed = label.trim();
    if (trimmed.startsWith('>')) {
      const n = parseInt(trimmed.replace('>', '').trim(), 10);
      if (!Number.isNaN(n)) return { minDays: n + 1 };
      return {};
    }
    const parts = trimmed.split('-');
    if (parts.length === 2) {
      const a = parseInt(parts[0].trim(), 10);
      const b = parseInt(parts[1].trim(), 10);
      return {
        minDays: Number.isNaN(a) ? undefined : a,
        maxDays: Number.isNaN(b) ? undefined : b,
      };
    }
    return {};
  };

  // Drilldown for PayLater buckets
  const handlePayLaterBucketClick = useCallback(async (bucket: { range?: string; label?: string }) => {
    setSelectedCategory('pay_later');
    setModalOpen(true);
    setLoadingModalData(true);
    try {
      const lbl = bucket.range || bucket.label || '';
      const { minDays, maxDays } = parseBucketLabel(lbl);
      const now = new Date();
      const fromDate = range?.from ? range.from : now;
      const toDate = range?.to ? range.to : now;
      const todayStr = new Date().toISOString().split('T')[0];
      const fromStr = (fromDate as Date).toISOString().split('T')[0];
      const toStr = (toDate as Date).toISOString().split('T')[0];

      // Prefer today if inside range
      const tryDates: string[] = [];
      if (fromStr <= todayStr && toStr >= todayStr) {
        tryDates.push(todayStr);
      }
      // Also try the selected 'to' date (range end)
      if (!tryDates.includes(toStr)) tryDates.push(toStr);
      // Finally try the 'from' date as a fallback
      if (!tryDates.includes(fromStr)) tryDates.push(fromStr);

      let debts: Debt[] = [];
      for (const dateStr of tryDates) {
        const resp = await api.get('/debt-statistics/detailed', {
          params: {
            date: dateStr,
            mode: 'payLater',
            minDays,
            maxDays,
            page: 1,
            limit: 1000,
          }
        });
        const respData = resp.data;
        debts = Array.isArray(respData?.data) ? respData.data : (Array.isArray(respData) ? respData : []);
        if (debts.length > 0) break;
      }
      setSelectedDebts(debts);
    } catch (e) {
      setSelectedDebts([]);
    } finally {
      setLoadingModalData(false);
    }
  }, [range]);

  // Contact details modal loader
  const loadContactDetails = useCallback(async (status: string, pageNum: number, limitNum: number) => {
    setContactLoading(true);
    try {
      const toDate = range?.to ? range.to : new Date();
      const dateStr = (toDate as Date).toISOString().split('T')[0];
      const res = await debtStatisticsAPI.getContactDetails({ date: dateStr, responseStatus: status, page: pageNum, limit: limitNum });
      setContactDetails(res.data || []);
      setContactTotal(res.total || 0);
      setContactPage(res.page || pageNum);
      setContactLimit(res.limit || limitNum);
    } catch {
      setContactDetails([]);
      setContactTotal(0);
    } finally {
      setContactLoading(false);
    }
  }, [range]);

  const handleResponseBarClick = useCallback((item: ContactResponseItem) => {
    const status = item.status;
    setContactStatusFilter(status);
    setContactModalTitle(`Khách theo trạng thái: ${status}`);
    setContactModalOpen(true);
    loadContactDetails(status, 1, contactLimit);
  }, [contactLimit, loadContactDetails]);

  const getCategoryDisplayName = useCallback((category: string): string => {
    const categoryMap: Record<string, string> = {
      'paid': 'Đã thanh toán',
      'pay_later': 'Khách hẹn trả',
      'no_information_available': 'Chưa có thông tin',
      'aging': 'Phân tích độ tuổi nợ'
    };
    return categoryMap[category] || category;
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }, []);

  // Helper function to check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function to get detailed debts based on date
  const getDetailedDebtsByDate = async (
    filters: DebtListFilters, 
    category: string, 
    targetDate: Date
  ): Promise<DebtListResponse> => {
    const dateStr = targetDate.toISOString().split('T')[0];

    // Map frontend categories to backend parameters for both paths
    const baseParams: any = {
      date: dateStr,
      page: filters.page || 1,
      limit: filters.limit || 1000
    };

    // Map category to appropriate API parameters
    switch (category) {
      case 'paid':
        baseParams.status = 'paid';
        break;
      case 'promised':
      case 'pay_later':
        baseParams.status = 'pay_later';
        break;
      case 'no_info':
      case 'no_information_available':
        baseParams.status = 'no_information_available';
        break;
      default:
        console.log('🔍 No specific filter for category:', category);
    }

    // Always use direct API call for consistency
    const response = await api.get('/debt-statistics/detailed', {
      params: baseParams
    });

    // Handle different response structures
    if (response.data) {
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data;
      }
      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.data.length,
          page: 1,
          limit: response.data.length,
          totalPages: 1
        };
      }
    }

    return {
      data: [],
      total: 0,
      page: 1,
      limit: filters.limit || 1000,
      totalPages: 0
    };
  };

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="aging">Phân tích nợ quá hạn</TabsTrigger>
              <TabsTrigger value="promise_not_met">Phân tích trễ hẹn</TabsTrigger>
              <TabsTrigger value="customer_responded">Phân tích khách hàng đã trả lời</TabsTrigger>
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
                  // Map aging range label to overdue drill‑down params
                  const label = (data as any)?.range || (data as any)?.label || (data as any)?.name || '';
                  const parse = (lbl: string) => {
                    const t = lbl.trim();
                    if (t.startsWith('>')) {
                      const n = parseInt(t.replace('>', '').replace(' ngày', '').trim(), 10);
                      return { minDays: (Number.isNaN(n) ? undefined : n + 1), maxDays: undefined };
                    }
                    const cleaned = t.replace(' ngày', '');
                    const parts = cleaned.split('-');
                    if (parts.length === 2) {
                      const a = parseInt(parts[0].trim(), 10);
                      const b = parseInt(parts[1].trim(), 10);
                      return { minDays: Number.isNaN(a) ? undefined : a, maxDays: Number.isNaN(b) ? undefined : b };
                    }
                    return {} as any;
                  };
                  const { minDays, maxDays } = parse(label);

                  setSelectedCategory('aging');
                  setModalOpen(true);
                  setLoadingModalData(true);
                  (async () => {
                    try {
                      const now = new Date();
                      const fromDate = range?.from ? range.from : now;
                      const toDate = range?.to ? range.to : now;
                      const todayStr = new Date().toISOString().split('T')[0];
                      const fromStr = (fromDate as Date).toISOString().split('T')[0];
                      const toStr = (toDate as Date).toISOString().split('T')[0];
                      // Use range to match chart summary scope to avoid count/detail mismatch
                      const resp = await api.get('/debt-statistics/detailed', {
                        params: {
                          from: fromStr,
                          to: toStr,
                          mode: 'overdue',
                          minDays,
                          maxDays,
                          page: 1,
                          limit: 1000,
                        }
                      });
                      const respData = resp.data;
                      const debts: Debt[] = Array.isArray(respData?.data) ? respData.data : (Array.isArray(respData) ? respData : []);
                      setSelectedDebts(debts);
                    } catch {
                      setSelectedDebts([]);
                    } finally {
                      setLoadingModalData(false);
                    }
                  })();
                }}
              />
            </TabsContent>

            {/* Phân tích trễ hẹn */}
            <TabsContent value="promise_not_met">
              <AgingChart
                data={(payLaterDelayData || []).map((i) => ({ count: i.count, amount: i.amount, label: i.range, range: i.range }))}
                loading={loading}
                onBarClick={(data) => handlePayLaterBucketClick(data)}
              />
            </TabsContent>

            {/* Phân tích khách hàng đã trả lời */}
            <TabsContent value="customer_responded">
              <div className="p-4">
                <div className="h-80 w-full">
                  <RResponsiveContainer width="100%" height="100%">
                    <RBarChart data={contactResponses} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                      <RCartesianGrid strokeDasharray="3 3" vertical={false} />
                      <RXAxis dataKey="status" angle={-30} textAnchor="end" height={60} />
                      <RYAxis />
                      <RTooltip formatter={(value: any) => [value, 'Số KH']} />
                      <RBar dataKey="customers" fill="#3b82f6" onClick={(d: any) => d && d.payload && handleResponseBarClick(d.payload)} className="cursor-pointer" />
                    </RBarChart>
                  </RResponsiveContainer>
                </div>
              </div>
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

          {/* Contact Details Modal */}
          <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
            <DialogContent className="!max-w-3xl">
              <DialogHeader>
                <DialogTitle>{contactModalTitle}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                {contactLoading ? (
                  <div className="py-12 text-center text-muted-foreground">Đang tải...</div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã KH</TableHead>
                          <TableHead>Tên KH</TableHead>
                          <TableHead>Mã NV</TableHead>
                          <TableHead>Thời điểm gần nhất</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contactDetails.map((c, idx) => (
                          <TableRow key={`${c.customer_code}-${idx}`}>
                            <TableCell>{c.customer_code}</TableCell>
                            <TableCell>{c.customer_name || '-'}</TableCell>
                            <TableCell>{c.employee_code_raw || '-'}</TableCell>
                            <TableCell>{c.latest_time ? new Date(c.latest_time).toLocaleString('vi-VN') : '-'}</TableCell>
                          </TableRow>
                        ))}
                        {contactDetails.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Không có dữ liệu</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">Tổng: {contactTotal}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={contactPage <= 1} onClick={() => loadContactDetails(contactStatusFilter, 1, contactLimit)}>Đầu</Button>
                  <Button variant="outline" size="sm" disabled={contactPage <= 1} onClick={() => loadContactDetails(contactStatusFilter, contactPage - 1, contactLimit)}>Trước</Button>
                  <span className="text-sm">Trang {contactPage} / {Math.max(1, Math.ceil(contactTotal / contactLimit))}</span>
                  <Button variant="outline" size="sm" disabled={contactPage >= Math.ceil(contactTotal / contactLimit)} onClick={() => loadContactDetails(contactStatusFilter, contactPage + 1, contactLimit)}>Tiếp</Button>
                  <Button variant="outline" size="sm" disabled={contactPage >= Math.ceil(contactTotal / contactLimit)} onClick={() => loadContactDetails(contactStatusFilter, Math.ceil(contactTotal / contactLimit), contactLimit)}>Cuối</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
