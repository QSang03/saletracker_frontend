import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

export type SearchType = 'all' | 'conversations' | 'messages' | 'contacts' | 'files' | 'images' | 'videos' | 'locations';

export interface UseSearchParams {
  q: string;
  user_id?: number | null;
  type?: SearchType;
  limit?: number;
  exact_match?: boolean;
  case_sensitive?: boolean;
  include_archived?: boolean;
}

export interface SearchResultItem {
  [key: string]: any;
}

export interface UseSearchResult<T = any> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildQuery(params: UseSearchParams): string {
  const q = new URLSearchParams();
  q.set('q', params.q);
  if (params.user_id) q.set('user_id', String(params.user_id));
  if (params.type) q.set('type', params.type);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.exact_match !== undefined) q.set('exact_match', String(params.exact_match));
  if (params.case_sensitive !== undefined) q.set('case_sensitive', String(params.case_sensitive));
  if (params.include_archived !== undefined) q.set('include_archived', String(params.include_archived));
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function useSearch<T = any>(params: UseSearchParams | null): UseSearchResult<T> {

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!params) return;

    // Always abort any in-flight request when params change
    if (abortRef.current) abortRef.current.abort();

    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token available');

      const qs = buildQuery(params);
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/search${qs}`;
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
      setData(json?.data as T);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to search');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const q = params?.q?.trim();

    // Always clear any pending debounce when params change
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If no query, reset loading state and abort any in-flight request
    if (!q) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setIsLoading(false);
      return;
    }

    // Show loading immediately during the 2s debounce window
    setIsLoading(true);

    // Enforce a 2s delay before calling API
    timeoutRef.current = setTimeout(() => {
      fetchData();
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (abortRef.current) abortRef.current.abort();
    };
  }, [params?.q, params?.user_id, params?.type, params?.limit, fetchData]);

  const refetch = useCallback(() => {
    refreshRef.current++;
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}


