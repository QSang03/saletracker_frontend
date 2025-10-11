import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

export interface UseSystemConfigResult {
  value: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch a system config by name
 * @param name - The name of the system config to fetch
 * @returns The config value, loading state, error, and refetch function
 */
export function useSystemConfig(name: string | null): UseSystemConfigResult {
  const [value, setValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!name) {
      setValue(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token available');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-config/${encodeURIComponent(name)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch config: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setValue(data?.value || null);
    } catch (e: any) {
      console.error(`Error fetching system config "${name}":`, e);
      setError(e?.message || 'Failed to fetch config');
      setValue(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [name]);

  return { value, isLoading, error, refetch: fetchConfig };
}

