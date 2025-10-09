"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { useContactsPaginated } from "@/hooks/contact-list/useContactsPaginated";
import { ContactRole } from "@/types/auto-reply";
import { useKeywordRoutes } from "@/hooks/contact-list/useKeywordRoutes";
import { useTutorial } from "@/contexts/TutorialContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import KeywordsAccordionDialog from "./KeywordsAccordionDialog";
import AddKeywordForProductModal from "./AddKeywordForProductModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import {
  Key,
  Users,
  X,
  Globe,
  UserCheck,
  Plus,
  Search,
  CheckCircle,
  Circle,
  User,
  Info,
  Filter,
  RefreshCw,
  UserPlus,
  PlusCircle,
  Database,
  Package,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import RenameKeywordDialog from "./RenameKeywordDialog";

export default function KeywordsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    items: contacts,
    total: contactsTotal,
    page: contactsPage,
    pageSize: contactsPageSize,
    setPage: setContactsPage,
    setPageSize: setContactsPageSize,
    search: contactsSearch,
    setSearch: setContactsSearch,
    fetchContacts,
  } = useContactsPaginated();
  const {
    routes,
    fetchRoutes,
    createRoute,
    createBulk,
    updateRoute,
    deleteRoute,
    renameAll,
    setActiveAll,
    deleteAll,
  } = useKeywordRoutes(undefined);
  const isRestrictedRole = (role: ContactRole) =>
    role === ContactRole.SUPPLIER || role === ContactRole.INTERNAL;
  const { currentUser } = useCurrentUser();
  const { isTutorialActive } = useTutorial();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;

  const [keyword, setKeyword] = useState("");
  const [applyAllContacts, setApplyAllContacts] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(
    new Set()
  );
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => Promise<void> | void) | null;
  }>({ open: false, title: "", message: "", onConfirm: null });
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);
  const [contactMap, setContactMap] = useState<Map<number, string>>(new Map());
  const [renameState, setRenameState] = useState<{
    open: boolean;
    keyword: string | null;
  }>({ open: false, keyword: null });
  const [selectedByKeyword, setSelectedByKeyword] = useState<
    Record<string, Set<number>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const [openAccordionModal, setOpenAccordionModal] = useState(false);
  const [openProductKeywordModal, setOpenProductKeywordModal] = useState(false);

  // Auto switch to contacts tab when global is turned off
  useEffect(() => {
    // Check if tutorial is active
    const tutorialOverlay = document.querySelector('[data-tutorial-active="true"]');
    const isTutorialActive = !!tutorialOverlay;
    
    console.log('KeywordsModal useEffect - applyAllContacts:', applyAllContacts, 'isTutorialActive:', isTutorialActive);
    
    // If tutorial is active, let tutorial handle all logic
    if (isTutorialActive) {
      console.log('Tutorial is active - skipping automatic tab switching');
      return;
    }
    
    // Auto-switch tab based on applyAllContacts value only (don't block manual tab changes)
    if (!applyAllContacts) {
      console.log('Auto-switching to contacts tab (tutorial not active)');
      setActiveTab("contacts");
    } else {
      console.log('Auto-switching to create tab (tutorial not active)');
      setActiveTab("create");
    }
  }, [applyAllContacts]); // Only watch applyAllContacts, not activeTab

  // Listen for tutorial tab change requests
  useEffect(() => {
    const handleTutorialTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      console.log('Received tutorial tab change request:', tab, 'currentActiveTab:', activeTab);
      if (tab === 'create' || tab === 'contacts') {
        console.log('Setting activeTab to:', tab);
        setActiveTab(tab);
      }
    };

    console.log('Setting up tutorial-tab-change event listener');
    window.addEventListener('tutorial-tab-change', handleTutorialTabChange as EventListener);
    return () => {
      console.log('Removing tutorial-tab-change event listener');
      window.removeEventListener('tutorial-tab-change', handleTutorialTabChange as EventListener);
    };
  }, [activeTab]);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      Promise.all([
        fetchRoutes(),
        fetchContacts(),
        currentUser?.id &&
          api
            .get("auto-reply/contacts", {
              params: { userId: currentUser.id, mine: "1" },
            })
            .then(({ data }) => {
              const m = new Map<number, string>();
              (data || []).forEach((c: any) => m.set(c.contactId, c.name));
              setContactMap(m);
            })
            .catch(() => setContactMap(new Map())),
      ]).finally(() => setIsLoading(false));
    }
  }, [open, fetchContacts, fetchRoutes, currentUser?.id]);

  const toggle = (set: Set<number>, id: number) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  };

  // ✅ FIXED: Close confirmState after performSave completes
  const performSave = async () => {
    try {
      setIsLoading(true);
      if (zaloDisabled && !isTutorialActive) return;
      if (!keyword.trim()) return;

      if (applyAllContacts) {
        await createRoute(
          { keyword: keyword.trim(), contactId: null, routeProducts: [] },
          { userId: currentUser?.id }
        );
      } else {
        const contactIds = Array.from(selectedContacts);
        if (!contactIds.length) {
          setAlert({
            type: "warning" as any,
            message: "Vui lòng chọn ít nhất 1 khách hàng",
          });
          return;
        }
        await createBulk({
          keyword: keyword.trim(),
          contactIds,
          productIds: [],
          defaultPriority: 0,
          active: true,
        });
      }

      setAlert({
        type: "success",
        message:
          "✅ Đã tạo keyword thành công! Bạn có thể gán sản phẩm trong phần chi tiết.",
      });
      setKeyword("");
      setSelectedContacts(new Set());
    } catch (e: any) {
      setAlert({
        type: "error",
        message: e?.message || "Không thể tạo keyword. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
      // ✅ FIXED: Close confirmState after save completes
      setConfirmState({ open: false, title: "", message: "", onConfirm: null });
    }
  };

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof routes>();
    for (const r of routes) {
      const key = r.keyword;
      if (!map.has(key)) map.set(key, [] as any);
      (map.get(key) as any).push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [routes]);

  const toggleSelect = (kw: string, routeId: number) => {
    setSelectedByKeyword((prev) => {
      const copy = { ...prev };
      const set = new Set(copy[kw] ?? new Set<number>());
      set.has(routeId) ? set.delete(routeId) : set.add(routeId);
      copy[kw] = set;
      return copy;
    });
  };

  const toggleSelectAllInGroup = (kw: string, ids: number[]) => {
    setSelectedByKeyword((prev) => {
      const set = new Set(prev[kw] ?? new Set<number>());
      const allSelected = ids.length > 0 && ids.every((id) => set.has(id));
      const next = new Set<number>(set);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return { ...prev, [kw]: next };
    });
  };

  // ✅ UPDATED: Keep parent alert for accordion dialog compatibility
  const bulkSetActive = async (kw: string, ids: number[], active: boolean) => {
    setIsLoading(true);
    try {
      for (const id of ids) {
        await updateRoute(id, { active });
      }
      // Note: KeywordsAccordionDialog will handle its own alerts now
      // This is kept for any direct usage in parent
      setAlert({
        type: "success",
        message: `✅ Đã ${active ? "bật" : "tắt"} ${
          ids.length
        } keyword thành công`,
      });
    } catch (e: any) {
      setAlert({
        type: "error",
        message: "Có lỗi xảy ra khi cập nhật. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ UPDATED: Keep parent alert for accordion dialog compatibility
  const bulkDelete = async (kw: string, ids: number[]) => {
    setIsLoading(true);
    try {
      for (const id of ids) {
        await deleteRoute(id);
      }
      // Note: KeywordsAccordionDialog will handle its own alerts now
      // This is kept for any direct usage in parent
      setAlert({
        type: "success",
        message: `✅ Đã xóa ${ids.length} keyword thành công`,
      });
    } catch (e: any) {
      setAlert({
        type: "error",
        message: "Có lỗi xảy ra khi xóa. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalKeywords = grouped.length;
    return { totalKeywords };
  }, [grouped]);

  const availableContacts = useMemo(() => {
    return contacts.filter((c) => !isRestrictedRole(c.role));
  }, [contacts]);

  const handleSelectAllContacts = useCallback(() => {
    const allSelected =
      availableContacts.length > 0 &&
      availableContacts.every((c) => selectedContacts.has(c.contactId));

    setSelectedContacts((prev) => {
      const set = new Set(prev);
      if (allSelected) {
        availableContacts.forEach((c) => set.delete(c.contactId));
      } else {
        availableContacts.forEach((c) => set.add(c.contactId));
      }
      return set;
    });
  }, [availableContacts, selectedContacts]);

  const handleToggleContact = useCallback(
    (contactId: number) => {
      if ((zaloDisabled && !isTutorialActive) || isLoading) return;
      setSelectedContacts((prev) => toggle(prev, contactId));
    },
    [zaloDisabled, isTutorialActive, isLoading]
  );

  const handleRefreshData = useCallback(async () => {
    setContactsLoading(true);
    try {
      await Promise.all([fetchRoutes(), fetchContacts()]);
    } finally {
      setContactsLoading(false);
    }
  }, [fetchRoutes, fetchContacts]);

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="!max-w-[70vw] h-[85vh] flex flex-col bg-white/95 backdrop-blur-sm border shadow-2xl">
          {/* Simplified Header */}
          <DialogHeader className="relative pb-4 flex-shrink-0" data-radix-dialog-header>
            <div className="flex items-center gap-4 pr-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-md opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-2xl shadow-lg">
                  <Key className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-slate-800 mb-2 tutorial-keywords-modal-header">
                  Quản lý Keywords
                </DialogTitle>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Thiết lập từ khóa để tự động gợi ý sản phẩm phù hợp cho khách
                  hàng
                </p>
              </div>
              {/* Moved management buttons here for easier access */}
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <Button
                  onClick={() => setOpenProductKeywordModal(true)}
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-9 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 mr-1" />
                    Keyword + Sản phẩm
                  </span>
                </Button>
                <Button
                  onClick={() => setOpenAccordionModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-9 text-sm tutorial-keywords-manage-button"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 mr-1" />
                    Quản lý Keywords
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-red-400 text-white"
                    >
                      {stats.totalKeywords}
                    </Badge>
                  </span>
                </Button>
              </div>
            </div>
            <Separator className="mt-4" />
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-h-0 p-1">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              {/* Tabs List */}
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-lg tutorial-keywords-tabs">
                <TabsTrigger
                  value="create"
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-sm tutorial-keywords-create-tab"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="font-medium">Tạo Keywords</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  disabled={applyAllContacts}
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed tutorial-keywords-contacts-tab"
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Chọn khách hàng</span>
                  {selectedContacts.size > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 bg-blue-100 text-blue-700"
                    >
                      {selectedContacts.size}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Tab Content - Tạo Keywords */}
              <TabsContent
                value="create"
                className="flex-1 overflow-y-auto mt-0"
              >
                <div className="grid grid-cols-1 gap-6 h-full">
                  <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Plus className="w-4 h-4 text-blue-600" />
                        Tạo keyword mới
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 tutorial-keywords-form-section">
                      <div className="space-y-1 tutorial-keywords-input-field">
                        <label className="text-xs font-medium text-slate-700">
                          Từ khóa
                        </label>
                        <div className="relative tutorial-keywords-input-container">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <Input
                            disabled={(zaloDisabled && !isTutorialActive) || isLoading}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="VD: iphone, laptop, túi xách..."
                            className="pl-9 h-9 bg-white border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm tutorial-keywords-input tutorial-keywords-keyword-input"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm tutorial-keywords-apply-all">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1 rounded-lg shadow-sm transition-all duration-200 ${
                              applyAllContacts
                                ? "bg-green-100 shadow-green-200/50"
                                : "bg-blue-100 shadow-blue-200/50"
                            }`}
                          >
                            {applyAllContacts ? (
                              <Globe className="w-4 h-4 text-green-600" />
                            ) : (
                              <Users className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-800">
                              {applyAllContacts
                                ? "Áp dụng cho tất cả"
                                : "Chọn khách hàng"}
                            </div>
                            <div className="text-xs text-slate-600">
                              {applyAllContacts
                                ? "Keywords sẽ áp dụng cho toàn bộ khách hàng"
                                : `${selectedContacts.size} khách hàng đã chọn`}
                            </div>
                          </div>
                        </div>
                        <Switch
                          disabled={(zaloDisabled && !isTutorialActive) || isLoading}
                          checked={applyAllContacts}
                          onCheckedChange={setApplyAllContacts}
                          className="tutorial-keywords-apply-all-switch data-[state=checked]:bg-green-500 transition-all duration-200"
                        />
                      </div>

                      <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-700">
                          {applyAllContacts
                            ? "Keyword sẽ áp dụng global cho tất cả khách hàng"
                            : "Chuyển sang tab 'Chọn khách hàng' để chọn khách hàng cần áp dụng keyword"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab Content - Chọn khách hàng */}
              <TabsContent
                value="contacts"
                className="flex-1 overflow-y-auto mt-0 tutorial-keywords-contacts-content"
              >
                <Card className="h-full shadow-sm border-slate-200 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        Chọn khách hàng áp dụng keyword
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`transition-all duration-200 text-xs ${
                            selectedContacts.size > 0
                              ? "bg-blue-100 text-blue-700 shadow-sm"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          {selectedContacts.size}/{availableContacts.length}
                        </Badge>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRefreshData}
                              disabled={contactsLoading || isLoading}
                              className="h-7 w-7 p-0 hover:bg-blue-50"
                            >
                              <RefreshCw
                                className={`w-3 h-3 text-blue-600 ${
                                  contactsLoading ? "animate-spin" : ""
                                }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Làm mới danh sách</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4 overflow-hidden">
                    <div className="h-full flex flex-col space-y-4">
                      {/* Quick Actions */}
                      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 rounded-lg">
                            <Filter className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-xs font-medium text-slate-700">
                            Thao tác nhanh
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllContacts}
                            disabled={
                              (zaloDisabled && !isTutorialActive) ||
                              isLoading ||
                              availableContacts.length === 0
                            }
                            className="h-7 text-xs px-2 hover:bg-blue-100 text-blue-700 font-medium tutorial-keywords-select-all-button"
                          >
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {availableContacts.length > 0 &&
                              availableContacts.every((c) =>
                                selectedContacts.has(c.contactId)
                              )
                                ? "Bỏ chọn tất cả"
                                : "Chọn tất cả"}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContacts(new Set())}
                            disabled={
                              (zaloDisabled && !isTutorialActive) ||
                              isLoading ||
                              selectedContacts.size === 0
                            }
                            className="h-7 text-xs px-2 hover:bg-red-50 text-red-600 font-medium tutorial-keywords-clear-selection-button"
                          >
                            <span className="flex items-center gap-2">
                              <X className="w-3 h-3 mr-1" />
                              Xóa chọn
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Contacts Table - FIXED */}
                      <div className="flex-1 border border-slate-200 rounded-lg bg-white overflow-hidden tutorial-keywords-contacts-table-container">
                        {contactsLoading ? (
                          <div className="flex flex-col items-center justify-center h-full p-8">
                            <div className="relative">
                              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            </div>
                            <div className="text-sm font-medium text-slate-600 mb-2">
                              Đang tải danh sách khách hàng...
                            </div>
                            <div className="text-xs text-slate-500">
                              Vui lòng chờ trong giây lát
                            </div>
                          </div>
                        ) : (
                          <div className="h-full overflow-y-auto p-3">
                            <PaginatedTable
                              enableSearch
                              enablePageSize
                              page={contactsPage}
                              total={contactsTotal}
                              pageSize={contactsPageSize}
                              onPageChange={setContactsPage}
                              onPageSizeChange={setContactsPageSize}
                              onFilterChange={(f) =>
                                setContactsSearch(f.search || "")
                              }
                            >
                              <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                  <TableRow className="border-b border-slate-200">
                                    <TableHead className="w-10 h-10">
                                      <Checkbox
                                        disabled={
                                          (zaloDisabled && !isTutorialActive) ||
                                          isLoading ||
                                          availableContacts.length === 0
                                        }
                                        checked={
                                          availableContacts.length > 0 &&
                                          availableContacts.every((c) =>
                                            selectedContacts.has(c.contactId)
                                          )
                                        }
                                        onCheckedChange={
                                          handleSelectAllContacts
                                        }
                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-4 h-4"
                                      />
                                    </TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-700">
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        Tên khách hàng
                                      </div>
                                    </TableHead>
                                    <TableHead className="w-16 text-center font-semibold text-xs text-slate-700">
                                      Trạng thái
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {availableContacts.length === 0 ? (
                                    <TableRow>
                                      <TableCell
                                        colSpan={3}
                                        className="text-center py-6"
                                      >
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                            <Users className="w-5 h-5 text-slate-400" />
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-slate-600 mb-1">
                                              Không có khách hàng nào
                                            </div>
                                            <div className="text-xs text-slate-500">
                                              Danh sách khách hàng trống hoặc
                                              tất cả đều có role bị hạn chế
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    availableContacts.map((contact) => {
                                      const isSelected = selectedContacts.has(
                                        contact.contactId
                                      );
                                      return (
                                        <TableRow
                                          key={contact.contactId}
                                          className={`cursor-pointer transition-all duration-200 hover:bg-slate-50 tutorial-keywords-contact-row ${
                                            isSelected
                                              ? "bg-blue-50 border-l-4 border-l-blue-500"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            handleToggleContact(
                                              contact.contactId
                                            )
                                          }
                                        >
                                          <TableCell className="py-2">
                                            <Checkbox
                                              disabled={
                                                (zaloDisabled && !isTutorialActive) || isLoading
                                              }
                                              checked={isSelected}
                                              onCheckedChange={() =>
                                                handleToggleContact(
                                                  contact.contactId
                                                )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-4 h-4 tutorial-keywords-contact-checkbox"
                                            />
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 ${
                                                  isSelected
                                                    ? "bg-blue-500 shadow-sm"
                                                    : "bg-slate-100"
                                                }`}
                                              >
                                                <User
                                                  className={`w-3 h-3 ${
                                                    isSelected
                                                      ? "text-white"
                                                      : "text-slate-500"
                                                  }`}
                                                />
                                              </div>
                                              <div>
                                                <div
                                                  className={`font-medium text-sm transition-colors ${
                                                    isSelected
                                                      ? "text-blue-900"
                                                      : "text-slate-900"
                                                  }`}
                                                >
                                                  {contact.name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                  ID: {contact.contactId}
                                                </div>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-2 text-center">
                                            {isSelected ? (
                                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                            ) : (
                                              <Circle className="w-4 h-4 text-slate-300 mx-auto" />
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </PaginatedTable>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between w-full text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>
                    Keyword:{" "}
                    <span className="font-medium text-slate-800">
                      {keyword || "Chưa nhập"}
                    </span>
                  </span>
                </div>
                {!applyAllContacts && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>
                      Khách hàng:{" "}
                      <span className="font-medium text-slate-800">
                        {selectedContacts.size}
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>
                    Tab:{" "}
                    <span className="font-medium text-slate-800">
                      {activeTab === "create"
                        ? "Tạo keyword"
                        : "Chọn khách hàng"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="px-4 hover:bg-slate-50 transition-all duration-200 h-9 text-sm"
                  disabled={isLoading}
                >
                  Đóng
                </Button>

                <Button
                  disabled={
                    (zaloDisabled && !isTutorialActive) ||
                    !keyword.trim() ||
                    isLoading ||
                    (!applyAllContacts && selectedContacts.size === 0)
                  }
                  onClick={() =>
                    setConfirmState({
                      open: true,
                      title: "Tạo keyword",
                      message: (
                        <div className="space-y-2">
                          <p>
                            Tạo keyword{" "}
                            <span className="font-semibold">
                              "{keyword.trim()}"
                            </span>
                            {applyAllContacts
                              ? " (GLOBAL)"
                              : ` cho ${selectedContacts.size} khách hàng`}
                            ?
                          </p>
                          <p className="text-sm text-slate-600">
                            Sản phẩm sẽ được gán sau trong phần chi tiết.
                          </p>
                        </div>
                      ),
                      onConfirm: performSave, // ✅ FIXED: Direct function reference
                    })
                  }
                  className="px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-9 text-sm"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang tạo...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Tạo Keyword
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>

          {/* ✅ UPDATED: KeywordsAccordionDialog with clean props */}
          <KeywordsAccordionDialog
            open={openAccordionModal}
            onClose={() => setOpenAccordionModal(false)}
            grouped={grouped}
            selectedByKeyword={selectedByKeyword}
            toggleSelect={toggleSelect}
            toggleSelectAllInGroup={toggleSelectAllInGroup}
            bulkSetActive={bulkSetActive}
            bulkDelete={bulkDelete}
            setRenameState={setRenameState}
            setConfirmState={setConfirmState}
            contactMap={contactMap}
            zaloDisabled={zaloDisabled && !isTutorialActive}
            isLoading={isLoading}
            updateRoute={updateRoute}
            deleteRoute={deleteRoute}
            createRoute={createRoute} // ✅ NEW: Add createRoute for adding contacts
            setIsLoading={setIsLoading}
            setAlert={setAlert} // ✅ Keep for compatibility (child will use local alert)
            currentUser={currentUser}
            onKeywordRenamed={(oldKeyword, newKeyword) => {
              // ✅ FIXED: Refresh data after rename to update UI
              fetchRoutes();
            }}
          />

          <ConfirmDialog
            isOpen={confirmState.open}
            title={confirmState.title}
            message={confirmState.message}
            onConfirm={() => confirmState.onConfirm?.()}
            onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
          />

          <AddKeywordForProductModal
            open={openProductKeywordModal}
            onClose={() => setOpenProductKeywordModal(false)}
          />

          <RenameKeywordDialog
            open={renameState.open}
            keyword={renameState.keyword ?? ""}
            onClose={() => setRenameState({ open: false, keyword: null })}
            onSubmit={async (newKw) => {
              const oldKw = renameState.keyword ?? "";
              setConfirmState({
                open: true,
                title: "Đổi tên keyword",
                message: `Đổi "${oldKw}" thành "${newKw}" cho tất cả liên hệ?`,
                onConfirm: async () => {
                  try {
                    setIsLoading(true);
                    await renameAll(oldKw, newKw, currentUser?.id);
                    setAlert({
                      type: "success",
                      message: "✅ Đã đổi tên keyword thành công",
                    });
                  } catch (e: any) {
                    setAlert({
                      type: "error",
                      message: e?.message || "Có lỗi xảy ra khi đổi tên",
                    });
                  } finally {
                    setIsLoading(false);
                    setConfirmState((s) => ({ ...s, open: false }));
                  }
                },
              });
            }}
          />

          {/* ✅ Parent ServerResponseAlert for main modal actions */}
          {alert && (
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
