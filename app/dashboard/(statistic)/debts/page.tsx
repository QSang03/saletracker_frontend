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
import { api } from "@/lib/api";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { useDebounce } from "@/hooks/useDebounce";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // Modal pagination states
  const [modalCurrentPage, setModalCurrentPage] = useState<number>(1);
  const [modalTotalCount, setModalTotalCount] = useState<number>(0);
  const [modalTotalPages, setModalTotalPages] = useState<number>(0);
  const [modalCurrentDate, setModalCurrentDate] = useState<string>("");
  const [modalCurrentCategory, setModalCurrentCategory] = useState<string>("");

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

  // Fetch ALL debts for modal with lazy loading - accurate statistics
  const fetchDebtsForModal = useCallback(async (category: string, dateFromChart?: string) => {
    
    if (!isComponentMounted.current) {
      return;
    }
    setLoadingModalData(true);
    try {
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
        } catch (error) {
          console.error('❌ Error parsing dateFromChart:', error);
        }
      }
      
      const modalFilters: DebtListFilters = {
        ...debouncedFilters
        // No limit - will fetch all data
      };
      
      const dateStr = targetDate.toISOString().split('T')[0];
      modalFilters.from = dateStr;
      modalFilters.to = dateStr;
      
      // Fetch ALL data for accurate statistics
      const response = await getAllDebtsByDate(modalFilters, category, targetDate);
      
      // Process the response data
      let filteredData: Debt[] = [];
      
      if (response && response.data) {
        filteredData = response.data;
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

  // Helper function to fetch ALL debts (for modal) - fetches all pages
  const getAllDebtsByDate = async (
    filters: DebtListFilters, 
    category: string, 
    targetDate: Date
  ): Promise<DebtListResponse> => {
    const dateStr = targetDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const fetchAllPages = async (endpoint: string, baseParams: any): Promise<any[]> => {
      
      const params = {
        ...baseParams,
        page: 1,
        limit: 100000, // Request large limit to get all data
        all: 'true' // Flag to backend to return all data
      };
      const response = await api.get(endpoint, { params });
      
      let allData: any[] = [];
      let total = 0;

      // Handle different response structures
      if (response.data) {
        if (response.data.data && Array.isArray(response.data.data)) {
          allData = response.data.data;
          total = response.data.total || allData.length;
        } else if (Array.isArray(response.data)) {
          allData = response.data;
          total = allData.length;
        }
      }
      // If we didn't get all data in one request, fall back to pagination
      if (allData.length < total && total > 0) {
        allData = [];
        let currentPage = 1;
        const pageSize = 1000;
        let hasMoreData = true;

        while (hasMoreData) {
          const paginatedParams = {
            ...baseParams,
            page: currentPage,
            limit: pageSize
          };
          
          const pageResponse = await api.get(endpoint, { params: paginatedParams });
          
          let pageData: any[] = [];

          if (pageResponse.data) {
            if (pageResponse.data.data && Array.isArray(pageResponse.data.data)) {
              pageData = pageResponse.data.data;
            } else if (Array.isArray(pageResponse.data)) {
              pageData = pageResponse.data;
            }
          }

          allData = [...allData, ...pageData];

          // Check if we have more data to fetch
          hasMoreData = pageData.length === pageSize && allData.length < total;
          
          if (hasMoreData) {
            currentPage++;
          }
        }
      }

      return allData;
    };

    // Prepare base parameters
    const baseParams: any = {
      date: dateStr
    };

    // Map category to status filter
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
        console.log('🔍 No specific status filter for category:', category);
    }

    let allData: any[] = [];
    
    if (dateStr === today) {
      
      const debtsParams: any = {
        from: dateStr,
        to: dateStr,
        all: 'true' // Flag to get all data
      };

      if (baseParams.status) {
        debtsParams.status = baseParams.status;
      }

      allData = await fetchAllPages('/debts', debtsParams);
    } else {
      allData = await fetchAllPages('/debt-statistics/detailed', baseParams);
    }

    return {
      data: allData,
      total: allData.length,
      page: 1,
      limit: allData.length,
      totalPages: 1
    };
  };

  // Handle modal pagination - simplified version
  const handleModalPageChange = useCallback(async (newPage: number) => {
  }, []);

  // Reset modal pagination when opening modal
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
    
    // Reset modal pagination when opening modal
    setModalCurrentPage(1);
    setModalTotalCount(0);
    setModalTotalPages(0);
    
    setSelectedCategory(category);
    setModalOpen(true);
    fetchDebtsForModal(category, dateFromChart); // Reset and load data
  }, [fetchDebtsForModal]);

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

  // Get statistics count only (without full data) - much faster
  const getStatisticsCount = async (
    category: string, 
    targetDate: Date
  ): Promise<number> => {
    const dateStr = targetDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const baseParams: any = {
      date: dateStr,
      page: 1,
      limit: 1 // Only need count, not actual data
    };

    // Map category to status filter
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
        console.log('🔍 No specific status filter for category:', category);
    }

    try {
      let response;
      
      if (dateStr === today) {
        // Current day - use debts endpoint
        const debtsParams: any = {
          from: dateStr,
          to: dateStr,
          page: 1,
          pageSize: 1 // Only need count
        };

        if (baseParams.status) {
          debtsParams.status = baseParams.status;
        }

        response = await api.get('/debts', { params: debtsParams });
      } else {
        // Past date - use debt-statistics endpoint
        response = await api.get('/debt-statistics/detailed', { params: baseParams });
      }

      // Extract total count from response
      if (response.data) {
        if (response.data.total !== undefined) {
          return response.data.total;
        }
        if (Array.isArray(response.data)) {
          return response.data.length;
        }
        if (response.data.data && response.data.data.length !== undefined) {
          return response.data.total || response.data.data.length;
        }
      }

      return 0;
    } catch (error) {
      console.error('❌ Error getting statistics count:', error);
      return 0;
    }
  };

  // Helper function to get detailed debts with pagination (for modal display)
  const getDetailedDebtsByDate = async (
    filters: DebtListFilters, 
    category: string, 
    targetDate: Date
  ): Promise<DebtListResponse> => {
    const dateStr = targetDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    // Prepare base parameters
    const baseParams: any = {
      date: dateStr,
      page: filters.page || 1,
      limit: filters.limit || 50 // Reasonable page size for modal
    };

    // Map category to status filter
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
        console.log('🔍 No specific status filter for cate gory:', category);
    }

    try {
      let response;
      
      if (dateStr === today) {
        
        const debtsParams: any = {
          from: dateStr,
          to: dateStr,
          page: baseParams.page,
          pageSize: baseParams.limit
        };

        if (baseParams.status) {
          debtsParams.status = baseParams.status;
        }

        response = await api.get('/debts', { params: debtsParams });
      } else {
        response = await api.get('/debt-statistics/detailed', { params: baseParams });
      }

      // Handle different response structures
      if (response.data) {
        if (response.data.data && Array.isArray(response.data.data)) {
          return {
            data: response.data.data,
            total: response.data.total || response.data.data.length,
            page: response.data.page || baseParams.page,
            limit: response.data.limit || baseParams.limit,
            totalPages: response.data.totalPages || Math.ceil((response.data.total || response.data.data.length) / baseParams.limit)
          };
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
        page: baseParams.page,
        limit: baseParams.limit,
        totalPages: 0
      };
    } catch (error) {
      console.error('❌ Error in getDetailedDebtsByDate:', error);
      return {
        data: [],
        total: 0,
        page: filters.page || 1,
        limit: filters.limit || 50,
        totalPages: 0
      };
    }
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
                  console.log('🔍 [Dashboard] AgingChart bar clicked:', data);
                  
                  // For aging chart, we want to show all debts in that age range
                  // Since aging data doesn't directly correspond to debt status,
                  // we'll show all debts and let the user filter by the range
                  
                  // We can use a generic category or create a special one for aging
                  const category = 'aging'; // Special category for aging drill-down
                  
                  handleChartClick(data, category);
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
              // Reset modal pagination states
              setModalCurrentPage(1);
              setModalTotalCount(0);
              setModalTotalPages(0);
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
