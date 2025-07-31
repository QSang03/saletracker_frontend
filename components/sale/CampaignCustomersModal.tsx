import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  TableHead,
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

// Enums matching backend
export enum LogStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  CUSTOMER_REPLIED = "customer_replied",
  STAFF_HANDLED = "staff_handled",
  REMINDER_SENT = "reminder_sent",
}

// Type definitions matching backend entities
interface CampaignCustomer {
  id: string;
  phone_number: string;
  full_name: string;
  salutation?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CampaignCustomerMap {
  campaign_id: number;
  customer_id: number;
  added_at: string;
  campaign_customer: CampaignCustomer;
}

interface CampaignInteractionLog {
  id: string;
  message_content_sent: string;
  attachment_sent?: Record<string, any>;
  status: LogStatus;
  sent_at?: string;
  customer_replied_at?: string;
  customer_reply_content?: string;
  staff_handled_at?: string;
  staff_reply_content?: string;
  staff_handler?: {
    id: string;
    name: string;
  };
  error_details?: Record<string, any>;
  conversation_metadata?: Record<string, any>;
  reminder_metadata?: Array<{
    message: string;
    remindAt: string;
    attachment_sent?: Record<string, any>;
    error?: string;
  }>;
}
interface CustomerWithStatus extends CampaignCustomer {
  full_name: string;
  salutation?: string;
  added_at: string;
  latest_log?: CampaignInteractionLog;
  total_interactions: number;
  last_interaction_at?: string;
}

interface CampaignCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}

interface CustomerLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWithStatus | null;
  campaignId: string;
}

// Status configuration
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

// Format date
const formatDate = (date: string | Date): string => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "N/A";
  }
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

// Alternative approach - Direct DOM manipulation
// Pure React Image Modal - No DOM manipulation
const ImageModal = ({
  isOpen,
  imageSrc,
  onClose,
}: {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
}) => {
  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999999]"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={(e) => {
        // Close when clicking the backdrop directly
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close button */}
      <button
        className="fixed top-4 right-4 w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer border-2 border-gray-300 z-[10000000]"
        style={{
          position: "fixed",
        }}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <span className="text-2xl font-bold text-gray-700 select-none">
          ✕
        </span>
      </button>

      {/* Image container */}
      <div
        className="relative max-w-[80vw] max-h-[80vh]"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <img
          src={imageSrc}
          alt="Ảnh phóng to"
          className="w-full h-full object-contain rounded-lg shadow-2xl"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />

        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full pointer-events-none select-none">
          Click vào nút X hoặc nhấn Esc để đóng
        </div>
      </div>
    </div>,
    document.body
  );
};

