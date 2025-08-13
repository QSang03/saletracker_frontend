import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function useAutoReplySettings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Optional: if backend has a settings endpoint; else keep local
  const { data } = await api.get<{ enabled: boolean } | undefined>('auto-reply/settings');
      if (data && typeof data.enabled === 'boolean') setEnabled(data.enabled);
    } catch (e: any) {
      // silently ignore if endpoint not available
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (value: boolean, contactIds?: number[] | 'ALL') => {
    setEnabled(value);
    try {
      // Prefer bulk API if available
      if (contactIds) {
        await api.patch('auto-reply/contacts/auto-reply-bulk', { contactIds, enabled: value });
      } else {
        await api.patch('auto-reply/settings', { enabled: value });
      }
    } catch (e) {
      // rollback only UI; not failing hard
      setEnabled(prev => prev);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { enabled, setEnabled, loading, error, fetch, update };
}
