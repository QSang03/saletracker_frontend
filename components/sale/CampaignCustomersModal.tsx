import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Phone,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  User,
  AlertCircle,
  Edit,
  Trash,
} from "lucide-react";
import { Campaign } from "@/types";
import { campaignAPI } from "@/lib/campaign-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import CustomerLogModal, { LogStatus } from "./CampaignCustomerLogModal.tsx";
import EditCustomerModal from "./EditCustomerModal";
import { CampaignSocket } from "@/components/socket/CampaignSocket";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface CampaignCustomer {
  id: string;
  phone_number: string;
  full_name: string;
  salutation?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CustomerWithStatus extends CampaignCustomer {
  full_name: string;
  salutation?: string;
  added_at: string;
  latest_log?: any;
  total_interactions: number;
  last_interaction_at?: string;
  status?: LogStatus | null;
  conversation_metadata?: any;
  sent_at?: Date | null;
}

interface CampaignCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}

const LOG_STATUS_CONFIG = {
  [LogStatus.PENDING || null]: {
    label: "Chưa gửi",
    variant: "outline" as const,
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  [LogStatus.SENT]: {
    label: "Đã gửi",
    variant: "default" as const,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CheckCircle,
  },
  [LogStatus.FAILED]: {
    label: "Gửi lỗi",
    variant: "destructive" as const,
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  [LogStatus.CUSTOMER_REPLIED]: {
    label: "KH phản hồi",
    variant: "default" as const,
    color: "bg-green-50 text-green-700 border-green-200",
    icon: MessageCircle,
  },
  [LogStatus.STAFF_HANDLED]: {
    label: "Đã xử lý",
    variant: "secondary" as const,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: User,
  },
  [LogStatus.REMINDER_SENT]: {
    label: "Đã nhắc lại",
    variant: "outline" as const,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertCircle,
  },
};

// Generate a simple UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formatDateShort = (date: string | Date): string => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "N/A";
  }
};

const LogStatusBadge = ({ status }: { status: LogStatus }) => {
  const config =
    LOG_STATUS_CONFIG[status] || LOG_STATUS_CONFIG[LogStatus.PENDING];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <Badge
        variant={config.variant}
        className={cn(
          "font-medium text-xs flex items-center gap-1",
          config.color
        )}
      >
        <motion.div
          animate={{ rotate: status === LogStatus.PENDING ? [0, 360] : 0 }}
          transition={{
            duration: 2,
            repeat: status === LogStatus.PENDING ? Infinity : 0,
            ease: "linear",
          }}
        >
          <IconComponent className="h-3 w-3" />
        </motion.div>
        {config.label}
      </Badge>
    </motion.div>
  );
};

const CustomerLoadingSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, index) => (
      <motion.tr
        key={`loading-skeleton-${index}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="animate-pulse"
      >
        <TableCell className="text-center">
          <div className="h-4 w-8 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-6 w-20 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <div className="h-8 w-8 bg-gray-200 rounded mx-auto" />
        </TableCell>
      </motion.tr>
    ))}
  </>
);

export default function CampaignCustomersModal({
  isOpen,
  onClose,
  campaign,
}: CampaignCustomersModalProps) {
  const pageSize = 1000000;
  const [customers, setCustomers] = useState<CustomerWithStatus[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<
    CustomerWithStatus[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStatus | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<CustomerWithStatus | null>(null);
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(
    new Set()
  );
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number>(0);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] =
    useState<CustomerWithStatus | null>(null);

  // ✅ THÊM: Focused row state để highlight row đang được thao tác
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const skipClearRef = useRef(false);
  const modalOpenRef = useRef(false);

  const getEventKey = (event: any): string => {
    return `${event.ws_type || event.type}_${
      event.campaignId || event.campaign_id
    }_${event.customerId || event.customer_id}_${event.timestamp}`;
  };

  const hasRealChanges = (event: any): boolean => {
    if (!event.changes && !event.status && !event.interaction_data)
      return false;

    // Kiểm tra changes object
    if (event.changes) {
      return Object.keys(event.changes).some((key) => {
        const change = event.changes[key];
        if (typeof change === "object" && "old" in change && "new" in change) {
          return change.old !== change.new;
        }
        return true;
      });
    }

    // Có status change hoặc interaction data mới
    return Boolean(event.status || event.interaction_data);
  };

  const fetchCustomers = useCallback(
    async (searchQuery = "", status = "all") => {
      if (!campaign) return;

      try {
        setLoading(true);

        const response = await campaignAPI.getCampaignCustomers(campaign.id, {
          search: searchQuery,
          status: status === "all" ? undefined : status,
          page: 1,
          limit: pageSize,
        });

        const allCustomers = response.data || [];
        setCustomers(allCustomers);
        setDisplayCount(20);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error("Không thể tải danh sách khách hàng");
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    },
    [campaign]
  );

  // ✅ CẬP NHẬT: Function cập nhật customer cụ thể thay vì reload toàn bộ
  const updateSpecificCustomer = useCallback(
    async (customerId: string, changes: any, interactionData?: any) => {
      try {
        const customerIndex = customers.findIndex((c) => c.id === customerId);
        if (customerIndex === -1) {
          // Nếu không tìm thấy customer, có thể là customer mới được thêm
          await fetchCustomers(searchTerm, statusFilter);
          return;
        }

        // ✅ CHỈ cập nhật những field thay đổi, GIỮ NGUYÊN data cũ
        if (changes || interactionData) {
          setCustomers((prev) => {
            const newCustomers = [...prev];
            const existingCustomer = newCustomers[customerIndex];

            const updatedFields: any = {};

            // Xử lý status changes
            if (changes?.status) {
              updatedFields.status = changes.status.new || changes.status;
            }

            // Xử lý interaction changes
            if (interactionData) {
              updatedFields.conversation_metadata =
                interactionData.conversation_metadata;
              updatedFields.total_interactions =
                interactionData.total_interactions ||
                existingCustomer.total_interactions;
              updatedFields.last_interaction_at =
                interactionData.last_interaction_at;
            }

            // Xử lý sent_at changes
            if (changes?.sent_at) {
              updatedFields.sent_at = changes.sent_at.new;
            }

            // ✅ MERGE chỉ những field cần thiết
            newCustomers[customerIndex] = {
              ...existingCustomer,
              ...updatedFields,
            };

            return newCustomers;
          });

          console.log(`✅ Updated customer ${customerId} specifically:`, {
            changes,
            interactionData,
          });
          return;
        }

        // ✅ FALLBACK: Chỉ fetch khi cần thiết
        console.log(`⚠️ Fallback to full customer refresh for ${customerId}`);
        await fetchCustomers(searchTerm, statusFilter);
      } catch (error) {
        console.error("Error updating specific customer:", error);
        // Fallback to full reload
        await fetchCustomers(searchTerm, statusFilter);
      }
    },
    [customers, searchTerm, statusFilter, fetchCustomers]
  );

  // ✅ CẬP NHẬT: Tối ưu interaction log update handler
  const handleCampaignInteractionLogUpdate = useCallback(
    (data: any) => {
      console.log(
        "Campaign interaction log updated via socket (customers modal):",
        data
      );

      // ✅ Xử lý theo structure events array
      const events = data.events || [data];
      if (events.length === 0) {
        console.log("No events to process in customers modal");
        return;
      }

      // ✅ Chỉ xử lý events của campaign hiện tại
      if (!campaign) return;

      events.forEach((event: any) => {
        // Kiểm tra campaign match
        const eventCampaignId = event.campaignId || event.campaign_id;
        if (eventCampaignId !== campaign.id) {
          console.log(
            "Event not for current campaign:",
            eventCampaignId,
            "vs",
            campaign.id
          );
          return;
        }

        // ✅ Kiểm tra duplicate events
        const eventKey = getEventKey(event);
        if (processedEvents.has(eventKey)) {
          console.log("🔄 Duplicate interaction event ignored:", eventKey);
          return;
        }

        // ✅ Kiểm tra timestamp để tránh xử lý sự kiện cũ
        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime <= lastEventTimestamp) {
          console.log("⏰ Old interaction event ignored:", event.timestamp);
          return;
        }

        // ✅ Kiểm tra có thay đổi thực sự không
        if (!hasRealChanges(event)) {
          console.log("📝 No real interaction changes detected:", event);
          return;
        }

        // ✅ Đánh dấu event đã xử lý
        setProcessedEvents((prev) => new Set([...prev, eventKey]));
        setLastEventTimestamp(eventTime);

        // ✅ Cập nhật customer cụ thể
        const customerId = event.customerId || event.customer_id;
        if (customerId) {
          updateSpecificCustomer(
            customerId,
            event.changes,
            event.interaction_data
          );
        } else {
          // Fallback to full reload nếu không có customer ID
          console.log("⚠️ No customer ID in event, fallback to full reload");
          fetchCustomers(searchTerm, statusFilter);
        }
      });
    },
    [
      campaign,
      processedEvents,
      lastEventTimestamp,
      updateSpecificCustomer,
      searchTerm,
      statusFilter,
      fetchCustomers,
    ]
  );

  useEffect(() => {
    let filtered = customers;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (customer) =>
          customer.full_name.toLowerCase().includes(searchLower) ||
          customer.phone_number.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "all") {
      // Treat "pending" filter as both explicit pending status and missing/null status
      if (statusFilter === "pending") {
        filtered = filtered.filter(
          (customer) => customer.status === statusFilter || customer.status == null
        );
      } else {
        filtered = filtered.filter((customer) => customer.status === statusFilter);
      }
    }

    setFilteredCustomers(filtered);
    setDisplayCount(20);
  }, [customers, searchTerm, statusFilter]);

  useEffect(() => {
    if (isOpen && campaign) {
      fetchCustomers(searchTerm, statusFilter);
    }
  }, [isOpen, campaign]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setStatusFilter("all");
      setCustomers([]);
      setFilteredCustomers([]);
      setDisplayCount(20);
    }
  }, [isOpen]);

  // ✅ THÊM: Cleanup processed events để tránh memory leak
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const fifteenMinutesAgo = now - 15 * 60 * 1000;

      setProcessedEvents((prev) => {
        const filtered = new Set<string>();
        prev.forEach((eventKey) => {
          const parts = eventKey.split("_");
          const timestamp = parts[parts.length - 1];
          try {
            if (new Date(timestamp).getTime() > fifteenMinutesAgo) {
              filtered.add(eventKey);
            }
          } catch {
            // Keep events we can't parse timestamp for safety
            filtered.add(eventKey);
          }
        });
        return filtered;
      });
    }, 5 * 60 * 1000); // Cleanup mỗi 5 phút

    return () => clearInterval(cleanup);
  }, []);

  // ✅ THÊM: Helper function để set focus an toàn
  const setFocusSafely = (id: string | null) => {
    try {
      skipClearRef.current = true;
      setFocusedRowId(id);
    } finally {
      setTimeout(() => {
        skipClearRef.current = false;
      }, 0);
    }
  };

  // ✅ THÊM: Utility để thực hiện action mà không bị clear focus
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

  // ✅ THÊM: Clear focusedRowId khi click outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (skipClearRef.current) return;
      if (modalOpenRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const focusedNode = target.closest(
        "[data-focused-row-id]"
      ) as HTMLElement | null;

      if (focusedNode) {
        const id = focusedNode.getAttribute("data-focused-row-id");
        if (id !== null && String(focusedRowId) === id) return;
      }

      if (focusedRowId !== null) setFocusSafely(null);
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [focusedRowId]);

  // ✅ THÊM: Keep modalOpenRef in sync với modal states
  useEffect(() => {
    modalOpenRef.current = !!(
      isLogModalOpen ||
      isEditModalOpen ||
      showDeleteConfirm
    );
  }, [isLogModalOpen, isEditModalOpen, showDeleteConfirm]);

  // ✅ THÊM: Clear focus khi data thay đổi
  useEffect(() => {
    setFocusSafely(null);
  }, [customers]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleViewLogs = (customer: CustomerWithStatus) => {
    setFocusSafely(customer.id);
    const customerWithSentDate = {
      ...customer,
      sent_date: customer.sent_at
        ? new Date(customer.sent_at).toISOString().split("T")[0]
        : undefined,
    };

    setSelectedCustomer(customerWithSentDate);
    withSkipClear(() => setIsLogModalOpen(true));
  };

  // ✅ THÊM MỚI: Handle edit customer
  const handleEditCustomer = (customer: CustomerWithStatus) => {
    setFocusSafely(customer.id);
    setEditingCustomer(customer);
    withSkipClear(() => setIsEditModalOpen(true));
  };

  const handleEditModalClose = () => {
    withSkipClear(() => setIsEditModalOpen(false));
    setEditingCustomer(null);
  };

  const handleEditSuccess = () => {
    // Reload customers sau khi edit thành công
    fetchCustomers(searchTerm, statusFilter);
    withSkipClear(() => handleEditModalClose());
  };

  const handleDeleteCustomer = async (customer: CustomerWithStatus) => {
    if (!campaign) return;

    setFocusSafely(customer.id);
    // ✅ THAY ĐỔI: Thay vì window.confirm, hiển thị confirm dialog
    setCustomerToDelete(customer);
    withSkipClear(() => setShowDeleteConfirm(true));
  };

  // ✅ THÊM MỚI: Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!campaign || !customerToDelete) return;

    try {
      setDeletingCustomerId(customerToDelete.id);

      // Gọi API xóa customer khỏi campaign
      await campaignAPI.removeCustomerFromCampaign(
        campaign.id,
        customerToDelete.id
      );

      // Cập nhật local state - loại bỏ customer đã xóa
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));

      toast.success(
        `Đã xóa khách hàng "${customerToDelete.full_name}" khỏi chiến dịch`
      );
    } catch (error) {
      console.error("Error deleting customer from campaign:", error);
      toast.error("Không thể xóa khách hàng khỏi chiến dịch");
    } finally {
      setDeletingCustomerId(null);
      withSkipClear(() => setShowDeleteConfirm(false));
      setCustomerToDelete(null);
    }
  };

  // ✅ THÊM MỚI: Handle cancel delete
  const handleCancelDelete = () => {
    withSkipClear(() => setShowDeleteConfirm(false));
    setCustomerToDelete(null);
    setDeletingCustomerId(null);
  };

  const handleExportCustomers = async () => {
    if (!campaign) return null;

    try {
      toast.info("Đang xuất báo cáo tổng quan...");

      // ✅ Gọi API exportCampaignSummary (2 sheets)
      const response = await campaignAPI.exportCampaignSummary(campaign.id);

      // ✅ Tạo blob từ response data
      const blob = new Blob([response], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // ✅ Tạo URL để download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // ✅ Đặt tên file với timestamp
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:.]/g, "-");
      const safeCampaignName = campaign.name.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `${safeCampaignName}_summary_report_${timestamp}.xlsx`;

      // ✅ Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ✅ Cleanup URL object
      window.URL.revokeObjectURL(url);

      toast.success("Đã xuất báo cáo tổng quan thành công");
    } catch (error) {
      console.error("Error exporting campaign summary:", error);
      toast.error("Không thể xuất báo cáo tổng quan");
    }
  };

  const getCustomerInteractionCount = (conversationMetadata: any): number => {
    if (
      !conversationMetadata?.history ||
      !Array.isArray(conversationMetadata.history)
    ) {
      return 0;
    }

    return conversationMetadata.history.filter(
      (item: any) => item.sender === "customer"
    ).length;
  };

  const loadMoreCustomers = () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);

    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + 20, filteredCustomers.length));
      setIsLoadingMore(false);
    }, 300);
  };

  const displayedCustomers = filteredCustomers.slice(0, displayCount);
  const hasMoreData = displayCount < filteredCustomers.length;
  const getLastCustomerInteractionTime = (
    conversationMetadata: any
  ): string | null => {
    if (
      !conversationMetadata?.history ||
      !Array.isArray(conversationMetadata.history)
    ) {
      return null;
    }

    const customerMessages = conversationMetadata.history.filter(
      (item: any) => item.sender === "customer"
    );

    if (customerMessages.length === 0) {
      return null;
    }

    const sortedMessages = customerMessages.sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedMessages[0]?.timestamp || null;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMoreData && !isLoadingMore) {
        loadMoreCustomers();
      }
    }
  };

  if (!campaign) return null;

  const tableHeaders = [
    "#",
    "Khách hàng",
    "Số điện thoại",
    "Ngày tạo DSKH",
    "Ngày Gửi",
    "Trạng thái gửi",
    "Tương tác",
    "Lần cuối",
    "Thao tác",
  ];

  return (
    <>
      {/* ✅ Socket integration for real-time updates */}
      <CampaignSocket
        onCampaignInteractionLogUpdate={handleCampaignInteractionLogUpdate}
      />

      <AnimatePresence>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
              className="!max-w-[90vw] w-full !h-[90vh] p-0 flex flex-col"
              style={{
                maxHeight: "90vh",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Users className="h-5 w-5 text-blue-600" />
                      </motion.div>
                      Danh sách khách hàng chiến dịch
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Chiến dịch:{" "}
                      <span className="font-medium text-gray-900">
                        {campaign.name}
                      </span>
                      <AnimatePresence>
                        {customers.length > 0 && (
                          <motion.span
                            className="ml-2"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                          >
                            • Tổng số:{" "}
                            <motion.span
                              className="font-medium"
                              key={customers.length}
                              initial={{ scale: 1.2, color: "#2563eb" }}
                              animate={{ scale: 1, color: "inherit" }}
                              transition={{ duration: 0.3 }}
                            >
                              {customers.length.toLocaleString()}
                            </motion.span>{" "}
                            khách hàng
                            {filteredCustomers.length !== customers.length && (
                              <span className="text-blue-600">
                                {" "}
                                • Hiển thị:{" "}
                                {filteredCustomers.length.toLocaleString()}
                              </span>
                            )}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Filters */}
                <div className="flex-shrink-0 p-4 border-b">
                  <motion.div
                    className="flex flex-col sm:flex-row gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex-1 relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2"
                      >
                        <Search className="h-4 w-4 text-gray-400" />
                      </motion.div>
                      <Input
                        placeholder="Tìm kiếm theo tên, số điện thoại... (tìm kiếm local)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Select
                          value={statusFilter}
                          onValueChange={handleStatusFilterChange}
                        >
                          <SelectTrigger className="h-10 w-40">
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            >
                              <Filter className="h-4 w-4 mr-2" />
                            </motion.div>
                            <SelectValue placeholder="Trạng thái" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="pending">Chưa gửi</SelectItem>
                            <SelectItem value="sent">Đã gửi</SelectItem>
                            <SelectItem value="failed">Gửi lỗi</SelectItem>
                            <SelectItem value="customer_replied">
                              KH phản hồi
                            </SelectItem>
                            <SelectItem value="staff_handled">
                              Đã xử lý
                            </SelectItem>
                            <SelectItem value="reminder_sent">
                              Đã nhắc lại
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={() =>
                            fetchCustomers(searchTerm, statusFilter)
                          }
                          disabled={loading}
                        >
                          <motion.div
                            animate={{ rotate: loading ? 360 : 0 }}
                            transition={{
                              duration: 1,
                              repeat: loading ? Infinity : 0,
                              ease: "linear",
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </motion.div>
                        </Button>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            fetchCustomers("", "all");
                          }}
                          disabled={!searchTerm && statusFilter === "all"}
                        >
                          <span className="inline-block">Xóa bộ lọc</span>
                        </Button>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 hover:bg-green-50 hover:border-green-200 transition-all duration-200"
                          onClick={handleExportCustomers}
                          disabled={loading || customers.length === 0}
                        >
                          <motion.div
                            animate={{
                              y: [0, -2, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="mr-2 inline-block"
                          >
                            <Download className="h-4 w-4" />
                          </motion.div>
                          <span className="inline-block">Xuất Excel</span>
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-hidden">
                  <motion.div
                    className="h-full overflow-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    onScroll={handleScroll}
                  >
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          {tableHeaders.map((header, index) => (
                            <motion.th
                              key={`header-${index}`}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + index * 0.05 }}
                              className={cn(
                                "h-12 px-4 text-center align-middle font-medium text-muted-foreground border-b",
                                header === "#" && "w-12",
                                header === "Thao tác" && "w-20",
                                header === "Khách hàng" && "text-left"
                              )}
                            >
                              {header}
                            </motion.th>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="wait">
                          {loading ? (
                            <CustomerLoadingSkeleton />
                          ) : displayedCustomers.length > 0 ? (
                            <>
                              {displayedCustomers.map((customer, index) => (
                                <motion.tr
                                  key={`customer-${
                                    customer.id
                                  }-${generateUUID()}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  transition={{
                                    delay: index * 0.01,
                                    duration: 0.3,
                                  }}
                                  whileHover={{
                                    backgroundColor: "#f9fafb",
                                    scale: 1.005,
                                  }}
                                  className={cn(
                                    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                                    focusedRowId === customer.id
                                      ? "focused-no-hover ring-2 ring-indigo-300 shadow-lg bg-amber-300"
                                      : ""
                                  )}
                                  data-focused-row-id={customer.id}
                                >
                                  <TableCell className="text-center text-sm text-gray-500">
                                    <motion.span
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      {index + 1}
                                    </motion.span>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      className="font-medium text-gray-900"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      {customer.salutation && (
                                        <span className="text-sm text-gray-500 mr-1">
                                          {customer.salutation}
                                        </span>
                                      )}
                                      {customer.full_name}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.div
                                      className="flex items-center justify-center gap-1 text-sm"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.15 }}
                                    >
                                      <Phone className="h-3 w-3 text-gray-400" />
                                      {customer.phone_number}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.div
                                      className="flex items-center justify-center gap-1 text-sm text-gray-600"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      {(() => {
                                        const d = new Date(customer.added_at);
                                        const pad = (n: number) =>
                                          n.toString().padStart(2, "0");
                                        return `${d.getFullYear()}-${pad(
                                          d.getMonth() + 1
                                        )}-${pad(d.getDate())} ${pad(
                                          d.getHours()
                                        )}:${pad(d.getMinutes())}:${pad(
                                          d.getSeconds()
                                        )}`;
                                      })()}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.div
                                      className="flex items-center justify-center gap-1 text-sm text-gray-600"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      {customer.sent_at
                                        ? (() => {
                                            const d = new Date(
                                              customer.sent_at
                                            );
                                            const pad = (n: number) =>
                                              n.toString().padStart(2, "0");
                                            return `${d.getFullYear()}-${pad(
                                              d.getMonth() + 1
                                            )}-${pad(d.getDate())} ${pad(
                                              d.getHours()
                                            )}:${pad(d.getMinutes())}:${pad(
                                              d.getSeconds()
                                            )}`;
                                          })()
                                        : "Chưa Gửi"}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.25 }}
                                      className="flex justify-center"
                                    >
                                      {customer.status ? (
                                        <LogStatusBadge
                                          status={customer.status}
                                        />
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-gray-500"
                                        >
                                          Chưa gửi
                                        </Badge>
                                      )}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.span
                                      className="font-medium text-sm"
                                      initial={{ opacity: 0 }}
                                      animate={{
                                        opacity: 1,
                                        scale: [1.2, 1],
                                        color: ["#2563eb", "inherit"],
                                      }}
                                      transition={{ delay: 0.3 }}
                                      key={customer.conversation_metadata}
                                    >
                                      {getCustomerInteractionCount(
                                        customer.conversation_metadata
                                      )}{" "}
                                      lần
                                    </motion.span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.div
                                      className="text-sm text-gray-600"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.35 }}
                                    >
                                      {(() => {
                                        const lastInteractionTime =
                                          getLastCustomerInteractionTime(
                                            customer.conversation_metadata
                                          );
                                        if (!lastInteractionTime)
                                          return "Chưa có";
                                        const d = new Date(lastInteractionTime);
                                        const pad = (n: number) =>
                                          n.toString().padStart(2, "0");
                                        return `${d.getFullYear()}-${pad(
                                          d.getMonth() + 1
                                        )}-${pad(d.getDate())} ${pad(
                                          d.getHours()
                                        )}:${pad(d.getMinutes())}:${pad(
                                          d.getSeconds()
                                        )}`;
                                      })()}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {/* ✅ CẬP NHẬT: Thêm nút Edit cho campaign bản nháp */}
                                    <div className="flex items-center justify-center gap-1">
                                      {/* Nút xem logs - luôn có */}
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleViewLogs(customer)
                                          }
                                          className="h-8 w-8 p-0"
                                          title="Xem lịch sử tương tác"
                                        >
                                          <motion.div
                                            whileHover={{ rotate: 5 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </motion.div>
                                        </Button>
                                      </motion.div>

                                      {/* Nút edit - CHỈ hiển thị khi campaign là DRAFT */}
                                      {campaign.status === "draft" && (
                                        <>
                                          <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                          >
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleEditCustomer(customer)
                                              }
                                              className="h-8 w-8 p-0"
                                              title="Chỉnh sửa thông tin khách hàng"
                                            >
                                              <motion.div
                                                whileHover={{ rotate: 5 }}
                                                transition={{ duration: 0.2 }}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </motion.div>
                                            </Button>
                                          </motion.div>
                                          <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                          >
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleDeleteCustomer(customer)
                                              }
                                              disabled={
                                                deletingCustomerId ===
                                                customer.id
                                              }
                                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                              title="Xóa khách hàng khỏi chiến dịch"
                                            >
                                              <motion.div
                                                animate={{
                                                  rotate:
                                                    deletingCustomerId ===
                                                    customer.id
                                                      ? 360
                                                      : 0,
                                                  scale:
                                                    deletingCustomerId ===
                                                    customer.id
                                                      ? 0.8
                                                      : 1,
                                                }}
                                                transition={{
                                                  duration:
                                                    deletingCustomerId ===
                                                    customer.id
                                                      ? 1
                                                      : 0.2,
                                                  repeat:
                                                    deletingCustomerId ===
                                                    customer.id
                                                      ? Infinity
                                                      : 0,
                                                  ease: "linear",
                                                }}
                                              >
                                                <Trash className="h-4 w-4" />
                                              </motion.div>
                                            </Button>
                                          </motion.div>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </motion.tr>
                              ))}

                              {isLoadingMore && (
                                <TableRow>
                                  <TableCell
                                    colSpan={10}
                                    className="h-16 text-center"
                                  >
                                    <motion.div
                                      className="flex items-center justify-center space-x-2 text-blue-600"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                    >
                                      <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                          duration: 1,
                                          repeat: Infinity,
                                          ease: "linear",
                                        }}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </motion.div>
                                      <span>Đang tải thêm...</span>
                                    </motion.div>
                                  </TableCell>
                                </TableRow>
                              )}

                              {hasMoreData && !isLoadingMore && (
                                <TableRow>
                                  <TableCell
                                    colSpan={10}
                                    className="h-16 text-center"
                                  >
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        variant="outline"
                                        onClick={loadMoreCustomers}
                                        className="mx-auto"
                                      >
                                        Tải thêm (
                                        {filteredCustomers.length -
                                          displayCount}{" "}
                                        còn lại)
                                      </Button>
                                    </motion.div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={10}
                                className="h-32 text-center"
                              >
                                <motion.div
                                  className="flex flex-col items-center justify-center space-y-3 text-gray-500"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <motion.div
                                    animate={{
                                      y: [0, -5, 0],
                                      rotate: [0, 5, -5, 0],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                  >
                                    <Users className="h-12 w-12 text-gray-300" />
                                  </motion.div>
                                  <div>
                                    <p className="font-medium">
                                      Không tìm thấy khách hàng
                                    </p>
                                    <p className="text-sm">
                                      {searchTerm || statusFilter !== "all"
                                        ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                                        : "Chưa có khách hàng nào trong chiến dịch này"}
                                    </p>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </motion.div>
                </div>

                {/* Footer */}
                <AnimatePresence>
                  {filteredCustomers.length > 0 && (
                    <motion.div
                      className="flex-shrink-0 flex items-center justify-between p-4 border-t text-sm text-gray-600 bg-gray-50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        Hiển thị {filteredCustomers.length.toLocaleString()} /{" "}
                        {displayCount.toLocaleString()} khách hàng
                        {customers.length !== filteredCustomers.length && (
                          <span className="text-blue-600">
                            {" "}
                            (lọc từ {customers.length.toLocaleString()})
                          </span>
                        )}
                      </motion.div>

                      {hasMoreData && (
                        <motion.div
                          className="text-blue-600"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          Cuộn xuống để tải thêm
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Customer Log Detail Modal */}
      <CustomerLogModal
        isOpen={isLogModalOpen}
        onClose={() => withSkipClear(() => setIsLogModalOpen(false))}
        customer={selectedCustomer}
        campaignId={campaign?.id || ""}
      />

      {/* ✅ THÊM MỚI: Edit Customer Modal */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        customer={editingCustomer}
        campaignId={campaign?.id || ""}
        onSuccess={handleEditSuccess}
      />

      {/* ✅ THÊM MỚI: Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa khách hàng"
        message={
          customerToDelete ? (
            <div>
              <p className="mb-3">
                Bạn có chắc chắn muốn xóa khách hàng này khỏi chiến dịch không?
              </p>
              <div className="p-3 bg-red-50 rounded-md text-sm space-y-1 border border-red-200">
                <div>
                  <strong>Họ tên:</strong> {customerToDelete.full_name}
                </div>
                <div>
                  <strong>Số điện thoại:</strong>{" "}
                  {customerToDelete.phone_number}
                </div>
                {customerToDelete.salutation && (
                  <div>
                    <strong>Xưng hô:</strong> {customerToDelete.salutation}
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm text-red-600 pb-3">
                <strong>Lưu ý:</strong> Thao tác này sẽ xóa khách hàng khỏi
                chiến dịch.
              </p>
            </div>
          ) : null
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText={
          deletingCustomerId === customerToDelete?.id
            ? "Đang xóa..."
            : "Xác nhận xóa"
        }
        cancelText="Hủy"
      />
    </>
  );
}
