import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AutoReplyCustomerProfile } from '@/types/auto-reply';

export function useContactProfile(contactId: number | null) {
  const [profile, setProfile] = useState<AutoReplyCustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    try {
  const { data } = await api.get<AutoReplyCustomerProfile>(`auto-reply/contacts/${contactId}/profile`);
      setProfile(data ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const saveProfile = useCallback(async (patch: Partial<AutoReplyCustomerProfile>) => {
    if (!contactId) return;
  const { data } = await api.patch<AutoReplyCustomerProfile>(`auto-reply/contacts/${contactId}/profile`, patch);
    setProfile(data);
  }, [contactId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return { profile, loading, error, fetchProfile, saveProfile };
}
