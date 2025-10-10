import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Conversation, ConversationsResponse, PaginationMeta } from '@/types/zalo-chat';
import { getAccessToken } from '@/lib/auth';

export type ConversationType = 'private' | 'group' | 'official' | 'business' | 'bot';

export interface UseConversationsParams {
  userId: number | undefined; // undefined = không truyền user_id (admin/view/manager)
  isManager?: boolean; // true = manager mode
  page?: number;
  limit?: number;
  search?: string;
  conversation_type?: ConversationType | null;
  sort_by?: 'last_message_timestamp' | 'created_at' | 'conversation_name' | 'unread_count' | 'member_count' | 'is_pinned';
  sort_order?: 'asc' | 'desc';
  is_pinned?: boolean | null;
  is_muted?: boolean | null;
  is_archived?: boolean | null;
  has_unread?: boolean | null;
  from_date?: string | null; // YYYY-MM-DD
  to_date?: string | null;   // YYYY-MM-DD
  min_members?: number | null;
  max_members?: number | null;
  refreshKey?: number; // Force refresh key
}

export interface UseConversationsResult {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  refetch: () => void;
}

function buildQuery(params: UseConversationsParams): string {
  const q = new URLSearchParams();
  // Chỉ thêm user_id nếu userId không phải undefined
  if (params.userId !== undefined) {
    q.set('user_id', String(params.userId));
  }
  // Thêm is_manager=true nếu là manager mode
  if (params.isManager === true) {
    q.set('is_manager', 'true');
  }
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.conversation_type) q.set('conversation_type', params.conversation_type);
  if (params.sort_by) q.set('sort_by', params.sort_by);
  if (params.sort_order) q.set('sort_order', params.sort_order);
  if (params.is_pinned !== undefined && params.is_pinned !== null) q.set('is_pinned', String(params.is_pinned));
  if (params.is_muted !== undefined && params.is_muted !== null) q.set('is_muted', String(params.is_muted));
  if (params.is_archived !== undefined && params.is_archived !== null) q.set('is_archived', String(params.is_archived));
  if (params.has_unread !== undefined && params.has_unread !== null) q.set('has_unread', String(params.has_unread));
  if (params.from_date) q.set('from_date', params.from_date);
  if (params.to_date) q.set('to_date', params.to_date);
  if (params.min_members !== undefined && params.min_members !== null) q.set('min_members', String(params.min_members));
  if (params.max_members !== undefined && params.max_members !== null) q.set('max_members', String(params.max_members));
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function useConversations(params: UseConversationsParams): UseConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Tạo query string để so sánh và tránh re-fetch không cần thiết
  const queryString = useMemo(() => buildQuery(params), [
    params.userId,
    params.isManager,
    params.page,
    params.limit,
    params.search,
    params.conversation_type,
    params.sort_by,
    params.sort_order,
    params.is_pinned,
    params.is_muted,
    params.is_archived,
    params.has_unread,
    params.from_date,
    params.to_date,
    params.min_members,
    params.max_members,
    params.refreshKey,
  ]);

  const fetchData = useCallback(async () => {
    // Chỉ abort nếu có request đang chạy và params thực sự thay đổi
    if (abortRef.current && refreshRef.current > 0) {
      abortRef.current.abort();
    }
    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token available');

      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/conversations${queryString}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai',
        },
        signal: abortController.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
      }

      const json: ConversationsResponse = await res.json();
      const conversationsData = Array.isArray(json?.data) ? json.data : [];
      setConversations(conversationsData);
      setPagination(json?.pagination || null);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (!params) return;
    // Defer fetch to next tick to avoid dev StrictMode double-invoke causing a canceled initial request
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [queryString, fetchData]);

  const refetch = useCallback(() => {
    refreshRef.current++;
    fetchData();
  }, [fetchData]);

  return { conversations, isLoading, error, pagination, refetch };
}



