import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GroupMember, GroupMembersResponse } from '@/types/zalo-chat';
import { getAccessToken } from '@/lib/auth';

export type GroupMemberSortBy =
  | 'joined_at'
  | 'last_seen_at'
  | 'display_name'
  | 'role'
  | 'message_count'
  | 'is_online'
  | 'is_admin';

export interface UseGroupMembersParams {
  conversation_id: number; // path param
  sort_by?: GroupMemberSortBy;
  sort_order?: 'asc' | 'desc';
  role?: 'admin' | 'moderator' | 'member' | 'owner' | null;
  is_admin?: boolean | null;
  is_online?: boolean | null;
  is_muted?: boolean | null;
  is_blocked?: boolean | null;
  has_avatar?: boolean | null;
  joined_from_date?: string | null; // YYYY-MM-DD
  joined_to_date?: string | null;   // YYYY-MM-DD
  last_seen_from_date?: string | null; // YYYY-MM-DD
  last_seen_to_date?: string | null;   // YYYY-MM-DD
  min_message_count?: number | null;
  max_message_count?: number | null;
  search?: string | null;
}

export interface UseGroupMembersResult {
  members: GroupMember[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildQuery(params: UseGroupMembersParams): string {
  const q = new URLSearchParams();
  if (params.sort_by) q.set('sort_by', params.sort_by);
  if (params.sort_order) q.set('sort_order', params.sort_order);
  if (params.role) q.set('role', params.role);
  if (params.is_admin !== undefined && params.is_admin !== null) q.set('is_admin', String(params.is_admin));
  if (params.is_online !== undefined && params.is_online !== null) q.set('is_online', String(params.is_online));
  if (params.is_muted !== undefined && params.is_muted !== null) q.set('is_muted', String(params.is_muted));
  if (params.is_blocked !== undefined && params.is_blocked !== null) q.set('is_blocked', String(params.is_blocked));
  if (params.has_avatar !== undefined && params.has_avatar !== null) q.set('has_avatar', String(params.has_avatar));
  if (params.joined_from_date) q.set('joined_from_date', params.joined_from_date);
  if (params.joined_to_date) q.set('joined_to_date', params.joined_to_date);
  if (params.last_seen_from_date) q.set('last_seen_from_date', params.last_seen_from_date);
  if (params.last_seen_to_date) q.set('last_seen_to_date', params.last_seen_to_date);
  if (params.min_message_count !== undefined && params.min_message_count !== null) q.set('min_message_count', String(params.min_message_count));
  if (params.max_message_count !== undefined && params.max_message_count !== null) q.set('max_message_count', String(params.max_message_count));
  if (params.search) q.set('search', params.search);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function useGroupMembers(params: UseGroupMembersParams | null): UseGroupMembersResult {

  const [members, setMembers] = useState<GroupMember[]>([]);
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
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/conversation/${params.conversation_id}/members${qs}`;
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

      const json: GroupMembersResponse = await res.json();
      setMembers(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load group members');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (!params?.conversation_id) return;
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [params?.conversation_id, params?.sort_by, params?.sort_order]);

  const refetch = useCallback(() => {
    refreshRef.current++;
    fetchData();
  }, [fetchData]);

  return { members, isLoading, error, refetch };
}


