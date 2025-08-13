import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AutoReplyContact, ContactRole } from "@/types/auto-reply";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { getAccessToken, getUserFromToken } from "@/lib/auth";
import { useDebounce } from "@/hooks/useDebounce";

export function useContactsPaginated() {
  const [items, setItems] = useState<AutoReplyContact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === "undefined") return 10;
    const v = Number(localStorage.getItem("autoReplyContacts.pageSize"));
    return Number.isFinite(v) && v > 0 ? v : 10;
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribe, unsubscribe, isConnected } = useWebSocketContext();
  const debouncedSearch = useDebounce(search, 300);

  const userId = useMemo(() => {
    const token = getAccessToken();
    if (!token) return undefined;
    const u = getUserFromToken(token);
    return u?.id ? Number(u.id) : undefined;
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{
        items: AutoReplyContact[];
        total: number;
        page: number;
        limit: number;
      }>("auto-reply/contacts.paginated", {
        params: {
          page,
          limit: pageSize,
      search: debouncedSearch || undefined,
          mine: "1",
          userId,
        },
      });
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e: any) {
      setError(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, userId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Reset to page 1 on search change
  useEffect(() => {
    setPage(1);
  }, [search]);

  const setPageSizeAndPersist = (sz: number) => {
    setPageSize(sz);
    if (typeof window !== "undefined") {
      localStorage.setItem("autoReplyContacts.pageSize", String(sz));
    }
  };

  const updateRole = async (contactId: number, role: ContactRole) => {
    await api.patch(`auto-reply/contacts/${contactId}/role`, { role });
    setItems((prev) =>
      prev.map((c) => (c.contactId === contactId ? { ...c, role } : c))
    );
  };

  const toggleAutoReply = async (contactId: number, enabled: boolean) => {
    await api.patch(`auto-reply/contacts/${contactId}/auto-reply`, {
      enabled,
    });
    setItems((prev) =>
      prev.map((c) =>
        c.contactId === contactId ? { ...c, autoReplyOn: enabled } : c
      )
    );
  };

  // Realtime updates
  useEffect(() => {
    const onContactUpdated = (payload: {
      contactId: number;
      patch: Partial<AutoReplyContact>;
    }) => {
      const { contactId, patch } = payload;
      setItems((prev) =>
        prev.map((c) => (c.contactId === contactId ? { ...c, ...patch } : c))
      );
    };
    const onContactsBulkUpdated = (payload: {
      contactIds: number[];
      patch: Partial<AutoReplyContact>;
    }) => {
      const { contactIds, patch } = payload;
      const setIds = new Set(contactIds);
      setItems((prev) =>
        prev.map((c) => (setIds.has(c.contactId) ? { ...c, ...patch } : c))
      );
    };

    subscribe("autoReply:contactUpdated", onContactUpdated as any);
    subscribe("autoReply:contactsBulkUpdated", onContactsBulkUpdated as any);
    return () => {
      unsubscribe("autoReply:contactUpdated", onContactUpdated as any);
      unsubscribe(
        "autoReply:contactsBulkUpdated",
        onContactsBulkUpdated as any
      );
    };
  }, [subscribe, unsubscribe, isConnected]);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    search,
    setPage,
    setPageSize: setPageSizeAndPersist,
    setSearch,
    fetchContacts,
    updateRole,
    toggleAutoReply,
  };
}
