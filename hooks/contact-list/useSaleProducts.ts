import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AutoReplyProduct } from '@/types/auto-reply';
import { useDebounce } from '@/hooks/useDebounce';

type ProductsMeta = { brands: string[]; cates: string[] };

export function useSaleProducts() {
  const [items, setItems] = useState<AutoReplyProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === 'undefined') return 20;
    const v = Number(localStorage.getItem('saleProducts.pageSize'));
    return Number.isFinite(v) && v > 0 ? v : 20;
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [cateFilters, setCateFilters] = useState<string[]>([]);
  const [meta, setMeta] = useState<ProductsMeta>({ brands: [], cates: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeta = useCallback(async () => {
    try {
      const { data } = await api.get<ProductsMeta>('auto-reply/products.meta');
      setMeta({ brands: data?.brands || [], cates: data?.cates || [] });
    } catch {
      // ignore meta errors
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ items: AutoReplyProduct[]; total: number; page: number; limit: number }>('auto-reply/products.paginated', {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch || undefined,
          brands: brandFilters,
          cates: cateFilters,
        },
        paramsSerializer: {
          // ensure arrays are serialized as repeated params: brands=a&brands=b
          serialize: (params) => {
            const usp = new URLSearchParams();
            Object.entries(params as Record<string, any>).forEach(([k, v]) => {
              if (v === undefined || v === null) return;
              if (Array.isArray(v)) {
                v.forEach((vv) => usp.append(k, String(vv)));
              } else {
                usp.append(k, String(v));
              }
            });
            return usp.toString();
          },
        },
      });
  setItems(data?.items || []);
  setTotal(data?.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, brandFilters, cateFilters]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, brandFilters, cateFilters]);

  const setPageSizeAndPersist = useCallback((sz: number) => {
    setPageSize(sz);
    if (typeof window !== 'undefined') {
      localStorage.setItem('saleProducts.pageSize', String(sz));
    }
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    search,
    brandFilters,
    cateFilters,
    meta,
    setPage,
    setPageSize: setPageSizeAndPersist,
    setSearch,
    setBrandFilters,
    setCateFilters,
    fetchProducts,
  };
}
