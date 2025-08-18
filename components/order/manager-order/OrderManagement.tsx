import React, { useState, useEffect, useMemo, useRef } from "react";
import { OrderDetail } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  Zap,
  Star,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Sparkles,
  MessageCircle,
  Hash,
  User,
  X,
} from "lucide-react";
import EditOrderDetailModal from "./EditOrderDetailModal";
import DeleteOrderDetailModal from "./DeleteOrderDetailModal";
import EditCustomerNameModal from "./EditCustomerNameModal";
import AddToBlacklistModal from "./AddToBlacklistModal";
import BulkActions from "./BulkActions";
import BulkDeleteModal from "./BulkDeleteModal";
import BulkExtendModal from "./BulkExtendModal";
import BulkNotesModal from "./BulkNotesModal";
import HideOrderDetailModal from "./HideOrderDetailModal";
import BulkHideModal from "./BulkHideModal";
import { POrderDynamic } from "../POrderDynamic";
import EmojiRenderer from "@/components/common/EmojiRenderer";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface OrderManagementProps {
  orders: OrderDetail[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  onEdit?: (orderDetail: OrderDetail, data: any) => void;
  onDelete?: (orderDetail: OrderDetail, reason?: string) => void;
  onEditCustomerName?: (
    orderDetail: OrderDetail,
    newCustomerName: string
  ) => void;
  onBulkDelete?: (orderDetails: OrderDetail[], reason?: string) => void;
  onBulkExtend?: (orderDetails: OrderDetail[]) => void;
  onBulkNotes?: (orderDetails: OrderDetail[], notes: string) => void;
  onAddToBlacklist?: (orderDetail: OrderDetail, reason?: string) => void;
  onBulkHide?: (orderDetails: OrderDetail[], reason: string) => void;
  onHide?: (orderDetail: OrderDetail, reason: string) => void;
  onSearch?: (searchTerm: string) => void;
  onSort?: (
    field: "quantity" | "unit_price" | "created_at" | null,
    direction: "asc" | "desc" | null
  ) => void;
  currentSortField?: "quantity" | "unit_price" | "created_at" | null;
  currentSortDirection?: "asc" | "desc" | null;
  loading?: boolean;
}

// ✅ Function tính toán extended động - đã sửa lỗi TypeScript
const calculateDynamicExtended = (
  createdAt: string | Date | undefined,
  originalExtended: number
) => {
  try {
    if (!createdAt) return originalExtended;

    // Parse ngày tạo
    const createdDate =
      typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    if (isNaN(createdDate.getTime())) return originalExtended;

    // Ngày hết hạn = ngày tạo + extended (theo ngày thực tế)
    const expiredDate = new Date(createdDate);
    expiredDate.setHours(0, 0, 0, 0);
    expiredDate.setDate(expiredDate.getDate() + originalExtended);

    // Ngày hiện tại (bỏ giờ)
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Số ngày còn lại (có thể âm nếu đã hết hạn)
    const diffMs = expiredDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.error("Error calculating dynamic extended:", error);
    return originalExtended;
  }
};

// ✅ Helper: Định dạng ngày giờ theo chuẩn Việt Nam: HH:mm:ss dd/MM/yyyy
const formatVietnamDateTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const HH = pad(date.getHours());
  const MM = pad(date.getMinutes());
  const SS = pad(date.getSeconds());
  return `${HH}:${MM}:${SS} ${dd}/${mm}/${yyyy}`;
};

