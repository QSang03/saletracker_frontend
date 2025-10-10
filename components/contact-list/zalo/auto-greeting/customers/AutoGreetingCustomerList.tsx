"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Settings,
  RefreshCw,
  History,
  Edit3,
  Users,
  ArrowUpDown,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getAccessToken } from "@/lib/auth";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { toast } from "sonner";
import CustomerHistoryModal from "@/components/contact-list/zalo/auto-greeting/CustomerHistoryModal";
import DeleteCustomerModal from "@/components/contact-list/zalo/auto-greeting/DeleteCustomerModal";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import SystemStatusBanner from "./SystemStatusBanner";
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

  // Helpers to normalize filters coming from PaginatedTable (which uses arrays/Date)
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Build CSV of selected statuses (urgent,reminder,normal); exclude "all"
  const getEffectiveStatusesCsv = (f: any): string => {
    if (Array.isArray(f?.statuses)) {
      const cleaned = (f.statuses as any[])
        .map((v) => String(v))
        .filter((v) => v && v !== "all");
      if (cleaned.length > 0) {
        const deduped = Array.from(new Set(cleaned));
        return deduped.join(",");
      }
      // Explicitly chosen none -> clear status filter
      return "";
    }
    // If statuses[] not provided at all, fallback to existing consolidated field
    if (f?.statusFilter && f.statusFilter !== "all") return String(f.statusFilter);
    return "";
  };

  const getEffectiveConversationType = (f: any): string => {
    // Prefer current multi-select value from PaginatedTable
    if (Array.isArray(f?.conversationType)) {
      if (f.conversationType.length > 0) return String(f.conversationType[f.conversationType.length - 1]);
      // Explicitly cleared -> reset to all
      return "all";
    }
    // Fallback to existing consolidated field
    if (f?.conversationTypeFilter && f.conversationTypeFilter !== "all")
      return f.conversationTypeFilter;
    return "all";
  };

  const getEffectiveDate = (f: any): string => {
    if (f?.dateFilter) return f.dateFilter;
    const sd = f?.singleDate;
    if (sd instanceof Date) return formatDate(sd);
    if (typeof sd === "string" && sd) return sd.slice(0, 10);
    return "";
  };

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
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conversationTypeFilter, setConversationTypeFilter] =
    useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  
  // Backend pagination states
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // PaginatedTable filter states
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    statusFilter: "all",
    conversationTypeFilter: "all",
    dateFilter: "",
    userId: undefined as number | undefined,
    departmentId: undefined as number | undefined,
    daysFilter: undefined as number | undefined,
    sortBy: "created_at" as string,
    sortOrder: "DESC" as string,
  });

  // State for users and departments
  const [users, setUsers] = useState<Array<{ value: number; label: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ value: number; label: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

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
        const saved = JSON.parse(savedFilters);
        setFilters(prev => ({
          ...prev,
          search: saved.searchTerm || "",
          statusFilter: saved.statusFilter || "all",
          conversationTypeFilter: saved.conversationTypeFilter || "all",
          dateFilter: saved.dateFilter || "",
          pageSize: saved.itemsPerPage || 10,
        }));
        setSearchTerm(saved.searchTerm || "");
        setStatusFilter(saved.statusFilter || "all");
        setConversationTypeFilter(saved.conversationTypeFilter || "all");
        setDateFilter(saved.dateFilter || "");
        setItemsPerPage(saved.itemsPerPage || 10);
      } catch (error) {
        console.error("Error loading filters from localStorage:", error);
        localStorage.removeItem("auto-greeting-filters");
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const saveData: any = {};

    if (filters.search?.trim()) saveData.searchTerm = filters.search;
    if (filters.statusFilter && filters.statusFilter !== "all")
      saveData.statusFilter = filters.statusFilter;
    if (filters.conversationTypeFilter && filters.conversationTypeFilter !== "all")
      saveData.conversationTypeFilter = filters.conversationTypeFilter;
    if (filters.dateFilter) saveData.dateFilter = filters.dateFilter;
    if (filters.pageSize && filters.pageSize !== 10)
      saveData.itemsPerPage = filters.pageSize;

    if (Object.keys(saveData).length > 0) {
      localStorage.setItem("auto-greeting-filters", JSON.stringify(saveData));
    } else {
      localStorage.removeItem("auto-greeting-filters");
    }
  }, [filters]);

  useEffect(() => {
    loadCustomers();
    loadSystemConfig();
    loadUsers();
    loadDepartments();
  }, []);

  // Load customers when filters change
  useEffect(() => {
    loadCustomers();
  }, [filters]);

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

  // PaginatedTable handlers
  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => {
      const effStatuses = getEffectiveStatusesCsv({ ...prev, ...newFilters });
      const effConversation = getEffectiveConversationType({ ...prev, ...newFilters });
      const effDate = getEffectiveDate({ ...prev, ...newFilters });

      // Handle employee filter (single selection from multiselect)
      const userId = Array.isArray(newFilters.employees)
        ? (newFilters.employees.length > 0 ? Number(newFilters.employees[0]) : undefined)
        : prev.userId;

      // Handle department filter (single selection from multiselect)
      const departmentId = Array.isArray(newFilters.departments)
        ? (newFilters.departments.length > 0 ? Number(newFilters.departments[0]) : undefined)
        : prev.departmentId;

      // Handle days filter (quantity field)
      const daysFilter = newFilters.quantity !== undefined
        ? (newFilters.quantity > 0 ? Number(newFilters.quantity) : undefined)
        : prev.daysFilter;

      // Handle sorting
      const sortBy = newFilters.sort?.field || prev.sortBy;
      const sortOrder = newFilters.sort?.direction?.toUpperCase() || prev.sortOrder;

      return {
        ...prev,
        ...newFilters,
        // Normalize to the query params our backend expects
        statusFilter: effStatuses || "all",
        conversationTypeFilter: effConversation,
        dateFilter: effDate,
        userId,
        departmentId,
        daysFilter,
        sortBy,
        sortOrder,
        // Ensure page fields are preserved when not provided
        page: newFilters.page ?? prev.page,
        pageSize: newFilters.pageSize ?? prev.pageSize,
      };
    });
    setSelectedCustomerIds(new Set());
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page,
    }));
    setCurrentPage(page);
    setSelectedCustomerIds(new Set());
  };

  const handlePageSizeChange = (pageSize: number) => {
    setFilters(prev => ({
      ...prev,
      pageSize,
      page: 1,
    }));
    setItemsPerPage(pageSize);
    setCurrentPage(1);
    setSelectedCustomerIds(new Set());
  };

  const clearFilters = () => {
    const defaultFilters = {
      page: 1,
      pageSize: 10,
      search: "",
      statusFilter: "all",
      conversationTypeFilter: "all",
      dateFilter: "",
      userId: undefined as number | undefined,
      departmentId: undefined as number | undefined,
      daysFilter: undefined as number | undefined,
      sortBy: "created_at" as string,
      sortOrder: "DESC" as string,
    };
    setFilters(defaultFilters);
    setSearchTerm("");
    setStatusFilter("all");
    setConversationTypeFilter("all");
    setDateFilter("");
    setCurrentPage(1);
    setItemsPerPage(10);
    setSelectedCustomerIds(new Set());
    localStorage.removeItem("auto-greeting-filters");
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      // Compute effective filters from either our local fields or PaginatedTable fields
      const effStatuses = getEffectiveStatusesCsv(filters);
      const effConversation = getEffectiveConversationType(filters);
      const effDate = getEffectiveDate(filters);
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(effStatuses && { statusFilter: effStatuses }),
        ...(effConversation !== "all" && { conversationTypeFilter: effConversation }),
        ...(effDate && { dateFilter: effDate }),
        ...(filters.userId && { userId: filters.userId.toString() }),
        ...(filters.departmentId && { departmentId: filters.departmentId.toString() }),
        ...(filters.daysFilter !== undefined && filters.daysFilter !== null && { daysFilter: filters.daysFilter.toString() }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
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
        // Sử dụng totalPages từ backend, nếu không có thì tính từ total và pageSize
        const totalPages = data.totalPages || Math.ceil((data.total || 0) / filters.pageSize);
        setTotalPages(totalPages);
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

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?limit=1000`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userOptions = (data.data || []).map((user: any) => ({
          value: user.id,
          label: user.zaloName || user.fullName || user.username || `User ${user.id}`,
        }));
        setUsers(userOptions);
      } else {
        console.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments?limit=1000`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const deptOptions = (data.data || []).map((dept: any) => ({
          value: dept.id,
          label: dept.name,
        }));
        setDepartments(deptOptions);
      } else {
        console.error("Failed to load departments");
      }
    } catch (error) {
      console.error("Error loading departments:", error);
    } finally {
      setLoadingDepartments(false);
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

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCustomerIds.size}
        onBulkEdit={handleBulkEdit}
        onBulkDelete={handleBulkDelete}
      />

      {/* PaginatedTable */}
      <PaginatedTable
        enableSearch={true}
        enableStatusFilter={true}
        enableConversationTypeFilter={true}
        enableSingleDateFilter={true}
        enableEmployeeFilter={true}
        enableDepartmentFilter={true}
        enableQuantityFilter={true}
        enablePageSize={true}
        enableGoToPage={true}
        availableStatuses={[
          { value: "all", label: "Tất cả" },
          { value: "urgent", label: "Cần báo gấp" },
          { value: "reminder", label: "Cần nhắc nhở" },
          { value: "normal", label: "Bình thường" },
        ]}
        availableEmployees={users}
        availableDepartments={departments}
        quantityLabel="Số ngày từ tin nhắn cuối"
        defaultQuantity={0}
        page={filters.page}
        total={totalItems}
        pageSize={filters.pageSize}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onResetFilter={clearFilters}
        loading={loading}
        canExport={false}
        singleDateLabel="Ngày tin nhắn cuối"
        defaultPageSize={10}
      >
        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border">
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
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      const newOrder = filters.sortBy === 'last_message_date' && filters.sortOrder === 'DESC' ? 'ASC' : 'DESC';
                      handleFilterChange({ 
                        sort: { field: 'last_message_date', direction: newOrder.toLowerCase() } 
                      });
                    }}
                    title="Click để sắp xếp"
                  >
                    <div className="flex items-center gap-1">
                      Tin Nhắn Cuối
                      {filters.sortBy === 'last_message_date' && (
                        <span className="text-xs">
                          {filters.sortOrder === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
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
                {customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canViewOwnerInfo() ? 12 : 11}
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
                          index % 2 === 0
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
                          {(filters.page - 1) * filters.pageSize + index + 1}
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
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PaginatedTable>

      {/* Modals */}
      <CustomerHistoryModal
        customerId={openCustomerId}
        open={!!openCustomerId}
        onClose={() => setOpenCustomerId(null)}
      />


      <DeleteCustomerModal
        customer={customerToDelete}
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
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
