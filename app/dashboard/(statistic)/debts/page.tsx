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
import AgingDailyChart from "@/components/debt/debt-statistic/AgingDailyChart";
import PayLaterDailyChart from "@/components/debt/debt-statistic/PayLaterDailyChart";
import CustomerResponseChart from "@/components/debt/debt-statistic/CustomerResponseChart";
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
import SmartTooltip from '@/components/ui/charts/SmartTooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download, X } from "lucide-react";
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

  const [chartType, setChartTypeState] = useState<'bar' | 'line'>("bar");
  const [agingChartType, setAgingChartType] = useState<'bar' | 'line'>("bar");
  const [payLaterChartType, setPayLaterChartType] = useState<'bar' | 'line'>("bar");
  const [customerResponseChartType, setCustomerResponseChartType] = useState<'bar' | 'line'>("bar");
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
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Memoized setters to prevent unnecessary re-renders
  const setChartType = useCallback((type: 'bar' | 'line') => {
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
  const [contactModalDate, setContactModalDate] = useState<string>(""); // Lưu ngày được bấm từ chart

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

  // verbose debug logs removed
        if (isComponentMounted.current) {
          
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
      console.error('❌ [fetchData] Error:', error);
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
    // processing trendData (debug logs removed)
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
      // BẮT BUỘC phải có yyyy-mm-dd hợp lệ - KHÔNG fallback về hôm nay
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
    console.log('🔍 [handleResponseDailyClick] Opening modal with status:', status, 'date:', dateStr);
    setContactStatusFilter(status);
    setContactModalTitle(`Khách theo trạng thái: ${status} (${dateStr})`);
    setContactModalDate(dateStr); // Lưu ngày được bấm từ chart
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
    } catch (error) {
      console.error('❌ [handleResponseDailyClick] Error:', error);
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
    console.log('🔍 [loadContactDetails] Called with:', { status, pageNum, limitNum });
    console.log('🔍 [loadContactDetails] Using date from chart click:', contactModalDate);
    setContactLoading(true);
    try {
      if (!contactModalDate) {
        console.warn('⚠️ No date from chart click, cannot filter properly');
        setContactDetails([]);
        setContactTotal(0);
        return;
      }
      
      // Always use the date from chart click - NEVER use range
      const params: any = {
        date: contactModalDate,
        mode: 'events',
        page: pageNum,
        limit: limitNum,
      };
      
      // Only add responseStatus if it's not empty
      if (status && status.trim() !== '') {
        params.responseStatus = status;
      }
      
      console.log('🔍 [loadContactDetails] API params (date mode):', params);
      const res = await debtStatisticsAPI.getContactDetails(params);
      console.log('🔍 [loadContactDetails] API response:', res);
      setContactDetails(res.data || []);
      setContactTotal(res.total || 0);
      setContactPage(res.page || pageNum);
      setContactLimit(res.limit || limitNum);
    } catch (error) {
      console.error('❌ [loadContactDetails] Error:', error);
      setContactDetails([]);
      setContactTotal(0);
    } finally {
      setContactLoading(false);
    }
  }, [contactModalDate]); // Depend on the date from chart click

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
            <div className="flex items-center gap-3">
              {/* <Button
                onClick={async () => {
                  try {
                    await debtStatisticsAPI.captureStatistics();
                    await debtStatisticsAPI.forceRefresh();
                    await fetchData();
                    console.log('✅ Data captured and refreshed');
                  } catch (error) {
                    console.error('❌ Error capturing data:', error);
                  }
                }}
                variant="outline"
                size="sm"
                className="h-9 px-4 text-sm font-medium text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              >
                Capture Data
              </Button> */}
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="h-9 px-4 text-sm font-medium text-blue-700 bg-white border-blue-300 hover:bg-blue-50"
              >
                Refresh
              </Button>
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
              <AgingDailyChart 
                data={agingDailyChartData}
                onBarClick={handleAgingDailyClick}
                loading={loading}
                labels={agingLabels}
                chartType={agingChartType}
                setChartType={setAgingChartType}
              />
            </TabsContent>

            {/* Phân tích trễ hẹn */}
            <TabsContent value="promise_not_met">
              <PayLaterDailyChart 
                data={payLaterDailyChartData}
                onBarClick={handlePayLaterDailyClick}
                loading={loading}
                labels={payLaterLabels}
                chartType={payLaterChartType}
                setChartType={setPayLaterChartType}
              />
            </TabsContent>

            {/* Phân tích khách hàng đã trả lời */}
            <TabsContent value="customer_responded">
              <CustomerResponseChart 
                data={responsesDailyChartData}
                onBarClick={handleResponseDailyClick}
                loading={loading}
                labels={responseStatuses}
                responseStatusVi={responseStatusVi}
                chartType={customerResponseChartType}
                setChartType={setCustomerResponseChartType}
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

          {/* Contact Details Modal - Custom for ContactDetailItem structure */}
          <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
            <DialogContent className="!w-[80vw] !max-w-[80vw] !h-[80vh] !max-h-[80vh] overflow-hidden flex flex-col p-0">
              {/* Header */}
              <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background">
                <DialogTitle className="text-lg font-semibold">
                  Chi tiết khách hàng đã trả lời - {contactModalTitle || "Khách đã trả lời"} ({contactTotal} khách)
                </DialogTitle>
              </DialogHeader>

              {/* Body */}
              <div className="flex flex-col gap-4 flex-1 overflow-hidden p-4">
                {/* Filter Section */}
                <div className="space-y-4">
                  {/* Filter Controls */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Filter Inputs */}
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Search Input */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <FileText className="h-4 w-4 text-gray-500" />
                            Tìm kiếm
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Mã khách hàng, tên khách hàng..."
                              className="h-10 pl-10 pr-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <AlertCircle className="h-4 w-4 text-gray-500" />
                            Trạng thái
                          </Label>
                          <Select 
                            value={contactStatusFilter} 
                            onValueChange={(value) => {
                              console.log('🔍 [Filter] Changing status filter:', { from: contactStatusFilter, to: value });
                              setContactStatusFilter(value);
                              // Reset to page 1 and fetch new data when filter changes
                              setContactPage(1);
                              // Convert "all" back to empty string for API
                              const apiStatus = value === "all" ? "" : value;
                              console.log('🔍 [Filter] API status will be:', apiStatus);
                              loadContactDetails(apiStatus, 1, contactLimit);
                            }}
                          >
                            <SelectTrigger className="h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder="Tất cả trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tất cả trạng thái</SelectItem>
                              <SelectItem value="Debt Reported">Đã gửi báo nợ</SelectItem>
                              <SelectItem value="Customer Responded">Khách đã trả lời</SelectItem>
                              <SelectItem value="First Reminder">Nhắc lần 1</SelectItem>
                              <SelectItem value="Second Reminder">Nhắc lần 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-4 bg-white border-t border-gray-200">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Active Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {contactStatusFilter && contactStatusFilter !== "all" && (
                            <>
                              <span className="text-sm font-medium text-gray-600">
                                Bộ lọc đang áp dụng:
                              </span>
                              <div className="flex gap-2 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                                >
                                  Trạng thái: {responseStatusVi[contactStatusFilter] || contactStatusFilter}
                                  <button
                                    onClick={() => {
                                      setContactStatusFilter("all");
                                      setContactPage(1);
                                      // Clear filter = show all statuses for the current date
                                      loadContactDetails("", 1, contactLimit);
                                    }}
                                    className="ml-2 hover:text-blue-900"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('🔍 [Test] Clear filter button clicked');
                              setContactStatusFilter("all");
                              setContactPage(1);
                              // Clear filter = show all statuses for the current date
                              loadContactDetails("", 1, contactLimit);
                            }}
                            className="h-9 px-4 text-sm font-medium text-gray-600 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                          >
                            <X className="h-4 w-4 inline-block mr-1" />
                            Xóa bộ lọc
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('🔍 [Test] Test filter button clicked');
                              console.log('🔍 [Test] Current modal title:', contactModalTitle);
                              console.log('🔍 [Test] Date from chart click:', contactModalDate);
                              loadContactDetails("Debt Reported", 1, contactLimit);
                            }}
                            className="h-9 px-4 text-sm font-medium text-blue-700 bg-white border-blue-300 hover:bg-blue-50"
                          >
                            Test Filter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* Export functionality */}}
                            className="h-9 px-4 text-sm font-medium text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
                          >
                            <Download className="h-4 w-4 inline-block mr-2" />
                            Xuất Excel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-3 w-3 text-blue-600" />
                      </div>
                      <p className="text-xs text-gray-600">Tổng khách hàng</p>
                      <p className="text-base font-bold text-gray-900">{contactTotal?.toLocaleString() || 0}</p>
                    </div>

                    <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <FileText className="h-3 w-3 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-600">Số bản ghi hiển thị</p>
                      <p className="text-base font-bold text-green-600">{Array.isArray(contactDetails) ? contactDetails.length : 0}</p>
                    </div>

                    <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="h-6 w-6 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <AlertCircle className="h-3 w-3 text-orange-600" />
                      </div>
                      <p className="text-xs text-gray-600">Trạng thái</p>
                      <p className="text-base font-bold text-orange-600">{contactStatusFilter || "Tất cả"}</p>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                      <TableRow className="hover:bg-transparent border-b border-gray-200">
                        <TableHead className="h-12 px-4 text-center font-semibold text-sm text-gray-700 bg-gray-50">
                          #
                        </TableHead>
                        <TableHead className="h-12 px-4 text-left font-semibold text-sm text-gray-700 bg-gray-50">
                          Mã KH
                        </TableHead>
                        <TableHead className="h-12 px-4 text-left font-semibold text-sm text-gray-700 bg-gray-50">
                          Tên KH
                        </TableHead>
                        <TableHead className="h-12 px-4 text-left font-semibold text-sm text-gray-700 bg-gray-50">
                          Mã NV
                        </TableHead>
                        <TableHead className="h-12 px-4 text-center font-semibold text-sm text-gray-700 bg-gray-50">
                          Thời gian cập nhật
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(contactDetails) && contactDetails.length > 0 ? (
                        contactDetails.map((contact, idx) => {
                          // Determine which time column to display based on status
                          const time =
                            contactStatusFilter === "Debt Reported" ||
                            contactStatusFilter === "Customer Responded"
                              ? contact.send_at
                              : contactStatusFilter === "First Reminder"
                              ? contact.first_remind_at
                              : contactStatusFilter === "Second Reminder"
                              ? contact.second_remind_at
                              : contact.latest_time;

                          return (
                            <TableRow
                              key={idx}
                              className={`hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                              }`}
                            >
                              <TableCell className="h-14 px-4 text-center font-medium text-sm text-gray-900">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="h-14 px-4 font-mono text-sm text-gray-700">
                                {contact.customer_code || "-"}
                              </TableCell>
                              <TableCell className="h-14 px-4 text-sm text-gray-700">
                                {contact.customer_name || "-"}
                              </TableCell>
                              <TableCell className="h-14 px-4 font-mono text-sm text-gray-700">
                                {contact.employee_code_raw || "-"}
                              </TableCell>
                              <TableCell className="h-14 px-4 text-sm text-center text-gray-700">
                                {time
                                  ? new Date(time).toLocaleString("vi-VN", {
                                      timeZone: "Asia/Ho_Chi_Minh",
                                    })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-16 text-center">
                            <div className="flex flex-col items-center space-y-4">
                              <AlertCircle className="h-16 w-16 opacity-50 text-gray-400" />
                              <div>
                                <p className="text-xl font-medium text-gray-900 mb-2">
                                  Không tìm thấy kết quả nào
                                </p>
                                <p className="text-sm text-gray-600">
                                  Thử thay đổi bộ lọc để xem thêm kết quả
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {contactTotal > contactLimit && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>
                        Hiển thị {((contactPage - 1) * contactLimit) + 1}-{Math.min(contactPage * contactLimit, contactTotal)} trên {contactTotal} kết quả
                      </span>
                      <Select
                        value={contactLimit.toString()}
                        onValueChange={(value) => {
                          setContactLimit(Number(value));
                          loadContactDetails(contactStatusFilter, 1, Number(value));
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="200">200</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>mỗi trang</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadContactDetails(contactStatusFilter, 1, contactLimit)}
                        disabled={contactPage === 1}
                      >
                        Đầu
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadContactDetails(contactStatusFilter, contactPage - 1, contactLimit)}
                        disabled={contactPage === 1}
                      >
                        Trước
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(contactTotal / contactLimit)) }, (_, i) => {
                          const totalPages = Math.ceil(contactTotal / contactLimit);
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (contactPage <= 3) {
                            pageNum = i + 1;
                          } else if (contactPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = contactPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={contactPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => loadContactDetails(contactStatusFilter, pageNum, contactLimit)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadContactDetails(contactStatusFilter, contactPage + 1, contactLimit)}
                        disabled={contactPage >= Math.ceil(contactTotal / contactLimit)}
                      >
                        Tiếp
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadContactDetails(contactStatusFilter, Math.ceil(contactTotal / contactLimit), contactLimit)}
                        disabled={contactPage >= Math.ceil(contactTotal / contactLimit)}
                      >
                        Cuối
                      </Button>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {contactLoading && (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Đang tải dữ liệu...</p>
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
