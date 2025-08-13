import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { KeywordRoute, RouteProduct } from '@/types/auto-reply';

export function useKeywordRoutes(contactId?: number | null) {
  const [routes, setRoutes] = useState<KeywordRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = contactId === undefined ? '' : `?contactId=${contactId === null ? 'null' : contactId}`;
  const { data } = await api.get<KeywordRoute[]>(`auto-reply/keywords${q}`);
      setRoutes(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load keyword routes');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const createRoute = useCallback(async (payload: { keyword: string; contactId: number | null; routeProducts: Pick<RouteProduct, 'productId' | 'priority' | 'active'>[]; }) => {
  const { data } = await api.post<KeywordRoute>('auto-reply/keywords', payload);
    setRoutes(prev => [data, ...prev]);
  }, []);

  const createBulk = useCallback(async (payload: { keyword: string; contactIds: number[]; productIds: number[]; defaultPriority?: number; active?: boolean; }) => {
    // Expect backend to return created routes
  const { data } = await api.post<KeywordRoute[]>('auto-reply/keywords/bulk', payload);
    setRoutes(prev => [...data, ...prev]);
  }, []);

  const updateRoute = useCallback(async (routeId: number, patch: Partial<{ keyword: string; active: boolean; routeProducts: RouteProduct[] }>) => {
  const { data } = await api.patch<KeywordRoute>(`auto-reply/keywords/${routeId}`, patch);
    setRoutes(prev => prev.map(r => r.routeId === routeId ? data : r));
  }, []);

  const deleteRoute = useCallback(async (routeId: number) => {
  await api.delete(`auto-reply/keywords/${routeId}`);
    setRoutes(prev => prev.filter(r => r.routeId !== routeId));
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  return { routes, loading, error, fetchRoutes, createRoute, createBulk, updateRoute, deleteRoute };
}
