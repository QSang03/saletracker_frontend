"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useContactAllowedProducts } from "@/hooks/contact-list/useContactAllowedProducts";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import type { AutoReplyProduct } from "@/types/auto-reply";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Package,
  Search,
  X,
  Check,
  Save,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: number;
}

// 🎯 Extend AutoReplyProduct type để support placeholder
interface ExtendedProduct extends AutoReplyProduct {
  isPlaceholder?: boolean;
}

export default function AllowedProductsModal({
  open,
  onClose,
  contactId,
}: Props) {
  // Backend-paged product list for current view
  const [products, setProducts] = useState<AutoReplyProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // default 10 rows/page
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [cateFilter, setCateFilter] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [onlyMyAllowed, setOnlyMyAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);
  // No global cross-contact badges; each contact manages its own allowed list
  const { items, patchBulk, fetchAll } = useContactAllowedProducts(contactId);
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // Keep the initial allowed set to compute deltas on save
  const initialAllowedRef = useRef<Set<number>>(new Set());
  const initializedAllowedRef = useRef<boolean>(false);

  // Refs for smooth scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // 🎯 Utility function to create placeholder rows
  const createPlaceholderRows = (count: number): ExtendedProduct[] => {
    return Array.from({ length: count }, (_, index) => ({
      productId: -(index + 1), // Negative IDs để tránh conflict
      code: "",
      name: "",
      brand: "",
      category: "",
      cate: "", // Add missing property
      stock: 0, // Add missing property
      isPlaceholder: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Utility function to truncate text
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      // Reset page on open
      setPage(1);
      initializedAllowedRef.current = false;
      // Load meta for filters (brands, categories)
      (async () => {
        try {
          const meta = await api.get<{ brands: string[]; cates: string[] }>(
            "auto-reply/products.meta"
          );
          setAvailableBrands(meta.data?.brands || []);
          setAvailableCategories(meta.data?.cates || []);
        } catch {
          setAvailableBrands([]);
          setAvailableCategories([]);
        }
      })();
    }
  }, [open]);

  // Update selected items when allowed data changes (first time on open)
  useEffect(() => {
    if (!open) return;
    if (!initializedAllowedRef.current && items.length > 0) {
      const activeIds = new Set(
        items.filter((i) => i.active).map((i) => i.productId)
      );
      setSelected(activeIds);
      // Store initial state for delta calculation
      initialAllowedRef.current = new Set(activeIds);
      initializedAllowedRef.current = true;
      console.log('[DEBUG] Initial allowed products set:', Array.from(activeIds));
    }
  }, [items, open]);

  // Fetch paginated products whenever filters/page change and modal open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(pageSize));
        if (search) params.set("search", search);
        // Ask backend to prioritize products already active for this contact
        params.set("contactId", String(contactId));
        brandFilter.forEach((b) => params.append("brands", b));
        cateFilter.forEach((c) => params.append("cates", c));
        const { data } = await api.get<{
          items: AutoReplyProduct[];
          total: number;
        }>(
          `auto-reply/products.paginated?${params.toString()}${
            onlyMyAllowed ? '&activeForContact=1' : ''
          }`
        );
        if (!cancelled) {
          const items = data?.items || [];
          setProducts(items);
          setTotal(data?.total || 0);
          // Reflect server-provided active flag for this contact on the current page immediately
          if (items.length > 0) {
            const activeIdsFromPage = items
              .filter((p: any) => (p as any).activeForContact)
              .map((p: any) => p.productId as number);
            
            setSelected((prev) => {
              const next = new Set(prev);
              // Remove products from current page that are no longer active
              items.forEach((p: any) => {
                if (!(p as any).activeForContact) {
                  next.delete(p.productId);
                }
              });
              // Add products from current page that are active
              activeIdsFromPage.forEach(id => next.add(id));
              return next;
            });
          }
          // When showing only products allowed for my user, pre-select them for this contact
          if (onlyMyAllowed && items.length > 0) {
            setSelected((prev) => {
              const next = new Set(prev);
              for (const p of items) next.add(p.productId);
              return next;
            });
          }
          // Smooth scroll to top of table when page changes
          smoothScrollToTop();
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    page,
    pageSize,
    search,
    brandFilter,
    cateFilter,
    onlyMyAllowed,
    currentUser?.id,
    contactId,
  ]);

  // Smooth scroll functions
  const smoothScrollToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const smoothScrollToElement = (element: HTMLElement) => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  };

  // Page change with smooth scroll
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Small delay to ensure state updates before scrolling
    setTimeout(() => {
      smoothScrollToTop();
    }, 100);
  };

  // Derived UI state
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (pageSize || 10))),
    [total, pageSize]
  );

  const toggleProduct = (id: number) => {
    // 🎯 Ignore placeholder products (negative IDs)
    if (id < 0) return;

    setSelected((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
    setAllMatchingSelected(false);
  };

  const toggleAll = async () => {
    // Select/unselect all across ALL pages matching current filters
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    brandFilter.forEach((b) => params.append('brands', b));
    cateFilter.forEach((c) => params.append('cates', c));
    // Not restricting by onlyMyAllowed; selection is based on current query scope
    const { data } = await api.get<number[]>(`auto-reply/products.ids?${params.toString()}`);

    const allIds: number[] = (data || []).filter((id) => id > 0);
    const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Unselect all
        allIds.forEach((id) => next.delete(id));
        setAllMatchingSelected(false);
      } else {
        // Select all
        allIds.forEach((id) => next.add(id));
        setAllMatchingSelected(true);
      }
      return next;
    });
  };

  const performSave = async () => {
    try {
      if (zaloDisabled) return;

      setLoading(true);
      // Always fetch latest allowed state from server to compute accurate deltas
      const { data: latest } = await api.get<{ productId: number; contactId: number; active: boolean }[]>(`auto-reply/contacts/${contactId}/allowed-products`);
      const before = new Set<number>((latest || []).filter((i) => i.active).map((i) => i.productId));
      const selectedIds = Array.from(selected).filter((id: number) => id > 0); // 🎯 Only actual product IDs
      // Compute deltas
      const toEnable = selectedIds.filter((id) => !before.has(id));
      const toDisable = Array.from(before).filter((id) => !selected.has(id));

      console.log('[DEBUG] Save operation:', {
        selectedIds,
        before: Array.from(before),
        toEnable,
        toDisable
      });

      if (toEnable.length > 0) await patchBulk(toEnable, true);
      if (toDisable.length > 0) await patchBulk(toDisable, false);

      // Update initial state to reflect current state after save
      initialAllowedRef.current = new Set(selectedIds);

      setAlert({
        type: "success",
        message: `✅ Đã cập nhật thành công ${selectedIds.length} sản phẩm được bán cho liên hệ này!`,
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setAlert({
        type: "error",
        message:
          e?.message || "❌ Lưu cấu hình sản phẩm thất bại. Vui lòng thử lại!",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearch("");
    setBrandFilter([]);
    setCateFilter([]);
    setProducts([]);
    setTotal(0);
    setPage(1);
    setPageSize(10);
    setSelected(new Set());
    initializedAllowedRef.current = false;
    initialAllowedRef.current = new Set();
    onClose();
  };

  const selectedCount = useMemo(() => {
    if (allMatchingSelected) return total;
    return Array.from(selected).filter((id) => id > 0).length;
  }, [selected, allMatchingSelected, total]);
  const isSelectedOnPage = (p: ExtendedProduct) =>
    p.productId > 0 && selected.has(p.productId);

  // 🎯 Only consider actual products for "all selected" check
  const actualProducts = products.filter((p) => p.productId > 0);
  const allFilteredSelected =
    actualProducts.length > 0 &&
    actualProducts.every((p) => isSelectedOnPage(p));

  // 🎯 Show selected items on top + add placeholders to maintain consistent layout
  const sortedProducts = useMemo((): ExtendedProduct[] => {
    // First, work with actual products only
    const actualProducts = products.filter((p) => p.productId > 0);
    const indexMap = new Map<number, number>();
    actualProducts.forEach((p, i) => indexMap.set(p.productId, i));

    // Sort actual products
    const sortedActual = [...actualProducts].sort((a, b) => {
      const aSel = isSelectedOnPage(a) ? 1 : 0;
      const bSel = isSelectedOnPage(b) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel; // selected first
      // preserve original order when both selected or both unselected
      return (
        (indexMap.get(a.productId) ?? 0) - (indexMap.get(b.productId) ?? 0)
      );
    });

    // 🎯 Add placeholders to maintain consistent row count
    const placeholderCount = Math.max(0, pageSize - sortedActual.length);
    if (placeholderCount > 0) {
      const placeholders = createPlaceholderRows(placeholderCount);
      return [...sortedActual, ...placeholders];
    }

    return sortedActual;
  }, [products, selected, pageSize]);

  const willEnableCount = useMemo(
    () =>
      Array.from(selected).filter(
        (id) => id > 0 && !initialAllowedRef.current.has(id)
      ).length,
    [selected]
  );
  const willDisableCount = useMemo(
    () =>
      Array.from(initialAllowedRef.current).filter((id) => !selected.has(id))
        .length,
    [selected]
  );

  if (!open) return null;

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
        <div
          ref={modalContentRef}
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden animate-fadeIn"
          style={{ scrollBehavior: "smooth" }}
        >
          {/* Header - Compact */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-lg p-1.5">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Cấu hình sản phẩm được bán
                  </h3>
                  <p className="text-orange-100 text-xs">
                    Liên hệ #{contactId} • Đã chọn {selectedCount} sản phẩm
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters & page-size via PaginatedTable toolbar */}
          <div className="px-4 py-3 border-b bg-gray-50/50">
            <PaginatedTable
              enableSearch
              enableCategoriesFilter
              availableCategories={availableCategories}
              availableBrands={availableBrands}
              enablePageSize
              defaultPageSize={10}
              page={page}
              total={total}
              pageSize={pageSize}
              onPageChange={(p) => handlePageChange(p)}
              onPageSizeChange={(ps) => {
                setPageSize(ps);
                setPage(1);
                setTimeout(() => smoothScrollToTop(), 100);
              }}
              onFilterChange={(f) => {
                setSearch(f.search || "");
                setCateFilter((f.categories || []).map(String));
                setBrandFilter((f.brands || []).map(String));
                setPage(1);
                setTimeout(() => smoothScrollToTop(), 100);
              }}
              controlsOnly
              hidePager
              loading={loading}
              toggles={[
                {
                  id: "only-my-allowed",
                  label: "Danh sách sản phẩm đang bán",
                  tooltip:
                    "Chỉ hiển thị các sản phẩm đã được bật bán cho khách hàng này",
                  checked: onlyMyAllowed,
                  onChange: (val) => {
                    setOnlyMyAllowed(val);
                    setPage(1);
                    setTimeout(() => smoothScrollToTop(), 100);
                  },
                },
              ]}
            >
              <></>
            </PaginatedTable>
          </div>

          {/* Content - Maximized for data */}
          <div className="px-4 py-2">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
                <h4 className="text-base font-semibold text-gray-800 mb-1">
                  {search ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm nào"}
                </h4>
                <p className="text-gray-500 text-xs text-center max-w-md">
                  {search
                    ? `Không tìm thấy sản phẩm nào phù hợp với "${search}"`
                    : "Danh sách sản phẩm trống, vui lòng thêm sản phẩm trước"}
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  ref={tableContainerRef}
                  className="max-h-[60vh] overflow-auto scrollbar-hide"
                  style={{ scrollBehavior: "smooth" }}
                >
                  <Table className="w-full text-xs">
                    <TableHeader className="bg-gray-100 sticky top-0 z-10">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="px-3 py-2 text-center font-semibold text-gray-700 w-12">
                          <Checkbox
                            checked={allFilteredSelected}
                            onCheckedChange={toggleAll}
                            disabled={zaloDisabled}
                            className="w-3 h-3"
                          />
                        </TableHead>
                        <TableHead className="px-3 py-2 text-left font-semibold text-gray-700 w-24">
                          Mã SP
                        </TableHead>
                        <TableHead className="px-3 py-2 text-left font-semibold text-gray-700">
                          Tên sản phẩm
                        </TableHead>
                        <TableHead className="px-3 py-2 text-left font-semibold text-gray-700 w-32">
                          Thương hiệu
                        </TableHead>
                        <TableHead className="px-3 py-2 text-center font-semibold text-gray-700 w-16">
                          Trạng thái
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedProducts.map((product, index) => {
                        const isEven = index % 2 === 0;
                        const isPlaceholder = product.isPlaceholder || false;
                        const isSelected =
                          !isPlaceholder && isSelectedOnPage(product);
                        const truncatedName = !isPlaceholder
                          ? truncateText(product.name, 100)
                          : "";
                        const shouldShowTooltip =
                          !isPlaceholder && product.name.length > 100;

                        // 🎯 Render placeholder row
                        if (isPlaceholder) {
                          return (
                            <TableRow
                              key={`placeholder-${index}`}
                              className={`border-b border-gray-400/60 ${
                                isEven ? "bg-white" : "bg-gray-100"
                              } opacity-30 pointer-events-none`}
                            >
                              <TableCell className="px-3 py-2 text-center">
                                <div className="w-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-3 py-2">
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-3 py-2">
                                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-3 py-2">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-3 py-2 text-center">
                                <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        // 🎯 Render actual product row
                        return (
                          <TableRow
                            key={product.productId}
                            className={`border-b border-gray-400/60 hover:bg-orange-50/80 transition-all duration-300 cursor-pointer ${
                              isEven ? "bg-white" : "bg-gray-100"
                            } ${
                              isSelected
                                ? "bg-orange-100 hover:bg-orange-200/60"
                                : ""
                            }`}
                            onClick={(e) => {
                              // Only toggle if not clicking on checkbox
                              if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
                                !zaloDisabled && toggleProduct(product.productId);
                              }
                            }}
                            onDoubleClick={(e) => {
                              smoothScrollToElement(
                                e.currentTarget as HTMLElement
                              );
                            }}
                          >
                            <TableCell className="px-3 py-2 text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  toggleProduct(product.productId)
                                }
                                disabled={zaloDisabled}
                                className="w-3 h-3"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                {product.code}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              {shouldShowTooltip ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="font-medium text-gray-900 cursor-help">
                                      {truncatedName}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    className="max-w-sm p-3 text-sm bg-gray-900 text-white rounded-lg shadow-lg"
                                    side="top"
                                  >
                                    <p className="whitespace-normal break-words">
                                      {product.name}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="font-medium text-gray-900">
                                  {product.name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <span
                                className="text-gray-600 truncate"
                                title={product.brand}
                              >
                                {product.brand || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-center">
                              {isSelected ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  ✓ Đang Bán
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  Tắt
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Bottom pager with smooth navigation */}
                <div className="flex items-center justify-between px-3 py-2 bg-white border-t">
                  <div className="text-xs text-gray-600">
                    Trang {page} / {totalPages} • Hiển thị {products.length} /{" "}
                    {total} sản phẩm
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      className="h-7 px-2 text-xs"
                    >
                      Trước
                    </Button>

                    {/* Page numbers for quick navigation */}
                    {totalPages <= 5 ? (
                      // Show all pages if total <= 5
                      Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            disabled={loading}
                            onClick={() => handlePageChange(pageNum)}
                            className="h-7 px-2 text-xs min-w-7"
                          >
                            {pageNum}
                          </Button>
                        )
                      )
                    ) : (
                      // Show condensed pagination for many pages
                      <>
                        {page > 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => handlePageChange(1)}
                            className="h-7 px-2 text-xs"
                          >
                            1
                          </Button>
                        )}
                        {page > 3 && (
                          <span className="px-1 text-xs text-gray-400">
                            ...
                          </span>
                        )}

                        {[page - 1, page, page + 1]
                          .filter((p) => p >= 1 && p <= totalPages)
                          .map((pageNum) => (
                            <Button
                              key={pageNum}
                              variant={pageNum === page ? "default" : "outline"}
                              size="sm"
                              disabled={loading}
                              onClick={() => handlePageChange(pageNum)}
                              className="h-7 px-2 text-xs min-w-7"
                            >
                              {pageNum}
                            </Button>
                          ))}

                        {page < totalPages - 2 && (
                          <span className="px-1 text-xs text-gray-400">
                            ...
                          </span>
                        )}
                        {page < totalPages - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => handlePageChange(totalPages)}
                            className="h-7 px-2 text-xs"
                          >
                            {totalPages}
                          </Button>
                        )}
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || loading}
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, page + 1))
                      }
                      className="h-7 px-2 text-xs"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Compact */}
          <div className="border-t bg-gray-50 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {selectedCount > 0
                    ? `${selectedCount} sản phẩm đã được chọn để bán`
                    : "Chưa chọn sản phẩm nào"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="h-8"
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={zaloDisabled || loading}
                  size="sm"
                  className="h-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {loading ? (
                    <>
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                        Đang lưu...
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-2">
                        <Save className="w-3 h-3 mr-1.5" />
                        Lưu cấu hình
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmOpen}
          title="Xác nhận cập nhật cấu hình sản phẩm"
          message={
            <div className="space-y-3">
              <p className="text-gray-700 text-sm">
                Bạn có chắc chắn muốn cập nhật danh sách sản phẩm được bán cho
                liên hệ <strong>#{contactId}</strong>?
              </p>
              <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700">
                  <Package className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    Sẽ bật: {willEnableCount} • Sẽ tắt: {willDisableCount}
                  </span>
                </div>
              </div>
            </div>
          }
          onConfirm={() => {
            setConfirmOpen(false);
            performSave();
          }}
          onCancel={() => setConfirmOpen(false)}
          confirmText="Cập nhật ngay"
          cancelText="Hủy"
        />

        {/* Alert */}
        {alert && (
          <div className="fixed top-4 right-4 z-[60]">
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
              duration={alert.type === "success" ? 2000 : 4000}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
