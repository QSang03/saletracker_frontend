"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MailOpen,
  BadgeCheck,
  Search,
  Filter,
  X,
  RotateCcw,
  Calendar,
  Eye,
  EyeOff,
  Clock,
  ChevronRight,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { Notification } from "@/types";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification?: Notification | null;
  notifications?: Notification[];
  selectedId?: number;
  onMarkAsRead?: (id: number) => void;
}

interface FilterState {
  search: string;
  status: "all" | "read" | "unread";
  dateRange: "all" | "today" | "week" | "month";
  sortBy: "newest" | "oldest" | "title";
}

const ITEMS_PER_PAGE = 15;

export default function NotificationDetailModal({
  open,
  onOpenChange,
  notification,
  notifications: propNotifications = [],
  selectedId,
  onMarkAsRead,
}: NotificationDetailModalProps) {
  const {
    notifications: hookNotifications,
    loading,
    error,
    markAsRead,
    markManyAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  } = useNotifications();

  // Use notifications from hook if prop notifications are empty (when opening from "View All")
  const notifications = propNotifications.length > 0 ? propNotifications : hookNotifications;

  const [displayCount, setDisplayCount] = React.useState(ITEMS_PER_PAGE);
  const [currentId, setCurrentId] = React.useState<number | undefined>(undefined);
  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    status: "all",
    dateRange: "all",
    sortBy: "newest",
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"specific" | "all">("all");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [bulkMode, setBulkMode] = React.useState(false);

  const listRef = React.useRef<HTMLUListElement>(null);
  const loadMoreTriggerRef = React.useRef<HTMLDivElement>(null);

  // Initialize modal
  React.useEffect(() => {
    if (open) {
      setDisplayCount(ITEMS_PER_PAGE);
      setIsLoading(false);
      setSelectedIds([]);
      setBulkMode(false);

      if (notification?.id) {
        // Specific notification mode
        setViewMode("specific");
        setCurrentId(notification.id);
        setShowFilters(false);
      } else {
        // All notifications mode
        setViewMode("all");
        setCurrentId(selectedId || notifications[0]?.id);
        setShowFilters(false);
      }
    } else {
      // Reset when closed
      setFilters({
        search: "",
        status: "all",
        dateRange: "all",
        sortBy: "newest",
      });
    }
  }, [open, notification, selectedId, notifications]);

  // Filter and sort notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = [...notifications];

    // If specific mode, show only that notification
    if (viewMode === "specific" && notification?.id) {
      filtered = filtered.filter((n) => n.id === notification.id);
    } else {
      // Apply filters only in "all" mode
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (n) =>
            n.title.toLowerCase().includes(search) ||
            n.content.toLowerCase().includes(search)
        );
      }

      if (filters.status !== "all") {
        filtered = filtered.filter((n) =>
          filters.status === "read" ? n.is_read === 1 : n.is_read === 0
        );
      }

      if (filters.dateRange !== "all") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        filtered = filtered.filter((n) => {
          const date = typeof n.created_at === "string" ? new Date(n.created_at) : n.created_at;

          switch (filters.dateRange) {
            case "today":
              return date >= today;
            case "week":
              return date >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            case "month":
              return date >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
              return true;
          }
        });
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aDate: Date;
      let bDate: Date;
      if (a.created_at instanceof Date) {
        aDate = a.created_at;
      } else if (typeof a.created_at === "string" || typeof a.created_at === "number") {
        aDate = new Date(a.created_at);
      } else {
        aDate = new Date(0);
      }
      if (b.created_at instanceof Date) {
        bDate = b.created_at;
      } else if (typeof b.created_at === "string" || typeof b.created_at === "number") {
        bDate = new Date(b.created_at);
      } else {
        bDate = new Date(0);
      }

      switch (filters.sortBy) {
        case "oldest":
          return aDate.getTime() - bDate.getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return bDate.getTime() - aDate.getTime();
      }
    });

    return filtered;
  }, [notifications, filters, viewMode, notification]);

  const displayedNotifications = filteredNotifications.slice(0, displayCount);
  const hasMore = displayCount < filteredNotifications.length;

  // Lazy loading
  const loadMore = React.useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredNotifications.length));
      setIsLoading(false);
    }, 200);
  }, [isLoading, hasMore, filteredNotifications.length]);

  // Intersection Observer
  React.useEffect(() => {
    if (!open || !hasMore || !loadMoreTriggerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { root: listRef.current, rootMargin: "100px" }
    );

    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [open, hasMore, loadMore]);

  // Reset display count when filters change
  React.useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filters]);

  const switchToAllMode = () => {
    setViewMode("all");
    setShowFilters(true);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      dateRange: "all",
      sortBy: "newest",
    });
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== "all") count++;
    if (filters.dateRange !== "all") count++;
    if (filters.sortBy !== "newest") count++;
    return count;
  }, [filters]);

  const selectedNotification = filteredNotifications.find((n) => n.id === currentId) || displayedNotifications[0];

  // Handle bulk selection
  const toggleSelectNotification = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllDisplayed = () => {
    const unreadIds = displayedNotifications.filter(n => n.is_read === 0).map(n => n.id);
    setSelectedIds(unreadIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Handle bulk mark as read
  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;

    try {
      await markManyAsRead(selectedIds);
      setSelectedIds([]);
      setBulkMode(false);
      toast.success(`Đã đánh dấu ${selectedIds.length} thông báo là đã đọc.`);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error("Không thể đánh dấu thông báo đã đọc.");
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteNotification(id);
      // Update current selection if deleted notification was selected
      if (currentId === id) {
        const remainingNotifications = filteredNotifications.filter(n => n.id !== id);
        setCurrentId(remainingNotifications[0]?.id);
      }
      toast.success("Thông báo đã được xóa.");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Không thể xóa thông báo.");
    }
  };

  // Handle delete all notifications
  const handleDeleteAllNotifications = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa tất cả thông báo?")) return;

    try {
      await deleteAllNotifications();
      setCurrentId(undefined);
      toast.success("Đã xóa tất cả thông báo.");
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      toast.error("Không thể xóa tất cả thông báo.");
    }
  };

  // Handle mark as read
  const handleMarkAsReadInternal = async (id: number) => {
    try {
      await markAsRead(id);
      onMarkAsRead?.(id); // Call prop callback if provided
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
      toast.success("Danh sách thông báo đã được cập nhật.");
    } catch (error) {
      console.error("Error refreshing notifications:", error);
      toast.error("Không thể cập nhật thông báo.");
    }
  };

  const formatDate = (date: Date | string | number) => {
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === "string" || typeof date === "number") {
      d = new Date(date);
    } else {
      return "";
    }
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (date: Date | string | number) => {
    const now = new Date();
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === "string" || typeof date === "number") {
      d = new Date(date);
    } else {
      return "";
    }
    if (isNaN(d.getTime())) return "";
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));

    if (diff < 1) return "Vừa xong";
    if (diff < 60) return `${diff} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return `${Math.floor(diff / 1440)} ngày trước`;
  };

  if (!notifications.length && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[90vw] !h-[90vh] !max-w-none !max-h-none p-0 rounded-3xl border-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/30 shadow-2xl backdrop-blur-sm">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          {viewMode === "specific"
            ? `Chi tiết thông báo: ${selectedNotification?.title || ""}`
            : "Tất cả thông báo"}
        </DialogTitle>

        <div className="flex h-full overflow-hidden rounded-3xl">
          {/* Sidebar */}
          <div className="w-[480px] flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50">
            {/* Header */}
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {viewMode === "specific" ? "Chi tiết thông báo" : "Tất cả thông báo"}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {loading ? "Đang tải..." : `${filteredNotifications.length} thông báo`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="w-10 h-10 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="relative w-10 h-10 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <Filter className="w-5 h-5" />
                    {activeFiltersCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {activeFiltersCount}
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              {/* Switch to all mode button */}
              {viewMode === "specific" && (
                <div className="flex flex-wrap items-center gap-2 mb-4 min-w-0">
                  <Button
                    onClick={switchToAllMode}
                    variant="outline"
                    className="w-full rounded-xl border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    <Eye className="w-4 h-4 mr-2 inline-block" />
                    <span className="leading-none align-middle">
                      Xem tất cả thông báo ({notifications.length})
                    </span>
                  </Button>
                </div>
              )}

              {/* Bulk actions */}
              {viewMode === "all" && (
                <div className="mb-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      onClick={() => setBulkMode(!bulkMode)}
                      className={`cursor-pointer rounded-xl flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors flex-shrink-0 ${
                        bulkMode
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-transparent border border-input hover:bg-accent hover:text-accent-foreground"
                      }`}
                      tabIndex={0}
                      role="button"
                      aria-pressed={bulkMode}
                    >
                      <Checkbox checked={bulkMode} tabIndex={-1} className="mr-2 pointer-events-none" />
                      <span className="leading-none align-middle whitespace-nowrap">
                        {bulkMode ? "Thoát chọn" : "Chọn nhiều"}
                      </span>
                    </div>
                    
                    <Button
                      onClick={handleDeleteAllNotifications}
                      variant="destructive"
                      size="sm"
                      className="rounded-xl ml-auto flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 mr-2 inline-block" />
                      <span className="leading-none align-middle">Xóa tất cả</span>
                    </Button>
                  </div>
                  
                  {bulkMode && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={selectAllDisplayed}
                        variant="outline"
                        size="sm"
                        className="rounded-xl flex-shrink-0"
                      >
                        <span className="whitespace-nowrap">Chọn tất cả chưa đọc</span>
                      </Button>
                      {selectedIds.length > 0 && (
                        <>
                          <Button
                            onClick={handleBulkMarkAsRead}
                            variant="default"
                            size="sm"
                            className="rounded-xl flex-shrink-0"
                          >
                            <span className="whitespace-nowrap">Đánh dấu đã đọc ({selectedIds.length})</span>
                          </Button>
                          <Button
                            onClick={clearSelection}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Filters */}
              {showFilters && viewMode === "all" && (
                <div className="space-y-4 p-4 mt-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Tìm kiếm thông báo..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80"
                    />
                    {filters.search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, search: "" }))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 p-0 rounded-lg"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {/* Filters row */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Select
                        value={filters.status}
                        onValueChange={(value: any) =>
                          setFilters((prev) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl w-full">
                          <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="unread">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Chưa đọc
                            </div>
                          </SelectItem>
                          <SelectItem value="read">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Đã đọc
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={filters.dateRange}
                        onValueChange={(value: any) =>
                          setFilters((prev) => ({ ...prev, dateRange: value }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl w-full">
                          <SelectValue placeholder="Thời gian" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="today">Hôm nay</SelectItem>
                          <SelectItem value="week">Tuần này</SelectItem>
                          <SelectItem value="month">Tháng này</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Sort and reset */}
                  <div className="flex gap-3">
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value: any) =>
                        setFilters((prev) => ({ ...prev, sortBy: value }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl flex-1">
                        <SelectValue placeholder="Sắp xếp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Mới nhất</SelectItem>
                        <SelectItem value="oldest">Cũ nhất</SelectItem>
                        <SelectItem value="title">Theo tiêu đề</SelectItem>
                      </SelectContent>
                    </Select>

                    {activeFiltersCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={resetFilters}
                          variant="outline"
                          className="h-9 px-4 rounded-xl"
                        >
                          <RotateCcw className="w-2 h-2 mr-2 inline-block" />
                          <span className="leading-none align-middle">Reset</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Active filters */}
                  {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.search && (
                        <Badge variant="secondary" className="rounded-lg">
                          Tìm: "{filters.search}"
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, search: "" }))
                            }
                            className="ml-1 w-3 h-3 p-0"
                          >
                            <X className="w-2 h-2" />
                          </Button>
                        </Badge>
                      )}
                      {filters.status !== "all" && (
                        <Badge variant="secondary" className="rounded-lg">
                          {filters.status === "read" ? "Đã đọc" : "Chưa đọc"}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, status: "all" }))
                            }
                            className="ml-1 w-3 h-3 p-0"
                          >
                            <X className="w-2 h-2" />
                          </Button>
                        </Badge>
                      )}
                      {filters.dateRange !== "all" && (
                        <Badge variant="secondary" className="rounded-lg">
                          {filters.dateRange === "today"
                            ? "Hôm nay"
                            : filters.dateRange === "week"
                            ? "Tuần này"
                            : "Tháng này"}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                dateRange: "all",
                              }))
                            }
                            className="ml-1 w-3 h-3 p-0"
                          >
                            <X className="w-2 h-2" />
                          </Button>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

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

            {/* Notifications List */}
            <ul ref={listRef} className="flex-1 overflow-y-auto">
              {loading && displayedNotifications.length === 0 ? (
                <li className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Đang tải thông báo...
                  </p>
                </li>
              ) : displayedNotifications.length === 0 ? (
                <li className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Mail className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Không tìm thấy thông báo
                  </p>
                </li>
              ) : (
                <>
                  {displayedNotifications.map((item, index) => (
                    <li
                      key={item.id}
                      className={`relative cursor-pointer transition-all duration-200 border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                        item.id === currentId
                          ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      {item.id === currentId && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r" />
                      )}

                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Bulk selection checkbox */}
                          {bulkMode && (
                            <div className="flex-shrink-0 mt-1">
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={() => toggleSelectNotification(item.id)}
                                className="w-4 h-4"
                                tabIndex={0}
                                aria-label={selectedIds.includes(item.id) ? "Bỏ chọn thông báo" : "Chọn thông báo"}
                              />
                            </div>
                          )}

                          {/* Status dot */}
                          <div className="flex-shrink-0 mt-2">
                            {item.is_read === 0 ? (
                              <div className="relative">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping opacity-75" />
                              </div>
                            ) : (
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                            )}
                          </div>

                          {/* Content */}
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => setCurrentId(item.id)}
                          >
                            <h4
                              className={`font-semibold text-sm leading-5 line-clamp-2 mb-2 ${
                                item.is_read === 0
                                  ? "text-slate-900 dark:text-slate-100"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                              {item.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(item.created_at)}
                              </div>
                              <div className="flex items-center gap-2">
                                {item.is_read === 0 ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  >
                                    Chưa đọc
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  >
                                    Đã đọc
                                  </Badge>
                                )}
                                {item.id === currentId && (
                                  <ChevronRight className="w-4 h-4 text-blue-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Delete button */}
                          <div className="flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(item.id);
                              }}
                              className="w-8 h-8 p-0 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}

                  {/* Load more trigger */}
                  {hasMore && (
                    <li className="p-6">
                      <div ref={loadMoreTriggerRef} className="text-center">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-100" />
                            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce animation-delay-200" />
                            <span className="ml-2 text-sm text-slate-500">
                              Đang tải...
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={loadMore}
                            variant="outline"
                            className="rounded-xl"
                          >
                            Tải thêm ({displayCount}/{filteredNotifications.length})
                          </Button>
                        )}
                      </div>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>

          {/* Detail Panel */}
          <div className="flex-1 flex flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
            {selectedNotification ? (
              <>
                {/* Header */}
                <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {selectedNotification.is_read === 1 ? (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <BadgeCheck className="w-8 h-8 text-white" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
                          <Mail className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 line-clamp-3 leading-tight mb-3">
                        {selectedNotification.title}
                      </h1>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedNotification.created_at)}
                        </div>
                        <Badge
                          variant={
                            selectedNotification.is_read === 1 ? "default" : "destructive"
                          }
                          className="rounded-lg"
                        >
                          {selectedNotification.is_read === 1 ? "Đã đọc" : "Chưa đọc"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div className="text-base leading-relaxed whitespace-pre-line">
                      {selectedNotification.content}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      ID: {selectedNotification.id}
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedNotification.is_read === 0 && (
                        <Button
                          onClick={() => handleMarkAsReadInternal(selectedNotification.id)}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg"
                        >
                          <MailOpen className="w-4 h-4 mr-2 inline-block" />
                          <span className="leading-none align-middle">
                            Đánh dấu đã đọc
                          </span>
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteNotification(selectedNotification.id)}
                        variant="destructive"
                        className="rounded-xl"
                      >
                        <Trash2 className="w-4 h-4 mr-2 inline-block" />
                        <span className="leading-none align-middle">Xóa</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Mail className="w-12 h-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                    {loading ? "Đang tải..." : "Chọn thông báo để xem chi tiết"}
                  </h3>
                  <p className="text-slate-400">
                    {loading 
                      ? "Vui lòng đợi..." 
                      : "Nhấp vào bất kỳ thông báo nào bên trái để xem nội dung đầy đủ"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}