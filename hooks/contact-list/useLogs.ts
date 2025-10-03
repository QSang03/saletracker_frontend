import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Conversation, Message } from '@/types/auto-reply';

export function useLogs(contactId: number | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    try {
  const { data } = await api.get<Conversation>(`auto-reply/conversations?contactId=${contactId}`);
      setConversation(data ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const fetchMessages = useCallback(async (p = 1, ps = pageSize) => {
    if (!conversation) return;
    setLoading(true);
    setError(null);
    try {
  const { data } = await api.get<{ items: Message[]; page: number; total?: number }>(`auto-reply/messages?convId=${conversation.convId}&page=${p}&pageSize=${ps}`);
      setMessages(data?.items || []);
      setPage(data?.page || p);
      setTotal(data?.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversation, pageSize]);

  useEffect(() => { fetchConversation(); }, [fetchConversation]);
  useEffect(() => { if (conversation) fetchMessages(1); }, [conversation, fetchMessages]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    fetchMessages(newPage, pageSize);
  }, [fetchMessages, pageSize]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    fetchMessages(1, newPageSize);
  }, [fetchMessages]);

  return { 
    conversation, 
    messages, 
    page, 
    pageSize, 
    total, 
    loading, 
    error, 
    fetchConversation, 
    fetchMessages,
    handlePageChange,
    handlePageSizeChange
  };
}
