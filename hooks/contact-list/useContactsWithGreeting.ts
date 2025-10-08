import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { AutoReplyContact, ContactRole } from '@/types/auto-reply';

export interface ContactWithGreeting extends AutoReplyContact {
  // Auto-greeting fields
  greetingId?: string | null;
  salutation?: string | null;
  greetingMessage?: string | null;
  greetingIsActive?: number;
  greetingConversationType?: 'group' | 'private' | null;
  greetingLastMessageDate?: string | null;
  greetingCustomerStatus?: 'urgent' | 'reminder' | 'normal' | null;
}

export interface ContactFilters {
  greetingStatus?: 'all' | 'active' | 'inactive' | 'none';
  customerStatus?: 'all' | 'urgent' | 'reminder' | 'normal';
  conversationType?: 'all' | 'group' | 'private';
}

export interface UseContactsWithGreetingReturn {
  items: ContactWithGreeting[];
  total: number;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (search: string) => void;
  filters: ContactFilters;
  setFilters: (filters: ContactFilters) => void;
  loading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
  updateRole: (contactId: number, role: ContactRole) => Promise<void>;
  toggleAutoReply: (contactId: number, enabled: boolean) => Promise<void>;
  updateGreeting: (contactId: number, data: {
    salutation?: string;
    greetingMessage?: string;
    greetingIsActive?: number;
  }) => Promise<void>;
}

export function useContactsWithGreeting(): UseContactsWithGreetingReturn {
  const [items, setItems] = useState<ContactWithGreeting[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ContactFilters>({
    greetingStatus: 'all',
    customerStatus: 'all',
    conversationType: 'all',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        pageSize,
        search: search || undefined,
      };

      // Add filter params if not 'all'
      if (filters.greetingStatus && filters.greetingStatus !== 'all') {
        params.greetingStatus = filters.greetingStatus;
      }
      if (filters.customerStatus && filters.customerStatus !== 'all') {
        params.customerStatus = filters.customerStatus;
      }
      if (filters.conversationType && filters.conversationType !== 'all') {
        params.conversationType = filters.conversationType;
      }

      const response = await api.get('/auto-reply/contacts-with-greeting', {
        params,
      });

      if (response.data) {
        setItems(response.data.data || []);
        setTotal(response.data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch contacts with greeting:', err);
      setError(err?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filters]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const updateRole = useCallback(
    async (contactId: number, role: ContactRole) => {
      await api.patch(`/auto-reply/contacts/${contactId}/role`, { role });
      await fetchContacts();
    },
    [fetchContacts]
  );

  const toggleAutoReply = useCallback(
    async (contactId: number, enabled: boolean) => {
      await api.patch(`/auto-reply/contacts/${contactId}/auto-reply`, {
        enabled,
      });
      await fetchContacts();
    },
    [fetchContacts]
  );

  const updateGreeting = useCallback(
    async (
      contactId: number,
      data: {
        salutation?: string;
        greetingMessage?: string;
        greetingIsActive?: number;
      }
    ) => {
      await api.patch(`/auto-reply/contacts/${contactId}/greeting`, data);
      await fetchContacts();
    },
    [fetchContacts]
  );

  return {
    items,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilters,
    loading,
    error,
    fetchContacts,
    updateRole,
    toggleAutoReply,
    updateGreeting,
  };
}
