import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

/**
 * Hook lấy danh sách ngày nghỉ (holiday) từ backend và gom vào Set<string>
 * Format ngày: YYYY-MM-DD (timezone VN)
 */
export function useHolidays() {
  const [holidaysSet, setHolidaysSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  const parseConfigValue = (value?: string) => {
    if (!value) return [] as Array<{ dates?: string[]; reason?: string }>;
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/system-config/by-section/holiday`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
      });
      if (!res.ok) throw new Error('Fetch holidays failed');
      const data = await res.json();
      // data expected: array of config objects { name, value }
      const set = new Set<string>();
      (Array.isArray(data) ? data : []).forEach((cfg: any) => {
        parseConfigValue(cfg?.value).forEach((entry) => {
          if (Array.isArray(entry?.dates)) {
            entry.dates.forEach((d: string) => {
              if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                set.add(d);
              }
            });
          }
        });
      });
      setHolidaysSet(set);
      loadedRef.current = true;
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      fetchHolidays();
    }
  }, [fetchHolidays]);

  return { holidaysSet, loading, error, refresh: fetchHolidays };
}

export type UseHolidaysResult = ReturnType<typeof useHolidays>;
