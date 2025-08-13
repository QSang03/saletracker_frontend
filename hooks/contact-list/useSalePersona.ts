import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SalesPersona } from '@/types/auto-reply';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

export function useSalePersona() {
  const [persona, setPersona] = useState<SalesPersona | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useCurrentUser();

  const fetchPersona = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = currentUser?.id;
      const qs = userId ? `?userId=${userId}` : '';
      const { data } = await api.get<SalesPersona>(`auto-reply/persona/me${qs}`);
      setPersona(data ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load persona');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const upsertPersona = useCallback(async (payload: Partial<SalesPersona> & { userId?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const withUser = { ...payload, userId: payload.userId ?? currentUser?.id } as any;
      if (persona?.personaId) {
        const { data } = await api.patch<SalesPersona>(`auto-reply/persona/${persona.personaId}`, withUser);
        setPersona(data);
      } else {
        const { data } = await api.post<SalesPersona>('auto-reply/persona', withUser);
        setPersona(data);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save persona');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [persona, currentUser?.id]);

  return { persona, loading, error, fetchPersona, upsertPersona };
}
