"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { useContactsPaginated } from "@/hooks/contact-list/useContactsPaginated";
import { useSaleProducts } from "@/hooks/contact-list/useSaleProducts";
import { useKeywordRoutes } from "@/hooks/contact-list/useKeywordRoutes";
import { ContactRole } from "@/types/auto-reply";
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
  Package,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";

export default function AddKeywordForProductModal({
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
    items: products,
    total: productsTotal,
    page: productsPage,
    pageSize: productsPageSize,
    setPage: setProductsPage,
    setPageSize: setProductsPageSize,
    search: productsSearch,
    setSearch: setProductsSearch,
    fetchProducts,
  } = useSaleProducts();
  const {
    createBulk,
    addProductsAll,
  } = useKeywordRoutes(undefined);
  
  const isRestrictedRole = (role: ContactRole) =>
    role === ContactRole.SUPPLIER || role === ContactRole.INTERNAL;
  const { currentUser } = useCurrentUser();
  const { isTutorialActive } = useTutorial();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;

  const [keyword, setKeyword] = useState("");
  const [applyAllContacts, setApplyAllContacts] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
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
  const [isLoading, setIsLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("products");

  // Auto switch to contacts tab when global is turned off
  useEffect(() => {
    // Check if tutorial is active
    const tutorialOverlay = document.querySelector('[data-tutorial-active="true"]');
    const isTutorialActive = !!tutorialOverlay;
    
    if (isTutorialActive) {
      return;
    }
    
    // Auto-switch tab based on applyAllContacts value only
    if (!applyAllContacts) {
      setActiveTab("contacts");
    } else {
      setActiveTab("products");
    }
  }, [applyAllContacts]);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      Promise.all([
        fetchContacts(),
        fetchProducts(),
      ]).finally(() => setIsLoading(false));
    }
  }, [open, fetchContacts, fetchProducts]);

  const toggle = (set: Set<number>, id: number) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  };

  const performSave = async () => {
    try {
      setIsLoading(true);
      if (zaloDisabled && !isTutorialActive) return;
      if (!keyword.trim()) {
        setAlert({
          type: "warning" as any,
          message: "Vui lòng nhập keyword",
        });
        return;
      }
      if (selectedProducts.size === 0) {
        setAlert({
          type: "warning" as any,
          message: "Vui lòng chọn ít nhất 1 sản phẩm",
        });
        return;
      }

      const productIds = Array.from(selectedProducts);
      
      if (applyAllContacts) {
        // Tạo keyword global và gán sản phẩm
        await createBulk({
          keyword: keyword.trim(),
          contactIds: [],
          productIds,
          defaultPriority: 0,
          active: true,
        });
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
          productIds,
          defaultPriority: 0,
          active: true,
        });
      }

      setAlert({
        type: "success",
        message: `✅ Đã tạo keyword "${keyword.trim()}" và gán ${productIds.length} sản phẩm thành công!`,
      });
      
      // Reset form
      setKeyword("");
      setSelectedContacts(new Set());
      setSelectedProducts(new Set());
    } catch (e: any) {
      setAlert({
        type: "error",
        message: e?.message || "Không thể tạo keyword. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
      setConfirmState({ open: false, title: "", message: "", onConfirm: null });
    }
  };

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

  const handleSelectAllProducts = useCallback(() => {
    const allSelected =
      products.length > 0 &&
      products.every((p) => selectedProducts.has(p.productId));

    setSelectedProducts((prev) => {
      const set = new Set(prev);
      if (allSelected) {
        products.forEach((p) => set.delete(p.productId));
      } else {
        products.forEach((p) => set.add(p.productId));
      }
      return set;
    });
  }, [products, selectedProducts]);

  const handleToggleProduct = useCallback(
    (productId: number) => {
      if ((zaloDisabled && !isTutorialActive) || isLoading) return;
      setSelectedProducts((prev) => toggle(prev, productId));
    },
    [zaloDisabled, isTutorialActive, isLoading]
  );

  const handleRefreshData = useCallback(async () => {
    setContactsLoading(true);
    try {
      await Promise.all([fetchContacts(), fetchProducts()]);
    } finally {
      setContactsLoading(false);
    }
  }, [fetchContacts, fetchProducts]);

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="!max-w-[70vw] h-[85vh] flex flex-col bg-white/95 backdrop-blur-sm border shadow-2xl">
          {/* Header */}
          <DialogHeader className="relative pb-4 flex-shrink-0" data-radix-dialog-header>
            <div className="flex items-center gap-4 pr-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl blur-md opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-green-500 to-blue-500 p-3 rounded-2xl shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-slate-800 mb-2">
                  Thêm Keyword cho Sản phẩm
                </DialogTitle>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Tạo keyword và gán sản phẩm để tự động gợi ý cho khách hàng
                </p>
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
              <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100 p-1 rounded-lg">
                <TabsTrigger
                  value="products"
                  disabled={applyAllContacts}
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Package className="w-4 h-4" />
                  <span className="font-medium">Chọn sản phẩm</span>
                  {selectedProducts.size > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 bg-blue-100 text-blue-700"
                    >
                      {selectedProducts.size}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  disabled={applyAllContacts}
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <TabsTrigger
                  value="keyword"
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-sm"
                >
                  <Key className="w-4 h-4" />
                  <span className="font-medium">Nhập keyword</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Content - Chọn sản phẩm */}
              <TabsContent
                value="products"
                className="flex-1 overflow-y-auto mt-0"
              >
                <Card className="h-full shadow-sm border-slate-200 bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        Chọn sản phẩm áp dụng keyword
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`transition-all duration-200 text-xs ${
                            selectedProducts.size > 0
                              ? "bg-green-100 text-green-700 shadow-sm"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          {selectedProducts.size}/{products.length}
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
                      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-100 rounded-lg">
                            <Filter className="w-3 h-3 text-green-600" />
                          </div>
                          <span className="text-xs font-medium text-slate-700">
                            Thao tác nhanh
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllProducts}
                            disabled={
                              (zaloDisabled && !isTutorialActive) ||
                              isLoading ||
                              products.length === 0
                            }
                            className="h-7 text-xs px-2 hover:bg-green-100 text-green-700 font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {products.length > 0 &&
                              products.every((p) =>
                                selectedProducts.has(p.productId)
                              )
                                ? "Bỏ chọn tất cả"
                                : "Chọn tất cả"}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProducts(new Set())}
                            disabled={
                              (zaloDisabled && !isTutorialActive) ||
                              isLoading ||
                              selectedProducts.size === 0
                            }
                            className="h-7 text-xs px-2 hover:bg-red-50 text-red-600 font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <X className="w-3 h-3 mr-1" />
                              Xóa chọn
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Products Table */}
                      <div className="flex-1 border border-slate-200 rounded-lg bg-white overflow-hidden">
                        {contactsLoading ? (
                          <div className="flex flex-col items-center justify-center h-full p-8">
                            <div className="relative">
                              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            </div>
                            <div className="text-sm font-medium text-slate-600 mb-2">
                              Đang tải danh sách sản phẩm...
                            </div>
                          </div>
                        ) : (
                          <div className="h-full overflow-y-auto p-3">
                            <PaginatedTable
                              enableSearch
                              enablePageSize
                              page={productsPage}
                              total={productsTotal}
                              pageSize={productsPageSize}
                              onPageChange={setProductsPage}
                              onPageSizeChange={setProductsPageSize}
                              onFilterChange={(f) =>
                                setProductsSearch(f.search || "")
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
                                          products.length === 0
                                        }
                                        checked={
                                          products.length > 0 &&
                                          products.every((p) =>
                                            selectedProducts.has(p.productId)
                                          )
                                        }
                                        onCheckedChange={
                                          handleSelectAllProducts
                                        }
                                        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 w-4 h-4"
                                      />
                                    </TableHead>
                                    <TableHead className="font-semibold text-xs text-slate-700">
                                      <div className="flex items-center gap-1">
                                        <Package className="w-3 h-3" />
                                        Tên sản phẩm
                                      </div>
                                    </TableHead>
                                    <TableHead className="w-20 text-center font-semibold text-xs text-slate-700">
                                      Trạng thái
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {products.length === 0 ? (
                                    <TableRow>
                                      <TableCell
                                        colSpan={3}
                                        className="text-center py-6"
                                      >
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                            <Package className="w-5 h-5 text-slate-400" />
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-slate-600 mb-1">
                                              Không có sản phẩm nào
                                            </div>
                                            <div className="text-xs text-slate-500">
                                              Danh sách sản phẩm trống
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    products.map((product) => {
                                      const isSelected = selectedProducts.has(
                                        product.productId
                                      );
                                      return (
                                        <TableRow
                                          key={product.productId}
                                          className={`cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
                                            isSelected
                                              ? "bg-green-50 border-l-4 border-l-green-500"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            handleToggleProduct(
                                              product.productId
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
                                                handleToggleProduct(
                                                  product.productId
                                                )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 w-4 h-4"
                                            />
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 ${
                                                  isSelected
                                                    ? "bg-green-500 shadow-sm"
                                                    : "bg-slate-100"
                                                }`}
                                              >
                                                <Package
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
                                                      ? "text-green-900"
                                                      : "text-slate-900"
                                                  }`}
                                                >
                                                  {product.name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                  ID: {product.productId}
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

              {/* Tab Content - Chọn khách hàng */}
              <TabsContent
                value="contacts"
                className="flex-1 overflow-y-auto mt-0"
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
                            className="h-7 text-xs px-2 hover:bg-blue-100 text-blue-700 font-medium"
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
                            className="h-7 text-xs px-2 hover:bg-red-50 text-red-600 font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <X className="w-3 h-3 mr-1" />
                              Xóa chọn
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Contacts Table */}
                      <div className="flex-1 border border-slate-200 rounded-lg bg-white overflow-hidden">
                        {contactsLoading ? (
                          <div className="flex flex-col items-center justify-center h-full p-8">
                            <div className="relative">
                              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            </div>
                            <div className="text-sm font-medium text-slate-600 mb-2">
                              Đang tải danh sách khách hàng...
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
                                          className={`cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
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
                                              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-4 h-4"
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

              {/* Tab Content - Nhập keyword */}
              <TabsContent
                value="keyword"
                className="flex-1 overflow-y-auto mt-0"
              >
                <div className="grid grid-cols-1 gap-6 h-full">
                  <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Key className="w-4 h-4 text-green-600" />
                        Nhập keyword
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">
                          Từ khóa
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <Input
                            disabled={(zaloDisabled && !isTutorialActive) || isLoading}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="VD: iphone, laptop, túi xách..."
                            className="pl-9 h-9 bg-white border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-green-50/50 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm">
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
                          className="data-[state=checked]:bg-green-500 transition-all duration-200"
                        />
                      </div>

                      <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                        <Info className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-green-700">
                          {applyAllContacts
                            ? "Keyword sẽ áp dụng global cho tất cả khách hàng"
                            : "Chuyển sang tab 'Chọn khách hàng' để chọn khách hàng cần áp dụng keyword"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between w-full text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>
                    Sản phẩm:{" "}
                    <span className="font-medium text-slate-800">
                      {selectedProducts.size}
                    </span>
                  </span>
                </div>
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
                      {activeTab === "products"
                        ? "Chọn sản phẩm"
                        : activeTab === "contacts"
                        ? "Chọn khách hàng"
                        : "Nhập keyword"}
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
                    selectedProducts.size === 0 ||
                    isLoading ||
                    (!applyAllContacts && selectedContacts.size === 0)
                  }
                  onClick={() =>
                    setConfirmState({
                      open: true,
                      title: "Tạo keyword cho sản phẩm",
                      message: (
                        <div className="space-y-2">
                          <p>
                            Tạo keyword{" "}
                            <span className="font-semibold">
                              "{keyword.trim()}"
                            </span>{" "}
                            cho {selectedProducts.size} sản phẩm
                            {applyAllContacts
                              ? " (GLOBAL)"
                              : ` và ${selectedContacts.size} khách hàng`}
                            ?
                          </p>
                          <p className="text-sm text-slate-600">
                            Khách hàng sẽ nhận được gợi ý sản phẩm khi nhập keyword này.
                          </p>
                        </div>
                      ),
                      onConfirm: performSave,
                    })
                  }
                  className="px-6 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-9 text-sm"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang tạo...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Tạo Keyword + Sản phẩm
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>

          <ConfirmDialog
            isOpen={confirmState.open}
            title={confirmState.title}
            message={confirmState.message}
            onConfirm={() => confirmState.onConfirm?.()}
            onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
          />

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
