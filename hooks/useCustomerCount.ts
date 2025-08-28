import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';

interface CustomerCountFilters {
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

export const useCustomerCount = (filters?: CustomerCountFilters) => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // If multiple employees selected (CSV), fetch per-employee and sum counts
      const employeesCsv = filters?.employees;
      if (employeesCsv && employeesCsv.includes(",")) {
        const ids = employeesCsv
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);

        const promises = ids.map(async (id) => {
          const url = new URL('/api/order-details/customer-count', window.location.origin);
          if (filters?.fromDate) url.searchParams.set('fromDate', filters.fromDate);
          if (filters?.toDate) url.searchParams.set('toDate', filters.toDate);
          if (filters?.employeeId) url.searchParams.set('employeeId', String(filters.employeeId));
          if (filters?.departmentId) url.searchParams.set('departmentId', String(filters.departmentId));
          if (filters?.search) url.searchParams.set('search', String(filters.search));
          if (filters?.status) url.searchParams.set('status', String(filters.status));
          if (filters?.date) url.searchParams.set('date', String(filters.date));
          if (filters?.dateRange && filters.dateRange.start && filters.dateRange.end) {
            url.searchParams.set('dateRange', JSON.stringify(filters.dateRange));
          }
          // Set employees param to single id for this request
          url.searchParams.set('employees', id);
          if (filters?.departments) url.searchParams.set('departments', String(filters.departments));
          if (filters?.products) url.searchParams.set('products', String(filters.products));
          if (filters?.warningLevel) url.searchParams.set('warningLevel', String(filters.warningLevel));
          if (filters?.quantity !== undefined) url.searchParams.set('quantity', String(filters.quantity));

          const res = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${getAccessToken()}`,
              'Content-Type': 'application/json',
            },
          });
          if (!res.ok) return 0;
          try {
            const d = await res.json();
            return Number(d?.customerCount) || 0;
          } catch (e) {
            return 0;
          }
        });

        const results = await Promise.all(promises);
        const total = results.reduce((s, v) => s + v, 0);
        setCount(total);
      } else {
        // Single request path
        const url = new URL('/api/order-details/customer-count', window.location.origin);
        if (filters?.fromDate) url.searchParams.set('fromDate', filters.fromDate);
        if (filters?.toDate) url.searchParams.set('toDate', filters.toDate);
        if (filters?.employeeId) url.searchParams.set('employeeId', filters.employeeId.toString());
        if (filters?.departmentId) url.searchParams.set('departmentId', filters.departmentId.toString());
        if (filters?.search) url.searchParams.set('search', String(filters.search));
        if (filters?.status) url.searchParams.set('status', String(filters.status));
        if (filters?.date) url.searchParams.set('date', String(filters.date));
        if (filters?.dateRange && filters.dateRange.start && filters.dateRange.end) {
          url.searchParams.set('dateRange', JSON.stringify(filters.dateRange));
        }
        if (filters?.employee) url.searchParams.set('employee', String(filters.employee));
        if (filters?.employees) url.searchParams.set('employees', String(filters.employees));
        if (filters?.departments) url.searchParams.set('departments', String(filters.departments));
        if (filters?.products) url.searchParams.set('products', String(filters.products));
        if (filters?.warningLevel) url.searchParams.set('warningLevel', String(filters.warningLevel));
        if (filters?.quantity !== undefined) url.searchParams.set('quantity', String(filters.quantity));

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch customer count: ${response.status}`);
        }
        
        const data = await response.json();
        setCount(data.customerCount);
      }
    } catch (err) {
      console.error('Error fetching customer count:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return { 
    count, 
    loading, 
    error, 
    refetch: fetchCount 
  };
};
