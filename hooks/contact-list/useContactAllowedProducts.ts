import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ContactAllowedProduct } from '@/types/auto-reply';

export function useContactAllowedProducts(contactId: number) {
  const [items, setItems] = useState<ContactAllowedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
  const { data } = await api.get<ContactAllowedProduct[]>(`auto-reply/contacts/${contactId}/allowed-products`);
      setItems(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load allowed products');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const patchBulk = useCallback(async (productIds: number[], active: boolean) => {
  await api.patch(`auto-reply/contacts/${contactId}/allowed-products`, { productIds, active });
    setItems(prev => {
      if (active) {
        // Enable: update or add items
        const map = new Map(prev.map(i => [i.productId, i]));
        productIds.forEach(pid => {
          const cur = map.get(pid);
          if (cur) cur.active = active; else map.set(pid, { productId: pid, contactId, active });
        });
        return Array.from(map.values());
      } else {
        // Disable: remove items from state
        return prev.filter(item => !productIds.includes(item.productId));
      }
    });
  }, [contactId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { items, loading, error, fetchAll, patchBulk };
}
