import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SalesPersona } from "@/types/auto-reply";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export function useSalePersonas(autoLoad = true) {
  const [personas, setPersonas] = useState<SalesPersona[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useCurrentUser();

  const fetchPersonas = useCallback(async () => {
    if (!currentUser?.id) return; // Wait until user is available
    setLoading(true);
    setError(null);
    try {
      const userId = currentUser.id;
      const qs = `?userId=${userId}`;
      const { data } = await api.get<SalesPersona[]>(`auto-reply/personas${qs}`);
      setPersonas(data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load personas");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (autoLoad) fetchPersonas();
  }, [autoLoad, fetchPersonas]);

  return { personas, loading, error, fetchPersonas, setPersonas };
}
