// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from "react";
import { getAccessToken, getUserFromToken } from "@/lib/auth";
import type { Notification } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface NotificationResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markManyAsRead: (ids: number[]) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to make authenticated API calls
  const makeAuthenticatedRequest = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const user = getUserFromToken(token);
    if (!user) {
      throw new Error("Invalid authentication token");
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await makeAuthenticatedRequest("/notifications");
      
      // Assuming the backend returns notifications directly
      // Adjust this based on your actual API response structure
      const notificationData: Notification[] = Array.isArray(response) ? response : response.data || [];
      
      // Calculate unread count
      const unread = notificationData.filter(n => n.is_read === 0).length;
      
      setNotifications(notificationData);
      setUnreadCount(unread);
      setTotal(notificationData.length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch notifications");
      // Set empty state on error
      setNotifications([]);
      setUnreadCount(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: number) => {
    try {
      await makeAuthenticatedRequest(`/notifications/${id}/read`, {
        method: "PATCH",
      });

      // Update local state optimistically
      setNotifications(prev => 
        prev.map(n => 
          n.id === id ? { ...n, is_read: 1 } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setError(err instanceof Error ? err.message : "Failed to mark as read");
      throw err; // Re-throw so component can handle it
    }
  }, [makeAuthenticatedRequest]);

  // Mark multiple notifications as read
  const markManyAsRead = useCallback(async (ids: number[]) => {
    try {
      await makeAuthenticatedRequest("/notifications/read-many", {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      });

      // Update local state optimistically
      setNotifications(prev => 
        prev.map(n => 
          ids.includes(n.id) ? { ...n, is_read: 1 } : n
        )
      );
      
      // Update unread count
      const affectedUnreadCount = notifications.filter(n => 
        ids.includes(n.id) && n.is_read === 0
      ).length;
      setUnreadCount(prev => Math.max(0, prev - affectedUnreadCount));
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
      setError(err instanceof Error ? err.message : "Failed to mark notifications as read");
      throw err;
    }
  }, [makeAuthenticatedRequest, notifications]);

  // Delete single notification
  const deleteNotification = useCallback(async (id: number) => {
    try {
      await makeAuthenticatedRequest(`/notifications/${id}`, {
        method: "DELETE",
      });

      // Update local state optimistically
      const deletedNotification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => prev - 1);
      
      // Update unread count if deleted notification was unread
      if (deletedNotification && deletedNotification.is_read === 0) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      setError(err instanceof Error ? err.message : "Failed to delete notification");
      throw err;
    }
  }, [makeAuthenticatedRequest, notifications]);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      await makeAuthenticatedRequest("/notifications", {
        method: "DELETE",
      });

      // Clear local state
      setNotifications([]);
      setUnreadCount(0);
      setTotal(0);
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
      setError(err instanceof Error ? err.message : "Failed to delete all notifications");
      throw err;
    }
  }, [makeAuthenticatedRequest]);

  // Refresh notifications (alias for fetchNotifications)
  const refreshNotifications = useCallback(() => {
    return fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    markAsRead,
    markManyAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  };
}

// Optional: Hook for real-time updates (WebSocket or polling)
export function useNotificationUpdates(intervalMs = 30000) {
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    // Set up polling for new notifications
    const interval = setInterval(() => {
      refreshNotifications();
    }, intervalMs);

    // Also refresh when window regains focus
    const handleFocus = () => {
      refreshNotifications();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshNotifications, intervalMs]);
}