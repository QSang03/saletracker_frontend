"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Download,
  Filter,
  Users,
  History,
  Trash2,
  CheckCircle,
  AlertCircle,
  Edit3,
  Star,
  Zap,
  Sparkles,
  User,
  MessageSquare,
  FileText,
  XCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getAccessToken } from "@/lib/auth";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { toast } from "sonner";
import CustomerHistoryModal from "@/components/contact-list/zalo/auto-greeting/CustomerHistoryModal";
import DeleteCustomerModal from "@/components/contact-list/zalo/auto-greeting/DeleteCustomerModal";
import ImportExcelModal from "@/components/contact-list/zalo/auto-greeting/ImportExcelModal";
import CSVExportPanel from "@/components/ui/tables/CSVExportPanel";
import SystemStatusBanner from "./SystemStatusBanner";
import SearchAndFilterControls from "./SearchAndFilterControls";
import ActionButtons from "./ActionButtons";
import BulkActionsBar from "./BulkActionsBar";
import EditCustomerModal from "./EditCustomerModal";
import BulkEditModal from "./BulkEditModal";
import BulkDeleteModal from "./BulkDeleteModal";

interface Customer {
  id: string;
  userId: number;
  zaloDisplayName: string;
  userDisplayName?: string; // Tên hiển thị của user sở hữu
  salutation: string;
  greetingMessage: string;
  conversationType?: "group" | "private";
  lastMessageDate?: string;
  customerLastMessageDate?: string;
  customerStatus?: "urgent" | "reminder" | "normal";
  daysSinceLastMessage: number | null;
  status: "ready" | "urgent" | "stable";
  isActive: number; // 1: active, 0: inactive
}

interface SystemConfig {
  enabled: boolean;
  cycleDays: number;
  executionTime: string;
  messageTemplate: string;
  allowCustomMessage: boolean;
}

interface AutoGreetingCustomerListProps {
  // Props sẽ được truyền từ page.tsx
}

const AutoGreetingCustomerList: React.FC<
  AutoGreetingCustomerListProps
