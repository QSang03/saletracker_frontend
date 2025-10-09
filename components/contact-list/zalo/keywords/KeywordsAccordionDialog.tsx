"use client";
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Key,
  User,
  Search,
  MoreHorizontal,
  Filter,
  ChevronDown,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Loader2,
  ChevronUp,
  X, // ✅ Added for deselect button
  UserPlus,
  Users,
  CheckCircle,
  Circle,
} from "lucide-react";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import { api } from "@/lib/api";
import { ContactRole } from "@/types/auto-reply";

type RouteItem = any;

interface Props {
  grouped: [string, RouteItem[]][];
  selectedByKeyword: Record<string, Set<number>>;
  toggleSelect: (kw: string, routeId: number) => void;
  toggleSelectAllInGroup: (kw: string, ids: number[]) => void;
  bulkSetActive: (kw: string, ids: number[], active: boolean) => Promise<void>;
  bulkDelete: (kw: string, ids: number[]) => Promise<void>;
  setRenameState: (s: any) => void;
  setConfirmState: (s: any) => void;
  contactMap: Map<number, string>;
  zaloDisabled: boolean;
  isLoading: boolean;
  updateRoute: (id: number, data: any) => Promise<any>;
  deleteRoute: (id: number) => Promise<any>;
  createRoute: (data: any, options?: any) => Promise<any>; // ✅ NEW: Add createRoute
  setIsLoading: (v: boolean) => void;
  setAlert: (a: any) => void;
  currentUser?: any;
  open: boolean;
  onClose: () => void;
  // ✅ NEW: Callback để update selectedKeyword khi rename
  onKeywordRenamed?: (oldKeyword: string, newKeyword: string) => void;
}

// ✅ Configuration for infinite scroll
const ITEMS_PER_PAGE = 10;
const INITIAL_LOAD = 10;

