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
} from "lucide-react";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";

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
  setIsLoading: (v: boolean) => void;
  setAlert: (a: any) => void;
  currentUser?: any;
  open: boolean;
  onClose: () => void;
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
  setIsLoading,
  setAlert,
  currentUser,
  open,
  onClose,
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
  }, [selectedKeyword, visibleCounts]);

  // ✅ Reset search khi đổi keyword
  useEffect(() => {
    setContactSearch("");
  }, [selectedKeyword]);

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
  const handleContactSearch = (value: string) => {
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
  };

  // Clamp visibleCounts if grouped/routes change (e.g., routes removed)
  useEffect(() => {
    if (!selectedKeyword) return;
    const total =
      grouped.find(([kw]) => kw === selectedKeyword)?.[1]?.length || 0;
    setVisibleCounts((prev) => {
      const current = prev[selectedKeyword] || INITIAL_LOAD;
      if (current > total) {
        return { ...prev, [selectedKeyword]: Math.max(0, total) };
      }
      return prev;
    });
  }, [grouped, selectedKeyword]);

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
      <DialogContent className="!max-w-[65vw] h-[80vh] flex flex-col">
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
            <div className="p-3 space-y-1">
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
                      placeholder="Tìm kiếm liên hệ..."
                      value={contactSearch}
                      onChange={(e) => handleContactSearch(e.target.value)}
                      className="pl-9 h-9 bg-white border-slate-300 focus:border-blue-500"
                    />
                  </div>
                </div>

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
                    {visibleRoutes.length === 0 ? (
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
