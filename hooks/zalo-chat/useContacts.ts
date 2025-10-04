import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Contact, PaginationMeta } from '@/types/zalo-chat';
import { getAccessToken } from '@/lib/auth';

export interface UseContactsParams {
  user_id: number;
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: 'display_name' | 'created_at' | 'zalo_contact_id' | 'phone_number' | 'last_active_at' | 'is_favorite' | 'contact_type';
  sort_order?: 'asc' | 'desc';
  contact_type?: 'friend' | 'stranger' | 'blocked' | 'pending' | 'business' | 'official' | null;
  is_favorite?: boolean | null;
  is_blocked?: boolean | null;
  is_online?: boolean | null;
  has_avatar?: boolean | null;
  has_phone?: boolean | null;
  gender?: 'male' | 'female' | 'other' | null;
  age_min?: number | null;
  age_max?: number | null;
  city?: string | null;
  province?: string | null;
  relationship_status?: 'single' | 'married' | 'in_relationship' | 'divorced' | null;
  last_active_days?: number | null;
  created_from_date?: string | null;
  created_to_date?: string | null;
  phone_prefix?: string | null;
  has_conversation?: boolean | null;
  conversation_count_min?: number | null;
  conversation_count_max?: number | null;
}

export interface UseContactsResult {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  refetch: () => void;
}

function buildQuery(params: UseContactsParams): string {
  const q = new URLSearchParams();
  q.set('user_id', String(params.user_id));
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.sort_by) q.set('sort_by', params.sort_by);
  if (params.sort_order) q.set('sort_order', params.sort_order);
  if (params.contact_type) q.set('contact_type', params.contact_type);
  if (params.is_favorite !== undefined && params.is_favorite !== null) q.set('is_favorite', String(params.is_favorite));
  if (params.is_blocked !== undefined && params.is_blocked !== null) q.set('is_blocked', String(params.is_blocked));
  if (params.is_online !== undefined && params.is_online !== null) q.set('is_online', String(params.is_online));
  if (params.has_avatar !== undefined && params.has_avatar !== null) q.set('has_avatar', String(params.has_avatar));
  if (params.has_phone !== undefined && params.has_phone !== null) q.set('has_phone', String(params.has_phone));
  if (params.gender) q.set('gender', params.gender);
  if (params.age_min !== undefined && params.age_min !== null) q.set('age_min', String(params.age_min));
  if (params.age_max !== undefined && params.age_max !== null) q.set('age_max', String(params.age_max));
  if (params.city) q.set('city', params.city);
  if (params.province) q.set('province', params.province);
  if (params.relationship_status) q.set('relationship_status', params.relationship_status);
  if (params.last_active_days !== undefined && params.last_active_days !== null) q.set('last_active_days', String(params.last_active_days));
  if (params.created_from_date) q.set('created_from_date', params.created_from_date);
  if (params.created_to_date) q.set('created_to_date', params.created_to_date);
  if (params.phone_prefix) q.set('phone_prefix', params.phone_prefix);
  if (params.has_conversation !== undefined && params.has_conversation !== null) q.set('has_conversation', String(params.has_conversation));
  if (params.conversation_count_min !== undefined && params.conversation_count_min !== null) q.set('conversation_count_min', String(params.conversation_count_min));
  if (params.conversation_count_max !== undefined && params.conversation_count_max !== null) q.set('conversation_count_max', String(params.conversation_count_max));
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function useContacts(params: UseContactsParams | null): UseContactsResult {

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!params) return;
    if (abortRef.current) abortRef.current.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token available');

      const qs = buildQuery(params);
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/contacts${qs}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai',
          'Authorization': `Bearer ${token}`,
        },
        signal: abortController.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
      }

      const json = await res.json();
      const items: Contact[] = Array.isArray(json?.data) ? json.data : [];
      setContacts(items);
      setPagination(json?.pagination || null);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (!params?.user_id) return;
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [params?.user_id, params?.page, params?.limit, params?.search, params?.sort_by, params?.sort_order]);

  const refetch = useCallback(() => {
    refreshRef.current++;
    fetchData();
  }, [fetchData]);

  return { contacts, isLoading, error, pagination, refetch };
}


