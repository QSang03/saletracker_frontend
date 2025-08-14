import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AutoReplyContact, ContactRole } from "@/types/auto-reply";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { getAccessToken, getUserFromToken } from "@/lib/auth";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export function useContacts() {
  const [contacts, setContacts] = useState<AutoReplyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribe, unsubscribe, isConnected } = useWebSocketContext();

  const { currentUser } = useCurrentUser();

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Prefer currentUser context; fallback to token
      let userId: number | undefined = currentUser?.id
        ? Number(currentUser.id)
        : undefined;
      if (!userId) {
        const token = getAccessToken();
        if (token) {
          const u = getUserFromToken(token);
          if (u?.id) userId = Number(u.id);
        }
      }
      if (!userId) throw new Error("Missing userId");
      const url = `auto-reply/contacts?userId=${userId}`;
      const { data } = await api.get<AutoReplyContact[]>(url);
      setContacts(data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

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
    fetchContacts();
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
