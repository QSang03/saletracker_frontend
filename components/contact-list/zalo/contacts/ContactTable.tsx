"use client";
import React from "react";
import { AutoReplyContact, ContactRole } from "@/types/auto-reply";
import { useContactsPaginated } from "@/hooks/contact-list/useContactsPaginated";
import { useContactsWithGreeting, ContactWithGreeting } from "@/hooks/contact-list/useContactsWithGreeting";
import { useSalePersonas } from "@/hooks/contact-list/useSalePersonas";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useTutorial } from "@/contexts/TutorialContext";
import AllowedProductsModal from "./modals/AllowedProductsModal";
import ContactKeywordsModal from "./modals/ContactKeywordsModal";
import ContactProfileModal from "./modals/ContactProfileModal";
import LogsDrawer from "./modals/LogsDrawer";
import RenameContactModal from "./RenameContactModal";
import EditGreetingModal from "./modals/EditGreetingModal";
import CustomerHistoryModal from "@/components/contact-list/zalo/auto-greeting/CustomerHistoryModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ContactTableTutorial from "./ContactTableTutorial";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { api } from "@/lib/api";
import {
  Users,
  Package,
  Key,
  User,
  FileText,
  Edit3,
  MessageCircle,
  UserCheck,
  Activity,
  Clock,
  AlertCircle,
  Crown,
  Building,
  UserPlus,
  Zap,
  MoreHorizontal,
  Hash,
  Settings,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Props {
  // When false, disable per-contact controls (toggle/select) but don't mutate their states
  globalAutoReplyEnabled?: boolean;
}

export const ContactTable: React.FC<Props> = ({
  globalAutoReplyEnabled = true,
}) => {
  const {
    items: contacts,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilters,
    loading,
    error,
    updateRole,
    toggleAutoReply,
    updateGreeting,
    fetchContacts,
  } = useContactsWithGreeting();
  const { currentUser } = useCurrentUser();
  const { isTutorialActive } = useTutorial();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const controlsDisabled = (zaloDisabled || !globalAutoReplyEnabled) && !isTutorialActive;

  // Check if current user is admin
  const isAdmin = currentUser?.roles?.some(role => role.name === 'admin') || false;

  // Personas for selection per contact
  const { personas, loading: personasLoading, fetchPersonas } = useSalePersonas(true);

  const isRestrictedRole = (role: ContactRole) =>
    role === ContactRole.SUPPLIER || role === ContactRole.INTERNAL;

  const [contactIdForProducts, setContactIdForProducts] = React.useState<
    number | null
  >(null);
  const [contactIdForKeywords, setContactIdForKeywords] = React.useState<
    number | null
  >(null);
  const [contactForProfile, setContactForProfile] = React.useState<{
    id: number;
    zaloId: string;
    name: string;
  } | null>(null);
  const [contactIdForLogs, setContactIdForLogs] = React.useState<number | null>(
    null
  );
  const [contactForRename, setContactForRename] = React.useState<{
    id: number;
    name: string;
  } | null>(null);

  // Edit greeting modal state
  const [contactForGreeting, setContactForGreeting] = React.useState<ContactWithGreeting | null>(null);

  // Greeting history modal state
  const [greetingHistoryContactId, setGreetingHistoryContactId] = React.useState<string | null>(null);

  // Confirm Dialog states for auto-reply toggle
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [pendingToggleValue, setPendingToggleValue] = React.useState<
    boolean | null
  >(null);
  const [contactIdForToggle, setContactIdForToggle] = React.useState<
    number | null
  >(null);
  const [contactNameForToggle, setContactNameForToggle] =
    React.useState<string>("");

  // Confirm Dialog states for role change
  const [confirmRoleOpen, setConfirmRoleOpen] = React.useState(false);
  const [pendingRoleValue, setPendingRoleValue] =
    React.useState<ContactRole | null>(null);
  const [contactIdForRole, setContactIdForRole] = React.useState<number | null>(
    null
  );
  const [contactNameForRole, setContactNameForRole] =
    React.useState<string>("");

  // Alert banner
  const [alert, setAlert] = React.useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // Bulk operations states
  const [selectedContacts, setSelectedContacts] = React.useState<Set<number>>(new Set());
  const [bulkOperation, setBulkOperation] = React.useState<string>("");
  const [showBulkActions, setShowBulkActions] = React.useState(false);

  // Auto-greeting config state
  const [greetingConfig, setGreetingConfig] = React.useState<{
    defaultGreeting: string;
    allowCustomMessage: boolean;
  }>({ defaultGreeting: '', allowCustomMessage: true });

  // Bulk operations functions
  const toggleContactSelection = (contactId: number) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const selectAllContacts = () => {
    setSelectedContacts(new Set(contacts.map(c => c.contactId)));
  };

  const selectAllValidContacts = () => {
    // Only select contacts that have persona assigned
    const validContactIds = contacts
      .filter(c => c.assignedPersona)
      .map(c => c.contactId);
    setSelectedContacts(new Set(validContactIds));
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
  };

  const handleExportData = async () => {
    try {
      const selectedContactsData = contacts.filter(c => selectedContacts.has(c.contactId));

      // Prepare data for export
      const exportData = selectedContactsData.map((contact, index) => ({
        'STT': index + 1,
        'Tên liên hệ': contact.name || '',
        'ID': contact.contactId || '',
        'Zalo ID': `'${contact.zaloContactId || ''}`, // Force as text with leading quote
        'Vai trò': contact.role === 'customer' ? 'Khách hàng' : (contact.role || ''),
        'Persona': contact.assignedPersona?.name || 'Chưa chọn',
        'Auto-Reply': contact.autoReplyOn ? 'Bật' : 'Tắt',
        'Thời gian bật': contact.autoReplyEnabledAt ? new Date(contact.autoReplyEnabledAt).toLocaleString('vi-VN') : 'Chưa có',
        'Thời gian tắt': contact.autoReplyDisabledAt ? new Date(contact.autoReplyDisabledAt).toLocaleString('vi-VN') : 'Chưa có',
        'Tin nhắn cuối': contact.lastMessage ? parseLastMessage(contact.lastMessage).substring(0, 50) : 'Chưa có',
        'Người sở hữu': contact.user?.username || 'N/A'
      }));

      // Create CSV content with proper escaping
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.map(header => `"${header}"`).join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = row[header as keyof typeof row];
            const stringValue = String(value || '');

            // Special handling for Zalo ID to preserve leading quote
            if (header === 'Zalo ID' && stringValue.startsWith("'")) {
              return stringValue; // Keep as-is with leading quote
            }

            // For other fields, wrap in quotes and escape internal quotes
            return `"${stringValue.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create and download file with UTF-8 BOM for proper Vietnamese encoding
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setAlert({
        type: "success",
        message: `Đã xuất dữ liệu ${selectedContacts.size} liên hệ thành công`
      });
      clearSelection();
    } catch (error: any) {
      console.error("Error exporting data:", error);
      setAlert({
        type: "error",
        message: "Lỗi khi xuất dữ liệu"
      });
    }
  };

  const handleBulkOperation = async (operation: string) => {
    if (selectedContacts.size === 0) return;

    try {
      const contactIds = Array.from(selectedContacts);
      let enabled = false;

      if (operation.includes("Bật")) {
        enabled = true;

        // Check if any selected contacts don't have persona assigned
        const selectedContactsData = contacts.filter(c => selectedContacts.has(c.contactId));
        const contactsWithoutPersona = selectedContactsData.filter(c => !c.assignedPersona);

        if (contactsWithoutPersona.length > 0) {
          const contactNames = contactsWithoutPersona.map(c => c.name).join(", ");
          setAlert({
            type: "error",
            message: `Không thể bật auto-reply cho ${contactsWithoutPersona.length} liên hệ chưa có persona: ${contactNames}. Vui lòng chọn persona trước.`
          });
          return;
        }
      } else if (operation.includes("Tắt")) {
        enabled = false;
      } else if (operation.includes("Xuất dữ liệu")) {
        // Export selected contacts to Excel
        await handleExportData();
        return;
      } else {
        // For other operations, just show success message
        setAlert({
          type: "success",
          message: `Đã thực hiện ${operation} cho ${selectedContacts.size} liên hệ`
        });
        clearSelection();
        return;
      }

      // Call API to toggle auto-reply for selected contacts
      await api.patch("/auto-reply/contacts/auto-reply-bulk", {
        contactIds,
        enabled: enabled
      }, {
        params: {
          userId: currentUser?.id
        }
      });

      // Refresh contacts list
      await fetchContacts();

      setAlert({
        type: "success",
        message: `Đã ${enabled ? 'bật' : 'tắt'} auto-reply cho ${selectedContacts.size} liên hệ`
      });
      clearSelection();
    } catch (error: any) {
      console.error("Error in bulk operation:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        "Lỗi khi thực hiện thao tác hàng loạt";

      setAlert({
        type: "error",
        message: errorMessage
      });
    }
  };

  // Function to parse and extract text from lastMessage JSON - FIXED TYPE
  const parseLastMessage = (lastMessage: string | null | undefined): string => {
    if (!lastMessage) return "";

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(lastMessage);
      return parsed.text || parsed.formattedText || "";
    } catch (error) {
      // If not JSON, return as is (fallback for plain text)
      return lastMessage;
    }
  };

  // Handle auto-reply toggle with confirmation
  const handleToggleAutoReply = (
    contactId: number,
    contactName: string,
    newValue: boolean
  ) => {
    setContactIdForToggle(contactId);
    setContactNameForToggle(contactName);
    setPendingToggleValue(newValue);
    setConfirmDialogOpen(true);
  };

  // Assign persona to a contact
  const handleAssignPersona = async (contactId: number, personaId: number | null) => {
    try {
      await api.patch(`auto-reply/contacts/${contactId}/persona`, {
        personaId,
      });
      // Refresh current page to reflect assignedPersona
      fetchContacts();
      setAlert({ type: "success", message: personaId ? "Đã gán persona" : "Đã bỏ gán persona" });
    } catch (e: any) {
      setAlert({ type: "error", message: e?.message || "Gán persona thất bại" });
    }
  };

  // Handle save greeting
  const handleSaveGreeting = async (data: {
    salutation?: string;
    greetingMessage?: string;
    greetingIsActive?: number;
  }) => {
    if (!contactForGreeting) return;

    try {
      await updateGreeting(contactForGreeting.contactId, data);
      setAlert({ type: "success", message: "Đã cập nhật lời chào thành công" });
      setContactForGreeting(null);
    } catch (e: any) {
      setAlert({ type: "error", message: e?.message || "Cập nhật lời chào thất bại" });
      throw e;
    }
  };

  // Handle confirm toggle
  const handleConfirmToggle = () => {
    (async () => {
      try {
        if (contactIdForToggle !== null && pendingToggleValue !== null) {
          await toggleAutoReply(contactIdForToggle, pendingToggleValue);
          setAlert({
            type: "success",
            message: pendingToggleValue
              ? "Đã bật auto-reply"
              : "Đã tắt auto-reply",
          });
        }
      } catch (e: any) {
        setAlert({
          type: "error",
          message: e?.message || "Thao tác auto-reply thất bại",
        });
      }
    })();
    setConfirmDialogOpen(false);
    setContactIdForToggle(null);
    setContactNameForToggle("");
    setPendingToggleValue(null);
  };

  // Handle cancel toggle
  const handleCancelToggle = () => {
    setConfirmDialogOpen(false);
    setContactIdForToggle(null);
    setContactNameForToggle("");
    setPendingToggleValue(null);
  };

  // Role change handlers
  const handleRequestRoleChange = (
    contactId: number,
    contactName: string,
    newRole: ContactRole
  ) => {
    setContactIdForRole(contactId);
    setContactNameForRole(contactName);
    setPendingRoleValue(newRole);
    setConfirmRoleOpen(true);
  };
  const handleConfirmRoleChange = async () => {
    try {
      if (contactIdForRole !== null && pendingRoleValue) {
        await updateRole(contactIdForRole, pendingRoleValue);
        setAlert({ type: "success", message: "Đã cập nhật vai trò liên hệ" });
      }
    } catch (e: any) {
      setAlert({
        type: "error",
        message: e?.message || "Cập nhật vai trò thất bại",
      });
    }
    setConfirmRoleOpen(false);
    setContactIdForRole(null);
    setContactNameForRole("");
    setPendingRoleValue(null);
  };
  const handleCancelRoleChange = () => {
    setConfirmRoleOpen(false);
    setContactIdForRole(null);
    setContactNameForRole("");
    setPendingRoleValue(null);
  };

  // Get row background color for zebra striping
  const getRowClassName = (index: number): string => {
    const isEven = index % 2 === 0;
    const baseClasses =
      "transition-all duration-300 border-b border-gray-200/30 h-14";

    if (isEven) {
      // Even rows - white background
      return `${baseClasses} bg-white hover:bg-blue-50/40`;
    } else {
      // Odd rows - light gray background
      return `${baseClasses} bg-gray-50/30 hover:bg-blue-50/60`;
    }
  };

  // Render inline error banner if needed
  const errorBanner = error ? (
    <div className="mx-4 mt-2 mb-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span className="text-sm">{error}</span>
    </div>
  ) : null;

  const roleOptions: ContactRole[] = [
    ContactRole.CUSTOMER,
    ContactRole.SUPPLIER,
    ContactRole.INTERNAL,
  ];

  const getRoleIcon = (role: ContactRole) => {
    switch (role) {
      case ContactRole.CUSTOMER:
        return <UserCheck className="w-3 h-3" />;
      case ContactRole.SUPPLIER:
        return <Building className="w-3 h-3" />;
      case ContactRole.INTERNAL:
        return <Crown className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role: ContactRole) => {
    switch (role) {
      case ContactRole.CUSTOMER:
        return "text-green-600 bg-green-50";
      case ContactRole.SUPPLIER:
        return "text-blue-600 bg-blue-50";
      case ContactRole.INTERNAL:
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Function to get Vietnamese display name for roles
  const getRoleDisplayName = (role: ContactRole): string => {
    switch (role) {
      case ContactRole.CUSTOMER:
        return "Khách hàng";
      case ContactRole.SUPPLIER:
        return "Nhà cung cấp";
      case ContactRole.INTERNAL:
        return "Nội bộ";
      default:
        return role;
    }
  };

  // Calculate row number based on page and index
  const getRowNumber = (index: number) => {
    return (page - 1) * pageSize + index + 1;
  };

  // Calculate days since last message
  const getDaysSinceLastMessage = (lastMessageDate: string | null | undefined): number | null => {
    if (!lastMessageDate) return null;
    const now = new Date();
    const lastDate = new Date(lastMessageDate);
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Listen for personas changes emitted by PersonasManagerModal and refresh
  // local personas and contacts so UI updates immediately without full page reload
  React.useEffect(() => {
    const handler = (e: Event) => {
      fetchPersonas();
      // also refresh contacts so assignedPersona reflects new items
      fetchContacts();
    };
    window.addEventListener("personas:changed", handler as EventListener);
    return () => window.removeEventListener("personas:changed", handler as EventListener);
  }, [fetchPersonas, fetchContacts]);

  // Fetch auto-greeting config on mount
  React.useEffect(() => {
    const fetchGreetingConfig = async () => {
      try {
        // Use axios api instance to auto-include Bearer token
        const { api } = await import('@/lib/api');
        const response = await api.get('/auto-greeting/config');
        setGreetingConfig({
          defaultGreeting: response.data.messageTemplate || '',
          allowCustomMessage: response.data.allowCustomMessage ?? true,
        });
      } catch (error) {
        console.error('Error fetching auto-greeting config:', error);
      }
    };
    fetchGreetingConfig();
  }, []);

  // Check if should show empty state
  const showEmptyState = !loading && total === 0;

  return (
    <TooltipProvider>
      <div className="relative tutorial-container">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-pink-500/3 rounded-2xl blur-lg"></div>

        <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl overflow-hidden">
          {/* Header - Compact */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Danh sách liên hệ
                </h2>
                <p className="text-blue-100 text-xs mt-1">
                  Quản lý và cấu hình auto-reply cho từng liên hệ
                </p>
              </div>
              <div className="ml-auto bg-white/20 rounded-xl px-3 py-1">
                <span className="text-white font-medium text-sm">
                  {total} liên hệ
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorBanner}

          {/* Filter Bar (always visible) */}
          <div className="p-3">
            <div className="mb-4 flex flex-wrap gap-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Trạng thái lời chào:
                </label>
                <Select
                  value={filters.greetingStatus || 'all'}
                  onValueChange={(v: any) => setFilters({ ...filters, greetingStatus: v })}
                >
                  <SelectTrigger className="w-[140px] h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang bật</SelectItem>
                    <SelectItem value="inactive">Đang tắt</SelectItem>
                    <SelectItem value="none">Chưa có</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Trạng thái khách:
                </label>
                <Select
                  value={filters.customerStatus || 'all'}
                  onValueChange={(v: any) => setFilters({ ...filters, customerStatus: v })}
                >
                  <SelectTrigger className="w-[140px] h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Cần báo gấp
                      </div>
                    </SelectItem>
                    <SelectItem value="reminder">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Cần nhắc nhở
                      </div>
                    </SelectItem>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Bình thường
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Loại hội thoại:
                </label>
                <Select
                  value={filters.conversationType || 'all'}
                  onValueChange={(v: any) => setFilters({ ...filters, conversationType: v })}
                >
                  <SelectTrigger className="w-[120px] h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="group">Nhóm</SelectItem>
                    <SelectItem value="private">Cá nhân</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Sắp xếp theo:
                </label>
                <Select
                  value={filters.sortBy || 'autoReplyUpdated'}
                  onValueChange={(v: any) => setFilters({ ...filters, sortBy: v })}
                >
                  <SelectTrigger className="w-[180px] h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autoReplyUpdated">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        Auto-Reply (Cập nhật)
                      </div>
                    </SelectItem>
                    <SelectItem value="greetingLastMessage">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        Lời chào (Tin nhắn)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    ...filters,
                    sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc'
                  })}
                  className="h-9 px-3 bg-white hover:bg-gray-50"
                  title={filters.sortOrder === 'desc' ? 'Giảm dần' : 'Tăng dần'}
                >
                  {filters.sortOrder === 'desc' ? (
                    <div className="flex items-center gap-1.5">
                      <ArrowDown className="w-4 h-4" />
                      <span className="text-xs font-medium">Giảm dần</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <ArrowUp className="w-4 h-4" />
                      <span className="text-xs font-medium">Tăng dần</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Show Empty State or Table */}
          {showEmptyState ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mb-4 opacity-50">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Chưa có liên hệ nào
              </h3>
              <p className="text-gray-500 text-sm">
                Danh sách liên hệ sẽ hiển thị khi có dữ liệu từ Zalo
              </p>
            </div>
          ) : (
            /* Table Content - Only show when has data */
            <div className="overflow-x-auto">
              <div className="p-3">
                <div className="filter-controls">
                  <PaginatedTable
                    enableSearch
                    enablePageSize
                    page={page}
                    total={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    onFilterChange={(f) => setSearch(f.search || "")}
                    loading={loading}
                  >
                    <Table className="contact-table">
                      <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                        <TableRow className="border-b border-gray-200/50">
                          {/* Checkbox Column */}
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-3 w-12">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedContacts.size === contacts.length && contacts.length > 0}
                                onChange={selectAllContacts}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </TableHead>

                          {/* STT Column - Only Icon */}
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-3 w-16">
                            <div className="flex items-center justify-center">
                              <Hash className="w-3 h-3" />
                            </div>
                          </TableHead>

                          <TableHead className="font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              Tên liên hệ
                            </div>
                          </TableHead>
                          {isAdmin && (
                            <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <Building className="w-3 h-3" />
                                Người sở hữu
                              </div>
                            </TableHead>
                          )}
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <UserPlus className="w-3 h-3" />
                              Vai trò
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <UserCheck className="w-3 h-3" />
                              Persona
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <MessageSquare className="w-3 h-3" />
                              Lời chào
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Clock className="w-3 h-3" />
                              Số ngày
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Activity className="w-3 h-3" />
                              Auto-Reply
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Clock className="w-3 h-3" />
                              Thời gian
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-xs h-12 px-4">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-3 h-3" />
                              Tin nhắn cuối
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4 w-16">
                            <div className="flex items-center justify-center gap-2">
                              <Settings className="w-3 h-3" />
                              Thao tác
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((c: ContactWithGreeting, index: number) => {
                          const messageText = parseLastMessage(c.lastMessage);

                          return (
                            <TableRow
                              key={c.contactId}
                              className={getRowClassName(index)}
                            >
                              {/* Checkbox Cell */}
                              <TableCell className="text-center px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedContacts.has(c.contactId)}
                                  onChange={() => toggleContactSelection(c.contactId)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </TableCell>

                              {/* STT Cell */}
                              <TableCell className="text-center px-3 py-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-semibold text-xs">
                                    {getRowNumber(index)}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-xs">
                                      {c.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 text-sm">
                                      {c.name}
                                      {c.salutation && (
                                        <span className="ml-1 text-gray-500 font-normal">
                                          ({c.salutation})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ID: {c.contactId}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              {/* User column - only for admin */}
                              {isAdmin && (
                                <TableCell className="text-center px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                                      <span className="text-white font-semibold text-xs">
                                        {c.user?.username?.charAt(0).toUpperCase() || 'U'}
                                      </span>
                                    </div>
                                    <div className="text-left">
                                      <div className="font-medium text-gray-900 text-xs">
                                        {c.user?.username || 'Unknown'}
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        ID: {c.user?.id || 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              )}

                              <TableCell className="text-center px-4 py-3">
                                <Select
                                  value={c.role}
                                  onValueChange={(val) =>
                                    handleRequestRoleChange(
                                      c.contactId,
                                      c.name,
                                      val as ContactRole
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-[160px] mx-auto h-8 rounded-lg border hover:border-purple-300 transition-colors duration-300">
                                    <SelectValue placeholder="Chọn vai trò">
                                      <div
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${getRoleColor(
                                          c.role
                                        )}`}
                                      >
                                        {getRoleIcon(c.role)}
                                        <span className="font-medium text-xs">
                                          {getRoleDisplayName(c.role)}
                                        </span>
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-0 shadow-xs">
                                    {roleOptions.map((r) => (
                                      <SelectItem
                                        key={r}
                                        value={r}
                                        className="rounded-lg my-0.5"
                                      >
                                        <div
                                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${getRoleColor(
                                            r
                                          )}`}
                                        >
                                          {getRoleIcon(r)}
                                          <span className="font-medium text-xs">
                                            {getRoleDisplayName(r)}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* Persona selection per contact */}
                              <TableCell className="text-center px-4 py-3">
                                <Select
                                  value={c.assignedPersona?.personaId ? String(c.assignedPersona.personaId) : "none"}
                                  onValueChange={(val) =>
                                    handleAssignPersona(
                                      c.contactId,
                                      val === "none" ? null : Number(val)
                                    )
                                  }
                                  disabled={isRestrictedRole(c.role) || (zaloDisabled && !isTutorialActive)}
                                >
                                  <SelectTrigger className="w-[180px] mx-auto h-8 rounded-lg border hover:border-purple-300 transition-colors duration-300">
                                    <SelectValue placeholder="Chọn persona">
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg">
                                        <UserCheck className="w-3 h-3" />
                                        <span className="font-medium text-xs">
                                          {c.assignedPersona?.name || "Chưa chọn"}
                                        </span>
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-0 shadow-xs">
                                    <SelectItem key="none" value="none" className="rounded-lg my-0.5">
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg">
                                        <span className="font-medium text-xs text-gray-600">Chưa chọn</span>
                                      </div>
                                    </SelectItem>
                                    {personas.map((p) => (
                                      <SelectItem key={p.personaId} value={String(p.personaId)} className="rounded-lg my-0.5">
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg">
                                          <span className="font-medium text-xs">{p.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* Greeting Info Cell */}
                              <TableCell className="text-center px-4 py-3">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col items-center gap-1.5">
                                      {/* Salutation Badge */}
                                      {c.salutation || c.greetingMessage ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                                          <Sparkles className="w-3 h-3 text-green-600" />
                                          <span className="text-xs font-medium text-green-700">
                                            {c.salutation || 'Có lời chào'}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                                          <MessageSquare className="w-3 h-3 text-gray-400" />
                                          <span className="text-xs text-gray-500">Chưa có</span>
                                        </div>
                                      )}

                                      {/* Status & View History Button */}
                                      <div className="flex items-center gap-2 text-xs">
                                        {c.greetingIsActive === 1 ? (
                                          <span className="inline-flex items-center gap-0.5 text-green-600">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                            Hoạt động
                                          </span>
                                        ) : c.greetingIsActive === 0 ? (
                                          <span className="inline-flex items-center gap-0.5 text-gray-400">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                            Tắt
                                          </span>
                                        ) : null}

                                        {/* View History Button */}
                                        {c.greetingId && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setGreetingHistoryContactId(c.greetingId || null)}
                                            className="h-5 px-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            title="Xem lịch sử gửi lời chào"
                                          >
                                            <History className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="!max-w-[350px] bg-white text-gray-700 shadow-xs border border-gray-100">
                                    <div className="space-y-2">
                                      {c.salutation && (
                                        <div>
                                          <span className="font-semibold text-gray-900">Xưng hô:</span>{' '}
                                          <span className="text-gray-700">{c.salutation}</span>
                                        </div>
                                      )}
                                      {c.greetingMessage ? (
                                        <div>
                                          <span className="font-semibold text-gray-900">Lời chào:</span>
                                          <p className="text-sm text-gray-700 mt-1 line-clamp-4">
                                            {c.greetingMessage}
                                          </p>
                                        </div>
                                      ) : greetingConfig.defaultGreeting && (
                                        <div>
                                          <span className="font-semibold text-gray-900">Lời chào:</span>
                                          <p className="text-sm text-blue-600 italic mt-1 line-clamp-4">
                                            {greetingConfig.defaultGreeting}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {greetingConfig.allowCustomMessage
                                              ? '(Đang dùng lời chào mặc định)'
                                              : '⚠️ Hệ thống đang khóa tùy chỉnh'}
                                          </p>
                                        </div>
                                      )}
                                      {c.greetingLastMessageDate && (
                                        <div className="pt-2 border-t border-gray-200">
                                          <span className="font-semibold text-gray-900">Tin nhắn cuối:</span>{' '}
                                          <span className="text-sm text-gray-600">
                                            {new Date(c.greetingLastMessageDate).toLocaleString('vi-VN')}
                                          </span>
                                        </div>
                                      )}
                                      {c.greetingCustomerStatus && (
                                        <div>
                                          <span className="font-semibold text-gray-900">Trạng thái:</span>{' '}
                                          <span className={`text-sm ${c.greetingCustomerStatus === 'urgent' ? 'text-red-600 font-medium' :
                                              c.greetingCustomerStatus === 'reminder' ? 'text-yellow-600 font-medium' :
                                                'text-green-600'
                                            }`}>
                                            {c.greetingCustomerStatus === 'urgent' ? 'Cần báo gấp' :
                                              c.greetingCustomerStatus === 'reminder' ? 'Cần nhắc nhở' :
                                                'Bình thường'}
                                          </span>
                                        </div>
                                      )}
                                      {!c.salutation && !c.greetingMessage && !greetingConfig.defaultGreeting && (
                                        <p className="text-gray-600">Chưa cấu hình lời chào</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>

                              {/* Days Since Last Message Cell */}
                              <TableCell className="text-center px-4 py-3">
                                {(() => {
                                  const days = getDaysSinceLastMessage(c.greetingLastMessageDate);
                                  if (days === null) {
                                    return (
                                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-500">N/A</span>
                                      </div>
                                    );
                                  }

                                  // Color coding based on urgency
                                  const color = days >= 7 ? 'red' : days >= 3 ? 'yellow' : 'green';
                                  const bgColor = days >= 7 ? 'bg-red-50 border-red-200' :
                                    days >= 3 ? 'bg-yellow-50 border-yellow-200' :
                                      'bg-green-50 border-green-200';
                                  const textColor = days >= 7 ? 'text-red-700' :
                                    days >= 3 ? 'text-yellow-700' :
                                      'text-green-700';

                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${bgColor}`}>
                                          <Clock className={`w-3 h-3 ${textColor}`} />
                                          <span className={`text-xs font-medium ${textColor}`}>
                                            {days} ngày
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="!bg-white !text-gray-600 shadow-xs border border-gray-100 rounded-lg">
                                        <div className="text-sm text-gray-600">
                                          <p className="font-semibold text-gray-700">Tin nhắn cuối:</p>
                                          <p>{new Date(c.greetingLastMessageDate!).toLocaleString('vi-VN')}</p>
                                          <p className="mt-1 text-gray-600">
                                            {days >= 7 ? '⚠️ Đã lâu không liên lạc' :
                                              days >= 3 ? '⏰ Nên liên lạc sớm' :
                                                '✅ Mới liên lạc gần đây'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })()}
                              </TableCell>

                              {/* Auto-Reply Toggle with Confirmation */}
                              <TableCell className="text-center px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2">
                                        {(!c.assignedPersona || !c.assignedPersona.personaId) && (
                                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        )}
                                        <Switch
                                          checked={c.autoReplyOn}
                                          disabled={
                                            (controlsDisabled && !isTutorialActive) ||
                                            (!c.assignedPersona?.personaId && !isTutorialActive) ||
                                            isRestrictedRole(c.role)
                                          }
                                          onCheckedChange={(v) =>
                                            handleToggleAutoReply(
                                              c.contactId,
                                              c.name,
                                              !!v
                                            )
                                          }
                                          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                                        />
                                        <div
                                          className={`w-2 h-2 rounded-full ${c.autoReplyOn
                                              ? "bg-green-500 animate-pulse"
                                              : "bg-gray-300"
                                            }`}
                                        ></div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {isRestrictedRole(c.role) ? (
                                        <p>Liên hệ thuộc nhóm không áp dụng auto-reply</p>
                                      ) : (!c.assignedPersona || !c.assignedPersona.personaId) ? (
                                        <p>Cần chọn Persona trước khi bật auto-reply</p>
                                      ) : (
                                        <p>
                                          {c.autoReplyOn
                                            ? "Tắt tự động trả lời cho liên hệ này"
                                            : "Bật tự động trả lời cho liên hệ này"}
                                        </p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>

                              {/* Thời gian bật/tắt Auto-Reply */}
                              <TableCell className="text-center px-4 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  {c.autoReplyOn ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <Clock className="w-3 h-3" />
                                      <span className="text-xs font-medium">Bật</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-gray-500">
                                      <Clock className="w-3 h-3" />
                                      <span className="text-xs font-medium">Tắt</span>
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    {c.autoReplyOn && c.autoReplyEnabledAt ? (
                                      <div>
                                        {new Date(c.autoReplyEnabledAt).toLocaleDateString('vi-VN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    ) : c.autoReplyDisabledAt ? (
                                      <div>
                                        {new Date(c.autoReplyDisabledAt).toLocaleDateString('vi-VN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">Chưa có</div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* 🎯 Enhanced Last Message Cell với HoverCard */}
                              <TableCell className="px-4 py-3">
                                <div className="max-w-[250px]">
                                  {messageText ? (
                                    <HoverCard>
                                      <HoverCardTrigger asChild>
                                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                                          <div className="flex items-center gap-1 mb-1">
                                            <Clock className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-500">
                                              Tin nhắn gần nhất
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                                            {messageText}
                                          </p>
                                        </div>
                                      </HoverCardTrigger>
                                      <HoverCardContent
                                        className="w-[900px] max-w-[90vw] p-4 bg-white border shadow-xs rounded-xs"
                                        side="top"
                                        align="end"
                                        sideOffset={8}
                                      >
                                        <div className="space-y-3">
                                          {/* Header */}
                                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                              <MessageCircle className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-semibold text-gray-900 text-sm">
                                                Tin nhắn gần nhất
                                              </h4>
                                              <p className="text-xs text-gray-500 truncate">
                                                từ {c.name}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Message Content - Enhanced với height tăng lên */}
                                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                            <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                                                {messageText}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Footer Info */}
                                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                              <Clock className="w-3 h-3" />
                                              <span>Tin nhắn cuối cùng</span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                              ID: {c.contactId}
                                            </div>
                                          </div>
                                        </div>
                                      </HoverCardContent>
                                    </HoverCard>
                                  ) : (
                                    <div className="text-gray-400 italic text-xs">
                                      Chưa có tin nhắn
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* Dropdown Actions */}
                              <TableCell className="px-4 py-3 ht">
                                <div className="flex justify-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 transition-colors duration-200"
                                      >
                                        <MoreHorizontal className="h-4 w-4 text-gray-600" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-56 rounded-xl shadow-xs border-0 bg-white/95 backdrop-blur-sm modal-tabs"
                                    >
                                      <DropdownMenuItem
                                        disabled={(zaloDisabled && !isTutorialActive) || isRestrictedRole(c.role)}
                                        onClick={() =>
                                          setContactIdForProducts(c.contactId)
                                        }
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-orange-50 rounded-lg m-1 transition-colors duration-200"
                                      >
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                          <Package className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">
                                            Sản phẩm
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Cấu hình sản phẩm cho liên hệ
                                          </div>
                                        </div>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        disabled={(zaloDisabled && !isTutorialActive) || isRestrictedRole(c.role)}
                                        onClick={() =>
                                          setContactIdForKeywords(c.contactId)
                                        }
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-yellow-50 rounded-lg m-1 transition-colors duration-200"
                                      >
                                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                          <Key className="w-4 h-4 text-yellow-600" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">
                                            Keywords
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Thiết lập từ khóa
                                          </div>
                                        </div>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        disabled={(zaloDisabled && !isTutorialActive) || isRestrictedRole(c.role)}
                                        onClick={() =>
                                          setContactForProfile({
                                            id: c.contactId,
                                            zaloId: c.zaloContactId,
                                            name: c.name,
                                          })
                                        }
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 rounded-lg m-1 transition-colors duration-200"
                                      >
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                          <User className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">
                                            Hồ sơ
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Xem thông tin liên hệ
                                          </div>
                                        </div>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        disabled={isRestrictedRole(c.role)}
                                        onClick={() =>
                                          setContactIdForLogs(c.contactId)
                                        }
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50 rounded-lg m-1 transition-colors duration-200"
                                      >
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <FileText className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">
                                            Logs
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Xem lịch sử hoạt động
                                          </div>
                                        </div>
                                      </DropdownMenuItem>

                                      <div className="h-px bg-gray-200 my-1"></div>

                                      <DropdownMenuItem
                                        disabled={(zaloDisabled && !isTutorialActive) || isRestrictedRole(c.role)}
                                        onClick={() => setContactForGreeting(c)}
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-emerald-50 rounded-lg m-1 transition-colors duration-200"
                                      >
                                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">
                                            Lời chào
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Cấu hình xưng hô & lời chào
                                          </div>
                                        </div>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        disabled={zaloDisabled && !isTutorialActive}
                                        onClick={() =>
                                          setContactForRename({
                                            id: c.contactId,
                                            name: c.name,
                                          })
                                        }
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-green-50 rounded-lg m-1 transition-colors duration-200"
                                      >
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                          <Edit3 className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">
                                            Đổi tên
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Chỉnh sửa tên liên hệ
                                          </div>
                                        </div>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedContacts.size > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-xs p-4 z-50 bulk-actions">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  Đã chọn {selectedContacts.size} liên hệ
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllValidContacts}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Chọn tất cả hợp lệ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkOperation("Bật auto-reply")}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  disabled={Array.from(selectedContacts).some(id => {
                    const contact = contacts.find(c => c.contactId === id);
                    return !contact?.assignedPersona;
                  })}
                >
                  Bật auto-reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkOperation("Tắt auto-reply")}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Tắt auto-reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkOperation("Xuất dữ liệu")}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Xuất dữ liệu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {contactIdForProducts !== null && (
          <AllowedProductsModal
            open={contactIdForProducts !== null}
            onClose={() => setContactIdForProducts(null)}
            contactId={contactIdForProducts}
          />
        )}
        {contactIdForKeywords !== null && (
          <ContactKeywordsModal
            open={contactIdForKeywords !== null}
            onClose={() => setContactIdForKeywords(null)}
            contactId={contactIdForKeywords}
            disabled={(() => {
              const c = contacts.find(x => x.contactId === contactIdForKeywords);
              return !!c && isRestrictedRole(c.role);
            })()}
          />
        )}
        {contactForProfile && (
          <ContactProfileModal
            open={!!contactForProfile}
            onClose={() => setContactForProfile(null)}
            contactId={contactForProfile.id}
            contactZaloId={contactForProfile.zaloId}
            contactName={contactForProfile.name}
          />
        )}
        {contactIdForLogs !== null && (
          <LogsDrawer
            open={contactIdForLogs !== null}
            onClose={() => setContactIdForLogs(null)}
            contactId={contactIdForLogs}
          />
        )}
        {contactForRename && (
          <RenameContactModal
            open={!!contactForRename}
            onClose={() => setContactForRename(null)}
            contactId={contactForRename.id}
            currentName={contactForRename.name}
          />
        )}
        <EditGreetingModal
          key={contactForGreeting?.contactId || 'greeting-modal'}
          open={contactForGreeting !== null}
          onClose={() => setContactForGreeting(null)}
          contact={contactForGreeting}
          onSave={handleSaveGreeting}
        />
        <CustomerHistoryModal
          customerId={greetingHistoryContactId}
          open={greetingHistoryContactId !== null}
          onClose={() => setGreetingHistoryContactId(null)}
        />

        {/* Confirm Dialog for Auto-Reply Toggle */}
        <ConfirmDialog
          isOpen={confirmDialogOpen}
          title={
            pendingToggleValue
              ? `Bật auto-reply cho ${contactNameForToggle}`
              : `Tắt auto-reply cho ${contactNameForToggle}`
          }
          message={
            <div className="space-y-3">
              <p className="text-gray-700">
                {pendingToggleValue
                  ? `Bạn có chắc chắn muốn bật tự động trả lời cho liên hệ "${contactNameForToggle}"?`
                  : `Bạn có chắc chắn muốn tắt tự động trả lời cho liên hệ "${contactNameForToggle}"?`}
              </p>
              <div
                className={`p-3 rounded-lg border-l-4 ${pendingToggleValue
                    ? "bg-green-50 border-green-400 text-green-700"
                    : "bg-amber-50 border-amber-400 text-amber-700"
                  }`}
              >
                <div className="flex items-start gap-2">
                  {pendingToggleValue ? (
                    <Zap className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  )}
                  <div className="text-sm">
                    {pendingToggleValue
                      ? "Hệ thống sẽ tự động trả lời tin nhắn từ liên hệ này dựa trên cấu hình đã thiết lập."
                      : "Hệ thống sẽ ngừng tự động trả lời tin nhắn từ liên hệ này. Tin nhắn sẽ cần được xử lý thủ công."}
                  </div>
                </div>
              </div>
            </div>
          }
          onConfirm={handleConfirmToggle}
          onCancel={handleCancelToggle}
          confirmText={pendingToggleValue ? "Bật ngay" : "Tắt ngay"}
          cancelText="Hủy"
        />

        {/* Confirm Dialog for Role Change */}
        <ConfirmDialog
          isOpen={confirmRoleOpen}
          title={`Đổi vai trò cho ${contactNameForRole}`}
          message={
            <div className="space-y-3">
              <p className="text-gray-700">
                Bạn có chắc muốn đổi vai trò liên hệ "{contactNameForRole}"
                thành
                {pendingRoleValue ? ` "${pendingRoleValue}"` : ""}?
              </p>
            </div>
          }
          onConfirm={handleConfirmRoleChange}
          onCancel={handleCancelRoleChange}
          confirmText="Xác nhận"
          cancelText="Hủy"
        />

        {alert && (
          <ServerResponseAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}
      </div>

      {/* Tutorial Component */}
      <ContactTableTutorial />
    </TooltipProvider>
  );
};

export default ContactTable;
