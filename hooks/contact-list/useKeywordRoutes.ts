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

  const createRoute = useCallback(async (
    payload: { keyword: string; contactId: number | null; routeProducts: Pick<RouteProduct, 'productId' | 'priority' | 'active'>[]; },
    options?: { userId?: number }
  ) => {
    // Backend may return a single route or an array (GLOBAL fan-out)
    const qs = payload.contactId === null && options?.userId != null ? `?userId=${options.userId}` : '';
    const { data } = await api.post<KeywordRoute | KeywordRoute[]>(`auto-reply/keywords${qs}`, payload);
    setRoutes(prev => {
      if (Array.isArray(data)) return [...data, ...prev];
      return [data, ...prev];
    });
    // Optional: ensure consistency by refreshing after bulk fan-out
    if (Array.isArray(data)) await fetchRoutes();
  }, [fetchRoutes]);

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

  // Grouped operations across all contacts for current user
  const renameAll = useCallback(async (oldKeyword: string, newKeyword: string, userId?: number) => {
    const qs = userId != null ? `?userId=${userId}` : '';
    await api.post(`auto-reply/keywords/rename-all${qs}`, { oldKeyword, newKeyword });
    await fetchRoutes();
  }, [fetchRoutes]);

  const setActiveAll = useCallback(async (keyword: string, active: boolean, userId?: number) => {
    const qs = userId != null ? `?userId=${userId}` : '';
    await api.patch(`auto-reply/keywords/active-all${qs}`, { keyword, active });
    await fetchRoutes();
  }, [fetchRoutes]);

  const reorderProductsAll = useCallback(async (keyword: string, productIds: number[], userId?: number) => {
    const qs = userId != null ? `?userId=${userId}` : '';
    await api.patch(`auto-reply/keywords/reorder-products${qs}`, { keyword, productIds });
    await fetchRoutes();
  }, [fetchRoutes]);

  const deleteAll = useCallback(async (keyword: string, userId?: number) => {
    const qs = userId != null ? `?userId=${userId}` : '';
    await api.post(`auto-reply/keywords/delete-all${qs}`, { keyword });
    // Optimistic: remove from local state
    setRoutes(prev => prev.filter(r => r.keyword !== keyword));
  }, []);

  // New: manage products for a keyword across all contacts of current user
  const addProductsAll = useCallback(async (keyword: string, productIds: number[], userId?: number) => {
    const qs = userId != null ? `?userId=${userId}` : '';
    await api.post(`auto-reply/keywords/add-products${qs}`, { keyword, productIds });
    await fetchRoutes();
  }, [fetchRoutes]);

  const removeProductsAll = useCallback(async (keyword: string, productIds: number[], userId?: number) => {
    const qs = userId != null ? `?userId=${userId}` : '';
    await api.post(`auto-reply/keywords/remove-products${qs}`, { keyword, productIds });
    await fetchRoutes();
  }, [fetchRoutes]);

  const setProductsAll = useCallback(async (keyword: string, productIds: number[], userId?: number) => {
    const qs = userId != null ? `?userId=${userId}` : '';
    await api.post(`auto-reply/keywords/set-products${qs}`, { keyword, productIds });
    await fetchRoutes();
  }, [fetchRoutes]);

  // Per-route (single contact) product management
  const addProductsToRoute = useCallback(async (routeId: number, productIds: number[]) => {
    await api.post(`auto-reply/keywords/${routeId}/add-products`, { productIds });
    await fetchRoutes();
  }, [fetchRoutes]);

  const removeProductsFromRoute = useCallback(async (routeId: number, productIds: number[]) => {
    await api.post(`auto-reply/keywords/${routeId}/remove-products`, { productIds });
    await fetchRoutes();
  }, [fetchRoutes]);

  const setProductsForRoute = useCallback(async (routeId: number, productIds: number[]) => {
    await api.post(`auto-reply/keywords/${routeId}/set-products`, { productIds });
    await fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  return {
    routes,
    loading,
    error,
    fetchRoutes,
    createRoute,
    createBulk,
    updateRoute,
    deleteRoute,
    renameAll,
    setActiveAll,
    reorderProductsAll,
    deleteAll,
  addProductsAll,
  removeProductsAll,
  setProductsAll,
  addProductsToRoute,
  removeProductsFromRoute,
  setProductsForRoute,
  };
}
