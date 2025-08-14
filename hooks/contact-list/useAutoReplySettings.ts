import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getAccessToken, getUserFromToken } from '@/lib/auth';

export function useAutoReplySettings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to read from current user (me) endpoint; fallback to settings if exists
      const token = getAccessToken();
      const u = token ? getUserFromToken(token) : null;
      if (u?.id) {
        try {
          const { data } = await api.get(`/users/${u.id}`);
          if (data && typeof data.isAutoReplyEnabled === 'boolean') {
            setEnabled(!!data.isAutoReplyEnabled);
            return;
          }
        } catch {}
      }
      // Fallback legacy
      const { data } = await api.get<{ enabled: boolean } | undefined>('auto-reply/settings');
      if (data && typeof data.enabled === 'boolean') setEnabled(data.enabled);
    } catch (e: any) {
      // silently ignore if endpoint not available
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (value: boolean) => {
    setEnabled(value);
    try {
      const token = getAccessToken();
      const u = token ? getUserFromToken(token) : null;
      if (u?.id) {
        await api.patch(`/users/${u.id}`, { isAutoReplyEnabled: value });
      } else {
        await api.patch('auto-reply/settings', { enabled: value });
      }
    } catch (e) {
      // keep current state; server may reject
      setEnabled(prev => prev);
      throw e;
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { enabled, setEnabled, loading, error, fetch, update };
}
