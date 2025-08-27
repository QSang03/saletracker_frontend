import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';

interface CustomerCountFilters {
  fromDate?: string;
  toDate?: string;
  employeeId?: number;
  departmentId?: number;
}

export const useCustomerCount = (filters?: CustomerCountFilters) => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Tạo URL với query parameters
      const url = new URL('/api/order-details/customer-count', window.location.origin);
      if (filters?.fromDate) url.searchParams.set('fromDate', filters.fromDate);
      if (filters?.toDate) url.searchParams.set('toDate', filters.toDate);
      if (filters?.employeeId) url.searchParams.set('employeeId', filters.employeeId.toString());
      if (filters?.departmentId) url.searchParams.set('departmentId', filters.departmentId.toString());

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
