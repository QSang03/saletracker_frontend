import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Campaign } from "@/types";
import { campaignAPI } from "@/lib/campaign-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import CustomerLogModal, { LogStatus } from "./CampaignCustomerLogModal.tsx";

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
}

interface CampaignCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}

const LOG_STATUS_CONFIG = {
  [LogStatus.PENDING]: {
    label: "Chờ gửi",
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
        key={`loading-${index}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="animate-pulse"
      >
        <TableCell>
          <div className="h-4 w-8 bg-gray-200 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-6 w-20 bg-gray-200 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-8 w-8 bg-gray-200 rounded" />
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

  const pageSize = 1000000;

  const fetchCustomers = async (searchQuery = "", status = "all") => {
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
  };

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
      filtered = filtered.filter(
        (customer) => customer.status === statusFilter
      );
    }

    setFilteredCustomers(filtered);
    setDisplayCount(20);
  }, [customers, searchTerm, statusFilter]);

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

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleViewLogs = (customer: CustomerWithStatus) => {
    setSelectedCustomer(customer);
    setIsLogModalOpen(true);
  };

  const handleExportCustomers = async () => {
    if (!campaign) return;

    try {
      toast.info("Đang xuất dữ liệu...");

      await campaignAPI.exportCampaignCustomers(campaign.id, {
        search: searchTerm,
        status: statusFilter === "all" ? undefined : statusFilter,
      });

      toast.success("Đã xuất danh sách khách hàng thành công");
    } catch (error) {
      console.error("Error exporting customers:", error);
      toast.error("Không thể xuất danh sách khách hàng");
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

  return (
    <>
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
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
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
                          <SelectTrigger className="w-40">
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
                            <SelectItem value="pending">Chờ gửi</SelectItem>
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
                          onClick={handleExportCustomers}
                          disabled={loading || customers.length === 0}
                          className="hover:bg-green-50 hover:border-green-200 transition-all duration-200"
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
                          {[
                            "#",
                            "Khách hàng",
                            "Số điện thoại",
                            "Ngày thêm",
                            "Trạng thái gửi",
                            "Tương tác",
                            "Lần cuối",
                            "Thao tác",
                          ].map((header, index) => (
                            <motion.th
                              key={header}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + index * 0.05 }}
                              className={cn(
                                "h-12 px-4 text-left align-middle font-medium text-muted-foreground border-b",
                                header === "#" && "w-12",
                                header === "Thao tác" && "w-20"
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
                                  key={customer.id}
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
                                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
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
                                  <TableCell>
                                    <motion.div
                                      className="flex items-center gap-1 text-sm"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.15 }}
                                    >
                                      <Phone className="h-3 w-3 text-gray-400" />
                                      {customer.phone_number}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      className="flex items-center gap-1 text-sm text-gray-600"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      {formatDateShort(customer.added_at)}
                                    </motion.div>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.25 }}
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
                                  <TableCell>
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
                                  <TableCell>
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
                                  <TableCell>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewLogs(customer)}
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
                                  </TableCell>
                                </motion.tr>
                              ))}

                              {isLoadingMore && (
                                <TableRow>
                                  <TableCell
                                    colSpan={8}
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
                                    colSpan={8}
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
                                colSpan={8}
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
        onClose={() => setIsLogModalOpen(false)}
        customer={selectedCustomer}
        campaignId={campaign?.id || ""}
      />
    </>
  );
}