export default function KeywordsAccordionDialog({
  grouped,
  selectedByKeyword,
  toggleSelect,
  toggleSelectAllInGroup,
  bulkSetActive,
  bulkDelete,
  setRenameState,
  setConfirmState,
  contactMap,
  zaloDisabled,
  isLoading,
  updateRoute,
  deleteRoute,
  createRoute, // ✅ NEW: Add createRoute
  setIsLoading,
  setAlert,
  currentUser,
  open,
  onClose,
  onKeywordRenamed,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // ✅ LOCAL alert state
  const [localAlert, setLocalAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // ✅ INFINITE SCROLL states
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(
    {}
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // ✅ NEW: Add contacts to keyword states
  const [showAddContactsMode, setShowAddContactsMode] = useState(false);
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<Set<number>>(new Set());
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // ✅ Refs for infinite scroll
  const contactsListRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ✅ Reset visible count khi chọn keyword khác
  useEffect(() => {
    if (selectedKeyword && !visibleCounts[selectedKeyword]) {
      const total =
        grouped.find(([kw]) => kw === selectedKeyword)?.[1]?.length || 0;
      setVisibleCounts((prev) => ({
        ...prev,
        [selectedKeyword]: Math.min(INITIAL_LOAD, Math.max(0, total)),
      }));
    }
  }, [selectedKeyword]); // ✅ FIXED: Remove visibleCounts from dependencies to prevent infinite loop

  // ✅ Reset search khi đổi keyword
  useEffect(() => {
    setContactSearch("");
  }, [selectedKeyword]);

  // ✅ FIXED: Listen for keyword rename and update selectedKeyword
  useEffect(() => {
    if (onKeywordRenamed && selectedKeyword) {
      // Check if current selectedKeyword still exists in grouped data
      const keywordExists = grouped.some(([kw]) => kw === selectedKeyword);
      if (!keywordExists) {
        // If selected keyword was renamed, we need to find the new name
        // This is a simple approach - in a real scenario, you might want to pass the new name directly
        setSelectedKeyword(null);
      }
    }
  }, [grouped, selectedKeyword, onKeywordRenamed]);

  // ✅ NEW: Fetch available contacts for adding to keyword
  const fetchAvailableContacts = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setContactsLoading(true);
    try {
      const { data } = await api.get("auto-reply/contacts", {
        params: { userId: currentUser.id, mine: "1" },
      });
      
      // Filter out restricted roles and existing contacts for this keyword
      const existingContactIds = new Set(
        selectedKeyword ? 
          (grouped.find(([kw]) => kw === selectedKeyword)?.[1] || []).map((r: any) => r.contactId) : 
          []
      );
      
      const available = (data || []).filter((c: any) => 
        !isRestrictedRole(c.role) && !existingContactIds.has(c.contactId)
      );
      
      setAvailableContacts(available);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setAvailableContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [currentUser?.id, selectedKeyword, grouped]);

  // ✅ NEW: Fetch contacts when entering add mode
  useEffect(() => {
    if (showAddContactsMode && selectedKeyword) {
      fetchAvailableContacts();
    }
  }, [showAddContactsMode, selectedKeyword, fetchAvailableContacts]);

  // ✅ Get all filtered routes for selected keyword (full data)
  const allFilteredRoutes = useMemo(() => {
    if (!selectedKeyword) return [];

    const allRoutes = grouped.find(([kw]) => kw === selectedKeyword)?.[1] || [];

    // Apply contact search filter
    return allRoutes.filter((route) => {
      if (!contactSearch) return true;
      const contactName =
        contactMap.get(route.contactId ?? -1) || `Contact #${route.contactId}`;
      return (
        contactName.toLowerCase().includes(contactSearch.toLowerCase()) ||
        route.contactId.toString().includes(contactSearch)
      );
    });
  }, [selectedKeyword, grouped, contactMap, contactSearch]);

  // ✅ Get currently visible routes (lazy loaded portion) - FIXED null check
  const visibleRoutes = useMemo(() => {
    if (!selectedKeyword) return []; // ✅ Early return if null

    const visibleCount = visibleCounts[selectedKeyword] || INITIAL_LOAD;
    return allFilteredRoutes.slice(0, visibleCount);
  }, [allFilteredRoutes, visibleCounts, selectedKeyword]);

  // ✅ Check if has more data to load - FIXED null check
  const hasMoreData = useMemo(() => {
    if (!selectedKeyword) return false; // ✅ Early return if null

    const visibleCount = visibleCounts[selectedKeyword] || INITIAL_LOAD;
    return visibleCount < allFilteredRoutes.length;
  }, [visibleCounts, selectedKeyword, allFilteredRoutes]);

  // ✅ Load more function
  const loadMore = useCallback(async () => {
    if (!selectedKeyword || loadingMore || !hasMoreData) return;

    setLoadingMore(true);

    // Simulate loading delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 200));

    const total =
      grouped.find(([kw]) => kw === selectedKeyword)?.[1]?.length || 0;
    setVisibleCounts((prev) => {
      const current = prev[selectedKeyword] || INITIAL_LOAD;
      const next = Math.min(current + ITEMS_PER_PAGE, Math.max(0, total));
      return { ...prev, [selectedKeyword]: next };
    });

    setLoadingMore(false);
  }, [selectedKeyword, loadingMore, hasMoreData]);

  // ✅ Setup IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !selectedKeyword) return;

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreData && !loadingMore) {
          loadMore();
        }
      },
      {
        rootMargin: "100px", // Start loading 100px before reaching the trigger
        threshold: 0.1,
      }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMoreData, loadingMore, loadMore, selectedKeyword]);

  // ✅ Handle contact search with reset - FIXED null check
  const handleContactSearch = useCallback((value: string) => {
    setContactSearch(value);
    // ✅ Null check before using as index
    if (selectedKeyword) {
      const total =
        grouped.find(([kw]) => kw === selectedKeyword)?.[1]?.length || 0;
      setVisibleCounts((prev) => ({
        ...prev,
        [selectedKeyword]: Math.min(INITIAL_LOAD, Math.max(0, total)),
      }));
    }
  }, [selectedKeyword, grouped]); // ✅ FIXED: Add dependencies and useCallback

  // Clamp visibleCounts if grouped/routes change (e.g., routes removed)
  useEffect(() => {
    if (!selectedKeyword) return;
    const total =
      grouped.find(([kw]) => kw === selectedKeyword)?.[1]?.length || 0;
    setVisibleCounts((prev) => {
      const current = prev[selectedKeyword] || INITIAL_LOAD;
      if (current > total && total > 0) {
        return { ...prev, [selectedKeyword]: Math.max(0, total) };
      }
      return prev;
    });
  }, [grouped, selectedKeyword]); // ✅ Keep dependencies but add safety check

  // ✅ Handle keyword selection with scroll reset
  const handleKeywordSelect = (keywordName: string) => {
    const isSelected = selectedKeyword === keywordName;
    setSelectedKeyword(isSelected ? null : keywordName);

    if (!isSelected && contactsListRef.current) {
      contactsListRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Filter keywords
  const filteredKeywords = grouped.filter(([kw, routes]) => {
    const matchesSearch = kw.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "active") return routes.some((r) => r.active);
    if (statusFilter === "inactive") return routes.some((r) => !r.active);
    return true;
  });

  const totalKeywords = grouped.length;
  const activeKeywords = grouped.filter(([, routes]) =>
    routes.some((r) => r.active)
  ).length;

  // ✅ NEW: Helper function to check if role is restricted
  const isRestrictedRole = (role: ContactRole) =>
    role === ContactRole.SUPPLIER || role === ContactRole.INTERNAL;

  // ✅ NEW: Add selected contacts to keyword
  const addContactsToKeyword = async () => {
    if (!selectedKeyword || selectedContactsToAdd.size === 0) return;
    
    try {
      setIsLoading(true);
      
      const contactIds = Array.from(selectedContactsToAdd);
      const keywordRoutes = grouped.find(([kw]) => kw === selectedKeyword)?.[1] || [];
      
      // Create new routes for selected contacts
      for (const contactId of contactIds) {
        await createRoute(
          { 
            keyword: selectedKeyword, 
            contactId, 
            routeProducts: [] 
          },
          { userId: currentUser?.id }
        );
      }
      
      setLocalAlert({
        type: "success",
        message: `✅ Đã thêm ${contactIds.length} khách hàng vào keyword "${selectedKeyword}"`,
      });
      
      // ✅ FIXED: Close confirmation modal
      setConfirmState({ open: false, title: "", message: "", onConfirm: null });
      
      // Reset state
      setShowAddContactsMode(false);
      setSelectedContactsToAdd(new Set());
      
      // Refresh data
      if (onKeywordRenamed) {
        onKeywordRenamed(selectedKeyword, selectedKeyword);
      }
      
    } catch (error: any) {
      setLocalAlert({
        type: "error",
        message: error?.message || "Có lỗi xảy ra khi thêm khách hàng",
      });
      // ✅ FIXED: Close confirmation modal even on error
      setConfirmState({ open: false, title: "", message: "", onConfirm: null });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NEW: Toggle contact selection for adding
  const toggleContactToAdd = (contactId: number) => {
    setSelectedContactsToAdd(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  // ✅ NEW: Select all available contacts
  const selectAllContactsToAdd = () => {
    const allSelected = availableContacts.length > 0 && 
      availableContacts.every(c => selectedContactsToAdd.has(c.contactId));
    
    if (allSelected) {
      setSelectedContactsToAdd(new Set());
    } else {
      setSelectedContactsToAdd(new Set(availableContacts.map(c => c.contactId)));
    }
  };

  // ✅ Existing handlers
  const handleBulkAction = async (
    keywordName: string,
    routeIds: number[],
    action: "activate" | "deactivate" | "delete"
  ) => {
    try {
      setIsLoading(true);
      if (action === "delete") {
        await bulkDelete(keywordName, routeIds);
        setLocalAlert({ type: "success", message: "✅ Đã xóa thành công" });
        if (selectedKeyword === keywordName) setSelectedKeyword(null);
      } else {
        await bulkSetActive(keywordName, routeIds, action === "activate");
        setLocalAlert({
          type: "success",
          message: `✅ Đã ${action === "activate" ? "bật" : "tắt"} thành công`,
        });
      }
    } catch (error: any) {
      setLocalAlert({
        type: "error",
        message: error?.message || "Có lỗi xảy ra",
      });
    } finally {
      setIsLoading(false);
      setConfirmState({ open: false, title: "", message: "", onConfirm: null });
    }
  };

  const handleSingleRouteAction = async (
    routeItem: any,
    action: "toggle" | "delete"
  ) => {
    try {
      setIsLoading(true);
      if (action === "delete") {
        await deleteRoute(routeItem.routeId);
        setLocalAlert({ type: "success", message: "✅ Đã xóa thành công" });
      } else {
        await updateRoute(routeItem.routeId, { active: !routeItem.active });
        setLocalAlert({
          type: "success",
          message: "✅ Đã cập nhật thành công",
        });
      }
    } catch (error: any) {
      setLocalAlert({
        type: "error",
        message: error?.message || "Có lỗi xảy ra",
      });
    } finally {
      setIsLoading(false);
      setConfirmState({ open: false, title: "", message: "", onConfirm: null });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="!max-w-[65vw] h-[80vh] flex flex-col tutorial-keywords-accordion-dialog">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 pb-3 pr-5">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">
                  Quản lý Keywords
                </div>
                <div className="text-xs text-slate-500 font-normal">
                  {totalKeywords} keywords, {activeKeywords} đang hoạt động
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 h-9 px-3"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm leading-none">
                      {statusFilter === "all"
                        ? "Tất cả"
                        : statusFilter === "active"
                        ? "Hoạt động"
                        : "Tắt"}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  Tất cả
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                  Đang hoạt động
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                  Đã tắt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex-shrink-0 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Tìm kiếm keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Keywords Sidebar */}
          <div className="w-72 flex-shrink-0 bg-slate-50 rounded-lg border overflow-y-auto">
            <div className="p-3 space-y-1 tutorial-keywords-list-sidebar">
              {filteredKeywords.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Không tìm thấy keyword</div>
                </div>
              ) : (
                filteredKeywords.map(([keywordName, routes], idx) => {
                  const activeCount = routes.filter((r) => r.active).length;
                  const isSelected = selectedKeyword === keywordName;
                  const visibleCount = visibleCounts[keywordName] || 0;
                  return (
                    <div
                      key={keywordName}
                      onClick={() => handleKeywordSelect(keywordName)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-green-200 text-white shadow-sm border border-green-600"
                          : "odd:bg-white even:bg-slate-100"
                      } ${!isSelected ? "hover:bg-green-100" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Key className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <div className="font-medium text-sm text-slate-800 truncate">
                          {keywordName}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {(() => {
                          const total = routes.length || 0;
                          const pct =
                            total === 0
                              ? 0
                              : Math.round((activeCount / total) * 100);
                          let colorCls = "bg-slate-100 text-slate-500"; // 0% (silver)
                          if (total > 0 && activeCount > 0) {
                            if (pct > 75)
                              colorCls = "bg-green-100 text-green-700";
                            else if (pct > 50)
                              colorCls = "bg-yellow-100 text-yellow-700";
                            else if (pct > 30)
                              colorCls = "bg-amber-100 text-amber-700";
                            else if (pct > 1)
                              colorCls = "bg-red-100 text-red-700";
                          }

                          return (
                            <Badge
                              variant="default"
                              className={`text-xs h-5 ${colorCls}`}
                            >
                              {activeCount}/{total} • {pct}%
                            </Badge>
                          );
                        })()}
                        <div className="text-xs text-slate-500">
                          {isSelected && visibleCount > 0 && (
                            <span className="ml-1 text-blue-600">
                              {visibleCount} hiển thị
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {selectedKeyword ? (
              <div className="h-full flex flex-col">
                {/* Keyword Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 bg-slate-50 rounded-lg border mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Key className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">
                        {selectedKeyword}
                      </div>
                      <div className="text-xs text-slate-500">
                        {allFilteredRoutes.length} liên hệ
                        {contactSearch && (
                          <span className="text-blue-600"> • đã lọc</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={zaloDisabled || isLoading}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          setRenameState({
                            open: true,
                            keyword: selectedKeyword,
                          })
                        }
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Đổi keyword
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-blue-600"
                        onClick={() => setShowAddContactsMode(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Thêm khách hàng
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => {
                          const routes =
                            grouped.find(
                              ([kw]) => kw === selectedKeyword
                            )?.[1] || [];
                          setConfirmState({
                            open: true,
                            title: "Xóa keyword",
                            message: `Xóa keyword "${selectedKeyword}" khỏi tất cả liên hệ?`,
                            onConfirm: async () =>
                              await handleBulkAction(
                                selectedKeyword,
                                routes.map((r) => r.routeId),
                                "delete"
                              ),
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa keyword
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Contact Search */}
                <div className="flex-shrink-0 mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder={showAddContactsMode ? "Tìm kiếm khách hàng để thêm..." : "Tìm kiếm liên hệ..."}
                      value={contactSearch}
                      onChange={(e) => handleContactSearch(e.target.value)}
                      className="pl-9 h-9 bg-white border-slate-300 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* ✅ NEW: Add Contacts Mode UI */}
                {showAddContactsMode && (
                  <div className="flex-shrink-0 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <UserPlus className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-blue-900">
                            Thêm khách hàng vào "{selectedKeyword}"
                          </div>
                          <div className="text-xs text-blue-600">
                            {selectedContactsToAdd.size} khách hàng đã chọn
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddContactsMode(false);
                            setSelectedContactsToAdd(new Set());
                          }}
                          className="h-7 text-xs px-2"
                        >
                          <span className="flex items-center gap-2">
                          <X className="w-3 h-3 mr-1" />
                          
                          Hủy
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setConfirmState({
                            open: true,
                            title: "Thêm khách hàng",
                            message: `Thêm ${selectedContactsToAdd.size} khách hàng vào keyword "${selectedKeyword}"?`,
                            onConfirm: addContactsToKeyword,
                          })}
                          disabled={selectedContactsToAdd.size === 0 || isLoading}
                          className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <span className="flex items-center gap-2">
                          <UserPlus className="w-3 h-3 mr-1" />
                          Thêm {selectedContactsToAdd.size}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ UPDATED: Bulk Actions với nút bỏ chọn */}
                {selectedKeyword &&
                  selectedByKeyword[selectedKeyword]?.size > 0 && (
                    <div className="flex-shrink-0 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                      <span className="text-sm font-medium text-blue-800">
                        Đã chọn {selectedByKeyword[selectedKeyword]?.size || 0}{" "}
                        liên hệ
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              title: "Bật đã chọn",
                              message: `Bật keyword cho ${
                                selectedByKeyword[selectedKeyword]?.size || 0
                              } liên hệ đã chọn?`,
                              onConfirm: async () =>
                                await handleBulkAction(
                                  selectedKeyword,
                                  Array.from(
                                    selectedByKeyword[selectedKeyword] ||
                                      new Set()
                                  ),
                                  "activate"
                                ),
                            })
                          }
                          disabled={isLoading}
                        >
                          Bật tất cả
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              title: "Tắt đã chọn",
                              message: `Tắt keyword cho ${
                                selectedByKeyword[selectedKeyword]?.size || 0
                              } liên hệ đã chọn?`,
                              onConfirm: async () =>
                                await handleBulkAction(
                                  selectedKeyword,
                                  Array.from(
                                    selectedByKeyword[selectedKeyword] ||
                                      new Set()
                                  ),
                                  "deactivate"
                                ),
                            })
                          }
                          disabled={isLoading}
                        >
                          Tắt tất cả
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              title: "Xóa đã chọn",
                              message: `Xóa keyword cho ${
                                selectedByKeyword[selectedKeyword]?.size || 0
                              } liên hệ đã chọn?`,
                              onConfirm: async () =>
                                await handleBulkAction(
                                  selectedKeyword,
                                  Array.from(
                                    selectedByKeyword[selectedKeyword] ||
                                      new Set()
                                  ),
                                  "delete"
                                ),
                            })
                          }
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700"
                        >
                          Xóa tất cả
                        </Button>

                        {/* ✅ NEW: Nút chọn tất cả và nút bỏ chọn tất cả */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selectedKeyword) {
                              // Select all currently filtered routes for this keyword
                              const ids = allFilteredRoutes.map(
                                (r: any) => r.routeId
                              );
                              toggleSelectAllInGroup(selectedKeyword, ids);
                            }
                          }}
                          disabled={isLoading || allFilteredRoutes.length === 0}
                          className=" hover:text-slate-800 hover:bg-slate-100"
                        >
                          Chọn tất cả
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selectedKeyword) {
                              // Clear all selections for this keyword
                              const currentSelected =
                                selectedByKeyword[selectedKeyword] || new Set();
                              currentSelected.forEach((routeId) => {
                                toggleSelect(selectedKeyword, routeId);
                              });
                            }
                          }}
                          disabled={isLoading}
                          className=" hover:text-slate-800 hover:bg-slate-100"
                        >
                          <span className="flex items-center gap-2">
                            <X className="w-3 h-3" />
                            Bỏ chọn
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}

                {/* ✅ UPDATED: INFINITE SCROLL Contacts List với row click */}
                <div className="flex-1 overflow-y-auto" ref={contactsListRef}>
                  <div className="space-y-2">
                    {/* ✅ NEW: Show available contacts when in add mode */}
                    {showAddContactsMode ? (
                      contactsLoading ? (
                        <div className="text-center py-12 text-slate-500">
                          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                          <div className="text-sm">Đang tải danh sách khách hàng...</div>
                        </div>
                      ) : availableContacts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <div className="text-sm">
                            {contactSearch
                              ? "Không tìm thấy khách hàng phù hợp"
                              : "Không có khách hàng nào để thêm"}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Quick Actions for Add Mode */}
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-green-100 rounded-lg">
                                <UserPlus className="w-3 h-3 text-green-600" />
                              </div>
                              <span className="text-xs font-medium text-slate-700">
                                Chọn khách hàng để thêm
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={selectAllContactsToAdd}
                                disabled={contactsLoading || availableContacts.length === 0}
                                className="h-7 text-xs px-2 hover:bg-green-100 text-green-700 font-medium"
                              >
                                <span className="flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {availableContacts.length > 0 &&
                                  availableContacts.every(c =>
                                    selectedContactsToAdd.has(c.contactId)
                                  )
                                    ? "Bỏ chọn tất cả"
                                    : "Chọn tất cả"}
                                </span>
                              </Button>
                            </div>
                          </div>

                          {/* Available Contacts List */}
                          {availableContacts
                            .filter(contact => 
                              !contactSearch || 
                              contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                              contact.contactId.toString().includes(contactSearch)
                            )
                            .map((contact) => {
                              const isSelected = selectedContactsToAdd.has(contact.contactId);
                              return (
                                <div
                                  key={contact.contactId}
                                  className={`flex items-center justify-between p-3 bg-white rounded-lg border hover:border-slate-300 transition-all cursor-pointer ${
                                    isSelected
                                      ? "ring-2 ring-green-200 bg-green-50/30"
                                      : ""
                                  }`}
                                  onClick={() => toggleContactToAdd(contact.contactId)}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleContactToAdd(contact.contactId)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-slate-900 truncate">
                                        {contact.name || `Contact #${contact.contactId}`}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        ID: {contact.contactId}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {isSelected ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-300" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </>
                      )
                    ) : visibleRoutes.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <div className="text-sm">
                          {contactSearch
                            ? "Không tìm thấy liên hệ phù hợp"
                            : "Không có liên hệ nào"}
                        </div>
                      </div>
                    ) : (
                      <>
                        {visibleRoutes.map((route) => {
                          const isSelected = selectedKeyword
                            ? (
                                selectedByKeyword[selectedKeyword] || new Set()
                              ).has(route.routeId)
                            : false;

                          return (
                            <div
                              key={route.routeId}
                              className={`flex items-center justify-between p-3 bg-white rounded-lg border hover:border-slate-300 transition-all cursor-pointer ${
                                isSelected
                                  ? "ring-2 ring-blue-200 bg-blue-50/30"
                                  : ""
                              }`}
                              // ✅ Click vào row để toggle checkbox
                              onClick={() => {
                                if (selectedKeyword) {
                                  toggleSelect(selectedKeyword, route.routeId);
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* ✅ Checkbox with click propagation */}
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => {
                                    if (selectedKeyword) {
                                      toggleSelect(
                                        selectedKeyword,
                                        route.routeId
                                      );
                                    }
                                  }}
                                  // ✅ Prevent double-click khi click trực tiếp checkbox
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-slate-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-slate-900 truncate">
                                    {(
                                      contactMap.get(route.contactId ?? -1) ??
                                      ""
                                    ).trim() || `--`}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    ID: {route.contactId}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <Badge
                                  className={`text-xs ${
                                    route.active
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {route.active ? "Hoạt động" : "Tắt"}
                                </Badge>

                                {/* ✅ Switch với prevent propagation */}
                                <span
                                  title={`${
                                    route.active ? "Tắt" : "Bật"
                                  } keyword "${route.keyword}"`}
                                  className="inline-block"
                                  onClick={(e) => e.stopPropagation()} // ✅ Prevent row click
                                >
                                  <Switch
                                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-300 transition-all duration-200"
                                    checked={route.active}
                                    onCheckedChange={() =>
                                      setConfirmState({
                                        open: true,
                                        title: route.active
                                          ? "Tắt keyword"
                                          : "Bật keyword",
                                        message: `${
                                          route.active ? "Tắt" : "Bật"
                                        } keyword "${
                                          route.keyword
                                        }" cho liên hệ này?`,
                                        onConfirm: async () =>
                                          await handleSingleRouteAction(
                                            route,
                                            "toggle"
                                          ),
                                      })
                                    }
                                    disabled={zaloDisabled || isLoading}
                                    aria-label={
                                      route.active
                                        ? `Tắt keyword ${route.keyword}`
                                        : `Bật keyword ${route.keyword}`
                                    }
                                  />
                                </span>

                                {/* ✅ Delete button với prevent propagation */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation(); // ✅ Prevent row click
                                    setConfirmState({
                                      open: true,
                                      title: "Xóa keyword",
                                      message: `Xóa keyword "${route.keyword}" khỏi liên hệ này?`,
                                      onConfirm: async () =>
                                        await handleSingleRouteAction(
                                          route,
                                          "delete"
                                        ),
                                    });
                                  }}
                                  disabled={zaloDisabled || isLoading}
                                  className="w-8 h-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        {/* ✅ Infinite Scroll Trigger */}
                        {hasMoreData && (
                          <div
                            ref={loadMoreTriggerRef}
                            className="flex justify-center py-4"
                          >
                            {loadingMore ? (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">
                                  Đang tải thêm...
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400">
                                Cuộn xuống để tải thêm
                              </div>
                            )}
                          </div>
                        )}

                        {/* ✅ End indicator */}
                        {!hasMoreData &&
                          visibleRoutes.length > INITIAL_LOAD && (
                            <div className="text-center py-4">
                              <div className="text-xs text-slate-500">
                                Đã hiển thị tất cả {allFilteredRoutes.length}{" "}
                                liên hệ
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  contactsListRef.current?.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  })
                                }
                                className="mt-2 gap-2 text-slate-600 hover:text-slate-800"
                              >
                                <span className="flex items-center gap-2">
                                  <ChevronUp className="w-4 h-4" />
                                  Lên đầu
                                </span>
                              </Button>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Key className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <div className="text-slate-600 font-medium mb-1">
                    Chọn keyword để quản lý
                  </div>
                  <div className="text-xs text-slate-500">
                    Chọn keyword từ danh sách bên trái để xem chi tiết
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>

        {/* ✅ LOCAL ServerResponseAlert */}
        {localAlert && (
          <ServerResponseAlert
            type={localAlert.type}
            message={localAlert.message}
            onClose={() => setLocalAlert(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
