import { useCallback, useEffect, useState, useRef } from 'react';
import { Conversation } from '@/types/zalo-chat';
import { getAccessToken } from '@/lib/auth';
import { ConversationType } from './useConversations';

interface UseMultiUserConversationsParams {
  userIds: number[]; // Array of user IDs to fetch conversations for
  page?: number;
  limit?: number;
  search?: string;
  conversation_type?: ConversationType | null;
  sort_by?: 'last_message_timestamp' | 'created_at';
  sort_order?: 'asc' | 'desc';
  refreshKey?: number;
}

interface UseMultiUserConversationsResult {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  refetch: (silent?: boolean) => void;
}

export function useMultiUserConversations(
  params: UseMultiUserConversationsParams
): UseMultiUserConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const refreshRef = useRef(0);

  const fetchData = useCallback(async (silent = false) => {
    if (params.userIds.length === 0) {
      setConversations([]);
      setTotalCount(0);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
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
      if (!token) {
        throw new Error('No access token');
      }

      // Gọi API tuần tự cho từng user ID để tránh quá tải database connections
      const allResults = [];
      for (const userId of params.userIds) {
        const queryParams = new URLSearchParams();
        queryParams.set('user_id', String(userId));
        queryParams.set('page', String(params.page || 1));
        queryParams.set('limit', String(params.limit || 20));
        if (params.search) queryParams.set('search', params.search);
        if (params.conversation_type) queryParams.set('conversation_type', params.conversation_type);
        queryParams.set('sort_by', params.sort_by || 'last_message_timestamp');
        queryParams.set('sort_order', params.sort_order || 'desc');

        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/conversations?${queryParams.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai',
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch conversations for user ${userId}`);
        }

        const result = await response.json();
        allResults.push({
          data: result.data || [],
          pagination: result.pagination || null
        });
      }

      // Merge tất cả conversations lại
      const mergedConversations: Conversation[] = allResults.flatMap(r => r.data);

      // Remove duplicates (cùng zalo_conversation_id)
      const uniqueConversations = mergedConversations.reduce((acc, conv) => {
        if (!acc.find(c => c.zalo_conversation_id === conv.zalo_conversation_id)) {
          acc.push(conv);
        }
        return acc;
      }, [] as Conversation[]);

      // Sort theo last_message_timestamp (descending)
      uniqueConversations.sort((a, b) => {
        const timeA = new Date(a.last_message_timestamp || 0).getTime();
        const timeB = new Date(b.last_message_timestamp || 0).getTime();
        return timeB - timeA;
      });

      // Determine hasMore: true if ANY user has more pages
      const anyUserHasMore = allResults.some(result => {
        if (!result.pagination) return false;
        const { page, total_pages } = result.pagination;
        return page < total_pages;
      });

      setConversations(uniqueConversations);
      setTotalCount(uniqueConversations.length);
      setHasMore(anyUserHasMore);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching multi-user conversations:', err);
        setError(err.message || 'Failed to fetch conversations');
      }
    } finally {
      // Luôn clear loading state để tránh animation bị stuck
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [
    params.userIds.join(','),
    params.page,
    params.limit,
    params.search,
    params.conversation_type,
    params.sort_by,
    params.sort_order,
    params.refreshKey,
  ]);

  useEffect(() => {
    // Defer fetch to next tick to avoid dev StrictMode double-invoke causing a canceled initial request
    const timer = setTimeout(() => {
      fetchData();
    }, 0);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback((silent = false) => {
    refreshRef.current++;
    fetchData(silent);
  }, [fetchData]);

  return {
    conversations,
    isLoading,
    error,
    totalCount,
    hasMore,
    refetch,
  };
}

