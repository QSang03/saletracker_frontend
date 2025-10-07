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
}

export function useMultiUserConversations(
  params: UseMultiUserConversationsParams
): UseMultiUserConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (params.userIds.length === 0) {
      setConversations([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token');
      }

      // Gọi API cho từng user ID
      const fetchPromises = params.userIds.map(async (userId) => {
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
        return result.data || [];
      });

      // Đợi tất cả API calls hoàn thành
      const allResults = await Promise.all(fetchPromises);

      // Merge tất cả conversations lại
      const mergedConversations: Conversation[] = allResults.flat();

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

      setConversations(uniqueConversations);
      setTotalCount(uniqueConversations.length);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching multi-user conversations:', err);
        setError(err.message || 'Failed to fetch conversations');
      }
    } finally {
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
    fetchData();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    conversations,
    isLoading,
    error,
    totalCount,
  };
}

