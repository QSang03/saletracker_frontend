"use client";
import React from "react";
import { AutoReplyContact, ContactRole } from "@/types/auto-reply";
import { useContactsPaginated } from "@/hooks/contact-list/useContactsPaginated";
import AllowedProductsModal from "./modals/AllowedProductsModal";
import ContactKeywordsModal from "./modals/ContactKeywordsModal";
import ContactProfileModal from "./modals/ContactProfileModal";
import LogsDrawer from "./modals/LogsDrawer";
import RenameContactModal from "./RenameContactModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
import { useCurrentUser } from "@/contexts/CurrentUserContext";
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
    loading,
    error,
    updateRole,
    toggleAutoReply,
  } = useContactsPaginated();
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const controlsDisabled = zaloDisabled || !globalAutoReplyEnabled;

  const [contactIdForProducts, setContactIdForProducts] = React.useState<
    number | null
  >(null);
  const [contactIdForKeywords, setContactIdForKeywords] = React.useState<
    number | null
  >(null);
  const [contactIdForProfile, setContactIdForProfile] = React.useState<
    number | null
  >(null);
  const [contactIdForLogs, setContactIdForLogs] = React.useState<number | null>(
    null
  );
  const [contactForRename, setContactForRename] = React.useState<{
    id: number;
    name: string;
  } | null>(null);

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

  // Check if should show empty state
  const showEmptyState = !loading && total === 0;

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-pink-500/3 rounded-2xl blur-lg"></div>

        <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-2xl overflow-hidden">
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
                  <Table>
                    <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                      <TableRow className="border-b border-gray-200/50">
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
                        <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <UserPlus className="w-3 h-3" />
                            Vai trò
                          </div>
                        </TableHead>
                        <TableHead className="text-center font-semibold text-gray-700 text-xs h-12 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Activity className="w-3 h-3" />
                            Auto-Reply
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
                      {contacts.map((c: AutoReplyContact, index: number) => {
                        const messageText = parseLastMessage(c.lastMessage);

                        return (
                          <TableRow
                            key={c.contactId}
                            className={getRowClassName(index)}
                          >
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
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {c.contactId}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

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
                                <SelectContent className="rounded-lg border-0 shadow-xl">
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

                            {/* Auto-Reply Toggle with Confirmation */}
                            <TableCell className="text-center px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={c.autoReplyOn}
                                        disabled={controlsDisabled}
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
                                        className={`w-2 h-2 rounded-full ${
                                          c.autoReplyOn
                                            ? "bg-green-500 animate-pulse"
                                            : "bg-gray-300"
                                        }`}
                                      ></div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {c.autoReplyOn
                                        ? "Tắt tự động trả lời cho liên hệ này"
                                        : "Bật tự động trả lời cho liên hệ này"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
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
                                      className="w-[900px] max-w-[90vw] p-4 bg-white border shadow-xl rounded-xl"
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
                            <TableCell className="px-4 py-3">
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
                                    className="w-56 rounded-xl shadow-xl border-0 bg-white/95 backdrop-blur-sm"
                                  >
                                    <DropdownMenuItem
                                      disabled={zaloDisabled}
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
                                      disabled={zaloDisabled}
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
                                      disabled={zaloDisabled}
                                      onClick={() =>
                                        setContactIdForProfile(c.contactId)
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
                                      disabled={zaloDisabled}
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
          )}
        </div>

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
          />
        )}
        {contactIdForProfile !== null && (
          <ContactProfileModal
            open={contactIdForProfile !== null}
            onClose={() => setContactIdForProfile(null)}
            contactId={contactIdForProfile}
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
                className={`p-3 rounded-lg border-l-4 ${
                  pendingToggleValue
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
    </TooltipProvider>
  );
};

export default ContactTable;
