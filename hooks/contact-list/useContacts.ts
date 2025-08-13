import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AutoReplyContact, ContactRole } from "@/types/auto-reply";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { getAccessToken, getUserFromToken } from "@/lib/auth";

export function useContacts() {
  const [contacts, setContacts] = useState<AutoReplyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribe, unsubscribe, isConnected } = useWebSocketContext();

const fetchContacts = useCallback(
    async (userId?: number) => {
        setLoading(true);
        setError(null);
        try {
            const url = userId
                ? `auto-reply/contacts?userId=${userId}`
                : "auto-reply/contacts";
            const { data } = await api.get<AutoReplyContact[]>(url);
            setContacts(data || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load contacts");
        } finally {
            setLoading(false);
        }
    },
    []
);

  const updateRole = useCallback(
    async (contactId: number, role: ContactRole) => {
      await api.patch(`auto-reply/contacts/${contactId}/role`, { role });
      setContacts((prev) =>
        prev.map((c) => (c.contactId === contactId ? { ...c, role } : c))
      );
    },
    []
  );

  const toggleAutoReply = useCallback(
    async (contactId: number, enabled: boolean) => {
      await api.patch(`auto-reply/contacts/${contactId}/auto-reply`, {
        enabled,
      });
      setContacts((prev) =>
        prev.map((c) =>
          c.contactId === contactId ? { ...c, autoReplyOn: enabled } : c
        )
      );
    },
    []
  );
  useEffect(() => {
    // Lấy token từ localStorage
    const token = getAccessToken();
    let userId: number | undefined = undefined;
    if (token) {
      const user = getUserFromToken(token);
      if (user && user.id) {
        userId = Number(user.id);
      }
    }
    fetchContacts(userId);
  }, [fetchContacts]);

  // Realtime updates
  useEffect(() => {
    const onContactUpdated = (payload: {
      contactId: number;
      patch: Partial<AutoReplyContact>;
    }) => {
      const { contactId, patch } = payload;
      setContacts((prev) =>
        prev.map((c) => (c.contactId === contactId ? { ...c, ...patch } : c))
      );
    };
    const onContactsBulkUpdated = (payload: {
      contactIds: number[];
      patch: Partial<AutoReplyContact>;
    }) => {
      const { contactIds, patch } = payload;
      const setIds = new Set(contactIds);
      setContacts((prev) =>
        prev.map((c) => (setIds.has(c.contactId) ? { ...c, ...patch } : c))
      );
    };

    // In case backend emits renameQueued, we may refetch later if needed.

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
    contacts,
    loading,
    error,
    fetchContacts,
    updateRole,
    toggleAutoReply,
  };
}
