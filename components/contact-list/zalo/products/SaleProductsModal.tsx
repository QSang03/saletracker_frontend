"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSaleProducts } from "@/hooks/contact-list/useSaleProducts";
import { useContactsPaginated } from "@/hooks/contact-list/useContactsPaginated";
import { ContactRole } from "@/types/auto-reply";
import { api } from "@/lib/api";
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
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import {
  Package,
  Users,
  ShoppingCart,
  Sparkles,
  Check,
  X,
  Globe,
  UserCheck,
  Tags,
  Save,
  Zap,
  Crown,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";

export default function SaleProductsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    items: products,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    brandFilters,
    setBrandFilters,
    cateFilters,
    setCateFilters,
    meta,
    fetchProducts,
  } = useSaleProducts();
  const {
    items: contactItems,
    total: contactsTotal,
    page: contactsPage,
    pageSize: contactsPageSize,
    setPage: setContactsPage,
    setPageSize: setContactsPageSize,
    search: contactsSearch,
    setSearch: setContactsSearch,
    fetchContacts,
  } = useContactsPaginated();
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const isRestrictedRole = (role: ContactRole) => role === ContactRole.SUPPLIER || role === ContactRole.INTERNAL;
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set()
  );
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(
    new Set()
  );
  const [applyAllContacts, setApplyAllContacts] = useState(true);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // Ensure preselect runs only once per modal open
  const preselectedRef = useRef(false);

  // 🎯 Utility function to truncate text với 50 ký tự
  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // 🎯 Check if all products on current page are selected
  const allProductsSelected =
    products.length > 0 && products.every((p) => selectedProducts.has(p.productId));

  // 🎯 Check if all contacts are selected (when not applying to all)
  // Only consider selectable contacts (exclude restricted roles)
  const selectableContacts = contactItems.filter((c) => !isRestrictedRole(c.role));
  const allContactsSelected =
    selectableContacts.length > 0 &&
    selectableContacts.every((c) => selectedContacts.has(c.contactId));

  // 🎯 Toggle all products on current page
  const toggleAllProducts = () => {
    if (allProductsSelected) {
      // Unselect all products on current page
      setSelectedProducts((prev) => {
        const newSet = new Set(prev);
        products.forEach((p) => newSet.delete(p.productId));
        return newSet;
      });
    } else {
      // Select all products on current page
      setSelectedProducts((prev) => {
        const newSet = new Set(prev);
        products.forEach((p) => newSet.add(p.productId));
        return newSet;
      });
    }
  };

  // 🎯 Toggle all contacts
  const toggleAllContacts = () => {
  if (allContactsSelected) {
      // Unselect all contacts on current page
      setSelectedContacts((prev) => {
        const set = new Set(prev);
    selectableContacts.forEach((c) => set.delete(c.contactId));
        return set;
      });
    } else {
      // Select all contacts on current page
      setSelectedContacts((prev) => {
        const set = new Set(prev);
    selectableContacts.forEach((c) => set.add(c.contactId));
        return set;
      });
    }
  };

  // Fetch contacts when opening; product list is managed by useSaleProducts
  useEffect(() => {
    if (open) {
      fetchContacts();
    }
  }, [open, fetchContacts]);

  // Reset preselect flag when modal closes
  useEffect(() => {
  if (!open) preselectedRef.current = false;
  }, [open]);

  // Preselect globally active products once per open
  useEffect(() => {
    if (!open || preselectedRef.current) return;
    (async () => {
      try {
        const uid = currentUser?.id;
        if (!uid) return;
        const { data } = await api.get<number[]>(
          `auto-reply/allowed-products/mine?userId=${uid}&flat=1`
        );
        if (Array.isArray(data)) {
          setSelectedProducts(new Set<number>(data.map(Number)));
        }
      } catch (e) {
        // ignore preselect errors, allow manual selection
      } finally {
        preselectedRef.current = true;
      }
    })();
  }, [open, currentUser?.id]);

  const toggleSet = (set: Set<number>, id: number) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  };

  const save = async () => {
    if (zaloDisabled) return;
    try {
      const selectedProductIds = Array.from(selectedProducts);
      const userId = currentUser?.id;
      if (!userId) throw new Error("Thiếu userId");

      // Fetch current active allowed products for this user, scoped to allowed contacts
      if (applyAllContacts) {
        // 1) Fetch all my contacts and filter out restricted roles
        const { data: allContacts } = await api.get<{ contactId: number; role: ContactRole }[]>(
          `auto-reply/contacts`,
          { params: { userId } }
        );
        const allowedIds = (allContacts || [])
          .filter((c) => !isRestrictedRole(c.role as any))
          .map((c) => Number(c.contactId));
        const allowedIdsSet = new Set<number>(allowedIds);
        if (allowedIds.length === 0) {
          setAlert({ type: "warning", message: "Không có khách hàng hợp lệ để áp dụng" });
          return;
        }
        // 2) Get full pairs and filter to allowed contacts
        const { data: pairs } = await api.get<
          { contactId: number; productId: number }[]
        >(`auto-reply/allowed-products/mine?userId=${userId}`);
        const currentSet = new Set<number>();
        (pairs || []).forEach((p) => {
          if (allowedIdsSet.has(Number(p.contactId))) {
            currentSet.add(Number(p.productId));
          }
        });
        const selectedSet = new Set<number>(selectedProductIds);
        const toDisable = Array.from(currentSet).filter((id) => !selectedSet.has(id));

        // 3) Apply bulk updates only to allowed contacts
        if (selectedProductIds.length > 0) {
          await api.post(`auto-reply/allowed-products/bulk?userId=${userId}`, {
            contactIds: allowedIds,
            productIds: selectedProductIds,
            active: true,
          });
        }
        if (toDisable.length > 0) {
          await api.post(`auto-reply/allowed-products/bulk?userId=${userId}`, {
            contactIds: allowedIds,
            productIds: toDisable,
            active: false,
          });
        }
      } else {
        const contactIds = Array.from(selectedContacts);
        // Remove restricted contacts defensively
        const filtered = contactIds.filter((cid) => {
          const c = contactItems.find((x) => x.contactId === cid);
          return c && !isRestrictedRole(c.role);
        });
        if (!filtered.length) {
          setAlert({
            type: "warning",
            message: "Chọn ít nhất 1 liên hệ để áp dụng",
          });
          return;
        }
        // Get full pairs and filter to selected contacts
        const { data: pairs } = await api.get<
          {
            contactId: number;
            productId: number;
          }[]
        >(`auto-reply/allowed-products/mine?userId=${userId}`);
  const selectedContactsSet = new Set<number>(filtered);
        const currentSet = new Set<number>();
        (pairs || []).forEach((p) => {
          if (selectedContactsSet.has(Number(p.contactId))) {
            currentSet.add(Number(p.productId));
          }
        });
        const selectedSet = new Set<number>(selectedProductIds);
        const toDisable = Array.from(currentSet).filter(
          (id) => !selectedSet.has(id)
        );
        // Enable all selected across the chosen contacts
    if (selectedProductIds.length > 0) {
          await api.post(`auto-reply/allowed-products/bulk?userId=${userId}`, {
      contactIds: filtered,
            productIds: selectedProductIds,
            active: true,
          });
        }
        if (toDisable.length > 0) {
          await api.post(`auto-reply/allowed-products/bulk?userId=${userId}`, {
      contactIds: filtered,
            productIds: toDisable,
            active: false,
          });
        }
      }
      setAlert({
        type: "success",
        message: "Đã lưu cấu hình sản phẩm cho Sale",
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Lỗi khi lưu cấu hình";
      setAlert({ type: "error", message: String(msg) });
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const form = new FormData();
      form.append("file", file);
      await api.post("auto-reply/products/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchProducts();
      setAlert({ type: "success", message: "Đã nhập Excel sản phẩm" });
      e.target.value = "";
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Lỗi khi nhập Excel sản phẩm";
      setAlert({ type: "error", message: String(msg) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="!max-w-[95vw] xl:!max-w-[90vw] 2xl:!max-w-[85vw] max-h-[92vh] flex flex-col bg-gradient-to-br from-blue-50/95 via-white/95 to-purple-50/95 backdrop-blur-xl border-0 shadow-2xl">
          {/* Decorative Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-pink-500/3 pointer-events-none"></div>

          {/* Fixed Header - Compact */}
          <DialogHeader className="relative pb-3 flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur-sm opacity-40 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl">
                  <Package className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1">
                  Sản phẩm tổng quát cho Sale
                </DialogTitle>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Cấu hình sản phẩm cho hệ thống auto-reply
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content - Two Column Layout */}
          <div className="flex-1 overflow-hidden min-h-0">
            <div className="h-full overflow-y-auto pr-2">
              {/* Two Column Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 relative">
                {/* Products Section */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/8 to-red-500/8 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                  <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl overflow-hidden">
                    {/* Header - Compact */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-white" />
                        <span className="font-semibold text-white text-sm">
                          Danh sách sản phẩm
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <div className="bg-white/25 rounded-full px-2 py-1">
                            <span className="text-white text-xs font-medium">
                              {total} sản phẩm
                            </span>
                          </div>
                          <label className="relative inline-flex items-center px-2 py-1 rounded-full bg-white/90 text-orange-600 text-xs font-semibold shadow cursor-pointer hover:shadow-md transition-all">
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              className="sr-only"
                              onChange={onImport}
                              disabled={importing || zaloDisabled}
                            />
                            <span>{importing ? "Nhập..." : "Excel"}</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Content - Increased Height */}
                    <div className="h-[42vh] overflow-auto">
                      <div className="p-2">
                        <PaginatedTable
                          enableSearch
                          enableCategoriesFilter
                          availableCategories={meta.cates}
                          availableBrands={meta.brands}
                          enablePageSize
                          page={page}
                          total={total}
                          pageSize={pageSize}
                          onPageChange={setPage}
                          onPageSizeChange={setPageSize}
                          onFilterChange={(f) => {
                            setSearch(f.search || "");
                            if (Array.isArray(f.categories))
                              setCateFilters(f.categories.map(String));
                            if (Array.isArray(f.brands))
                              setBrandFilters(f.brands.map(String));
                          }}
                        >
                          <Table>
                            <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                              <TableRow className="border-b border-gray-200/50">
                                <TableHead className="text-center w-12 h-10">
                                  {/* 🎯 Select All Checkbox cho Products */}
                                  <Checkbox
                                    checked={allProductsSelected}
                                    onCheckedChange={toggleAllProducts}
                                    disabled={zaloDisabled}
                                    className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 w-3 h-3"
                                  />
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs h-10">
                                  <div className="flex items-center gap-1">
                                    <Tags className="w-3 h-3" />
                                    Mã SP
                                  </div>
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs h-10">
                                  Tên sản phẩm
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs h-10">
                                  <div className="flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    Brand
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {products.map((p) => {
                                const truncatedName = truncateText(p.name, 50);
                                const shouldShowTooltip = p.name.length > 50;

                                return (
                                  <TableRow
                                    key={p.productId}
                                    className={`hover:bg-orange-50/60 transition-colors duration-200 h-12 cursor-pointer ${
                                      selectedProducts.has(p.productId)
                                        ? "bg-orange-50/40 border-l-4 border-l-orange-500"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      !zaloDisabled &&
                                      setSelectedProducts((prev) =>
                                        toggleSet(prev, p.productId)
                                      )
                                    }
                                  >
                                    <TableCell className="text-center py-2">
                                      <Checkbox
                                        disabled={zaloDisabled}
                                        checked={selectedProducts.has(p.productId)}
                                        onCheckedChange={() =>
                                          setSelectedProducts((prev) =>
                                            toggleSet(prev, p.productId)
                                          )
                                        }
                                        className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 w-3 h-3"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-medium text-orange-600 py-2">
                                      <div className="bg-orange-100 rounded px-1.5 py-0.5 inline-block">
                                        {p.code}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-xs py-2 leading-tight">
                                      {/* 🎯 Tên sản phẩm với tooltip */}
                                      {shouldShowTooltip ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="cursor-help">
                                              {truncatedName}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent
                                            className="max-w-sm p-3 text-sm bg-gray-900 text-white rounded-lg shadow-lg"
                                            side="top"
                                          >
                                            <p className="whitespace-normal break-words">
                                              {p.name}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <div>{p.name}</div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs py-2">
                                      <div className="bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 inline-block font-medium">
                                        {p.brand || "N/A"}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* Filler rows */}
                              {products.length < pageSize &&
                                Array.from({
                                  length: Math.max(pageSize - products.length, 0),
                                }).map((_, idx) => (
                                  <TableRow
                                    key={`prod-filler-${idx}`}
                                    className="h-12"
                                  >
                                    <TableCell colSpan={4} className="p-0" />
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </PaginatedTable>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contacts Section */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 to-purple-500/8 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                  <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl overflow-hidden">
                    {/* Header - Compact */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-white" />
                          <span className="font-semibold text-white text-sm">
                            Áp dụng cho
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-white/25 rounded-full px-3 py-1.5">
                            <Switch
                              disabled={zaloDisabled}
                              checked={applyAllContacts}
                              onCheckedChange={(v) => setApplyAllContacts(!!v)}
                              className="data-[state=checked]:bg-green-500"
                            />
                            <span className="text-white text-xs font-medium flex items-center gap-1">
                              {applyAllContacts ? (
                                <Globe className="w-3 h-3" />
                              ) : (
                                <UserCheck className="w-3 h-3" />
                              )}
                              {applyAllContacts ? "Tất cả" : "Chọn lọc"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    {!applyAllContacts ? (
                      <div className="h-[42vh] overflow-auto">
                        <div className="p-2">
                          <PaginatedTable
                            enableSearch
                            page={contactsPage}
                            total={contactsTotal}
                            pageSize={contactsPageSize}
                            onPageChange={setContactsPage}
                            onPageSizeChange={setContactsPageSize}
                            onFilterChange={(f) => {
                              setContactsSearch(f.search || "");
                            }}
                          >
                            <Table>
                              <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                                <TableRow className="border-b border-gray-200/50">
                                  <TableHead className="text-center w-12 h-10">
                                    {/* 🎯 Select All Checkbox cho Contacts (current page) */}
                                    <Checkbox
                                      checked={allContactsSelected}
                                      onCheckedChange={toggleAllContacts}
                                      disabled={zaloDisabled}
                                      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-3 h-3"
                                    />
                                  </TableHead>
                                  <TableHead className="font-semibold text-gray-700 text-xs h-10">
                                    Tên liên hệ
                                  </TableHead>
                                  <TableHead className="font-semibold text-gray-700 text-xs h-10">
                                    Zalo ID
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {contactItems.map((c) => (
                                  <TableRow
                                    key={c.contactId}
                                    className={`hover:bg-blue-50/60 transition-colors duration-200 h-12 cursor-pointer ${
                                      selectedContacts.has(c.contactId)
                                        ? "bg-blue-50/40 border-l-4 border-l-blue-500"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      !zaloDisabled &&
                                      setSelectedContacts((prev) =>
                                        toggleSet(prev, c.contactId)
                                      )
                                    }
                                  >
                                    <TableCell className="text-center py-2">
                                      <Checkbox
                                        disabled={zaloDisabled}
                                        checked={selectedContacts.has(c.contactId)}
                                        onCheckedChange={() =>
                                          setSelectedContacts((prev) =>
                                            toggleSet(prev, c.contactId)
                                          )
                                        }
                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-3 h-3"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium text-xs py-2">
                                      {c.name}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-blue-600 py-2">
                                      <div className="bg-blue-100 rounded px-1.5 py-0.5 inline-block">
                                        {c.zaloContactId}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </PaginatedTable>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[42vh] flex items-center justify-center p-4">
                        <div className="text-center">
                          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3">
                            <Globe className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">
                            Áp dụng cho tất cả
                          </h3>
                          <p className="text-gray-600 text-xs leading-relaxed">
                            Sản phẩm sẽ được áp dụng cho toàn bộ danh sách liên hệ
                          </p>
                          <div className="mt-2 bg-green-50 rounded-lg p-2">
                            <span className="text-green-700 font-medium text-xs">
                              Tổng: {contactsTotal} liên hệ
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Stats - Compact */}
              <div className="flex justify-center gap-3 my-4">
                <div className="bg-white/85 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/60">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600">Đã chọn</span>
                    <span className="font-bold text-orange-600">
                      {selectedProducts.size}
                    </span>
                    <span className="text-gray-600">sản phẩm</span>
                  </div>
                </div>
                {!applyAllContacts && (
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/60">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-600">Đã chọn</span>
                      <span className="font-bold text-blue-600">
                        {selectedContacts.size}
                      </span>
                      <span className="text-gray-600">liên hệ</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Footer - Compact */}
          <DialogFooter className="relative pt-3 flex-shrink-0 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <div className="flex gap-3 w-full justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-white/60 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 px-5 py-2 h-10 text-xs rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <X className="w-3 h-3 mr-2" />
                  Đóng
                </span>
              </Button>
              <Button
                disabled={zaloDisabled}
                onClick={() => setConfirmOpen(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group px-6 py-2 h-10 text-xs rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <Save className="w-3 h-3 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Lưu cấu hình
                </span>
              </Button>
            </div>
          </DialogFooter>

          <ConfirmDialog
            isOpen={confirmOpen}
            title="Xác nhận lưu cấu hình"
            message={
              applyAllContacts
                ? "Áp dụng cho tất cả liên hệ?"
                : `Áp dụng cho ${selectedContacts.size} liên hệ đã chọn?`
            }
            onConfirm={() => {
              setConfirmOpen(false);
              save();
            }}
            onCancel={() => setConfirmOpen(false)}
          />

          {alert && (
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}

          {/* Decorative Elements - Smaller */}
          <div className="absolute top-4 right-4 opacity-15 pointer-events-none">
            <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
          </div>
          <div className="absolute bottom-4 left-4 opacity-8 pointer-events-none">
            <Zap className="w-5 h-5 text-blue-500 animate-bounce" />
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
