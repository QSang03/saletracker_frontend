import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

export interface CustomerListItem {
  customer_name: string;
  sale_id: number;
  sale_name: string;
  orders: number;
}

export interface CustomerListFilters {
  fromDate?: string;
  toDate?: string;
  employeeId?: number;
  departmentId?: number;
  // Full order filters
  search?: string;
  status?: string;
  date?: string;
  dateRange?: { start: string; end: string };
  employee?: string;
  employees?: string;
  departments?: string;
  products?: string;
  warningLevel?: string;
  quantity?: number | string;
}

export function useCustomerList(
  initialFilters?: CustomerListFilters,
  options?: { autoFetch?: boolean }
) {
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef<CustomerListFilters | undefined>(initialFilters);
  // Guard against race conditions between rapid pagination/filters changes
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(async (nextPage?: number, nextFilters?: CustomerListFilters, nextPageSize?: number) => {
    // ✅ Skip nếu đang fetch
    if (isFetchingRef.current) return;
    
    // ✅ Debounce fetch để tránh multiple calls
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(async () => {
      isFetchingRef.current = true;
      
      const token = getAccessToken();
      if (!token) {
        setError('Unauthorized');
        isFetchingRef.current = false;
        return;
      }
      const pageToLoad = nextPage ?? page;
      const filtersToUse = nextFilters ?? filtersRef.current;
      const pageSizeToLoad = nextPageSize ?? pageSize;
      // Increment request id and cancel previous request
      const reqId = ++requestIdRef.current;
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const abortController = new AbortController();
      abortRef.current = abortController;
      setLoading(true);
      setError(null);
    try {
      const url = new URL('/api/order-details/customers', window.location.origin);
      url.searchParams.set('page', String(pageToLoad));
      url.searchParams.set('pageSize', String(pageSizeToLoad));
      if (filtersToUse?.fromDate) url.searchParams.set('fromDate', filtersToUse.fromDate);
      if (filtersToUse?.toDate) url.searchParams.set('toDate', filtersToUse.toDate);
      if (filtersToUse?.employeeId) url.searchParams.set('employeeId', String(filtersToUse.employeeId));
      if (filtersToUse?.departmentId) url.searchParams.set('departmentId', String(filtersToUse.departmentId));
      if (filtersToUse?.search) url.searchParams.set('search', String(filtersToUse.search));
      if (filtersToUse?.status) url.searchParams.set('status', String(filtersToUse.status));
      if (filtersToUse?.date) url.searchParams.set('date', String(filtersToUse.date));
      if (filtersToUse?.dateRange && filtersToUse.dateRange.start && filtersToUse.dateRange.end) {
        url.searchParams.set('dateRange', JSON.stringify(filtersToUse.dateRange));
      }
      if (filtersToUse?.employee) url.searchParams.set('employee', String(filtersToUse.employee));
      if (filtersToUse?.employees) url.searchParams.set('employees', String(filtersToUse.employees));
      if (filtersToUse?.departments) url.searchParams.set('departments', String(filtersToUse.departments));
      if (filtersToUse?.products) url.searchParams.set('products', String(filtersToUse.products));
      if (filtersToUse?.warningLevel) url.searchParams.set('warningLevel', String(filtersToUse.warningLevel));
      if (filtersToUse?.quantity !== undefined) url.searchParams.set('quantity', String(filtersToUse.quantity));

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: abortController.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Ignore outdated responses
      if (reqId === requestIdRef.current) {
        setItems(data.data || []);
        setTotal(Number(data.total || 0));
        setPage(Number(data.page || pageToLoad));
        setPageSize(Number(data.pageSize || pageSizeToLoad));
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // Swallow aborted requests
        return;
      }
      setError(e?.message || 'Lỗi tải danh sách khách hàng');
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
          isFetchingRef.current = false;
        }
      }
    }, 100); // ✅ Debounce 100ms
    
    // Cleanup timeout
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [page, pageSize]);

  // ✅ Prevent duplicate calls
  const isSettingFiltersRef = useRef(false);
  
  const setFilters = useCallback((nf: CustomerListFilters) => {
    // ✅ Skip nếu đang set filters
    if (isSettingFiltersRef.current) return;
    
    isSettingFiltersRef.current = true;
    filtersRef.current = nf;
    setPage(1);
    fetchPage(1, nf).finally(() => {
      isSettingFiltersRef.current = false;
    });
  }, [fetchPage]);

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchPage(1, initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort any in-flight request when unmounting (important for React StrictMode double-mount in dev)
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return { items, page, pageSize, total, totalPages, loading, error, fetchPage, setPage, setPageSize, setFilters };
}