// ✅ Component để hiển thị text với tooltip khi cần thiết
const TruncatedText: React.FC<{
  text: string;
  maxLength?: number;
  className?: string;
}> = ({ text, maxLength = 50, className = "" }) => {
  if (!text || text.length <= maxLength) {
    return <span className={className}>{text || "N/A"}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help ${className}`}>
          {text.substring(0, maxLength)}...
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-md p-3 bg-slate-800 text-white text-sm rounded-lg shadow-xl">
        <div className="whitespace-pre-wrap break-words">{text}</div>
      </TooltipContent>
    </Tooltip>
  );
};

const OrderManagement: React.FC<OrderManagementProps> = ({
  orders,
  expectedRowCount,
  startIndex,
  onReload,
  onEdit,
  onDelete,
  onEditCustomerName,
  onBulkDelete,
  onBulkExtend,
  onBulkNotes,
  onAddToBlacklist,
  onBulkHide,
  onHide,
  onSearch,
  onSort,
  currentSortField,
  currentSortDirection,
  loading = false,
}) => {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const { currentUser } = useCurrentUser();
  const isOwner = React.useCallback(
    (od: OrderDetail) => {
      return !!(
        od?.order?.sale_by?.id &&
        currentUser?.id &&
        od.order!.sale_by!.id === currentUser.id
      );
    },
    [currentUser?.id]
  );

  // ✅ Tính toán số dòng hiển thị thực tế
  const actualRowCount = Math.min(safeOrders.length, expectedRowCount);

  // Small global style to prevent hover visual changes on the focused row only
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .focused-no-hover:hover, .focused-no-hover:hover > * {
        background-color: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
        transform: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Existing states
  const [editingDetail, setEditingDetail] = useState<OrderDetail | null>(null);
  const [deletingDetail, setDeletingDetail] = useState<OrderDetail | null>(
    null
  );
  const [hidingDetail, setHidingDetail] = useState<OrderDetail | null>(null);
  const [viewingDetail, setViewingDetail] = useState<OrderDetail | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHideModalOpen, setIsHideModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // ✅ Customer name edit states
  const [editingCustomerName, setEditingCustomerName] =
    useState<OrderDetail | null>(null);
  const [isEditCustomerNameModalOpen, setIsEditCustomerNameModalOpen] =
    useState(false);

  // ✅ Blacklist states
  const [addingToBlacklist, setAddingToBlacklist] =
    useState<OrderDetail | null>(null);
  const [isAddToBlacklistModalOpen, setIsAddToBlacklistModalOpen] =
    useState(false);

  // ✅ Bulk selection states
  const [selectedOrderIds, setSelectedOrderIds] = useState<
    Set<number | string>
  >(new Set());
  // ✅ Focused (active) row id - keep highlight until user acts on another row
  const [focusedRowId, setFocusedRowId] = useState<number | string | null>(
    null
  );
  // ref to temporarily skip clearing when the click originated from an internal handler
  const skipClearRef = useRef(false);
  // ref to indicate whether any modal is currently open; used to avoid clearing focus
  const modalOpenRef = useRef(false);

  // helper to set focus while preventing the global click handler from clearing it immediately
  const setFocusSafely = (id: number | string | null) => {
    try {
      skipClearRef.current = true;
      setFocusedRowId(id);
    } finally {
      // reset on next tick so document click handler (native) can run and not be blocked forever
      setTimeout(() => {
        skipClearRef.current = false;
      }, 0);
    }
  };

  // Utility to perform an action while temporarily preventing the global click handler
  // from clearing focusedRowId. Use for modal open/close flows.
  const withSkipClear = (fn: () => void, ms: number = 400) => {
    skipClearRef.current = true;
    try {
      fn();
    } finally {
      setTimeout(() => {
        skipClearRef.current = false;
      }, ms);
    }
  };
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkExtendModalOpen, setIsBulkExtendModalOpen] = useState(false);
  const [isBulkNotesModalOpen, setIsBulkNotesModalOpen] = useState(false);
  const [isBulkHideModalOpen, setIsBulkHideModalOpen] = useState(false);

  // ✅ Get selected orders
  const selectedOrders = useMemo(() => {
    return safeOrders.filter((order) => selectedOrderIds.has(order.id));
  }, [safeOrders, selectedOrderIds]);

  // ✅ Check if all orders on current page are selected
  const isAllSelected = useMemo(() => {
    if (safeOrders.length === 0) return false;
    return safeOrders.every((order) => selectedOrderIds.has(order.id));
  }, [safeOrders, selectedOrderIds]);

  // ✅ Check if some orders are selected (for indeterminate state)
  const isSomeSelected = useMemo(() => {
    if (safeOrders.length === 0) return false;
    return (
      safeOrders.some((order) => selectedOrderIds.has(order.id)) &&
      !isAllSelected
    );
  }, [safeOrders, selectedOrderIds, isAllSelected]);

  // ✅ Clear selection when orders change (e.g., page change)
  useEffect(() => {
    setSelectedOrderIds(new Set());
    // Clear focused row when data (page) changes
    setFocusSafely(null);
  }, [orders]);

  // Clear focusedRowId when clicking outside the currently focused row.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (skipClearRef.current) return;
      if (modalOpenRef.current) return; // don't clear focus while a modal is open
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const focusedNode = target.closest(
        "[data-focused-row-id]"
      ) as HTMLElement | null;

      // If clicked inside the focused row, do nothing.
      if (focusedNode) {
        const id = focusedNode.getAttribute("data-focused-row-id");
        if (id !== null && String(focusedRowId) === id) return;
      }

      // Otherwise clear focus
      if (focusedRowId !== null) setFocusSafely(null);
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [focusedRowId]);

  // Keep modalOpenRef in sync with modal state flags so the doc click handler
  // can ignore clicks while modals are open (prevents accidental clearing on modal close)
  useEffect(() => {
    modalOpenRef.current = !!(
      isEditModalOpen ||
      isDeleteModalOpen ||
      isHideModalOpen ||
      isViewModalOpen ||
      isEditCustomerNameModalOpen ||
      isAddToBlacklistModalOpen ||
      isBulkDeleteModalOpen ||
      isBulkExtendModalOpen ||
      isBulkNotesModalOpen ||
      isBulkHideModalOpen
    );
  }, [
    isEditModalOpen,
    isDeleteModalOpen,
    isHideModalOpen,
    isViewModalOpen,
    isEditCustomerNameModalOpen,
    isAddToBlacklistModalOpen,
    isBulkDeleteModalOpen,
    isBulkExtendModalOpen,
    isBulkNotesModalOpen,
    isBulkHideModalOpen,
  ]);

  // ✅ Handle select all/deselect all
  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedOrderIds);
      safeOrders.forEach((order) => newSelected.delete(order.id));
      setSelectedOrderIds(newSelected);
      // If user toggles select-all header, clear focused row to avoid confusion
      setFocusSafely(null);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedOrderIds);
      safeOrders.forEach((order) => newSelected.add(order.id));
      setSelectedOrderIds(newSelected);
      // If user toggles select-all header, clear focused row to avoid confusion
      setFocusSafely(null);
    }
  };

  // ✅ Handle individual selection
  const handleSelectOrder = (orderId: number | string) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
    // Mark this row as focused when user interacts with its checkbox
    setFocusSafely(orderId);
  };

  // ✅ Bulk action handlers
  const handleBulkDelete = () => {
    setIsBulkDeleteModalOpen(true);
  };

  const handleBulkExtend = () => {
    setIsBulkExtendModalOpen(true);
  };

  const handleBulkNotes = () => {
    setIsBulkNotesModalOpen(true);
  };

  const handleBulkHide = () => {
    setIsBulkHideModalOpen(true);
  };

  const handleBulkDeleteConfirm = (reason?: string) => {
    if (onBulkDelete && selectedOrders.length > 0) {
      onBulkDelete(selectedOrders, reason);
      setSelectedOrderIds(new Set());
      setIsBulkDeleteModalOpen(false);
    }
  };

  const handleBulkExtendConfirm = () => {
    if (onBulkExtend && selectedOrders.length > 0) {
      onBulkExtend(selectedOrders);
      setSelectedOrderIds(new Set());
      setIsBulkExtendModalOpen(false);
    }
  };

  const handleBulkNotesConfirm = (notes: string) => {
    if (onBulkNotes && selectedOrders.length > 0) {
      onBulkNotes(selectedOrders, notes);
      setSelectedOrderIds(new Set());
      setIsBulkNotesModalOpen(false);
    }
  };

  const handleEditClick = (orderDetail: OrderDetail) => {
    setFocusSafely(orderDetail.id);
    setEditingDetail(orderDetail);
    withSkipClear(() => setIsEditModalOpen(true));
  };

  const handleDeleteClick = (orderDetail: OrderDetail) => {
    setFocusSafely(orderDetail.id);
    setDeletingDetail(orderDetail);
    withSkipClear(() => setIsDeleteModalOpen(true));
  };

  const handleHideClick = (orderDetail: OrderDetail) => {
    setFocusSafely(orderDetail.id);
    setHidingDetail(orderDetail);
    withSkipClear(() => setIsHideModalOpen(true));
  };

  const handleViewClick = (orderDetail: OrderDetail) => {
    setFocusSafely(orderDetail.id);
    setViewingDetail(orderDetail);
    withSkipClear(() => setIsViewModalOpen(true));
  };

  const handleEditSave = (data: Partial<OrderDetail>) => {
    if (editingDetail && onEdit) {
      onEdit(editingDetail, data);
      withSkipClear(() => setIsEditModalOpen(false));
      setEditingDetail(null);
    }
  };

  const handleDeleteConfirm = (reason?: string) => {
    if (deletingDetail && onDelete) {
      onDelete(deletingDetail, reason);
      withSkipClear(() => setIsDeleteModalOpen(false));
      setDeletingDetail(null);
    }
  };

  const handleHideConfirm = (reason: string) => {
    if (hidingDetail && onHide) {
      onHide(hidingDetail, reason);
      withSkipClear(() => setIsHideModalOpen(false));
      setHidingDetail(null);
    }
  };

  const handleEditCancel = () => {
    withSkipClear(() => setIsEditModalOpen(false));
    setEditingDetail(null);
  };

  const handleDeleteCancel = () => {
    withSkipClear(() => setIsDeleteModalOpen(false));
    setDeletingDetail(null);
  };

  const handleHideCancel = () => {
    withSkipClear(() => setIsHideModalOpen(false));
    setHidingDetail(null);
  };

  const handleViewCancel = () => {
    withSkipClear(() => setIsViewModalOpen(false));
    setViewingDetail(null);
  };

  // ✅ Function để handle sort - 3 trạng thái: desc -> asc -> null
  const handleSort = (field: "quantity" | "unit_price" | "created_at") => {
    if (!onSort) return;

    if (currentSortField !== field) {
      // Nếu click vào cột khác, bắt đầu với desc
      onSort(field, "desc");
    } else {
      // Nếu click vào cùng cột
      if (currentSortDirection === "desc") {
        onSort(field, "asc");
      } else if (currentSortDirection === "asc") {
        onSort(null, null); // Reset về trạng thái ban đầu
      } else {
        onSort(field, "desc");
      }
    }
  };

  // ✅ Function để handle click vào tên khách hàng (double click = search)
  const handleCustomerNameClick = (customerName: string) => {
    if (onSearch && customerName && customerName.trim() !== "N/A") {
      onSearch(customerName.trim());
    }
  };

  // ✅ Function để handle single click tên khách hàng (edit)
  const handleCustomerNameEdit = (orderDetail: OrderDetail) => {
    setFocusSafely(orderDetail.id);
    setEditingCustomerName(orderDetail);
    setIsEditCustomerNameModalOpen(true);
  };

  // ✅ Function để handle save customer name
  const handleCustomerNameSave = (
    orderDetail: OrderDetail,
    newCustomerName: string
  ) => {
    if (onEditCustomerName) {
      onEditCustomerName(orderDetail, newCustomerName);
      setIsEditCustomerNameModalOpen(false);
      setEditingCustomerName(null);
    }
  };

  // ✅ Function để handle cancel customer name edit
  const handleCustomerNameCancel = () => {
    withSkipClear(() => setIsEditCustomerNameModalOpen(false));
    setEditingCustomerName(null);
  };

  // ✅ Blacklist handlers
  const handleAddToBlacklistClick = (orderDetail: OrderDetail) => {
    setFocusSafely(orderDetail.id);
    setAddingToBlacklist(orderDetail);
    setIsAddToBlacklistModalOpen(true);
  };

  const handleAddToBlacklistConfirm = (reason?: string) => {
    if (addingToBlacklist && onAddToBlacklist) {
      onAddToBlacklist(addingToBlacklist, reason);
      withSkipClear(() => setIsAddToBlacklistModalOpen(false));
      setAddingToBlacklist(null);
    }
  };

  const handleAddToBlacklistCancel = () => {
    withSkipClear(() => setIsAddToBlacklistModalOpen(false));
    setAddingToBlacklist(null);
  };

  // ✅ Data được sort từ backend, không cần sort ở frontend nữa
  const displayOrders = safeOrders;

  // ✅ Function để render sort icon
  const renderSortIcon = (field: "quantity" | "unit_price" | "created_at") => {
    if (currentSortField !== field) {
      return null; // Không hiển thị icon nếu không phải cột đang sort
    }

    if (currentSortDirection === "desc") {
      return <ChevronDown className="w-4 h-4 inline ml-1" />;
    } else if (currentSortDirection === "asc") {
      return <ChevronUp className="w-4 h-4 inline ml-1" />;
    }

    return null;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ xử lý";
      case "quoted":
        return "Chưa chốt";
      case "completed":
        return "Đã Chốt";
      case "demand":
        return "Nhu cầu";
      case "confirmed":
        return "Đã phản hồi";
      default:
        return status || "N/A";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 shadow-sm";
      case "quoted":
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm";
      case "completed":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 shadow-sm";
      case "demand":
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 shadow-sm";
      case "confirmed":
        return "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300 shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 shadow-sm";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3 mr-1" />;
      case "quoted":
        return <TrendingUp className="w-3 h-3 mr-1" />;
      case "completed":
        return <CheckCircle className="w-3 h-3 mr-1" />;
      case "demand":
        return <AlertTriangle className="w-3 h-3 mr-1" />;
      case "confirmed":
        return <Shield className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  // ✅ Sửa đổi getRowClassName để sử dụng extended động
  const getRowClassName = (orderDetail: OrderDetail, index: number) => {
    const dynamicExtended = calculateDynamicExtended(
      orderDetail.created_at,
      orderDetail.extended || 0
    );

    switch (dynamicExtended) {
      case 1:
        return "bg-gradient-to-r from-red-50 via-red-25 to-red-50 hover:from-red-100 hover:to-red-75 border-l-4 border-red-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
      case 2:
        return "bg-gradient-to-r from-amber-50 via-amber-25 to-amber-50 hover:from-amber-100 hover:to-amber-75 border-l-4 border-amber-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
      case 3:
        return "bg-gradient-to-r from-emerald-50 via-emerald-25 to-emerald-50 hover:from-emerald-100 hover:to-emerald-75 border-l-4 border-emerald-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
      default:
        if (dynamicExtended >= 4) {
          return index % 2 === 0
            ? "bg-gradient-to-r from-slate-50 via-slate-25 to-slate-50 hover:from-slate-100 hover:to-slate-75 border-l-4 border-slate-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1"
            : "bg-gradient-to-r from-gray-50 via-gray-25 to-gray-50 hover:from-gray-100 hover:to-gray-75 border-l-4 border-gray-400 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
        }
        return "bg-gradient-to-r from-white via-gray-25 to-white hover:from-gray-50 hover:to-gray-50 border-l-4 border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg my-1";
    }
  };

  const getExtendedBadgeStyle = (extended: number) => {
    switch (extended) {
      case 1:
        return "px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-red-300 border-2 border-red-400 glow-red transform hover:scale-105 transition-all duration-200";
      case 2:
        return "px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-amber-300 border-2 border-amber-400 glow-amber transform hover:scale-105 transition-all duration-200";
      case 3:
        return "px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-emerald-300 border-2 border-emerald-400 glow-emerald transform hover:scale-105 transition-all duration-200";
      default:
        if (extended >= 4) {
          return "px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-blue-300 border-2 border-blue-400 glow-blue transform hover:scale-105 transition-all duration-200";
        }
        return "px-2 py-1 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 rounded-full text-xs font-medium shadow-sm border border-gray-300 transform hover:scale-105 transition-all duration-200";
    }
  };

  const getExtendedIcon = (extended: number) => {
    switch (extended) {
      case 1:
        return <AlertTriangle className="w-3 h-3 mr-1" />;
      case 2:
        return <Clock className="w-3 h-3 mr-1" />;
      case 3:
        return <Zap className="w-3 h-3 mr-1" />;
      default:
        if (extended >= 4) {
          return <Star className="w-3 h-3 mr-1" />;
        }
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1750px] table-fixed">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <TableHead className="font-bold text-gray-700 w-[50px] text-center">
                  #
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[100px] text-center">
                  Mã đơn
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[80px] text-center">
                  Gia hạn
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Thời gian
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Nhân viên
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Khách hàng
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[400px] text-center">
                  Mặt hàng
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[60px] text-center">
                  SL
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-right">
                  Đơn giá
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Trạng thái
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[120px] text-center">
                  Gia Hạn Cuối
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[140px] text-center">
                  Ghi chú
                </TableHead>
                <TableHead className="font-bold text-gray-700 w-[200px] text-center">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ✅ CHỈ tạo skeleton theo actualRowCount, không phải expectedRowCount */}
              {Array.from({ length: actualRowCount }).map((_, index) => (
                <TableRow
                  key={`skeleton-${index}`}
                  className="border-l-4 border-gray-300 bg-gradient-to-r from-gray-50 to-white rounded-lg shadow-sm my-1 animate-pulse"
                >
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-16 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-12 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-full rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 rounded ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 rounded mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  const canBulkAct = useMemo(() => {
    if (selectedOrders.length === 0) return false;
    return selectedOrders.every(isOwner);
  }, [selectedOrders, isOwner]);

  return (
    <TooltipProvider>
      <style jsx>{`
        .glow-red {
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }
        .glow-amber {
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }
        .glow-emerald {
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }
        .glow-blue {
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .text-truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .text-wrap {
          word-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
        }
      `}</style>

      <div className="space-y-2">
        {/* ✅ Bulk Actions */}
        <BulkActions
          selectedOrders={selectedOrders}
          onBulkDelete={handleBulkDelete}
          onBulkExtend={handleBulkExtend}
          onBulkNotes={handleBulkNotes}
          onBulkHide={handleBulkHide}
          loading={loading}
          canAct={canBulkAct}
        />

        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide shadow-inner rounded-lg border border-slate-200">
            <Table className="min-w-[1800px] table-fixed bg-white">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b-2 border-slate-300 shadow-sm">
                  {/* ✅ Checkbox column */}
                  <TableHead className="font-bold text-slate-700 text-sm w-[40px] text-center left-0 bg-slate-100">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Chọn tất cả đơn hàng"
                      className={
                        isSomeSelected
                          ? "data-[state=indeterminate]:bg-primary"
                          : ""
                      }
                    />
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[50px] text-center left-[40px] bg-slate-100">
                    #
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[100px] text-center">
                    🏷️ Mã đơn
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[80px] text-center">
                    ⏰ Gia hạn
                  </TableHead>
                  <TableHead
                    className="font-bold text-slate-700 text-sm w-[120px] text-center cursor-pointer hover:bg-slate-200 transition-colors select-none"
                    onDoubleClick={() => handleSort("created_at")} // ✅ THÊM handler
                    title="Double-click để sắp xếp"
                  >
                    📅 Thời gian{renderSortIcon("created_at")}{" "}
                    {/* ✅ THÊM icon */}
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[220px] text-center">
                    👤 Nhân viên
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[220px] text-center">
                    🏪 Khách hàng
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[300px] text-center">
                    🛍️ Mặt hàng
                  </TableHead>
                  <TableHead
                    className="font-bold text-slate-700 text-sm w-[60px] text-center cursor-pointer hover:bg-slate-200 transition-colors select-none"
                    onDoubleClick={() => handleSort("quantity")}
                    title="Double-click để sắp xếp"
                  >
                    🔢 SL{renderSortIcon("quantity")}
                  </TableHead>
                  <TableHead
                    className="font-bold text-slate-700 text-sm w-[100px] text-right cursor-pointer hover:bg-slate-200 transition-colors select-none"
                    onDoubleClick={() => handleSort("unit_price")}
                    title="Double-click để sắp xếp"
                  >
                    💰 Đơn giá{renderSortIcon("unit_price")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[120px] text-center">
                    📊 Trạng thái
                  </TableHead>
                  {/* ✅ CẬP NHẬT: Thêm width cụ thể cho cột thời gian gia hạn cuối */}
                  <TableHead className="font-bold text-slate-700 text-sm w-[130px] text-center">
                    ⏰ Gia hạn cuối
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[140px] text-center">
                    📝 Ghi chú
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-sm w-[200px] text-center">
                    ⚙️ Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayOrders.length === 0 && (
                  <TableRow className="border-l-4 border-gray-300 bg-gradient-to-r from-gray-50 to-white rounded-lg shadow-sm my-1">
                    <TableCell
                      colSpan={16}
                      className="text-center py-8 text-gray-500"
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className="text-6xl">📋</div>
                        <div className="text-lg font-medium">
                          Không có dữ liệu đơn hàng
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* ✅ CHỈ hiển thị data thật có, KHÔNG tạo empty rows */}
                {displayOrders.length > 0 &&
                  displayOrders.map((orderDetail, index) => (
                    <TableRow
                      key={orderDetail.id || index}
                      {...(focusedRowId === orderDetail.id
                        ? { "data-focused-row-id": String(orderDetail.id) }
                        : {})}
                      className={`${getRowClassName(orderDetail, index)} ${
                        focusedRowId === orderDetail.id
                          ? "focused-no-hover ring-2 ring-indigo-300 shadow-lg bg-amber-300"
                          : ""
                      }`}
                    >
                      {(() => {
                        const owner = isOwner(orderDetail);
                        return (
                          <>
                            {/* ✅ Checkbox cell */}
                            <TableCell className="text-center left-0 bg-inherit">
                              <Checkbox
                                checked={selectedOrderIds.has(orderDetail.id)}
                                onCheckedChange={() =>
                                  handleSelectOrder(orderDetail.id)
                                }
                                aria-label={`Chọn đơn hàng #${orderDetail.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-center left-[40px] bg-inherit">
                              <div className="flex items-center justify-center w-8 h-8 bg-slate-200 rounded-full text-xs font-bold shadow-sm mx-auto">
                                {startIndex + index + 1}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-blue-700">
                              <div className="text-truncate">
                                #{orderDetail.id || "N/A"}
                              </div>
                            </TableCell>
                            {/* ✅ Sửa đổi phần hiển thị extended để sử dụng giá trị động */}
                            <TableCell className="text-center">
                              {(() => {
                                const dynamicExtended =
                                  calculateDynamicExtended(
                                    orderDetail.created_at,
                                    orderDetail.extended || 0
                                  );
                                return (
                                  <span
                                    className={`inline-flex items-center ${getExtendedBadgeStyle(
                                      dynamicExtended
                                    )}`}
                                    title={`Công thức: ${
                                      orderDetail.created_at
                                        ? new Date(
                                            orderDetail.created_at
                                          ).getDate()
                                        : "N/A"
                                    } + ${
                                      orderDetail.extended || 0
                                    } - ${new Date().getDate()} = ${dynamicExtended}`}
                                  >
                                    {getExtendedIcon(dynamicExtended)}
                                    {dynamicExtended}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-center text-slate-600 text-sm">
                              <div className="flex flex-col">
                                {orderDetail.created_at ? (
                                  typeof orderDetail.created_at === "string" ? (
                                    <>
                                      <div className="font-medium text-blue-600">
                                        {orderDetail.created_at.includes(" ")
                                          ? orderDetail.created_at.split(
                                              " "
                                            )[1] || ""
                                          : ""}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {orderDetail.created_at.includes(" ")
                                          ? orderDetail.created_at.split(
                                              " "
                                            )[0] || ""
                                          : orderDetail.created_at}
                                      </div>
                                    </>
                                  ) : orderDetail.created_at instanceof Date ? (
                                    <>
                                      <div className="font-medium text-blue-600">
                                        {orderDetail.created_at.toLocaleTimeString(
                                          "vi-VN"
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {orderDetail.created_at.toLocaleDateString(
                                          "vi-VN"
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div>""</div>
                                  )
                                ) : (
                                  <div>""</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-purple-700 text-sm">
                              <TruncatedText
                                text={
                                  orderDetail.order?.sale_by?.fullName ||
                                  orderDetail.order?.sale_by?.username ||
                                  "N/A"
                                }
                                maxLength={15}
                                className="text-truncate"
                              />
                            </TableCell>
                            <TableCell className="text-center font-medium text-green-700 text-sm">
                              <div className="flex items-center justify-center gap-1">
                                <div
                                  className="cursor-pointer hover:bg-green-50 rounded px-1 py-1 transition-colors flex-1"
                                  onDoubleClick={() => {
                                    // Set focus to this row when user double-clicks customer name
                                    setFocusSafely(orderDetail.id);
                                    handleCustomerNameClick(
                                      orderDetail.customer_name || ""
                                    );
                                  }}
                                  title="Double-click để tìm kiếm tất cả đơn của khách hàng này"
                                >
                                  <TruncatedText
                                    text={orderDetail.customer_name || "--"}
                                    maxLength={12}
                                    className="text-truncate"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 hover:bg-green-100 mr-5"
                                  onClick={() =>
                                    owner && handleCustomerNameEdit(orderDetail)
                                  }
                                  title={
                                    owner
                                      ? "Sửa tên khách hàng"
                                      : "Chỉ chủ sở hữu đơn hàng mới được sửa tên khách hàng"
                                  }
                                  disabled={!owner}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-left text-slate-600 hover:text-slate-800 transition-colors">
                              <TruncatedText
                                text={orderDetail.raw_item || "N/A"}
                                maxLength={55}
                                className="text-wrap leading-relaxed"
                              />
                            </TableCell>
                            <TableCell className="text-center font-semibold text-indigo-600">
                              <div className="text-truncate">
                                {orderDetail.quantity || 0}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600 text-sm">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-truncate cursor-help">
                                    {orderDetail.unit_price
                                      ? Number(
                                          orderDetail.unit_price
                                        ).toLocaleString() + "₫"
                                      : "0₫"}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span>
                                    {orderDetail.unit_price
                                      ? Number(
                                          orderDetail.unit_price
                                        ).toLocaleString(undefined, {
                                          maximumFractionDigits: 10,
                                        }) + "₫"
                                      : "0₫"}
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  orderDetail.status || ""
                                )}`}
                              >
                                {getStatusIcon(orderDetail.status || "")}
                                <span className="text-truncate max-w-[80px]">
                                  {getStatusLabel(orderDetail.status || "")}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="p-3 text-center w-[130px]">
                              {orderDetail.last_extended_at ? (
                                <div className="flex flex-col items-center space-y-1">
                                  <span className="text-xs text-purple-600 font-medium truncate">
                                    {(() => {
                                      const date =
                                        typeof orderDetail.last_extended_at ===
                                        "string"
                                          ? new Date(
                                              orderDetail.last_extended_at
                                            )
                                          : orderDetail.last_extended_at;
                                      return date.toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      });
                                    })()}
                                  </span>
                                  <span className="text-xs text-purple-500">
                                    {(() => {
                                      const date =
                                        typeof orderDetail.last_extended_at ===
                                        "string"
                                          ? new Date(
                                              orderDetail.last_extended_at
                                            )
                                          : orderDetail.last_extended_at;
                                      return date.toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      });
                                    })()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  --
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-slate-600 italic hover:text-slate-800 transition-colors text-sm px-3">
                              <TruncatedText
                                text={orderDetail.notes || "—"}
                                maxLength={18}
                                className="text-wrap leading-relaxed"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <POrderDynamic action="read">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          handleViewClick(orderDetail)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Xem tin nhắn</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </POrderDynamic>

                                <POrderDynamic action="update">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          owner && handleEditClick(orderDetail)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                                        disabled={!owner}
                                        title={
                                          owner
                                            ? "Sửa"
                                            : "Chỉ chủ sở hữu được sửa"
                                        }
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {owner
                                          ? "Sửa"
                                          : "Chỉ chủ sở hữu đơn hàng mới được thao tác"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </POrderDynamic>

                                <POrderDynamic action="delete">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          owner &&
                                          handleDeleteClick(orderDetail)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                                        disabled={!owner}
                                        title={
                                          owner
                                            ? "Xóa"
                                            : "Chỉ chủ sở hữu được xóa"
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {owner
                                          ? "Xóa"
                                          : "Chỉ chủ sở hữu đơn hàng mới được thao tác"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </POrderDynamic>

                                <POrderDynamic action="update">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          owner && handleHideClick(orderDetail)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
                                        disabled={!owner}
                                        title={
                                          owner
                                            ? "Ẩn"
                                            : "Chỉ chủ sở hữu được ẩn"
                                        }
                                      >
                                        <EyeOff className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {owner
                                          ? "Ẩn"
                                          : "Chỉ chủ sở hữu đơn hàng mới được thao tác"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </POrderDynamic>

                                <POrderDynamic action="update">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          owner &&
                                          handleAddToBlacklistClick(orderDetail)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors"
                                        disabled={!owner}
                                        title={
                                          owner
                                            ? "Thêm vào blacklist"
                                            : "Chỉ chủ sở hữu được thao tác"
                                        }
                                      >
                                        <Shield className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {owner
                                          ? "Thêm vào blacklist"
                                          : "Chỉ chủ sở hữu đơn hàng mới được thao tác"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </POrderDynamic>
                              </div>
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  ))}

                {/* ✅ LOẠI BỎ: Không tạo empty rows nữa */}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {editingDetail && (
        <EditOrderDetailModal
          orderDetail={editingDetail}
          isOpen={isEditModalOpen}
          onClose={handleEditCancel}
          onSave={handleEditSave}
          loading={loading}
        />
      )}

      {deletingDetail && (
        <DeleteOrderDetailModal
          orderDetail={deletingDetail}
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          loading={loading}
        />
      )}

      {hidingDetail && (
        <HideOrderDetailModal
          orderDetail={hidingDetail}
          isOpen={isHideModalOpen}
          onClose={handleHideCancel}
          onConfirm={handleHideConfirm}
          loading={loading}
        />
      )}

      {/* Messages Modal */}
      {viewingDetail && (
        <Dialog
          open={isViewModalOpen}
          onOpenChange={(v: boolean) =>
            withSkipClear(() => setIsViewModalOpen(v))
          }
        >
          <DialogContent
            className="max-w-7xl max-h-[90vh] p-0 overflow-hidden border-0 bg-transparent"
            style={{ width: "90vw", minWidth: 1000 }}
          >
            {/* Floating background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute top-6 left-8 text-blue-300 animate-pulse">
                <Star className="w-3 h-3 opacity-60" />
              </div>
              <div
                className="absolute top-12 right-12 text-cyan-300 animate-bounce"
                style={{ animationDelay: "0.5s" }}
              >
                <Zap className="w-4 h-4 opacity-40" />
              </div>
              <div
                className="absolute bottom-8 left-16 text-indigo-300 animate-ping"
                style={{ animationDelay: "1s" }}
              >
                <Star className="w-3 h-3 opacity-30" />
              </div>
              <div
                className="absolute bottom-16 right-8 text-blue-200 animate-pulse"
                style={{ animationDelay: "1.5s" }}
              >
                <Sparkles className="w-4 h-4 opacity-50" />
              </div>
              <div
                className="absolute top-1/2 left-4 text-cyan-200 animate-bounce"
                style={{ animationDelay: "2s" }}
              >
                <MessageCircle className="w-3 h-3 opacity-40" />
              </div>
            </div>

            {/* Main modal container with stunning effects */}
            <div className="relative p-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 rounded-3xl animate-gradient-shift z-10">
              <div className="relative bg-gradient-to-br from-white via-blue-50 to-indigo-50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
                {/* Enhanced Header */}
                <DialogHeader className="relative p-0 m-0">
                  <div className="relative p-6 bg-gradient-to-br from-blue-600 via-cyan-600 to-indigo-600 text-white overflow-hidden">
                    {/* Header background effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-indigo-500/20 animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-400 animate-shimmer"></div>

                    {/* Floating sparkles in header */}
                    <div className="absolute top-4 right-6 text-cyan-300 animate-bounce">
                      <Sparkles className="w-5 h-5 drop-shadow-lg" />
                    </div>

                    <DialogTitle className="sr-only">Xem tin nhắn</DialogTitle>

                    {/* Enhanced customer info */}
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Enhanced avatar */}
                        <div className="relative group">
                          <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20"></div>
                          <div className="relative w-14 h-14 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border-3 border-white/50 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg font-bold text-white drop-shadow-lg">
                              {viewingDetail?.customer_name?.charAt(0) || "K"}
                            </span>
                          </div>
                          {/* Online indicator */}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-bold text-lg text-white drop-shadow-md">
                            {viewingDetail?.customer_name || "Khách hàng"}
                          </h3>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-cyan-100 font-medium flex items-center gap-2">
                              <Hash className="w-4 h-4" />
                              Mã đơn: {viewingDetail?.id ?? "N/A"}
                            </p>

                            {/* Conversation type badge (Nhóm chat / Cá Nhân) */}
                            {(() => {
                              // Normalize metadata (support string or object) and new format
                              let md: any = viewingDetail?.metadata as any;
                              if (typeof md === "string") {
                                try {
                                  md = JSON.parse(md);
                                } catch {
                                  md = {};
                                }
                              }
                              const legacyType = md?.conversation_type as
                                | string
                                | undefined;
                              const newIsGroup = md?.conversation_info
                                ?.is_group as boolean | undefined;
                              const type =
                                legacyType ??
                                (typeof newIsGroup === "boolean"
                                  ? newIsGroup
                                    ? "group"
                                    : "private"
                                  : undefined);
                              if (!type) return null;
                              const label =
                                type === "group"
                                  ? "Nhóm chat"
                                  : type === "private"
                                  ? "Cá Nhân"
                                  : "Không xác định";
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20 text-white/90 border border-white/30">
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <User className="w-4 h-4 text-cyan-200" />
                          <p className="text-sm text-cyan-100 font-medium">
                            Sale:{" "}
                            {viewingDetail?.order?.sale_by?.fullName ||
                              viewingDetail?.order?.sale_by?.username ||
                              "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <Clock className="w-4 h-4 text-cyan-200" />
                          <p className="text-xs text-cyan-200">Online now</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* Enhanced Messages Container */}
                <div className="relative flex flex-col h-[65vh] bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/30 overflow-hidden">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100"></div>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), 
                         radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)`,
                      }}
                    ></div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-6 relative z-10 scrollbar-hide hover:scrollbar-show">
                    {(() => {
                      try {
                        // Normalize metadata (support string or object)
                        let metadata: any = viewingDetail.metadata ?? {};
                        if (typeof metadata === "string") {
                          try {
                            metadata = JSON.parse(metadata);
                          } catch {
                            metadata = {};
                          }
                        }

                        // Unified message model used by UI
                        interface Message {
                          type: "customer" | "sale";
                          text: string;
                          time: string;
                          index: number;
                          messageId?: number | string;
                          senderName?: string;
                          // Quoted/replied message support
                          isQuoted?: boolean;
                          quotedMessageId?: number | string | null;
                          quotedSenderName?: string | null;
                          quotedText?: string;
                        }

                        let messages: Message[] = [];

                        // Common fallback names
                        const saleDisplayName =
                          viewingDetail?.order?.sale_by?.fullName ||
                          viewingDetail?.order?.sale_by?.username ||
                          "Sale";
                        const customerDisplayName =
                          viewingDetail?.customer_name ||
                          metadata?.conversation_info?.conversation_name ||
                          "Khách";

                        // New format: metadata.messages (array)
                        if (Array.isArray(metadata.messages)) {
                          const rawMessages = metadata.messages as any[];
                          // First pass: build base messages
                          messages = rawMessages.map((m: any, i: number) => {
                            let text = "";
                            try {
                              const parsed =
                                typeof m.content === "string"
                                  ? JSON.parse(m.content)
                                  : m.content;
                              text = parsed?.text ?? String(m.content ?? "");
                            } catch {
                              text = String(m.content ?? "");
                            }
                            let time = "";
                            try {
                              const d = new Date(m.timestamp);
                              if (!isNaN(d.getTime())) {
                                time = formatVietnamDateTime(d);
                              }
                            } catch {
                              time = "";
                            }
                            const type: Message["type"] =
                              m.role?.toString().toUpperCase() === "SALE"
                                ? "sale"
                                : "customer";
                            const senderName =
                              m.sender_name?.toString?.() ||
                              (type === "sale"
                                ? saleDisplayName
                                : customerDisplayName);
                            const isQuoted =
                              Boolean(m.is_quoted_message) ||
                              m.quoted_message_id != null;
                            const quotedMessageId = m.quoted_message_id ?? null;
                            const quotedSenderName =
                              m.quoted_sender_name?.toString?.() ?? null;
                            return {
                              type,
                              text,
                              time,
                              index: i,
                              messageId: m.message_id,
                              senderName,
                              isQuoted,
                              quotedMessageId,
                              quotedSenderName,
                            };
                          });

                          // Second pass: resolve quoted text by referenced message_id
                          try {
                            const messageLookup = new Map<
                              string,
                              { text: string; senderName?: string }
                            >();
                            for (const msg of messages) {
                              if (
                                msg.messageId !== undefined &&
                                msg.messageId !== null
                              ) {
                                messageLookup.set(String(msg.messageId), {
                                  text: msg.text,
                                  senderName: msg.senderName,
                                });
                              }
                            }
                            messages = messages.map((msg) => {
                              if (msg.quotedMessageId != null) {
                                const entry = messageLookup.get(
                                  String(msg.quotedMessageId)
                                );
                                if (entry) {
                                  return {
                                    ...msg,
                                    quotedText: entry.text,
                                    quotedSenderName:
                                      msg.quotedSenderName ||
                                      entry.senderName ||
                                      null,
                                  };
                                }
                              }
                              return msg;
                            });
                          } catch {}
                        } else {
                          // Legacy format: metadata.content_lq (string with [CUSTOMER]/[SALE] lines)
                          const contentLq = metadata.content_lq || "";

                          if (!contentLq) {
                            return (
                              <div className="flex justify-center items-center h-full">
                                <div className="text-center">
                                  {/* Enhanced empty state */}
                                  <div className="relative mb-6">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                                      <div className="relative">
                                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                                        <MessageCircle className="relative w-12 h-12 text-blue-500 animate-pulse" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xl font-semibold text-gray-600 mb-2">
                                    Không có tin nhắn nào
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    Cuộc trò chuyện sẽ hiển thị tại đây
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          const lines = contentLq.split("\n");
                          lines.forEach((line: string, index: number) => {
                            const customerMatch = line.match(
                              /\[CUSTOMER\]\s*(.+?)\s*\((\d+:\d+)\)/
                            );
                            const saleMatch = line.match(
                              /\[SALE\]\s*(.+?)\s*\((\d+:\d+)\)/
                            );

                            if (customerMatch) {
                              try {
                                const messageData = JSON.parse(
                                  customerMatch[1]
                                );
                                messages.push({
                                  type: "customer",
                                  text: messageData.text || "",
                                  time: customerMatch[2] || "",
                                  index,
                                  senderName: customerDisplayName,
                                });
                              } catch (e) {
                                messages.push({
                                  type: "customer",
                                  text: customerMatch[1] || "",
                                  time: customerMatch[2] || "",
                                  index,
                                  senderName: customerDisplayName,
                                });
                              }
                            } else if (saleMatch) {
                              try {
                                const messageData = JSON.parse(saleMatch[1]);
                                messages.push({
                                  type: "sale",
                                  text: messageData.text || "",
                                  time: saleMatch[2] || "",
                                  index,
                                  senderName: saleDisplayName,
                                });
                              } catch (e) {
                                messages.push({
                                  type: "sale",
                                  text: saleMatch[1] || "",
                                  time: saleMatch[2] || "",
                                  index,
                                  senderName: saleDisplayName,
                                });
                              }
                            }
                          });
                        }

                        if (messages.length === 0) {
                          return (
                            <div className="flex justify-center items-center h-full">
                              <div className="text-center">
                                <div className="relative mb-6">
                                  <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto shadow-xl">
                                    <AlertTriangle className="w-10 h-10 text-red-500 animate-bounce" />
                                  </div>
                                </div>
                                <div className="text-lg font-medium text-red-600">
                                  Không thể tải tin nhắn
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return messages.map(
                          (message: Message, index: number) => {
                            if (message.type === "customer") {
                              return (
                                <div
                                  key={`customer-${message.messageId ?? index}`}
                                  className="flex items-start space-x-4 animate-fadeInLeft group"
                                  style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                  {/* Enhanced customer avatar */}
                                  <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gray-400 rounded-full animate-pulse opacity-20"></div>
                                    <div className="relative w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                                      <span className="text-xs text-white font-bold">
                                        {viewingDetail.customer_name?.charAt(
                                          0
                                        ) || "K"}
                                      </span>
                                    </div>
                                    {/* Message indicator */}
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-400 rounded-full border-2 border-white animate-bounce opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  </div>

                                  <div className="flex flex-col space-y-2 max-w-md lg:max-w-lg">
                                    {/* Enhanced message bubble - ALWAYS on top and clear */}
                                    <div className="relative group/message">
                                      <div className="absolute inset-0 bg-gradient-to-br from-white to-blue-50 rounded-2xl blur opacity-30 group-hover/message:opacity-50 transition-opacity duration-300"></div>
                                      <div className="relative bg-white/95 backdrop-blur-sm p-4 rounded-2xl rounded-tl-md shadow-lg border-2 border-blue-100/50 group-hover/message:shadow-2xl group-hover/message:scale-[1.02] transition-all duration-300">
                                        {/* Quoted message preview (INSIDE main bubble, at top, muted) */}
                                        {message.isQuoted && (
                                          <div className="mb-3 pb-3 border-b border-gray-200/60">
                                            {/* Muted quoted message container */}
                                            <div className="relative overflow-hidden rounded-lg bg-gray-50/70 border border-gray-200/40 p-3">
                                              {/* Overlay to make it more muted */}
                                              <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>

                                              {/* Quote indicator line */}
                                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-300 to-blue-400 opacity-60"></div>

                                              <div className="relative pl-3">
                                                {/* Quoted sender info - muted */}
                                                <div className="flex items-center gap-2 mb-1.5">
                                                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-50"></div>
                                                  <span className="text-xs font-medium text-gray-500/80">
                                                    Trả lời{" "}
                                                    {message.quotedSenderName ||
                                                      "tin nhắn"}
                                                  </span>
                                                  {message.quotedMessageId !==
                                                    undefined &&
                                                    message.quotedMessageId !==
                                                      null && (
                                                      <span className="text-[10px] text-gray-400 bg-gray-100/80 px-1.5 py-0.5 rounded opacity-70">
                                                        #
                                                        {String(
                                                          message.quotedMessageId
                                                        )}
                                                      </span>
                                                    )}
                                                </div>

                                                {/* Quoted message content - heavily muted */}
                                                <div className="text-xs text-gray-400/90 line-clamp-2 whitespace-pre-wrap opacity-75 italic">
                                                  "
                                                  {message.quotedText ||
                                                    "(Không xem được nội dung)"}
                                                  "
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Main message content - PROMINENT */}
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                                          <EmojiRenderer
                                            text={message.text.replace(
                                              /\\n/g,
                                              "\n"
                                            )}
                                            renderMode="image"
                                          />
                                        </p>

                                        {/* Message tail */}
                                        <div className="absolute -left-2 top-4 w-4 h-4 bg-white/95 transform rotate-45 border-l-2 border-t-2 border-blue-100/50"></div>
                                      </div>
                                    </div>

                                    {/* Enhanced timestamp with sender name */}
                                    <div className="flex items-center gap-2 ml-4">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-500 font-medium">
                                        {message.senderName
                                          ? `${message.senderName} • ${
                                              message.time || ""
                                            }`
                                          : message.time}
                                      </span>
                                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div
                                  key={`sale-${message.messageId ?? index}`}
                                  className="flex items-start space-x-4 justify-end animate-fadeInRight group"
                                  style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                  <div className="flex flex-col space-y-2 max-w-md lg:max-w-lg">
                                    {/* Enhanced sale message bubble - ALWAYS on top and clear */}
                                    <div className="relative group/message">
                                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl blur opacity-30 group-hover/message:opacity-50 transition-opacity duration-300"></div>
                                      <div className="relative bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-4 rounded-2xl rounded-tr-md shadow-lg border border-blue-400/30 group-hover/message:shadow-2xl group-hover/message:scale-[1.02] transition-all duration-300">
                                        {/* Quoted message preview (INSIDE main bubble, at top, muted) */}
                                        {message.isQuoted && (
                                          <div className="mb-3 pb-3 border-b border-white/20">
                                            {/* Muted quoted message container */}
                                            <div className="relative overflow-hidden rounded-lg bg-black/10 border border-white/20 p-3">
                                              {/* Overlay to make it more muted */}
                                              <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

                                              {/* Quote indicator line */}
                                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-300 to-cyan-200 opacity-70"></div>

                                              <div className="relative pl-3">
                                                {/* Quoted sender info - muted */}
                                                <div className="flex items-center gap-2 mb-1.5 justify-end">
                                                  {message.quotedMessageId !==
                                                    undefined &&
                                                    message.quotedMessageId !==
                                                      null && (
                                                      <span className="text-[10px] text-cyan-200/70 bg-white/10 px-1.5 py-0.5 rounded">
                                                        #
                                                        {String(
                                                          message.quotedMessageId
                                                        )}
                                                      </span>
                                                    )}
                                                  <span className="text-xs font-medium text-white/70">
                                                    Trả lời{" "}
                                                    {message.quotedSenderName ||
                                                      "tin nhắn"}
                                                  </span>
                                                  <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full opacity-60"></div>
                                                </div>

                                                {/* Quoted message content - heavily muted */}
                                                <div className="text-xs text-white/60 line-clamp-2 whitespace-pre-wrap text-right italic">
                                                  "
                                                  {message.quotedText ||
                                                    "(Không xem được nội dung)"}
                                                  "
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Main message content - PROMINENT */}
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">
                                          <EmojiRenderer
                                            text={message.text.replace(
                                              /\\n/g,
                                              "\n"
                                            )}
                                            renderMode="image"
                                          />
                                        </p>

                                        {/* Message tail */}
                                        <div className="absolute -right-2 top-4 w-4 h-4 bg-gradient-to-br from-blue-500 to-cyan-600 transform rotate-45"></div>

                                        {/* Shimmer effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/message:translate-x-full transition-transform duration-1000 rounded-2xl"></div>
                                      </div>
                                    </div>

                                    {/* Enhanced timestamp with sender name */}
                                    <div className="flex items-center gap-2 mr-4 justify-end">
                                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                                      <span className="text-xs text-gray-500 font-medium">
                                        {message.senderName
                                          ? `${message.senderName} • ${
                                              message.time || ""
                                            }`
                                          : message.time}
                                      </span>
                                      <CheckCircle className="w-3 h-3 text-blue-500" />
                                    </div>
                                  </div>

                                  {/* Enhanced sale avatar */}
                                  <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-20"></div>
                                    <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                                      <span className="text-xs text-white font-bold">
                                        {viewingDetail.order?.sale_by?.fullName?.charAt(
                                          0
                                        ) ||
                                          viewingDetail.order?.sale_by?.username?.charAt(
                                            0
                                          ) ||
                                          "S"}
                                      </span>
                                    </div>
                                    {/* Message indicator */}
                                    <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-bounce opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  </div>
                                </div>
                              );
                            }
                          }
                        );
                      } catch (error) {
                        return (
                          <div className="flex justify-center items-center h-full">
                            <div className="text-center">
                              <div className="relative mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto shadow-xl">
                                  <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                                </div>
                              </div>
                              <div className="text-lg font-medium text-red-600">
                                Lỗi khi tải tin nhắn
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Enhanced Chat Footer */}
                  <div className="relative p-6 bg-white/80 backdrop-blur-sm border-t border-blue-200 shadow-inner">
                    {/* Footer background effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-cyan-50/50"></div>

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-gray-600">
                            Trạng thái:
                          </span>
                        </div>

                        {/* Enhanced status badge */}
                        <div className="relative group">
                          <div
                            className="absolute inset-0 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                            style={{
                              background: getStatusColor(
                                viewingDetail.status || ""
                              ),
                            }}
                          ></div>
                          <span
                            className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-white/50 ${getStatusColor(
                              viewingDetail.status || ""
                            )}`}
                          >
                            <span className="animate-pulse">
                              {getStatusIcon(viewingDetail.status || "")}
                            </span>
                            {getStatusLabel(viewingDetail.status || "")}
                          </span>
                        </div>
                      </div>

                      {/* Enhanced close button */}
                      <Button
                        onClick={handleViewCancel}
                        variant="outline"
                        size="sm"
                        className="group relative overflow-hidden flex items-center gap-2 px-4 py-2 text-base font-medium border-2 border-gray-300 hover:border-red-400 bg-white/80 hover:bg-red-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out backdrop-blur-sm"
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <span className="flex items-center gap-2">
                          <X className="w-4 h-4 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                          <span className="relative z-10">Đóng</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ✅ Bulk Action Modals */}
      <BulkDeleteModal
        selectedOrders={selectedOrders}
        isOpen={isBulkDeleteModalOpen}
        onClose={() => withSkipClear(() => setIsBulkDeleteModalOpen(false))}
        onConfirm={handleBulkDeleteConfirm}
        loading={loading}
      />

      <BulkExtendModal
        selectedOrders={selectedOrders}
        isOpen={isBulkExtendModalOpen}
        onClose={() => withSkipClear(() => setIsBulkExtendModalOpen(false))}
        onConfirm={handleBulkExtendConfirm}
        loading={loading}
      />

      <BulkNotesModal
        selectedOrders={selectedOrders}
        isOpen={isBulkNotesModalOpen}
        onClose={() => withSkipClear(() => setIsBulkNotesModalOpen(false))}
        onConfirm={handleBulkNotesConfirm}
        loading={loading}
      />

      <BulkHideModal
        selectedOrders={selectedOrders}
        isOpen={isBulkHideModalOpen}
        onClose={() => withSkipClear(() => setIsBulkHideModalOpen(false))}
        onConfirm={(reason: string) => {
          if (onBulkHide && selectedOrders.length > 0) {
            onBulkHide(selectedOrders, reason);
            setSelectedOrderIds(new Set());
            withSkipClear(() => setIsBulkHideModalOpen(false));
          }
        }}
        loading={loading}
      />

      {/* ✅ Customer name edit modal */}
      <EditCustomerNameModal
        orderDetail={editingCustomerName}
        isOpen={isEditCustomerNameModalOpen}
        onClose={handleCustomerNameCancel}
        onSave={handleCustomerNameSave}
        loading={loading}
      />

      {/* ✅ Add to Blacklist modal */}
      <AddToBlacklistModal
        orderDetail={addingToBlacklist}
        isOpen={isAddToBlacklistModalOpen}
        onClose={handleAddToBlacklistCancel}
        onConfirm={handleAddToBlacklistConfirm}
        loading={loading}
      />
    </TooltipProvider>
  );
};

export default OrderManagement;
