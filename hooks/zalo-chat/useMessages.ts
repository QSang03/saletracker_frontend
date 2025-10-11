import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Message, MessagesResponse, PaginationMeta } from '@/types/zalo-chat';
import { getAccessToken } from '@/lib/auth';

export type MessageContentType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'FILE'
  | 'STICKER'
  | 'LOCATION'
  | 'CONTACT'
  | 'SYSTEM'
  | 'QUOTE';

export interface UseMessagesParams {
  conversation_id: number;
  page?: number;
  limit?: number;
  search?: string;
  content_type?: MessageContentType | null;
  from_date?: string | null; // YYYY-MM-DD
  to_date?: string | null;   // YYYY-MM-DD
  from_time?: string | null; // HH:MM:SS
  to_time?: string | null;   // HH:MM:SS
  sort_by?: 'timestamp' | 'created_at' | 'content' | 'sender_id' | 'message_type' | 'file_size';
  sort_order?: 'asc' | 'desc';
  include_quotes?: boolean;
  sender_id?: number | null;
  is_edited?: boolean | null;
  is_deleted?: boolean | null;
  has_attachment?: boolean | null;
  min_file_size?: number | null;
  max_file_size?: number | null;
  file_extensions?: string | null; // comma separated
  is_forwarded?: boolean | null;
  is_reply?: boolean | null;
  reaction_type?: string | null;
  is_starred?: boolean | null;
}

export interface UseMessagesResult {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  refetch: (silent?: boolean) => void; // silent = true to skip loading animation
}

function buildQuery(params: UseMessagesParams): string {
  const q = new URLSearchParams();
  q.set('conversation_id', String(params.conversation_id));
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.content_type) q.set('content_type', params.content_type);
  if (params.from_date) q.set('from_date', params.from_date);
  if (params.to_date) q.set('to_date', params.to_date);
  if (params.from_time) q.set('from_time', params.from_time);
  if (params.to_time) q.set('to_time', params.to_time);
  if (params.sort_by) q.set('sort_by', params.sort_by);
  if (params.sort_order) q.set('sort_order', params.sort_order);
  if (params.include_quotes !== undefined && params.include_quotes !== null) q.set('include_quotes', String(params.include_quotes));
  if (params.sender_id !== undefined && params.sender_id !== null) q.set('sender_id', String(params.sender_id));
  if (params.is_edited !== undefined && params.is_edited !== null) q.set('is_edited', String(params.is_edited));
  if (params.is_deleted !== undefined && params.is_deleted !== null) q.set('is_deleted', String(params.is_deleted));
  if (params.has_attachment !== undefined && params.has_attachment !== null) q.set('has_attachment', String(params.has_attachment));
  if (params.min_file_size !== undefined && params.min_file_size !== null) q.set('min_file_size', String(params.min_file_size));
  if (params.max_file_size !== undefined && params.max_file_size !== null) q.set('max_file_size', String(params.max_file_size));
  if (params.file_extensions) q.set('file_extensions', params.file_extensions);
  if (params.is_forwarded !== undefined && params.is_forwarded !== null) q.set('is_forwarded', String(params.is_forwarded));
  if (params.is_reply !== undefined && params.is_reply !== null) q.set('is_reply', String(params.is_reply));
  if (params.reaction_type) q.set('reaction_type', params.reaction_type);
  if (params.is_starred !== undefined && params.is_starred !== null) q.set('is_starred', String(params.is_starred));
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function useMessages(params: UseMessagesParams | null): UseMessagesResult {

  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!params) return;
    // Only abort if there was a previous in-flight request and params truly changed
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }
    const abortController = new AbortController();
    abortRef.current = abortController;

    // Chỉ set loading state nếu không phải silent mode
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token available');

      const qs = buildQuery(params);
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/messages${qs}`;
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

      const json: MessagesResponse = await res.json();
      setMessages(Array.isArray(json?.data) ? json.data : []);
      setPagination(json?.pagination || null);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load messages');
    } finally {
      // Luôn clear loading state để tránh animation bị stuck
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (!params?.conversation_id) return;
    fetchData();
    return () => {
      // Do not abort here to avoid 'canceled' first request in some browsers
    };
  }, [
    params?.conversation_id,
    params?.page,
    params?.limit,
    params?.sort_by,
    params?.sort_order,
    params?.include_quotes,
    params?.search,
    fetchData,
  ]);

  const refetch = useCallback((silent = false) => {
    refreshRef.current++;
    fetchData(silent);
  }, [fetchData]);

  return { messages, isLoading, error, pagination, refetch };
}


