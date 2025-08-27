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

  const fetchPage = useCallback(async (nextPage?: number, nextFilters?: CustomerListFilters, nextPageSize?: number) => {
    const token = getAccessToken();
    if (!token) {
      setError('Unauthorized');
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
      }
    }
  }, [page, pageSize]);

  const setFilters = useCallback((nf: CustomerListFilters) => {
    filtersRef.current = nf;
    setPage(1);
    fetchPage(1, nf);
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
    };
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return { items, page, pageSize, total, totalPages, loading, error, fetchPage, setPage, setPageSize, setFilters };
}


