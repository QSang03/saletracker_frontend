import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';

interface SendHistoryItem {
  id: number;
  content: string;
  sent_at: string;
  sent_from: string;
  sent_to: string;
  zaloCustomerId?: string;
  sendFunction?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SendHistoryResponse {
  data: SendHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface SendHistoryFilters {
  zalo_customer_id?: string;
  user_id?: number;
  send_function?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  notes?: string;
}

export function useSendHistory(filters?: SendHistoryFilters) {
  const [data, setData] = useState<SendHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSendHistory = async (customFilters?: SendHistoryFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const finalFilters = { ...filters, ...customFilters };

      if (finalFilters.zalo_customer_id) params.append('zalo_customer_id', finalFilters.zalo_customer_id);
      if (finalFilters.user_id) params.append('user_id', finalFilters.user_id.toString());
      if (finalFilters.send_function) params.append('send_function', finalFilters.send_function);
      if (finalFilters.from) params.append('from', finalFilters.from);
      if (finalFilters.to) params.append('to', finalFilters.to);
      if (finalFilters.page) params.append('page', finalFilters.page.toString());
      if (finalFilters.pageSize) params.append('pageSize', finalFilters.pageSize.toString());
      if (finalFilters.notes) params.append('notes', finalFilters.notes);

      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-history?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SendHistoryResponse = await response.json();
      setData(result.data);
      setTotal(result.total);
    } catch (err: any) {
      console.error('Error fetching send history:', err);
      setError(err.message || 'Lỗi khi tải lịch sử gửi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters) {
      fetchSendHistory();
    }
  }, [JSON.stringify(filters)]);

  return {
    data,
    total,
    loading,
    error,
    refetch: fetchSendHistory,
  };
}