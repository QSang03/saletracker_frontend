"use client";
import React, { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { api } from "@/lib/api";
import {
  ListChecks,
  Package,
  Save,
  Trash2,
  X,
  Sparkles,
  Zap,
  ShoppingCart,
  Tags,
  Crown,
  Hash,
  GripVertical,
  CheckCircle2,
  Move,
} from "lucide-react";
import { useKeywordRoutes } from "@/hooks/contact-list/useKeywordRoutes";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import type { AlertType } from "@/components/ui/loading/ServerResponseAlert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Product = {
  productId: number;
  code: string;
  name: string;
  brand?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  routeId: number;
  contactId: number;
  initialProductIds: number[];
  onSaved?: () => void;
};

// 🎯 Sortable Item Component
function SortableItem({
  id,
  index,
  product,
  onRemove,
  truncateText,
}: {
  id: number;
  index: number;
  product?: Product;
  onRemove: () => void;
  truncateText: (text: string, maxLength: number) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-pink-50/60 border border-purple-200/50 rounded-lg px-3 py-3 transition-all duration-200 hover:shadow-md group ${
        isDragging ? "opacity-50 shadow-xl scale-105 z-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 mr-3">
          {/* 🎯 Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-purple-100 rounded transition-colors"
          >
            <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
          </div>
          <Badge
            variant="outline"
            className="bg-purple-100 text-purple-700 border-purple-300"
          >
            <Hash className="w-3 h-3 mr-1" />
            {index + 1}
          </Badge>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-purple-600 font-medium">
            {product?.code || `#${id}`}
          </div>
          {product && (
            <div className="text-xs text-gray-600 w-full">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  {product.name.length > 70 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help truncate">
                          {truncateText(product.name, 70)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-md whitespace-normal break-words">
                          {product.name}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="truncate">{product.name}</div>
                  )}
                </div>

                <div className="flex-none ml-3">
                  <div className="bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 inline-block font-medium text-[0.68rem] min-w-[64px] text-center">
                    {product.brand || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      </div>

      <div className="flex items-center gap-1 ml-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Xóa khỏi danh sách</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export default function RouteProductsDialog({
  open,
  onClose,
  routeId,
  contactId,
  initialProductIds,
  onSaved,
}: Props) {
  const { setProductsForRoute } = useKeywordRoutes(undefined);
  const MAX_SELECTED = 10;
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<
    Record<number, Product>
  >({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [cates, setCates] = useState<string[]>([]);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [cateFilters, setCateFilters] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [lastSavedIds, setLastSavedIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 🎯 Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 🎯 Utility function to truncate text
  const truncateText = (text: string, maxLength: number = 40): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  useEffect(() => {
    if (open) {
      if (
        Array.isArray(initialProductIds) &&
        initialProductIds.length > MAX_SELECTED
      ) {
        const trimmed = initialProductIds.slice(0, MAX_SELECTED);
        setSelected(trimmed);
        setLastSavedIds(trimmed);
        setAlert({
          type: "info",
          message: `Chỉ được chọn tối đa ${MAX_SELECTED} sản phẩm; danh sách đã được rút gọn.`,
        });
      } else {
        setSelected(initialProductIds);
        setLastSavedIds(initialProductIds);
      }
      setPage(1);
    }
  }, [open, initialProductIds]);

  // Resolve names for selected items that may not be on the current page
  useEffect(() => {
    if (!open) return;
    const missing = (selected || []).filter(
      (id) => !products.find((p) => p.productId === id) && !selectedDetails[id]
    );
    if (missing.length === 0) return;
    const params = new URLSearchParams();
    missing.forEach((id) => params.append("ids", String(id)));
    api
      .get<Product[]>(`auto-reply/products/by-ids?${params.toString()}`)
      .then(({ data }) => {
        const map: Record<number, Product> = {};
        (data || []).forEach((p) => {
          map[p.productId] = p;
        });
        setSelectedDetails((prev) => ({ ...prev, ...map }));
      })
      .catch(() => void 0);
  }, [open, selected, products, selectedDetails]);

  useEffect(() => {
    if (!open) return;
    api.get("auto-reply/products.meta").then(({ data }) => {
      setBrands(data?.brands || []);
      setCates(data?.cates || []);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    brandFilters.forEach((b) => params.append("brands", b));
    cateFilters.forEach((c) => params.append("cates", c));
    // Only show products allowed for this contact and prioritize them
    params.set("activeForContact", "1");
    params.set("contactId", String(contactId));
    params.set("prioritizeContactId", String(contactId));
    api
      .get<{ items: Product[]; total: number }>(
        `auto-reply/products.paginated?${params.toString()}`
      )
      .then(({ data }) => {
        setProducts(data?.items || []);
        setTotal(data?.total || 0);
      });
  }, [open, page, pageSize, search, brandFilters, cateFilters, contactId]);

  // 🎯 Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelected((items) => {
        const oldIndex = items.findIndex((id) => id === active.id);
        const newIndex = items.findIndex((id) => id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleId = (id: number) =>
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) {
        setAlert({
          type: "error",
          message: `Chỉ được chọn tối đa ${MAX_SELECTED} sản phẩm`,
        });
        return prev;
      }
      return [...prev, id];
    });

  const removeFromSelected = (id: number) => {
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const save = async () => {
    try {
      setIsSaving(true);
      setAlert({ type: "loading", message: "Đang lưu cấu hình…" });
      await setProductsForRoute(routeId, selected);
      setAlert({
        type: "success",
        message: "Đã lưu cấu hình sản phẩm cho keyword.",
      });
      setLastSavedIds(selected);
      try {
        onSaved && onSaved();
      } catch {}
      //   onClose();
    } catch (e: any) {
      setAlert({ type: "error", message: "Lưu thất bại. Vui lòng thử lại." });
    } finally {
      setIsSaving(false);
    }
  };

  const arraysEqual = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);
  const isDirty = open && !arraysEqual(selected, lastSavedIds);

  const requestClose = () => {
    if (isDirty) setConfirmOpen(true);
    else onClose();
  };

  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) requestClose();
        }}
      >
        <DialogContent className="!max-w-[1600px] w-[95vw] h-[90vh] flex flex-col bg-gradient-to-br from-indigo-50/95 via-white/95 to-purple-50/95 backdrop-blur-xl border-0 shadow-2xl">
          {/* Decorative Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/3 via-purple-500/3 to-pink-500/3 pointer-events-none"></div>

          {/* Fixed Header */}
          <DialogHeader className="relative pb-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-sm opacity-40 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-xl">
                  <ListChecks className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  Cấu hình sản phẩm cho keyword
                </DialogTitle>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Chọn sản phẩm và kéo thả để sắp xếp thứ tự ưu tiên
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* 🎯 Fixed: Scrollable Content với height cố định */}
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Products Selection Section - 🎯 Fixed Structure */}
              <div className="flex flex-col h-full">
                <div className="relative group flex flex-col h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 to-indigo-500/8 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                  <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl flex flex-col h-full">
                    {/* Header - Fixed */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 flex-shrink-0 rounded-t-2xl">
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
                          <div className="bg-green-500/90 rounded-full px-2 py-1">
                            <span className="text-white text-xs font-medium">
                              {selected.length} đã chọn
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 🎯 Fixed: Scrollable Content */}
                    <div className="flex-1 min-h-0 overflow-auto">
                      <div className="h-full overflow-y-auto p-3">
                        <PaginatedTable
                          enableSearch
                          enableCategoriesFilter
                          availableBrands={brands}
                          availableCategories={cates}
                          enablePageSize
                          page={page}
                          total={total}
                          pageSize={pageSize}
                          onPageChange={setPage}
                          onPageSizeChange={setPageSize}
                          onFilterChange={(f) => {
                            setSearch(f.search || "");
                            setBrandFilters(
                              Array.isArray(f.brands)
                                ? f.brands.map(String)
                                : []
                            );
                            setCateFilters(
                              Array.isArray(f.categories)
                                ? f.categories.map(String)
                                : []
                            );
                          }}
                        >
                          <Table>
                            <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                              <TableRow className="border-b border-gray-200/50">
                                <TableHead className="w-16 text-center h-10">
                                  <Checkbox
                                    checked={
                                      products.length > 0 &&
                                      products.every((p) =>
                                        selected.includes(p.productId)
                                      )
                                    }
                                    onCheckedChange={() => {
                                      const all =
                                        products.length > 0 &&
                                        products.every((p) =>
                                          selected.includes(p.productId)
                                        );
                                      setSelected((prev) => {
                                        const set = new Set(prev);
                                        if (all)
                                          products.forEach((p) =>
                                            set.delete(p.productId)
                                          );
                                        else
                                          products.forEach((p) =>
                                            set.add(p.productId)
                                          );
                                        return Array.from(set);
                                      });
                                    }}
                                    className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-4 h-4"
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
                                const isSelected = selected.includes(
                                  p.productId
                                );
                                const truncatedName = truncateText(p.name, 50);
                                const shouldShowTooltip = p.name.length > 50;

                                return (
                                  <TableRow
                                    key={p.productId}
                                    className={`cursor-pointer h-12 transition-colors duration-200 ${
                                      isSelected
                                        ? "bg-blue-50/60 border-l-4 border-l-blue-500 hover:bg-blue-100/60"
                                        : "hover:bg-gray-50/60"
                                    }`}
                                    onClick={() => toggleId(p.productId)}
                                  >
                                    <TableCell className="text-center py-2">
                                      <Checkbox
                                        checked={isSelected}
                                        disabled={
                                          !isSelected &&
                                          selected.length >= MAX_SELECTED
                                        }
                                        onCheckedChange={() =>
                                          toggleId(p.productId)
                                        }
                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-4 h-4"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-medium text-blue-600 py-2">
                                      <div className="bg-blue-100 rounded px-1.5 py-0.5 inline-block">
                                        {p.code}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs py-2">
                                      {shouldShowTooltip ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="cursor-help">
                                              {truncatedName}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="max-w-sm whitespace-normal break-words">
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
                            </TableBody>
                          </Table>
                        </PaginatedTable>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Products Section - 🎯 Fixed Structure */}
              <div className="flex flex-col h-full">
                <div className="relative group flex flex-col h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/8 to-pink-500/8 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                  <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl flex flex-col h-full">
                    {/* Header - Fixed */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex-shrink-0 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                        <Move className="w-4 h-4 text-white" />
                        <span className="font-semibold text-white text-sm">
                          Sản phẩm đã chọn
                        </span>
                        <div className="ml-auto bg-white/25 rounded-full px-2 py-1">
                          <span className="text-white text-xs font-medium">
                            {selected.length} sản phẩm
                          </span>
                        </div>
                      </div>
                      {selected.length > 0 && (
                        <div className="mt-2 text-xs text-white/80 flex items-center gap-1">
                          <GripVertical className="w-3 h-3" />
                          <span>Kéo thả để sắp xếp thứ tự ưu tiên</span>
                        </div>
                      )}
                    </div>

                    {/* 🎯 Fixed: Scrollable Content với Drag & Drop */}
                    <div className="flex-1 min-h-0 overflow-auto">
                      <div className="h-full overflow-y-auto p-3">
                        {selected.length > 0 ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={selected}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {selected.map((pid, idx) => {
                                  const product =
                                    products.find((p) => p.productId === pid) ||
                                    selectedDetails[pid];
                                  return (
                                    <SortableItem
                                      key={pid}
                                      id={pid}
                                      index={idx}
                                      product={product}
                                      onRemove={() => removeFromSelected(pid)}
                                      truncateText={truncateText}
                                    />
                                  );
                                })}
                              </div>
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mb-4 opacity-50">
                                <Package className="w-8 h-8 text-white" />
                              </div>
                              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                                Chưa chọn sản phẩm nào
                              </h3>
                              <p className="text-gray-500 text-xs">
                                Chọn sản phẩm từ danh sách bên trái
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="relative pt-4 flex-shrink-0 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <div className="flex gap-3 w-full justify-end">
              <Button
                variant="outline"
                onClick={requestClose}
                className="bg-white/60 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 px-6 py-2 h-10 text-sm rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4 mr-2" />
                  Đóng
                </span>
              </Button>
              <Button
                onClick={save}
                disabled={isSaving}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group px-8 py-2 h-10 text-sm rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Lưu cấu hình
                </span>
              </Button>
            </div>
          </DialogFooter>

          {/* Decorative Elements */}
          <div className="absolute top-4 right-4 opacity-15 pointer-events-none">
            <div className="flex gap-1">
              <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
              <Move className="w-4 h-4 text-pink-500 animate-bounce" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 opacity-8 pointer-events-none">
            <Zap className="w-5 h-5 text-indigo-500 animate-pulse" />
          </div>
        </DialogContent>
      </Dialog>
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Bỏ thay đổi?"
        message="Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng mà không lưu?"
        confirmText="Đóng không lưu"
        cancelText="Tiếp tục chỉnh sửa"
        onConfirm={() => {
          setConfirmOpen(false);
          onClose();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </TooltipProvider>
  );
}