> = () => {
  const { currentUser } = useCurrentUser();

  // Helper function để kiểm tra user có quyền xem thông tin người sở hữu không
  const canViewOwnerInfo = () => {
    if (!currentUser?.roles) return false;
    return currentUser.roles.some((role: any) => 
      role.name === 'admin' || 
      role.name === 'Admin' || 
      role.name === 'view' || 
      role.name === 'View'
    );
  };
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [recentlyImportedIds, setRecentlyImportedIds] = useState<Set<string>>(
    new Set()
  );
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conversationTypeFilter, setConversationTypeFilter] =
    useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showExportModal, setShowExportModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  
  // Backend pagination states
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Edit customer states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    zaloDisplayName: "",
    salutation: "",
    greetingMessage: "",
    isActive: 1,
  });
  const [saving, setSaving] = useState(false);

  // Bulk edit states
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    salutation: "",
    greetingMessage: "",
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  // Load filters from localStorage on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("auto-greeting-filters");
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.searchTerm) setSearchTerm(filters.searchTerm);
        if (filters.statusFilter) setStatusFilter(filters.statusFilter);
        if (filters.conversationTypeFilter)
          setConversationTypeFilter(filters.conversationTypeFilter);
        if (filters.dateFilter) setDateFilter(filters.dateFilter);
        if (filters.itemsPerPage) setItemsPerPage(filters.itemsPerPage);
      } catch (error) {
        console.error("Error loading filters from localStorage:", error);
        localStorage.removeItem("auto-greeting-filters");
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filters: any = {};

    if (searchTerm.trim()) filters.searchTerm = searchTerm;
    if (statusFilter && statusFilter !== "all")
      filters.statusFilter = statusFilter;
    if (conversationTypeFilter && conversationTypeFilter !== "all")
      filters.conversationTypeFilter = conversationTypeFilter;
    if (dateFilter) filters.dateFilter = dateFilter;
    if (itemsPerPage && itemsPerPage !== 10)
      filters.itemsPerPage = itemsPerPage;

    if (Object.keys(filters).length > 0) {
      localStorage.setItem("auto-greeting-filters", JSON.stringify(filters));
    } else {
      localStorage.removeItem("auto-greeting-filters");
    }
  }, [
    searchTerm,
    statusFilter,
    conversationTypeFilter,
    dateFilter,
    itemsPerPage,
  ]);

  useEffect(() => {
    loadCustomers();
    loadSystemConfig();
  }, []);

  // Load customers when filters change
  useEffect(() => {
    loadCustomers();
  }, [searchTerm, statusFilter, conversationTypeFilter, dateFilter, currentPage, itemsPerPage]);

  // Bulk selection logic
  const selectedCustomers = customers.filter((customer) =>
    selectedCustomerIds.has(customer.id)
  );
  const isAllSelected =
    customers.length > 0 &&
    customers.every((customer) => selectedCustomerIds.has(customer.id));
  const isPartiallySelected =
    customers.some((customer) => selectedCustomerIds.has(customer.id)) &&
    !isAllSelected;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedCustomerIds(new Set());
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setSelectedCustomerIds(new Set());
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setConversationTypeFilter("all");
    setDateFilter("");
    setCurrentPage(1);
    setSelectedCustomerIds(new Set());
    localStorage.removeItem("auto-greeting-filters");
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { statusFilter }),
        ...(conversationTypeFilter !== "all" && { conversationTypeFilter }),
        ...(dateFilter && { dateFilter }),
      });

      const response = await fetch(
        `/api/auto-greeting/customers?${params.toString()}&t=${Date.now()}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        setCustomers(data.data);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 0);
      } else {
        setCustomers([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      setCustomers([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemConfig = async () => {
    try {
      setConfigLoading(true);
      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/config", {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemConfig(data);
      } else {
        console.error(
          "Failed to load config:",
          response.status,
          response.statusText
        );
        toast.error("Lỗi tải cấu hình hệ thống");
      }
    } catch (error) {
      console.error("Error loading system config:", error);
      toast.error("Lỗi tải cấu hình hệ thống");
    } finally {
      setConfigLoading(false);
    }
  };

  const getGreetingMessage = (customer: Customer) => {
    if (!systemConfig) return "Đang tải...";

    if (!systemConfig.allowCustomMessage) {
      return systemConfig.messageTemplate;
    }

    return customer.greetingMessage || systemConfig.messageTemplate;
  };

  // Edit customer functions
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      zaloDisplayName: customer.zaloDisplayName || "",
      salutation: customer.salutation || "",
      greetingMessage: customer.greetingMessage || "",
      isActive: customer.isActive || 1,
    });
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field: string, value: string | number) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;

    setSaving(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `/api/auto-greeting/customers/${editingCustomer.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            zaloDisplayName: editForm.zaloDisplayName,
            salutation: editForm.salutation,
            greetingMessage: editForm.greetingMessage,
            isActive: editForm.isActive,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success("Đã cập nhật thông tin khách hàng thành công!", {
        description: `Khách hàng "${editForm.zaloDisplayName}" đã được cập nhật`,
        duration: 3000,
      });

      await loadCustomers();
      setEditModalOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error("Lỗi khi cập nhật thông tin khách hàng", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditModalOpen(false);
    setEditingCustomer(null);
    setEditForm({
      zaloDisplayName: "",
      salutation: "",
      greetingMessage: "",
      isActive: 1,
    });
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = new Set(selectedCustomerIds);
      customers.forEach((customer) => newSelected.delete(customer.id));
      setSelectedCustomerIds(newSelected);
    } else {
      const newSelected = new Set(selectedCustomerIds);
      customers.forEach((customer) => newSelected.add(customer.id));
      setSelectedCustomerIds(newSelected);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomerIds);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomerIds(newSelected);
  };

  // Bulk edit handlers
  const handleBulkEdit = () => {
    setBulkEditModalOpen(true);
  };

  const handleBulkDelete = () => {
    setBulkDeleteModalOpen(true);
  };

  const handleBulkEditSave = async () => {
    if (selectedCustomers.length === 0) return;

    setBulkSaving(true);
    try {
      const customerIds = Array.from(selectedCustomerIds);

      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/customers/bulk-update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          customerIds,
          updateData: bulkEditForm,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();

      toast.success(
        `Đã cập nhật ${
          result.updatedCount || selectedCustomers.length
        } khách hàng thành công!`,
        {
          description:
            "Thông tin đã được cập nhật cho tất cả khách hàng được chọn",
          duration: 3000,
        }
      );

      await loadCustomers();
      setSelectedCustomerIds(new Set());
      setBulkEditModalOpen(false);
      setBulkEditForm({ salutation: "", greetingMessage: "" });
    } catch (error) {
      console.error("Failed to bulk update customers:", error);
      toast.error("Lỗi khi cập nhật hàng loạt", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedCustomers.length === 0) return;

    setBulkSaving(true);
    try {
      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/customers/bulk-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          customerIds: Array.from(selectedCustomerIds),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success(
        `Đã xóa ${selectedCustomers.length} khách hàng thành công!`,
        {
          description: "Tất cả khách hàng được chọn đã được xóa",
          duration: 3000,
        }
      );

      await loadCustomers();
      setSelectedCustomerIds(new Set());
      setBulkDeleteModalOpen(false);
    } catch (error) {
      console.error("Failed to bulk delete customers:", error);
      toast.error("Lỗi khi xóa hàng loạt", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkCancel = () => {
    setBulkEditModalOpen(false);
    setBulkDeleteModalOpen(false);
    setBulkEditForm({ salutation: "", greetingMessage: "" });
  };

  const handleImportSuccess = async (importedIds: string[]) => {
    // Set loading để user biết đang refresh
    setLoading(true);
    
    try {
      // Set recently imported IDs để highlight
      setRecentlyImportedIds(new Set(importedIds));
      setTimeout(() => {
        setRecentlyImportedIds(new Set());
      }, 30000);

      // Reset selection và về trang đầu
      setSelectedCustomerIds(new Set());
      setCurrentPage(1);

      // Fetch lại data để hiển thị danh sách mới nhất
      await loadCustomers();
      
      // Cập nhật refresh key để trigger re-render
      setRefreshKey(prev => prev + 1);
      
      // Thông báo cho user biết đã refresh data
      toast.success("Đã cập nhật danh sách khách hàng");
    } catch (error) {
      console.error("Error refreshing data after import:", error);
      toast.error("Lỗi khi cập nhật danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromContacts = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/import-from-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ userId: currentUser?.id }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;

        const contentDisposition = response.headers.get("content-disposition");
        const filename = contentDisposition
          ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
          : `danh-sach-khach-hang-tu-danh-ba-${
              new Date().toISOString().split("T")[0]
            }.xlsx`;

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("Đã tải xuống file Excel danh sách khách hàng từ danh bạ!");
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || "Unknown error";
        
        // Bắt các lỗi cụ thể
        if (errorMessage.includes("chưa liên kết") || errorMessage.includes("not linked") || errorMessage.includes("zalo_account_not_found")) {
          toast.error("Tài khoản chưa được liên kết với Zalo. Vui lòng liên kết tài khoản trước khi sử dụng chức năng này.");
        } else if (errorMessage.includes("no contacts") || errorMessage.includes("không có danh bạ")) {
          toast.warning("Không tìm thấy danh bạ nào. Vui lòng kiểm tra lại tài khoản Zalo của bạn.");
        } else if (errorMessage.includes("permission") || errorMessage.includes("quyền")) {
          toast.error("Bạn không có quyền thực hiện chức năng này.");
        } else if (errorMessage.includes("timeout") || errorMessage.includes("bị timeout") || errorMessage.includes("AbortError") || errorMessage.includes("Request timeout")) {
          toast.error("Kết nối đến server Zalo bị timeout. Vui lòng thử lại sau.", {
            description: "Server có thể đang quá tải hoặc mạng chậm",
            duration: 6000,
          });
        } else if (errorMessage.includes("không thể kết nối") || errorMessage.includes("ECONNREFUSED")) {
          toast.error("Không thể kết nối đến server Zalo. Vui lòng kiểm tra kết nối mạng hoặc liên hệ admin.", {
            description: "Server Zalo có thể đang bảo trì",
            duration: 6000,
          });
        } else if (errorMessage.includes("không tìm thấy server") || errorMessage.includes("DNS")) {
          toast.error("Không tìm thấy server Zalo. Vui lòng kiểm tra cấu hình mạng.", {
            description: "Liên hệ admin để kiểm tra cấu hình server",
            duration: 6000,
          });
        } else if (errorMessage.includes("network") || errorMessage.includes("kết nối")) {
          toast.error("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.");
        } else {
          toast.error(`Lỗi khi nhập từ danh bạ: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("Failed to import from contacts:", error);
      
      // Bắt lỗi network
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.");
      } else if (error instanceof Error) {
        const errorMessage = error.message;
        
        if (errorMessage.includes("chưa liên kết") || errorMessage.includes("not linked")) {
          toast.error("Tài khoản chưa được liên kết với Zalo. Vui lòng liên kết tài khoản trước khi sử dụng chức năng này.");
        } else if (errorMessage.includes("no contacts") || errorMessage.includes("không có danh bạ")) {
          toast.warning("Không tìm thấy danh bạ nào. Vui lòng kiểm tra lại tài khoản Zalo của bạn.");
        } else if (errorMessage.includes("timeout") || errorMessage.includes("bị timeout") || errorMessage.includes("AbortError") || errorMessage.includes("Request timeout")) {
          toast.error("Kết nối đến server Zalo bị timeout. Vui lòng thử lại sau.", {
            description: "Server có thể đang quá tải hoặc mạng chậm",
            duration: 6000,
          });
        } else if (errorMessage.includes("không thể kết nối") || errorMessage.includes("ECONNREFUSED")) {
          toast.error("Không thể kết nối đến server Zalo. Vui lòng kiểm tra kết nối mạng hoặc liên hệ admin.", {
            description: "Server Zalo có thể đang bảo trì",
            duration: 6000,
          });
        } else {
          toast.error(`Lỗi khi nhập từ danh bạ: ${errorMessage}`);
        }
      } else {
        toast.error("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await fetch("/api/auto-greeting/download-template", {
        method: "GET",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;

        const contentDisposition = response.headers.get("content-disposition");
        const filename = contentDisposition
          ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
          : `mau-danh-sach-khach-hang-${
              new Date().toISOString().split("T")[0]
            }.xlsx`;

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("Đã tải xuống file mẫu Excel!", {
          description: "File mẫu đã được tải xuống thư mục Downloads",
          duration: 3000,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to download template");
      }
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error("Lỗi khi tải file mẫu", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setDeleting(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `/api/auto-greeting/customers/${customerToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        toast.success("Đã xóa khách hàng thành công!", {
          description: `Khách hàng "${customerToDelete.zaloDisplayName}" đã được xóa`,
          duration: 3000,
        });
        await loadCustomers();
        setDeleteModalOpen(false);
        setCustomerToDelete(null);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error("Lỗi khi xóa khách hàng", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  // Toggle is_active status
  const handleToggleActive = useCallback(
    async (customerId: string, currentStatus: number) => {
      try {
        const token = getAccessToken();
        const newStatus = currentStatus === 1 ? 0 : 1;

        const response = await fetch(
          `/api/auto-greeting/customers/${customerId}/toggle-active`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ isActive: newStatus }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        toast.success(
          `Đã ${
            newStatus === 1 ? "kích hoạt" : "vô hiệu hóa"
          } khách hàng thành công!`
        );

        // Cập nhật state local một lần duy nhất
        setCustomers((prevCustomers) => {
          const updatedCustomers = prevCustomers.map((customer) =>
            customer.id === customerId
              ? { ...customer, isActive: newStatus }
              : customer
          );

          return updatedCustomers;
        });

        // Force re-render bằng cách tăng refreshKey
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error("Failed to toggle customer active status:", error);
        toast.error("Lỗi khi cập nhật trạng thái khách hàng", {
          description: error instanceof Error ? error.message : "Unknown error",
          duration: 5000,
        });
      }
    },
    []
  );

  // Prepare data for CSVExportPanel
  const getExportData = () => {
    const baseHeaders = [
      "STT",
      "Mã Khách Hàng",
      "Tên Zalo Khách",
    ];

    const ownerHeader = "Người Sở Hữu";
    
    const remainingHeaders = [
      "Xưng hô",
      "Lời Chào",
      "Loại Hội Thoại",
      "Tin Nhắn Cuối",
      "Lần Cuối Gửi",
      "Số Ngày",
      "Trạng Thái",
      "Kích Hoạt",
    ];

    // Chỉ thêm cột "Người Sở Hữu" nếu user có quyền
    const headers = canViewOwnerInfo() 
      ? [...baseHeaders, ownerHeader, ...remainingHeaders]
      : [...baseHeaders, ...remainingHeaders];

    const data = customers.map((customer, index) => {
      const baseData = [
        ((currentPage - 1) * itemsPerPage) + index + 1,
        customer.id,
        customer.zaloDisplayName,
        customer.salutation || "",
        customer.greetingMessage || "",
        customer.conversationType === "group"
          ? "Nhóm"
          : customer.conversationType === "private"
          ? "Cá nhân"
          : "Chưa xác định",
        customer.customerLastMessageDate
          ? new Date(customer.customerLastMessageDate).toLocaleString("vi-VN")
          : "Chưa có",
        customer.lastMessageDate
          ? new Date(customer.lastMessageDate).toLocaleString("vi-VN")
          : "Chưa gửi",
        customer.daysSinceLastMessage === null
          ? "Chưa có"
          : customer.daysSinceLastMessage,
        customer.customerStatus === "urgent"
          ? "Cần báo gấp"
          : customer.customerStatus === "reminder"
          ? "Cần nhắc nhở"
          : customer.customerStatus === "normal"
          ? "Bình thường"
          : "Bình thường",
        customer.isActive === 1 ? "Kích hoạt" : "Chưa kích hoạt",
      ];

      // Chỉ thêm userDisplayName nếu user có quyền
      if (canViewOwnerInfo()) {
        return [
          baseData[0], // STT
          baseData[1], // Mã Khách Hàng
          baseData[2], // Tên Zalo Khách
          customer.userDisplayName || `User ${customer.userId}`, // Người Sở Hữu
          ...baseData.slice(3) // Các cột còn lại
        ];
      }

      return baseData;
    });

    return { headers, data };
  };

  // Fetch all data for export (with current filters)
  const getExportAllData = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        "/api/auto-greeting/export-customers-filtered",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            searchTerm,
            statusFilter,
            conversationTypeFilter,
            dateFilter,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch all data");
      }

      const data = await response.json();
      const customers = data.data || [];

      return customers.map((customer: any, index: number) => {
        const baseData = [
          index + 1,
          customer.id,
          customer.zaloDisplayName,
          customer.salutation || "",
          customer.greetingMessage || "",
          customer.conversationType === "group"
            ? "Nhóm"
            : customer.conversationType === "private"
            ? "Cá nhân"
            : "Chưa xác định",
          customer.customerLastMessageDate
            ? new Date(customer.customerLastMessageDate).toLocaleString("vi-VN")
            : "Chưa có",
          customer.lastMessageDate
            ? new Date(customer.lastMessageDate).toLocaleString("vi-VN")
            : "Chưa gửi",
          customer.daysSinceLastMessage === null
            ? "Chưa có"
            : customer.daysSinceLastMessage,
          customer.customerStatus === "urgent"
            ? "Cần báo gấp"
            : customer.customerStatus === "reminder"
            ? "Cần nhắc nhở"
            : customer.customerStatus === "normal"
            ? "Bình thường"
            : "Bình thường",
          customer.isActive === 1 ? "Kích hoạt" : "Chưa kích hoạt",
        ];

        // Chỉ thêm userDisplayName nếu user có quyền
        if (canViewOwnerInfo()) {
          return [
            baseData[0], // STT
            baseData[1], // Mã Khách Hàng
            baseData[2], // Tên Zalo Khách
            customer.userDisplayName || `User ${customer.userId}`, // Người Sở Hữu
            ...baseData.slice(3) // Các cột còn lại
          ];
        }

        return baseData;
      });
    } catch (error) {
      console.error("Error fetching all data:", error);
      
      // Hiển thị thông báo lỗi cho user
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          toast.error("Lỗi kết nối khi xuất dữ liệu. Vui lòng thử lại sau.");
        } else if (error.message.includes("permission") || error.message.includes("unauthorized")) {
          toast.error("Bạn không có quyền xuất dữ liệu này.");
        } else {
          toast.error(`Lỗi khi xuất dữ liệu: ${error.message}`);
        }
      } else {
        toast.error("Đã xảy ra lỗi không xác định khi xuất dữ liệu.");
      }
      
      return [];
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-800">
          Gửi lời chào tự động
        </h1>
      </div>

      {/* System Status */}
      <SystemStatusBanner
        systemConfig={systemConfig}
        configLoading={configLoading}
        onRefresh={loadSystemConfig}
      />

      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        conversationTypeFilter={conversationTypeFilter}
        setConversationTypeFilter={setConversationTypeFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        itemsPerPage={itemsPerPage}
        handleItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Action Buttons */}
      <ActionButtons
        downloadingTemplate={downloadingTemplate}
        loading={loading}
        onDownloadTemplate={handleDownloadTemplate}
        onImportModalOpen={() => setImportModalOpen(true)}
        onReload={loadCustomers}
        onExportModalOpen={() => setShowExportModal(true)}
        onImportFromContacts={handleImportFromContacts}
        onClearFilters={clearFilters}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCustomerIds.size}
        onBulkEdit={handleBulkEdit}
        onBulkDelete={handleBulkDelete}
      />

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <span className="text-sm text-gray-600">
            Tổng số dòng: {totalItems}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=indeterminate]:bg-blue-500 data-[state=indeterminate]:border-blue-500"
                    ref={(el) => {
                      if (el && el instanceof HTMLInputElement) {
                        el.indeterminate = isPartiallySelected;
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Tên Zalo Khách
                </th>
                {canViewOwnerInfo() && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                    Người Sở Hữu
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Lời Chào
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Loại Hội Thoại
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Tin Nhắn Cuối
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Lần Cuối Gửi
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Số Ngày
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                  Trạng Thái
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Kích Hoạt
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <div>Chưa có khách hàng nào</div>
                    <div className="text-sm mt-1">
                      Hãy upload file Excel để thêm khách hàng
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer, index) => {
                  return (
                    <tr
                      key={customer.id}
                      className={`${
                        recentlyImportedIds.has(customer.id)
                          ? "bg-green-50 border-l-4 border-l-green-400"
                          : index % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                      } transition-colors duration-300`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 border-b w-12">
                        <Checkbox
                          checked={selectedCustomerIds.has(customer.id)}
                          onCheckedChange={() =>
                            handleSelectCustomer(customer.id)
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 border-b">
                        {customer.zaloDisplayName}
                        {customer.salutation ? ` (${customer.salutation})` : ""}
                      </td>
                      {canViewOwnerInfo() && (
                        <td className="px-4 py-3 text-sm text-gray-600 border-b">
                          {customer.userDisplayName || `User ${customer.userId}`}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-600 border-b max-w-xs">
                        <div className="space-y-1">
                          <div className="truncate">
                            {getGreetingMessage(customer)}
                          </div>
                          {systemConfig?.allowCustomMessage && (
                            <div className="flex items-center gap-1">
                              {customer.greetingMessage ? (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  Tùy chỉnh
                                </span>
                              ) : (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          )}
                          {!systemConfig?.allowCustomMessage && (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                              Hệ thống
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            customer.conversationType === "group"
                              ? "bg-blue-100 text-blue-800"
                              : customer.conversationType === "private"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {customer.conversationType === "group"
                            ? "Nhóm"
                            : customer.conversationType === "private"
                            ? "Cá nhân"
                            : "Chưa xác định"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {customer.customerLastMessageDate
                          ? (() => {
                              try {
                                const date = new Date(
                                  customer.customerLastMessageDate
                                );
                                return isNaN(date.getTime())
                                  ? "Invalid Date"
                                  : date.toLocaleString("vi-VN");
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()
                          : "Chưa có"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {customer.lastMessageDate
                          ? (() => {
                              try {
                                const date = new Date(customer.lastMessageDate);
                                return isNaN(date.getTime())
                                  ? "Invalid Date"
                                  : date.toLocaleString("vi-VN");
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()
                          : "Chưa gửi"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {customer.daysSinceLastMessage === null
                          ? "Chưa có"
                          : customer.daysSinceLastMessage}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                            customer.customerStatus === "urgent"
                              ? "bg-red-200 text-red-900"
                              : customer.customerStatus === "reminder"
                              ? "bg-yellow-100 text-yellow-800"
                              : customer.customerStatus === "normal"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {customer.customerStatus === "urgent"
                            ? "Cần báo gấp"
                            : customer.customerStatus === "reminder"
                            ? "Cần nhắc nhở"
                            : customer.customerStatus === "normal"
                            ? "Bình thường"
                            : "Bình thường"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        <div className="flex items-center gap-3">
                          {/* Toggle Switch */}
                          <button
                            key={`toggle-${customer.id}-${refreshKey}`}
                            onClick={() =>
                              handleToggleActive(customer.id, customer.isActive)
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              customer.isActive === 1
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                            title={
                              customer.isActive === 1
                                ? "Vô hiệu hóa"
                                : "Kích hoạt"
                            }
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                customer.isActive === 1
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>

                          {/* Status Text */}
                          <span
                            key={`status-${customer.id}-${refreshKey}`}
                            className={`text-sm font-medium ${
                              customer.isActive === 1
                                ? "text-green-700"
                                : "text-gray-500"
                            }`}
                          >
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenCustomerId(customer.id)}
                            className="border-gray-300 text-gray-600 hover:bg-gray-50"
                            title="Xem lịch sử tin nhắn"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            title="Xóa khách hàng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} trong{" "}
                {totalItems} kết quả
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CustomerHistoryModal
        customerId={openCustomerId}
        open={!!openCustomerId}
        onClose={() => setOpenCustomerId(null)}
      />

      <CSVExportPanel
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        defaultExportCount={itemsPerPage}
        {...getExportData()}
        fetchAllData={getExportAllData}
        filtersDescription={
          <div className="space-y-1">
            <div>
              <strong>Bộ lọc hiện tại:</strong>
            </div>
            {searchTerm && <div>• Tìm kiếm: "{searchTerm}"</div>}
            {statusFilter !== "all" && (
              <div>
                • Trạng thái:{" "}
                {statusFilter === "urgent"
                  ? "Cần báo gấp"
                  : statusFilter === "reminder"
                  ? "Cần nhắc nhở"
                  : "Bình thường"}
              </div>
            )}
            {conversationTypeFilter !== "all" && (
              <div>
                • Loại hội thoại:{" "}
                {conversationTypeFilter === "group" ? "Nhóm" : "Cá nhân"}
              </div>
            )}
            {dateFilter && (
              <div>
                • Ngày: {new Date(dateFilter).toLocaleDateString("vi-VN")}
              </div>
            )}
            <div>• Tổng số khách hàng: {totalItems}</div>
          </div>
        }
      />

      <DeleteCustomerModal
        customer={customerToDelete}
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />

      <ImportExcelModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <EditCustomerModal
        isOpen={editModalOpen}
        editingCustomer={editingCustomer}
        editForm={editForm}
        systemConfig={systemConfig}
        saving={saving}
        onClose={handleCancelEdit}
        onSave={handleSaveEdit}
        onFormChange={handleEditFormChange}
      />

      <BulkEditModal
        isOpen={bulkEditModalOpen}
        selectedCount={selectedCustomerIds.size}
        bulkEditForm={bulkEditForm}
        systemConfig={systemConfig}
        bulkSaving={bulkSaving}
        onClose={handleBulkCancel}
        onSave={handleBulkEditSave}
        onFormChange={setBulkEditForm}
      />

      <BulkDeleteModal
        isOpen={bulkDeleteModalOpen}
        selectedCount={selectedCustomerIds.size}
        bulkSaving={bulkSaving}
        onClose={handleBulkCancel}
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  );
};

export default AutoGreetingCustomerList;
