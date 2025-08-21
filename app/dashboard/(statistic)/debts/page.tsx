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
import type { PayLaterDelayItem, ContactResponseItem, ContactDetailItem, AgingDailyItem, PayLaterDailyItem, ContactResponseDailyItem } from "@/lib/debt-statistics-api";
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
  // Daily series states
  const [agingDaily, setAgingDaily] = useState<AgingDailyItem[]>([]);
  const [payLaterDaily, setPayLaterDaily] = useState<PayLaterDailyItem[]>([]);
  const [responsesDaily, setResponsesDaily] = useState<ContactResponseDailyItem[]>([]);

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
  const toVNDate = useCallback((d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }), []);
  const filters = useMemo(() => {
    const apiFilters: StatisticsFilters = {};
    if (range?.from) apiFilters.from = toVNDate(range.from as Date);
    if (range?.to) apiFilters.to = toVNDate(range.to as Date);
    return apiFilters;
  }, [range?.from?.toDateString(), range?.to?.toDateString(), toVNDate]); // Use dateString instead of getTime for better performance

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

        const [overviewRes, agingRes, trendsRes, employeeRes, payLaterRes, responsesRes, agingDailyRes, payLaterDailyRes, responsesDailyRes] = await Promise.all([
          debtStatisticsAPI.getOverview(debouncedFilters),
          debtStatisticsAPI.getAgingAnalysis(debouncedFilters),
          debtStatisticsAPI.getTrends(debouncedFilters),
          debtStatisticsAPI.getEmployeePerformance(debouncedFilters),
          debtStatisticsAPI.getPayLaterDelay({ ...debouncedFilters, buckets: '7,14,30' }),
          debtStatisticsAPI.getContactResponses({ ...debouncedFilters, by: 'customer' }),
          debtStatisticsAPI.getAgingDaily(debouncedFilters),
          debtStatisticsAPI.getPayLaterDelayDaily({ ...debouncedFilters, buckets: '7,14,30' }),
          debtStatisticsAPI.getContactResponsesDaily({ ...debouncedFilters, by: 'customer' }),
        ]);

        if (isComponentMounted.current) {
          console.log('🔍 [Dashboard] Setting aging data:', agingRes);
          setOverview(overviewRes);
          setAgingData(agingRes);
          setTrendData(trendsRes);
          setEmployeeData(employeeRes);
          setPayLaterDelayData(payLaterRes || []);
          setContactResponses(responsesRes || []);
          setAgingDaily(agingDailyRes || []);
          setPayLaterDaily(payLaterDailyRes || []);
          setResponsesDaily(responsesDailyRes || []);
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
    console.log('🔍 [chartData] Processing trendData:', trendData);
    
    return trendData.map((item, index) => {
      // Ưu tiên sử dụng trường date từ API (ISO format) thay vì name (vi-VN format)
      let displayName = item.date || item.name;
      
      // Nếu có trường date, sử dụng trực tiếp (đã là ISO format)
      if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        displayName = item.date;
      } else {
        // Nếu không có date hoặc date không hợp lệ, thử parse từ name
        try {
          const date = new Date(displayName);
          if (!isNaN(date.getTime())) {
            // Format as YYYY-MM-DD for consistency
            displayName = date.toISOString().split('T')[0];
          } else {
            console.warn('⚠️ Invalid date for chart item:', { item, displayName });
            displayName = `Day ${index + 1}`;
          }
        } catch (error) {
          console.warn('⚠️ Could not parse date for chart item:', { item, displayName, error });
          // Fallback to index-based naming if date parsing fails
          displayName = `Day ${index + 1}`;
        }
      }
      
      const result = {
        name: displayName,
        paid: item.paid,
        pay_later: item.pay_later,
        no_info: item.no_info,
      };
      
      console.log(`🔍 [chartData] Processed item ${index}:`, result);
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
    if (!isComponentMounted.current) return;
    setLoadingModalData(true);
    try {
      // BẮT BUỘC phải có yyyy-mm-dd hợp lệ
      if (!(typeof dateFromChart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateFromChart))) {
        console.warn('[fetchDebtsForModal] dateFromChart không hợp lệ:', dateFromChart);
        setSelectedDebts([]);
        return; // dừng, KHÔNG fallback về hôm nay
      }

      const baseParams: any = {
        date: dateFromChart,
        page: 1,
        all: true,
        limit: 100000,
      };

      switch (category) {
        case 'paid':
          baseParams.status = 'paid'; break;
        case 'promised':
        case 'pay_later':
          baseParams.status = 'pay_later'; break;
        case 'no_info':
        case 'no_information_available':
          baseParams.status = 'no_information_available'; break;
      }

      console.log('🔍 [fetchDebtsForModal] API call params:', baseParams);
      const response = await api.get('/debt-statistics/detailed', { params: baseParams });
      console.log('🔍 [fetchDebtsForModal] API response:', response.data);

      const filteredData: Debt[] =
        Array.isArray(response?.data?.data) ? response.data.data :
        Array.isArray(response?.data) ? response.data :
        [];

      console.log('🔍 [fetchDebtsForModal] Filtered data count:', filteredData.length);
      if (isComponentMounted.current) setSelectedDebts(filteredData);
    } catch (error) {
      console.error('❌ Error in fetchDebtsForModal:', error);
      if (isComponentMounted.current) setSelectedDebts([]);
    } finally {
      if (isComponentMounted.current) setLoadingModalData(false);
    }
  }, [isComponentMounted]);


  const handleChartClick = useCallback((p1: any, p2?: any) => {
  // Chịu được cả onChartClick(category, data) và onChartClick(data, category)
  let category: string = '';
  let data: any;

  if (typeof p1 === 'string') {
    category = p1;
    data = p2;
  } else {
    data = p1;
    if (typeof p2 === 'string') category = p2;
  }

  // Lấy ngày từ data trực tiếp (fullRowData từ ChartSection)
  let dateFromChart: string | undefined;
  
  // Ưu tiên lấy từ data trực tiếp trước (fullRowData từ ChartSection)
  const candidates = [
    data?.name,           // Trường name chứa ngày từ chart data (đã được format thành ISO)
    data?.date,           // Trường date nếu có
    data?.label,          // Trường label nếu có
    // Fallback cho các trường hợp khác (Recharts payload)
    (data && (data.payload ?? data))?.name,
    (data && (data.payload ?? data))?.date,
    (data && (data.payload ?? data))?.label,
    (data as any)?.activeLabel,
  ];

  console.log('🔍 [handleChartClick] Debug candidates:', {
    p1, p2, data, candidates
  });

  // Tìm ngày hợp lệ (format YYYY-MM-DD)
  for (const c of candidates) {
    if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c)) {
      dateFromChart = c;
      break;
    }
  }

  console.log('🔍 [handleChartClick] Final result:', {
    dateFromChart, category, dataName: data?.name, dataDate: data?.date
  });

  // Không rơi về hôm nay nữa — nếu không bắt được ngày thì hủy drilldown
  if (!dateFromChart) {
    console.warn('[handleChartClick] Không xác định được ngày từ chart, hủy mở modal.', {
      p1, p2, data, candidates
    });
    return;
  }

  setSelectedCategory(category || '');
  setModalOpen(true);
  // gọi như cũ
  void fetchDebtsForModal(category || '', dateFromChart);
}, [fetchDebtsForModal]);

  // Build daily grouped datasets
  const agingLabels = useMemo(() => ['1-30', '31-60', '61-90', '>90'], []);
  // Pre-compute full date list in range (skip Sundays) so charts show zeros when no data
  const selectedDates = useMemo(() => {
    const dates: string[] = [];
    const start = range?.from ? new Date(range.from) : undefined;
    const end = range?.to ? new Date(range.to) : undefined;
    if (!start || !end) return dates;
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    for (let d = s; d <= e; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
      if (d.getDay() === 0) continue; // skip Sunday
      dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
    }
    return dates;
  }, [range?.from?.toDateString(), range?.to?.toDateString()]);
  const agingDailyChartData = useMemo(() => {
    const map = new Map<string, any>();
    const src = Array.isArray(agingDaily) ? agingDaily : (agingDaily ? [agingDaily as any] : []);
    src.forEach((i) => {
      const key = i.date;
      if (!map.has(key)) map.set(key, { name: key });
      const row = map.get(key);
      row[i.range] = (row[i.range] || 0) + i.count;
    });
    // Ensure every selected date exists and buckets are zero-filled
    const rows = selectedDates.map((date) => {
      const base: any = { name: date };
      agingLabels.forEach((lbl) => { base[lbl] = 0; });
      const existing = map.get(date);
      if (existing) {
        agingLabels.forEach((lbl) => {
          if (typeof existing[lbl] === 'number') base[lbl] = existing[lbl];
        });
      }
      return base;
    });
    return rows;
  }, [agingDaily, selectedDates, agingLabels]);

  const payLaterLabels = useMemo(() => {
    const set = new Set<string>();
    const src = Array.isArray(payLaterDaily) ? payLaterDaily : (payLaterDaily ? [payLaterDaily as any] : []);
    src.forEach((i) => set.add(i.range));
    const arr = Array.from(set);
    // Try to keep expected order 1-7, 8-14, 15-30, >30 if available
    const order = (label: string) => {
      if (label.startsWith('>')) return 999;
      const parts = label.split('-');
      const start = parseInt(parts[0], 10);
      return isNaN(start) ? 500 : start;
    };
    const sorted = arr.sort((a, b) => order(a) - order(b));
    return sorted.length > 0 ? sorted : ['1-7', '8-14', '15-30', '>30'];
  }, [payLaterDaily]);
  const payLaterDailyChartData = useMemo(() => {
    const map = new Map<string, any>();
    const src = Array.isArray(payLaterDaily) ? payLaterDaily : (payLaterDaily ? [payLaterDaily as any] : []);
    src.forEach((i) => {
      const key = i.date;
      if (!map.has(key)) map.set(key, { name: key });
      const row = map.get(key);
      row[i.range] = (row[i.range] || 0) + i.count;
    });
    const rows = selectedDates.map((date) => {
      const base: any = { name: date };
      payLaterLabels.forEach((lbl) => { base[lbl] = 0; });
      const existing = map.get(date);
      if (existing) {
        payLaterLabels.forEach((lbl) => {
          if (typeof existing[lbl] === 'number') base[lbl] = existing[lbl];
        });
      }
      return base;
    });
    return rows;
  }, [payLaterDaily, selectedDates, payLaterLabels]);

  // Response statuses (English keys for API, localized in tooltip)
  const responseStatuses = useMemo(() => ['Debt Reported', 'Customer Responded', 'First Reminder', 'Second Reminder'], []);
  const responseStatusVi = useMemo(() => ({
    'Debt Reported': 'Đã gửi báo nợ',
    'Customer Responded': 'Khách đã trả lời',
    'First Reminder': 'Nhắc lần 1',
    'Second Reminder': 'Nhắc lần 2',
    'Not Sent': 'Chưa gửi',
    'Error Send': 'Gửi lỗi',
    'Sent But Not Verified': 'Đã gửi, chưa xác minh',
  } as Record<string, string>), []);
  const responsesDailyChartData = useMemo(() => {
    const map = new Map<string, any>();
    const src = Array.isArray(responsesDaily) ? responsesDaily : (responsesDaily ? [responsesDaily as any] : []);
    src.forEach((i) => {
      const key = i.date;
      if (!map.has(key)) map.set(key, { name: key });
      const row = map.get(key);
      row[i.status] = (row[i.status] || 0) + i.customers;
    });
    const rows = selectedDates.map((date) => {
      const base: any = { name: date };
      responseStatuses.forEach((st) => { base[st] = 0; });
      const existing = map.get(date);
      if (existing) {
        responseStatuses.forEach((st) => {
          if (typeof existing[st] === 'number') base[st] = existing[st];
        });
      }
      return base;
    });
    return rows;
  }, [responsesDaily, selectedDates, responseStatuses]);

  // Click handlers for daily charts
  const handleAgingDailyClick = useCallback(async (label: string, entry: any, _index: number) => {
    const dateStr = entry?.payload?.name;
    if (!dateStr || !label) return;
    const parse = (lbl: string) => {
      const t = lbl.trim();
      if (t.startsWith('>')) {
        const n = parseInt(t.replace('>', '').trim(), 10);
        return { minDays: isNaN(n) ? undefined : n + 1, maxDays: undefined };
      }
      const parts = t.split('-');
      if (parts.length === 2) {
        const a = parseInt(parts[0].trim(), 10);
        const b = parseInt(parts[1].trim(), 10);
        return { minDays: isNaN(a) ? undefined : a, maxDays: isNaN(b) ? undefined : b };
      }
      return {} as any;
    };
    const { minDays, maxDays } = parse(label);
    setSelectedCategory('aging');
    setModalOpen(true);
    setLoadingModalData(true);
    try {
      const resp = await api.get('/debt-statistics/detailed', {
        params: { date: dateStr, mode: 'overdue', minDays, maxDays, page: 1, all: true, limit: 100000 },
      });
      const respData = resp.data;
      const debts: Debt[] = Array.isArray(respData?.data) ? respData.data : Array.isArray(respData) ? respData : [];
      setSelectedDebts(debts);
    } catch {
      setSelectedDebts([]);
    } finally {
      setLoadingModalData(false);
    }
  }, []);

  const handlePayLaterDailyClick = useCallback(async (label: string, entry: any, _index: number) => {
    const dateStr = entry?.payload?.name;
    if (!dateStr || !label) return;
    const { minDays, maxDays } = parseBucketLabel(label);
    setSelectedCategory('promise_not_met');
    setModalOpen(true);
    setLoadingModalData(true);
    try {
      const resp = await api.get('/debt-statistics/detailed', {
        params: { date: dateStr, mode: 'payLater', minDays, maxDays, page: 1, all: true, limit: 100000 },
      });
      const respData = resp.data;
      const debts: Debt[] = Array.isArray(respData?.data) ? respData.data : Array.isArray(respData) ? respData : [];
      setSelectedDebts(debts);
    } catch {
      setSelectedDebts([]);
    } finally {
      setLoadingModalData(false);
    }
  }, []);

  const handleResponseDailyClick = useCallback(async (status: string, entry: any, index: number) => {
    const dateStr = entry?.payload?.name;
    if (!dateStr || !status) return;
    setContactStatusFilter(status);
    setContactModalTitle(`Khách theo trạng thái: ${status} (${dateStr})`);
    setContactModalOpen(true);
    setContactLoading(true);
    try {
      const res = await debtStatisticsAPI.getContactDetails({
        date: dateStr,
        responseStatus: status,
        mode: 'events',
        page: 1,
        limit: contactLimit,
      });
      const payload = res as any;
      const data: ContactDetailItem[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? (payload as ContactDetailItem[])
        : [];
      setContactDetails(data);
      setContactTotal(payload?.total || data.length || 0);
      setContactPage(payload?.page || 1);
      setContactLimit(payload?.limit || contactLimit);
    } catch {
      setContactDetails([]);
      setContactTotal(0);
    } finally {
      setContactLoading(false);
    }
  }, [contactLimit]);

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
    setSelectedCategory('promise_not_met');
    setModalOpen(true);
    setLoadingModalData(true);
    try {
      const lbl = bucket.range || bucket.label || '';
      const { minDays, maxDays } = parseBucketLabel(lbl);
      const now = new Date();
      const fromDate = range?.from ? range.from : now;
      const toDate = range?.to ? range.to : now;
      const fromStr = (fromDate as Date).toISOString().split('T')[0];
      const toStr = (toDate as Date).toISOString().split('T')[0];

      // Use range-based details to match the pay-later buckets aggregation
      const resp = await api.get('/debt-statistics/detailed', {
        params: {
          from: fromStr,
          to: toStr,
          mode: 'payLater',
          minDays,
          maxDays,
          page: 1,
          all: true,
          limit: 100000,
        }
      });
      const respData = resp.data;
      const debts: Debt[] = Array.isArray(respData?.data) ? respData.data : (Array.isArray(respData) ? respData : []);
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
      const fromDate = range?.from ? range.from : new Date();
      const toDate = range?.to ? range.to : new Date();
      const fromStr = (fromDate as Date).toISOString().split('T')[0];
      const toStr = (toDate as Date).toISOString().split('T')[0];
      const res = await debtStatisticsAPI.getContactDetails({ from: fromStr, to: toStr, responseStatus: status, page: pageNum, limit: limitNum });
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
      'aging': 'Ngày quá hạn'
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
      all: true,
      limit: 100000
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
      limit: 100000,
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
              <TabsTrigger value="promise_not_met">Phân tích ngày trễ hẹn</TabsTrigger>
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
              {/* Daily stacked columns with title/description to match overview */}
              <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Biểu đồ thống kê công nợ quá hạn</h2>
                  <p className="text-sm text-gray-600 mt-1">Theo dõi tình hình công nợ qua các khoảng thời gian</p>
                </div>
                <div className="h-80 w-full">
                  <RResponsiveContainer width="100%" height="100%">
                    <RBarChart data={agingDailyChartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                      <RCartesianGrid strokeDasharray="3 3" vertical={false} />
                      <RXAxis dataKey="name" angle={-30} textAnchor="end" height={60} />
                      <RYAxis />
                      <RTooltip />
                      {agingLabels.map((k, idx) => (
                        <RBar key={`aging-daily-${k}`} dataKey={k} fill={["#10b981","#f59e0b","#ef4444","#7c2d12"][idx]}
                          className="cursor-pointer" onClick={(data, index) => { void handleAgingDailyClick(k, data, index); }} />
                      ))}
                    </RBarChart>
                  </RResponsiveContainer>
                </div>
              </div>

              {/* Remove legacy chart to avoid trùng lặp */}
            </TabsContent>

            {/* Phân tích trễ hẹn */}
            <TabsContent value="promise_not_met">
              <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Biểu đồ thống kê trễ hẹn</h2>
                  <p className="text-sm text-gray-600 mt-1">Theo dõi tình hình công nợ qua các khoảng thời gian</p>
                </div>
                <div className="h-80 w-full">
                  <RResponsiveContainer width="100%" height="100%">
                    <RBarChart data={payLaterDailyChartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                      <RCartesianGrid strokeDasharray="3 3" vertical={false} />
                      <RXAxis dataKey="name" angle={-30} textAnchor="end" height={60} />
                      <RYAxis />
                      <RTooltip />
                      {payLaterLabels.map((k, idx) => (
                        <RBar key={`pl-daily-${k}`} dataKey={k} fill={["#60A5FA","#f59e0b","#ef4444","#7c2d12"][idx % 4]}
                          className="cursor-pointer" onClick={(data, index) => { void handlePayLaterDailyClick(k, data, index); }} />
                      ))}
                    </RBarChart>
                  </RResponsiveContainer>
                </div>
              </div>

              {/* Remove legacy chart */}
            </TabsContent>

            {/* Phân tích khách hàng đã trả lời */}
            <TabsContent value="customer_responded">
              <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Biểu đồ thống kê khách đã trả lời</h2>
                  <p className="text-sm text-gray-600 mt-1">Theo dõi tình hình công nợ qua các khoảng thời gian</p>
                </div>
                <div className="h-80 w-full">
                  <RResponsiveContainer width="100%" height="100%">
                    <RBarChart data={responsesDailyChartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                      <RCartesianGrid strokeDasharray="3 3" vertical={false} />
                      <RXAxis dataKey="name" angle={-30} textAnchor="end" height={60} />
                      <RYAxis />
                      <RTooltip formatter={(value: any, name: any) => [value, (responseStatusVi as any)[String(name)] || String(name)]} />
                      {responseStatuses.map((k, idx) => (
                        <RBar key={`resp-daily-${k}`} dataKey={k} name={responseStatusVi[k] || k} fill={["#3b82f6","#10b981","#f59e0b","#ef4444"][idx % 4]} className="cursor-pointer" onClick={(data, index) => { void handleResponseDailyClick(k, data, index); }} />
                      ))}
                    </RBarChart>
                  </RResponsiveContainer>
                </div>
              </div>

              {/* Remove legacy aggregated responses */}
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

          {/* Contact Details Modal - Custom for ContactDetailItem structure */}
          <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{contactModalTitle || 'Khách đã trả lời'}</DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto">
                {contactLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <LoadingSpinner size={32} />
                    <span className="ml-2">Đang tải dữ liệu...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{contactTotal}</div>
                        <div className="text-sm text-gray-600">Tổng số khách hàng</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Array.isArray(contactDetails) ? contactDetails.length : 0}
                        </div>
                        <div className="text-sm text-gray-600">Hiển thị</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {contactStatusFilter || 'Tất cả'}
                        </div>
                        <div className="text-sm text-gray-600">Trạng thái</div>
                      </div>
                    </div>

                    {/* Contact Details Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>STT</TableHead>
                            <TableHead>Mã khách hàng</TableHead>
                            <TableHead>Tên khách hàng</TableHead>
                            <TableHead>Mã nhân viên</TableHead>
                            <TableHead>Thời gian cập nhật</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(contactDetails) && contactDetails.length > 0 ? (
                            contactDetails.map((contact, index) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-mono text-sm">
                                  {contact.customer_code || '-'}
                                </TableCell>
                                <TableCell>{contact.customer_name || '-'}</TableCell>
                                <TableCell className="font-mono text-sm">
                                  {contact.employee_code_raw || '-'}
                                </TableCell>
                                <TableCell>
                                  {contact.latest_time ? (
                                    new Date(contact.latest_time).toLocaleString('vi-VN', {
                                      timeZone: 'Asia/Ho_Chi_Minh'
                                    })
                                  ) : '-'}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                Không có dữ liệu
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
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
