import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Account } from '@/types/zalo-chat';
import { getAccessToken } from '@/lib/auth';

export interface UseAccountsParams {
  user_id?: number | null;
  is_active?: boolean | null;
  sort_by?: 'created_at' | 'last_active_at' | 'display_name' | 'zalo_username' | 'phone_number' | 'email' | 'login_count' | 'message_count' | 'conversation_count';
  sort_order?: 'asc' | 'desc';
  account_type?: 'personal' | 'business' | 'official' | 'bot' | null;
  account_status?: 'active' | 'inactive' | 'suspended' | 'banned' | 'pending_verification' | null;
  verification_status?: 'verified' | 'unverified' | 'pending' | 'rejected' | null;
  has_phone?: boolean | null;
  has_email?: boolean | null;
  has_avatar?: boolean | null;
  phone_verified?: boolean | null;
  email_verified?: boolean | null;
  created_from_date?: string | null;
  created_to_date?: string | null;
  last_active_from_date?: string | null;
  last_active_to_date?: string | null;
  min_login_count?: number | null;
  max_login_count?: number | null;
  min_message_count?: number | null;
  max_message_count?: number | null;
  min_conversation_count?: number | null;
  max_conversation_count?: number | null;
  country_code?: string | null;
  language?: string | null;
  timezone?: string | null;
}

export interface UseAccountsResult {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => void;
}

function buildQuery(params: UseAccountsParams): string {
  const q = new URLSearchParams();
  if (params.user_id) q.set('user_id', String(params.user_id));
  if (params.is_active !== undefined && params.is_active !== null) q.set('is_active', String(params.is_active));
  if (params.sort_by) q.set('sort_by', params.sort_by);
  if (params.sort_order) q.set('sort_order', params.sort_order);
  if (params.account_type) q.set('account_type', params.account_type);
  if (params.account_status) q.set('account_status', params.account_status);
  if (params.verification_status) q.set('verification_status', params.verification_status);
  if (params.has_phone !== undefined && params.has_phone !== null) q.set('has_phone', String(params.has_phone));
  if (params.has_email !== undefined && params.has_email !== null) q.set('has_email', String(params.has_email));
  if (params.has_avatar !== undefined && params.has_avatar !== null) q.set('has_avatar', String(params.has_avatar));
  if (params.phone_verified !== undefined && params.phone_verified !== null) q.set('phone_verified', String(params.phone_verified));
  if (params.email_verified !== undefined && params.email_verified !== null) q.set('email_verified', String(params.email_verified));
  if (params.created_from_date) q.set('created_from_date', params.created_from_date);
  if (params.created_to_date) q.set('created_to_date', params.created_to_date);
  if (params.last_active_from_date) q.set('last_active_from_date', params.last_active_from_date);
  if (params.last_active_to_date) q.set('last_active_to_date', params.last_active_to_date);
  if (params.min_login_count !== undefined && params.min_login_count !== null) q.set('min_login_count', String(params.min_login_count));
  if (params.max_login_count !== undefined && params.max_login_count !== null) q.set('max_login_count', String(params.max_login_count));
  if (params.min_message_count !== undefined && params.min_message_count !== null) q.set('min_message_count', String(params.min_message_count));
  if (params.max_message_count !== undefined && params.max_message_count !== null) q.set('max_message_count', String(params.max_message_count));
  if (params.min_conversation_count !== undefined && params.min_conversation_count !== null) q.set('min_conversation_count', String(params.min_conversation_count));
  if (params.max_conversation_count !== undefined && params.max_conversation_count !== null) q.set('max_conversation_count', String(params.max_conversation_count));
  if (params.country_code) q.set('country_code', params.country_code);
  if (params.language) q.set('language', params.language);
  if (params.timezone) q.set('timezone', params.timezone);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function useAccounts(params: UseAccountsParams | null): UseAccountsResult {

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState<number>(0);
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
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/accounts${qs}`;
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
      const items: Account[] = Array.isArray(json?.data) ? json.data : [];
      setAccounts(items);
      setTotal(typeof json?.total_count === 'number' ? json.total_count : items.length);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load accounts');
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
  }, [params?.user_id, params?.sort_by, params?.sort_order]);

  const refetch = useCallback(() => {
    refreshRef.current++;
    fetchData();
  }, [fetchData]);

  return { accounts, isLoading, error, total, refetch };
}


