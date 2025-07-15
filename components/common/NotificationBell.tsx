"use client";
import * as React from "react";
import { Bell, Eye, EyeOff, Clock, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import type { Notification } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import NotificationDetailModal from "@/components/common/NotificationDetailModal";
import { useNotifications } from "@/hooks/useNotifications";

const ITEMS_PER_PAGE = 8;

export default function NotificationBell() {
  const {
    notifications: allNotifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    refreshNotifications
  } = useNotifications();

  const [open, setOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedNotification, setSelectedNotification] = React.useState<Notification | null>(null);
  const [selectedId, setSelectedId] = React.useState<number | undefined>(undefined);

  // Local pagination state for popover
  const [displayCount, setDisplayCount] = React.useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Get current notifications to display in popover
  const notifications = React.useMemo(
    () => allNotifications.slice(0, displayCount),
    [allNotifications, displayCount]
  );

  const hasUnread = unreadCount > 0;
  const hasMore = displayCount < allNotifications.length;

  // Refs for intersection observer
  const listRef = React.useRef<HTMLUListElement>(null);
  const loadMoreTriggerRef = React.useRef<HTMLDivElement>(null);

  // Load more notifications for popover
  const loadMore = React.useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, allNotifications.length));
      setIsLoadingMore(false);
    }, 200);
  }, [isLoadingMore, hasMore, allNotifications.length]);

  // Intersection Observer for lazy loading in popover
  React.useEffect(() => {
    if (!open || !hasMore || !loadMoreTriggerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { root: listRef.current, rootMargin: "50px" }
    );

    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [open, hasMore, loadMore]);

  // Reset display count when popover closes
  React.useEffect(() => {
    if (!open) {
      setDisplayCount(ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }
  }, [open]);

  // Handle notification click
  const handleNotificationClick = async (n: Notification) => {
    try {
      // Mark as read if unread
      if (n.is_read === 0) {
        await markAsRead(n.id);
        toast.success("Đã đánh dấu đã đọc", {
          description: "Thông báo đã được đánh dấu là đã đọc.",
        });
      }
      
      setSelectedNotification(n);
      setSelectedId(n.id);
      setModalOpen(true);
      setOpen(false);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Lỗi", {
        description: "Không thể đánh dấu thông báo đã đọc.",
      });
    }
  };

  // Handle show all notifications
  const handleShowAllNotifications = () => {
    setSelectedNotification(null);
    setSelectedId(undefined);
    setModalOpen(true);
    setOpen(false);
  };

  // Handle mark as read from modal
  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      toast.success("Thông báo đã được đánh dấu là đã đọc.");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Không thể đánh dấu thông báo đã đọc.");
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refreshNotifications();
      toast.success("Đã cập nhật: Danh sách thông báo đã được cập nhật.");
    } catch (error) {
      console.error("Error refreshing notifications:", error);
      toast.error("Lỗi: Không thể cập nhật thông báo.");
    }
  };

  // Format time ago
  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    let created: Date;
    if (date instanceof Date) {
      created = date;
    } else if (typeof date === "string" || typeof date === "number") {
      created = new Date(date);
    } else {
      return "";
    }
    if (isNaN(created.getTime())) return "";
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Vừa xong";
    if (diffInMinutes < 60) return `${diffInMinutes} phút`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ`;
    return `${Math.floor(diffInMinutes / 1440)} ngày`;
  };

  return (
    <>
      <style jsx>{`
        @keyframes bellRingShake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(15deg) translateY(-2px); }
          20% { transform: rotate(-10deg) translateY(-4px); }
          30% { transform: rotate(15deg) translateY(-2px); }
          40% { transform: rotate(-10deg) translateY(-4px); }
          50% { transform: rotate(10deg) translateY(-6px); }
          60% { transform: rotate(-8deg) translateY(-4px); }
          70% { transform: rotate(6deg) translateY(-2px); }
          80% { transform: rotate(-4deg) translateY(-1px); }
          90% { transform: rotate(2deg) translateY(-0.5px); }
        }

        @keyframes bellBounceShake {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(8deg); }
          50% { transform: translateY(-12px) rotate(-5deg); }
          75% { transform: translateY(-6px) rotate(3deg); }
        }

        .bell-ring-shake {
          animation: bellRingShake 1.5s ease-in-out infinite;
        }

        .bell-bounce-shake {
          animation: bellBounceShake 1s ease-in-out infinite;
        }

        .bell-combined-effect {
          animation: bellBounceShake 1s ease-in-out infinite, bellRingShake 1.5s ease-in-out infinite;
        }

        /* Stagger animation delays for ripple effects */
        .animation-delay-100 {
          animation-delay: 0.1s;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative group rounded-xl transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:scale-105 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:hover:from-blue-950 dark:hover:to-purple-950 h-12 w-12"
            aria-label="Thông báo"
          >
            {/* Animated background glow */}
            {hasUnread && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-20 animate-pulse" />
            )}

            {/* Enhanced ripple effect */}
            {hasUnread && (
              <div className="absolute top-2 right-1 pointer-events-none flex items-center justify-center">
                <div className="absolute h-10 w-10 rounded-full bg-gradient-to-r from-red-400 to-pink-500 opacity-30 animate-ping" />
                <div className="absolute h-8 w-8 rounded-full bg-gradient-to-r from-red-500 to-pink-600 opacity-50 animate-ping animation-delay-200" />
                <div className="absolute h-6 w-6 rounded-full bg-gradient-to-r from-red-600 to-pink-700 opacity-40 animate-ping animation-delay-300" />
              </div>
            )}

            {/* Bell with enhanced realistic ringing animation */}
            <div
              className={`relative z-10 transition-all duration-300 transform-gpu ${
                hasUnread
                  ? "bell-combined-effect text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
              }`}
            >
              <Bell className="w-7 h-7" />
            </div>

            {/* Enhanced badge with gradient and pulsing effect */}
            {hasUnread && (
              <div className="absolute -top-1 -right-3 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-pink-600 animate-pulse" />
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-red-400 to-pink-500 opacity-50 animate-ping" />
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-red-300 to-pink-400 opacity-30 animate-ping animation-delay-200" />
                  
                  <Badge
                    className={`relative h-6 ${
                      unreadCount > 99 ? "min-w-8 px-1" : "min-w-6"
                    } p-0 text-xs font-bold bg-gradient-to-r from-red-500 to-pink-600 text-white border-2 border-white dark:border-slate-900 shadow-lg flex items-center justify-center transform transition-transform duration-200 hover:scale-110`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                </div>
              </div>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-96 p-0 rounded-2xl shadow-2xl border-0 bg-white/95 backdrop-blur-xl dark:bg-slate-900/95"
          sideOffset={8}
        >
          {/* Header with gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10" />
            <div className="relative px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Thông báo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {loading ? "Đang tải..." : unreadCount > 0
                      ? `${unreadCount} thông báo mới`
                      : "Không có thông báo mới"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="w-8 h-8 p-0 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowAllNotifications}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 rounded-lg transition-colors flex items-center"
                >
                  <Sparkles className="w-2 h-2 mr-1 inline-block" />
                  <span className="leading-none align-middle">Xem tất cả</span>
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />

          {/* Error state */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Không thể tải thông báo</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefresh}
                  className="ml-auto text-xs"
                >
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {/* Notifications list */}
          <ul
            ref={listRef}
            className="max-h-80 overflow-y-auto scroll-smooth divide-y divide-slate-100 dark:divide-slate-800"
          >
            {loading && notifications.length === 0 ? (
              <li className="p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Đang tải thông báo...
                  </p>
                </div>
              </li>
            ) : notifications.length === 0 ? (
              <li className="p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                    <Bell className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Không có thông báo mới
                  </p>
                </div>
              </li>
            ) : (
              <>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className="relative group transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 cursor-pointer"
                    onClick={() => handleNotificationClick(n)}
                  >
                    {/* Hover indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />

                    <div className="px-4 py-4 space-y-2">
                      {/* Title with status indicator */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {n.is_read === 0 ? (
                            <div className="relative">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600 animate-pulse" />
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-400 animate-ping" />
                            </div>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`font-medium text-sm line-clamp-2 transition-colors ${
                              n.is_read === 0
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {n.title}
                          </h4>
                        </div>
                        <div className="flex-shrink-0">
                          {n.is_read === 0 ? (
                            <EyeOff className="w-3 h-3 text-slate-400" />
                          ) : (
                            <Eye className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </div>

                      {/* Content preview */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pl-5">
                        {n.content}
                      </p>

                      {/* Time with icon */}
                      <div className="flex items-center gap-1 pl-5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}

                {/* Loading indicator with intersection trigger */}
                {(isLoadingMore || hasMore) && (
                  <li className="p-4 text-center">
                    <div
                      ref={loadMoreTriggerRef}
                      className="flex flex-col items-center justify-center gap-3"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce animation-delay-100" />
                            <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce animation-delay-200" />
                          </div>
                          <span className="text-xs text-slate-500">
                            Đang tải...
                          </span>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadMore();
                          }}
                          className="text-xs"
                        >
                          Tải thêm ({displayCount}/{allNotifications.length})
                        </Button>
                      )}
                    </div>
                  </li>
                )}
              </>
            )}
          </ul>
        </PopoverContent>
      </Popover>

      <NotificationDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        notification={selectedNotification}
        notifications={allNotifications}
        selectedId={selectedId}
        onMarkAsRead={handleMarkAsRead}
      />
    </>
  );
}