// Enhanced Customer Log Detail Modal - FINAL FIXED VERSION
const CustomerLogModal = ({
  isOpen,
  onClose,
  customer,
  campaignId,
}: CustomerLogModalProps) => {
  const [logs, setLogs] = useState<CampaignInteractionLog[]>([]);
  const [loading, setLoading] = useState(false);
  // State cho modal ảnh - tách biệt hoàn toàn
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Flag để ngăn việc đóng modal chính
  const [preventMainModalClose, setPreventMainModalClose] = useState(false);

  const renderAttachment = (attachment: any) => {
    if (!attachment) return null;

    // Hàm xử lý click ảnh để mở modal
    const handleImageClick = (imageSrc: string) => {
      setSelectedImage(imageSrc);
      setShowImageModal(true);
      setPreventMainModalClose(true); // Set flag khi mở image modal
    };

    // 1. Object có type là "image" và base64 - hiển thị ảnh
    if (
      typeof attachment === "object" &&
      attachment.type === "image" &&
      attachment.base64
    ) {
      return (
        <div className="my-3">
          <span className="font-semibold mr-2 text-gray-700">Đính kèm:</span>
          <div className="mt-2">
            <img
              src={attachment.base64}
              alt="Ảnh đính kèm"
              className="rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] max-w-full h-auto object-contain"
              style={{ maxWidth: 400, maxHeight: 300 }}
              onClick={() => handleImageClick(attachment.base64)}
            />
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              🔍 <span>Click để phóng to</span>
            </div>
          </div>
        </div>
      );
    }

    // 2. Object có type là "link" và url - hiển thị URL đầy đủ
    if (
      typeof attachment === "object" &&
      attachment.type === "link" &&
      attachment.url
    ) {
      return (
        <div className="my-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="font-semibold mr-2 text-gray-700">Đính kèm:</span>
          <div className="mt-2">
            <span className="text-blue-700 text-sm break-all font-mono bg-white px-2 py-1 rounded border">
              {attachment.url}
            </span>
          </div>
        </div>
      );
    }

    // 3. Object có type là "file" - chỉ hiển thị text "file"
    if (typeof attachment === "object" && attachment.type === "file") {
      return (
        <div className="my-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="font-semibold mr-2 text-gray-700">Đính kèm:</span>
          <span className="opacity-80 bg-white px-2 py-1 rounded text-sm">
            📄 file
          </span>
        </div>
      );
    }

    // 4. Xử lý các trường hợp khác (giữ nguyên logic cũ cho tương thích)
    if (
      typeof attachment === "string" &&
      attachment.startsWith("data:image/")
    ) {
      return (
        <div className="my-3">
          <span className="font-semibold mr-2 text-gray-700">Đính kèm:</span>
          <div className="mt-2">
            <img
              src={attachment}
              alt="Ảnh đính kèm"
              className="rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] max-w-full h-auto object-contain"
              style={{ maxWidth: 400, maxHeight: 300 }}
              onClick={() => handleImageClick(attachment)}
            />
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              🔍 <span>Click để phóng to</span>
            </div>
          </div>
        </div>
      );
    }

    // 5. String URL trực tiếp - hiển thị URL đầy đủ
    if (
      typeof attachment === "string" &&
      (attachment.startsWith("http://") || attachment.startsWith("https://"))
    ) {
      return (
        <div className="my-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="font-semibold mr-2 text-gray-700">Đính kèm:</span>
          <div className="mt-2">
            <span className="text-blue-700 text-sm break-all font-mono bg-white px-2 py-1 rounded border">
              {attachment}
            </span>
          </div>
        </div>
      );
    }

    // 6. Object có fileName
    if (typeof attachment === "object" && attachment?.fileName) {
      return (
        <div className="my-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="font-semibold mr-2 text-gray-700">Đính kèm:</span>
          <span className="opacity-80 bg-white px-2 py-1 rounded text-sm">
            📄 Tệp: {attachment.fileName}
          </span>
        </div>
      );
    }

    return (
      <div className="my-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="font-semibold mr-2 text-gray-700">Đính kèm:</span>
        <span className="opacity-60 bg-white px-2 py-1 rounded text-sm">
          ❓ [Không xác định]
        </span>
      </div>
    );
  };

  // Hàm parse JSON content
  const parseMessageContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return parsed.text || content;
    } catch {
      return content;
    }
  };

  const fetchCustomerLogs = async () => {
    if (!customer || !campaignId) return;
    try {
      setLoading(true);
      const response = await campaignAPI.getCustomerLogs(
        campaignId,
        customer.id
      );
      setLogs(response || []);
    } catch (error) {
      console.error("Error fetching customer logs:", error);
      toast.error("Không thể tải lịch sử tương tác");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      fetchCustomerLogs();
    }
  }, [isOpen, customer, campaignId]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowImageModal(false);
      setSelectedImage(null);
      setPreventMainModalClose(false);
    }
  }, [isOpen]);

  // Handle close image modal
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    // Delay để tránh xung đột với event của main modal
    setTimeout(() => {
      setPreventMainModalClose(false);
    }, 100);
  };

  // Handle main modal close - FIXED: Sử dụng flag để kiểm soát
  const handleMainModalClose = (open: boolean) => {
    if (!open && preventMainModalClose) {
      return; // Ignore close request khi flag được set
    }

    if (!open) {
      onClose();
    }
  };

  if (!customer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          open={isOpen}
          onOpenChange={handleMainModalClose} // Sử dụng handler đã sửa
        >
          <DialogContent
            style={{
              maxWidth: "80vw",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, #eff6ff 100%)",
              borderRadius: "1rem",
              boxShadow: "0 8px 32px 0 rgba(59,130,246,0.15)",
              border: "1px solid #bfdbfe",
              paddingLeft: 0,
              paddingRight: 0,
            }}
            className="
              bg-gradient-to-br from-white/90 to-blue-50 backdrop-blur-sm
              scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100
              "
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col h-full"
            >
              <DialogHeader className="pb-4 border-b border-blue-200 px-8 pt-6">
                <DialogTitle
                  className="
                      flex items-center gap-3 text-2xl font-extrabold 
                      bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                      bg-clip-text text-transparent
                      select-none
                    "
                >
                  <motion.div
                    animate={{
                      rotate: [0, 6, -6, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex items-center"
                  >
                    <MessageCircle className="h-7 w-7" />
                  </motion.div>
                  Lịch sử tương tác
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-700 mt-1 select-text">
                  Khách hàng:{" "}
                  <span className="font-semibold text-gray-900">
                    {customer.full_name}
                  </span>
                  <span className="ml-3">
                    • SĐT:{" "}
                    <span className="font-medium">{customer.phone_number}</span>
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-auto mt-4 px-8 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 max-w-full">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center h-32 space-x-3"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="p-2 rounded-full bg-blue-100"
                      >
                        <RefreshCw className="h-6 w-6 text-blue-500" />
                      </motion.div>
                      <span className="text-blue-600 font-semibold text-lg animate-pulse">
                        Đang tải...
                      </span>
                    </motion.div>
                  ) : logs.length > 0 ? (
                    <motion.div
                      key="logs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6 max-w-full"
                    >
                      <AnimatePresence>
                        {logs.map((log, idx) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 25, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -25, scale: 0.95 }}
                            transition={{ delay: idx * 0.1, duration: 0.35 }}
                            whileHover={{
                              scale: 1.01,
                              boxShadow: "0 10px 20px rgba(59, 130, 246, 0.3)",
                            }}
                            className="bg-white rounded-xl border border-blue-100 shadow-md p-6 max-w-full break-words"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <LogStatusBadge status={log.status} />
                              <motion.span
                                className="text-xs text-gray-400"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.25 }}
                              >
                                ID: {log.id}
                              </motion.span>
                            </div>

                            <div className="space-y-5 max-w-full break-words">
                              {/* Tin nhắn đã gửi */}
                              <motion.div
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="text-sm font-semibold text-blue-700 mb-2">
                                  Tin nhắn đã gửi:
                                </div>
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg select-text break-words whitespace-pre-wrap max-w-full">
                                  <p className="text-gray-800 leading-relaxed">
                                    {log.message_content_sent}
                                  </p>
                                  {log.attachment_sent &&
                                    renderAttachment(log.attachment_sent)}
                                </div>
                                {log.sent_at &&
                                  typeof log.sent_at === "string" && (
                                    <div className="text-xs text-gray-500 mt-2">
                                      Gửi lúc: {formatDate(log.sent_at)}
                                    </div>
                                  )}
                              </motion.div>

                              {/* Phản hồi của khách */}
                              {log.customer_reply_content && (
                                <motion.div
                                  initial={{ opacity: 0, x: 15 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="text-sm font-semibold text-green-700 mb-2">
                                    Phản hồi của khách hàng:
                                  </div>
                                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg select-text break-words whitespace-pre-wrap max-w-full">
                                    <p className="text-gray-900 leading-relaxed">
                                      {parseMessageContent(
                                        log.customer_reply_content
                                      )}
                                    </p>
                                  </div>
                                  {log.customer_replied_at &&
                                    typeof log.customer_replied_at ===
                                      "string" && (
                                      <div className="text-xs text-gray-500 mt-2">
                                        Phản hồi lúc:{" "}
                                        {formatDate(log.customer_replied_at)}
                                      </div>
                                    )}
                                </motion.div>
                              )}

                              {/* Phản hồi của nhân viên */}
                              {log.staff_reply_content && (
                                <motion.div
                                  initial={{ opacity: 0, x: -15 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="text-sm font-semibold text-purple-700 mb-2">
                                    Phản hồi của nhân viên:
                                  </div>
                                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-lg select-text break-words whitespace-pre-wrap max-w-full">
                                    <p className="text-gray-800 leading-relaxed">
                                      {parseMessageContent(
                                        log.staff_reply_content
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    {log.staff_handler && (
                                      <span>
                                        Xử lý bởi: {log.staff_handler.name} •{" "}
                                      </span>
                                    )}
                                    {log.staff_handled_at &&
                                      typeof log.staff_handled_at ===
                                        "string" && (
                                        <span>
                                          Xử lý lúc:{" "}
                                          {formatDate(log.staff_handled_at)}
                                        </span>
                                      )}
                                  </div>
                                </motion.div>
                              )}

                              {/* Chi tiết lỗi */}
                              {log.error_details && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="text-sm font-semibold text-red-700 mb-2">
                                    Chi tiết lỗi:
                                  </div>
                                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg select-text break-words whitespace-pre-wrap max-w-full">
                                    <pre className="text-xs text-red-800 whitespace-pre-wrap break-words font-mono">
                                      {JSON.stringify(
                                        log.error_details,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center h-40 text-gray-400 select-none"
                    >
                      <motion.div
                        animate={{
                          y: [0, -6, 0],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <MessageCircle className="h-14 w-14 text-gray-300 mb-3" />
                      </motion.div>
                      <p className="font-semibold text-lg">
                        Chưa có lịch sử tương tác
                      </p>
                      <p className="text-sm max-w-xs text-center">
                        Khách hàng này chưa có tin nhắn nào được gửi
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            {/* Separate Image Modal - Completely isolated */}
            <ImageModal
              isOpen={showImageModal}
              imageSrc={selectedImage}
              onClose={handleCloseImageModal}
            />
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

// Enhanced Loading skeleton
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

// Main component
export default function CampaignCustomersModal({
  isOpen,
  onClose,
  campaign,
}: CampaignCustomersModalProps) {
  const [customers, setCustomers] = useState<CustomerWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStatus | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const pageSize = 10;

  const fetchCustomers = async (
    searchQuery = "",
    status = "all",
    currentPage = 1
  ) => {
    if (!campaign) return;

    try {
      setLoading(true);

      const response = await campaignAPI.getCampaignCustomers(campaign.id, {
        search: searchQuery,
        status: status === "all" ? undefined : status,
        page: currentPage,
        limit: pageSize,
      });

      setCustomers(response.data || []);
      setTotalPages(response.total_pages || 1);
      setTotalCustomers(response.total || 0);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Không thể tải danh sách khách hàng");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load customers when modal opens or filters change
  useEffect(() => {
    if (isOpen && campaign) {
      fetchCustomers(searchTerm, statusFilter, page);
    }
  }, [isOpen, campaign, searchTerm, statusFilter, page]);

  // Reset filters when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setStatusFilter("all");
      setPage(1);
      setCustomers([]);
    }
  }, [isOpen]);

  // Handle search with debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setPage(1);
      fetchCustomers(searchTerm, statusFilter, 1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Handle view customer logs
  const handleViewLogs = (customer: CustomerWithStatus) => {
    setSelectedCustomer(customer);
    setIsLogModalOpen(true);
  };

  // Handle export customers
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

  // Pagination controls
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  if (!campaign) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-[85vw] !max-h-[90vh] !min-h-[90vh] overflow-hidden flex flex-col">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                <DialogHeader className="pb-4">
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
                      {totalCustomers > 0 && (
                        <motion.span
                          className="ml-2"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                        >
                          • Tổng số:
                          <motion.span
                            className="font-medium"
                            key={totalCustomers}
                            initial={{ scale: 1.2, color: "#2563eb" }}
                            animate={{ scale: 1, color: "inherit" }}
                            transition={{ duration: 0.3 }}
                          >
                            {totalCustomers.toLocaleString()}
                          </motion.span>{" "}
                          khách hàng
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </DialogDescription>
                </DialogHeader>

                {/* Filters and Actions */}
                <motion.div
                  className="flex flex-col sm:flex-row gap-4 pb-4 border-b"
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
                      placeholder="Tìm kiếm theo tên, số điện thoại..."
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
                          fetchCustomers(searchTerm, statusFilter, page)
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

                {/* Customer Table */}
                <motion.div
                  className="flex-1 overflow-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
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
                        ) : customers.length > 0 ? (
                          customers.map((customer, index) => (
                            <motion.tr
                              key={customer.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{
                                delay: index * 0.05,
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
                                  {(page - 1) * pageSize + index + 1}
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
                                  {customer.latest_log ? (
                                    <LogStatusBadge
                                      status={customer.latest_log.status}
                                    />
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
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
                                  key={customer.total_interactions}
                                >
                                  {customer.total_interactions} lần
                                </motion.span>
                              </TableCell>
                              <TableCell>
                                <motion.div
                                  className="text-sm text-gray-600"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.35 }}
                                >
                                  {customer.last_interaction_at
                                    ? formatDateShort(
                                        customer.last_interaction_at
                                      )
                                    : "Chưa có"}
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
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center">
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

                {/* Pagination */}
                <AnimatePresence>
                  {totalPages > 1 && (
                    <motion.div
                      className="flex items-center justify-between pt-4 border-t"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.div
                        className="text-sm text-gray-600"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        Trang {page} / {totalPages} • Hiển thị{" "}
                        {customers.length} / {totalCustomers} khách hàng
                      </motion.div>
                      <div className="flex gap-2">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={page <= 1 || loading}
                          >
                            Trước
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={page >= totalPages || loading}
                          >
                            Sau
                          </Button>
                        </motion.div>
                      </div>
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
