import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  AlertCircle,
  Send,
  Reply,
  UserCheck,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Check,
  CheckCheck,
  Download,
  ExternalLink,
} from "lucide-react";
import { campaignAPI } from "@/lib/campaign-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

// Types (giữ nguyên)
export enum LogStatus {
  PENDING = "pending",
  SENT = "sent", 
  FAILED = "failed",
  CUSTOMER_REPLIED = "customer_replied",
  STAFF_HANDLED = "staff_handled",
  REMINDER_SENT = "reminder_sent",
}

interface CampaignCustomer {
  id: string;
  phone_number: string;
  full_name: string;
  salutation?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ConversationMessage {
  sender: "staff" | "customer";
  content: string;
  timestamp: string;
  contentType: string;
  attachment?: any;
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
  conversation_metadata?: {
    conv_id: string;
    history: ConversationMessage[];
  };
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
  status?: LogStatus | null;
  conversation_metadata?: any;
}

interface CustomerLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWithStatus | null;
  campaignId: string;
}

// Constants
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

// ✨ ENHANCED: Full date/time formatting for debug
const formatFullDateTime = (date: string | Date): string => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(date));
  } catch {
    return "N/A";
  }
};

// Compact time for bubble display
const formatChatTime = (date: string | Date): string => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "N/A";
  }
};

const parseMessageContent = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    return parsed.text || content;
  } catch {
    return content;
  }
};

// ✨ NEW: File download utility
const downloadFile = (fileData: any, filename: string = "downloaded-file") => {
  try {
    let blob: Blob;
    let downloadFilename = filename;

    if (fileData.base64 || fileData.data) {
      // Handle base64 encoded files
      const base64Data = fileData.base64 || fileData.data;
      const byteCharacters = atob(base64Data.split(',')[1] || base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray]);
      
      if (fileData.fileName) {
        downloadFilename = fileData.fileName;
      } else if (fileData.type) {
        const ext = fileData.type.includes('image') ? '.jpg' : '.file';
        downloadFilename = `${filename}${ext}`;
      }
    } else {
      // Handle text or other data
      blob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
      downloadFilename = `${filename}.json`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Đã tải xuống: ${downloadFilename}`);
  } catch (error) {
    console.error('Error downloading file:', error);
    toast.error('Lỗi khi tải file');
  }
};

// ✨ NEW: Enhanced attachment renderer with download/link functionality
const ZaloAttachmentRenderer = ({ 
  attachment, 
  onImageClick,
  isStaff = false 
}: { 
  attachment: any; 
  onImageClick?: (src: string) => void;
  isStaff?: boolean;
}) => {
  if (!attachment) return null;

  // Image attachment
  if (attachment.type === "image" && (attachment.base64 || typeof attachment === "string")) {
    const imageSrc = attachment.base64 || attachment;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative group cursor-pointer mb-2"
        onClick={() => onImageClick?.(imageSrc)}
      >
        <img
          src={imageSrc}
          alt="Ảnh chat"
          className="w-full max-w-xs rounded-lg shadow-md object-cover group-hover:shadow-lg transition-all duration-300"
          style={{ maxHeight: 200 }}
          loading="lazy"
        />
        
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <motion.div
            initial={{ scale: 0 }}
            whileHover={{ scale: 1 }}
            className="bg-white/90 rounded-full p-2.5 shadow-xl backdrop-blur-sm"
          >
            <ImageIcon className="h-5 w-5 text-gray-700" />
          </motion.div>
        </div>
        
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Click để phóng to
        </div>
      </motion.div>
    );
  }

  // ✨ NEW: Link attachment - Click to open in new tab
  if ((attachment.type === "link" && attachment.url) || 
      (typeof attachment === "string" && (attachment.startsWith("http://") || attachment.startsWith("https://")))) {
    const linkUrl = attachment.url || attachment;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
          isStaff 
            ? "bg-white/20 border-white/30 hover:bg-white/30" 
            : "bg-blue-50 border-blue-200 hover:bg-blue-100"
        )}
        onClick={() => window.open(linkUrl, '_blank')}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            isStaff ? "bg-white/30" : "bg-blue-100"
          )}>
            <ExternalLink className={cn("h-5 w-5", isStaff ? "text-white" : "text-blue-600")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn(
              "font-semibold text-sm mb-1",
              isStaff ? "text-white" : "text-blue-700"
            )}>
              Liên kết đính kèm
            </div>
            <div className={cn(
              "text-xs break-all font-mono opacity-90",
              isStaff ? "text-blue-100" : "text-blue-600"
            )}>
              {linkUrl.length > 50 ? `${linkUrl.substring(0, 50)}...` : linkUrl}
            </div>
          </div>
          <div className={cn(
            "flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium",
            isStaff ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
          )}>
            Click để mở
          </div>
        </div>
      </motion.div>
    );
  }

  // ✨ NEW: File attachment - Click to download
  if (attachment.type === "file" || (typeof attachment === "object" && attachment.fileName)) {
    const fileName = attachment.fileName || attachment.name || "file-dinh-kem";
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
          isStaff 
            ? "bg-white/20 border-white/30 hover:bg-white/30" 
            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
        )}
        onClick={() => downloadFile(attachment, fileName)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            isStaff ? "bg-white/30" : "bg-gray-100"
          )}>
            <Download className={cn("h-5 w-5", isStaff ? "text-white" : "text-gray-600")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn(
              "font-semibold text-sm mb-1",
              isStaff ? "text-white" : "text-gray-700"
            )}>
              File đính kèm
            </div>
            <div className={cn(
              "text-xs font-mono opacity-90 truncate",
              isStaff ? "text-blue-100" : "text-gray-600"
            )}>
              📄 {fileName}
            </div>
          </div>
          <div className={cn(
            "flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium",
            isStaff ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
          )}>
            Tải xuống
          </div>
        </div>
      </motion.div>
    );
  }

  // Default/Unknown attachment type
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "p-3 rounded-lg border-2",
        isStaff ? "bg-white/20 border-white/30" : "bg-gray-50 border-gray-200"
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className={cn("h-4 w-4", isStaff ? "text-white" : "text-gray-500")} />
        <span className={cn("font-semibold text-sm", isStaff ? "text-white" : "text-gray-700")}>
          Đính kèm:
        </span>
        <span className={cn("text-sm", isStaff ? "text-blue-100" : "text-gray-500")}>
          [Loại không xác định]
        </span>
      </div>
    </motion.div>
  );
};

// ✨ ENHANCED: Zalo-style Chat Message Component with full datetime
const ZaloChatMessage = ({ 
  message, 
  index,
  onImageClick
}: { 
  message: ConversationMessage;
  index: number;
  onImageClick: (src: string) => void;
}) => {
  const isStaff = message.sender === "staff";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.4,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className={cn(
        "flex w-full mb-4",
        isStaff ? "justify-end" : "justify-start"
      )}
    >
      <div className="flex items-start gap-2 max-w-[80%]">
        {/* Avatar cho customer (bên trái) */}
        {!isStaff && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg"
          >
            <User className="h-5 w-5 text-white" />
          </motion.div>
        )}

        <div className="flex flex-col">
          {/* Message bubble */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative px-4 py-3 shadow-lg max-w-full",
              isStaff 
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md" 
                : "bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md"
            )}
          >
            {/* ✨ Attachment nếu có */}
            {message.attachment && (
              <div className="mb-3">
                <ZaloAttachmentRenderer 
                  attachment={message.attachment}
                  onImageClick={onImageClick}
                  isStaff={isStaff}
                />
              </div>
            )}

            {/* Message content */}
            {message.content && (
              <div className="mb-3">
                <p className="text-sm leading-relaxed break-words select-text">
                  {message.content}
                </p>
              </div>
            )}

            {/* ✨ ENHANCED: Full timestamp always visible for debug */}
            <div className={cn(
              "flex items-center justify-between gap-2 text-xs border-t pt-2 mt-2",
              isStaff ? "text-blue-100 border-white/20" : "text-gray-500 border-gray-200"
            )}>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{formatFullDateTime(message.timestamp)}</span>
              </div>
              {isStaff && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3 text-blue-200" />
                  <span className="text-xs">Đã gửi</span>
                </motion.div>
              )}
            </div>

            {/* Zalo-style message tail */}
            <div
              className={cn(
                "absolute top-4 w-0 h-0",
                isStaff 
                  ? "-right-2 border-l-8 border-l-blue-500 border-t-8 border-t-transparent border-b-8 border-b-transparent"
                  : "-left-2 border-r-8 border-r-white border-t-8 border-t-transparent border-b-8 border-b-transparent"
              )}
            />
          </motion.div>
        </div>

        {/* Avatar cho staff (bên phải) */}
        {isStaff && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg"
          >
            <UserCheck className="h-5 w-5 text-white" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ✨ ENHANCED: Chat Conversation View with proper message parsing
const ZaloChatConversationView = ({ 
  log, 
  onImageClick 
}: { 
  log: CampaignInteractionLog; 
  onImageClick: (src: string) => void;
}) => {
  // Build conversation timeline
  const buildConversationTimeline = (): ConversationMessage[] => {
    const messages: ConversationMessage[] = [];

    // 1. Add initial staff message with attachment
    if (log.message_content_sent && log.sent_at) {
      messages.push({
        sender: "staff",
        content: log.message_content_sent,
        timestamp: log.sent_at,
        contentType: "TEXT",
        attachment: log.attachment_sent || undefined
      });
    }

    // 2. Add conversation history (avoid duplicates)
    if (log.conversation_metadata?.history) {
      log.conversation_metadata.history.forEach(historyMsg => {
        const isDuplicate = messages.some(existing => 
          existing.content === historyMsg.content && 
          Math.abs(new Date(existing.timestamp).getTime() - new Date(historyMsg.timestamp).getTime()) < 5000
        );
        
        if (!isDuplicate) {
          messages.push({
            sender: historyMsg.sender,
            content: historyMsg.content,
            timestamp: historyMsg.timestamp,
            contentType: historyMsg.contentType || "TEXT"
          });
        }
      });
    }

    // 3. Add customer reply if exists and not duplicate
    if (log.customer_reply_content && log.customer_replied_at) {
      const customerReplyExists = messages.some(msg => 
        msg.sender === "customer" && 
        msg.content === parseMessageContent(log.customer_reply_content!)
      );
      
      if (!customerReplyExists) {
        messages.push({
          sender: "customer",
          content: parseMessageContent(log.customer_reply_content),
          timestamp: log.customer_replied_at,
          contentType: "TEXT"
        });
      }
    }

    // 4. Add staff reply if exists
    if (log.staff_reply_content && log.staff_handled_at) {
      messages.push({
        sender: "staff",
        content: parseMessageContent(log.staff_reply_content),
        timestamp: log.staff_handled_at,
        contentType: "TEXT"
      });
    }

    // Sort by timestamp
    return messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const conversationMessages = buildConversationTimeline();

  return (
    <div className="space-y-1">
      {/* Chat header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 flex items-center justify-between mb-4 p-4 bg-white/80 rounded-xl backdrop-blur-lg border border-blue-100 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm">Cuộc hội thoại</span>
              {log.conversation_metadata?.conv_id && (
                <div className="text-xs text-gray-500 font-mono">
                  ID: {log.conversation_metadata.conv_id.slice(-12)}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <LogStatusBadge status={log.status} />
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-mono">
            {conversationMessages.length} tin nhắn
          </span>
        </div>
      </motion.div>

      {/* Message list */}
      <div className="space-y-1 pb-4">
        <AnimatePresence>
          {conversationMessages.map((message, index) => (
            <ZaloChatMessage
              key={`${message.timestamp}-${index}-${message.sender}`}
              message={message}
              index={index}
              onImageClick={onImageClick}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Error details if any */}
      {log.error_details && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-red-700">
            <XCircle className="h-4 w-4" />
            Chi tiết lỗi:
          </div>
          <pre className="text-xs text-red-800 whitespace-pre-wrap break-words font-mono leading-relaxed select-text">
            {JSON.stringify(log.error_details, null, 2)}
          </pre>
        </motion.div>
      )}
    </div>
  );
};

// Enhanced LogStatusBadge (giữ nguyên)
const LogStatusBadge = ({ status }: { status: LogStatus }) => {
  const config = LOG_STATUS_CONFIG[status] || LOG_STATUS_CONFIG[LogStatus.PENDING];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        duration: 0.3, 
        type: "spring", 
        stiffness: 300,
        damping: 20 
      }}
    >
      <Badge
        variant={config.variant}
        className={cn(
          "relative overflow-hidden font-semibold text-xs flex items-center gap-2 px-3 py-1.5 shadow-lg border-2",
          config.color,
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full before:transition-transform before:duration-700 hover:before:translate-x-full"
        )}
      >
        <motion.div
          animate={{ 
            rotate: status === LogStatus.PENDING ? [0, 360] : 0,
            scale: status === LogStatus.SENT ? [1, 1.2, 1] : 1 
          }}
          transition={{
            duration: status === LogStatus.PENDING ? 2 : 0.5,
            repeat: status === LogStatus.PENDING ? Infinity : 0,
            ease: "linear",
          }}
        >
          <IconComponent className="h-3.5 w-3.5" />
        </motion.div>
        {config.label}
        
        {status === LogStatus.SENT && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="h-2.5 w-2.5 text-blue-400" />
          </motion.div>
        )}
      </Badge>
    </motion.div>
  );
};

// Enhanced ImageModal (giữ nguyên)
const ImageModal = ({
  isOpen,
  imageSrc,
  onClose,
}: {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow || "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) {
    return null;
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 z-[9999999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.button
        initial={{ opacity: 0, scale: 0.8, rotate: 180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="fixed top-6 right-6 w-14 h-14 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer border-2 border-white/20 z-[10000000] backdrop-blur-sm"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <span className="text-2xl font-bold text-gray-700 select-none">✕</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ 
          duration: 0.4, 
          type: "spring", 
          stiffness: 200,
          damping: 20 
        }}
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <img
          src={imageSrc}
          alt="Ảnh phóng to"
          className="w-full h-full object-contain rounded-2xl shadow-2xl border-4 border-white/20"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
          draggable={false}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-white/90 text-sm bg-black/60 px-4 py-2 rounded-full pointer-events-none select-none backdrop-blur-sm border border-white/20"
        >
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Nhấn Esc hoặc click ngoài để đóng
          </span>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

// Main Component (giữ nguyên phần còn lại)
export const CustomerLogModal = ({
  isOpen,
  onClose,
  customer,
  campaignId,
}: CustomerLogModalProps) => {
  const [logs, setLogs] = useState<CampaignInteractionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    if (!isOpen) {
      setShowImageModal(false);
      setSelectedImage(null);
      document.body.style.overflow = "";
      document.body.style.overflowY = "";
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.body.style.overflowY = "";
    };
  }, []);

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setShowImageModal(true);
  };

  const fetchCustomerLogs = async () => {
    if (!customer || !campaignId) return;
    try {
      setLoading(true);
      const response = await campaignAPI.getCustomerLogs(campaignId, customer.id);
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

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    document.body.style.overflow = "";
  };

  const handleMainModalClose = (open: boolean) => {
    if (!open) {
      document.body.style.overflow = "";
      setShowImageModal(false);
      setSelectedImage(null);
      onClose();
    }
  };

  if (!customer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleMainModalClose}>
          <DialogContent
            className="p-0 gap-0 flex flex-col overflow-hidden"
            style={{
              maxWidth: "85vw",
              width: "85vw", 
              height: "92vh",
              maxHeight: "92vh",
              background: "transparent",
              border: "none",
              boxShadow: "none"
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                duration: 0.4, 
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className="flex flex-col h-full relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, #f8fafc 30%, #e2e8f0 100%)",
                borderRadius: "1.5rem",
                boxShadow: "0 32px 64px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(148,163,184,0.1)",
                border: "1px solid rgba(148,163,184,0.2)",
                backdropFilter: "blur(20px)"
              }}
            >
              {/* Decorative header bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
              
              {/* Floating decoration */}
              <div className="absolute top-4 right-4 opacity-5">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Sparkles className="h-12 w-12 text-blue-500" />
                </motion.div>
              </div>

              {/* Enhanced Header */}
              <div className="flex-shrink-0 pb-6 border-b border-gray-200/60 px-8 pt-8 relative">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-4 text-2xl font-black text-gray-800">
                      <motion.div
                        animate={{
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="relative"
                      >
                        <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 blur-lg"></div>
                        <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-3 shadow-lg">
                          <MessageCircle className="h-6 w-6 text-white" />
                        </div>
                      </motion.div>
                      
                      <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent">
                        Lịch sử tương tác
                      </span>
                      
                      <motion.div
                        animate={{ 
                          opacity: [0.5, 1, 0.5],
                          scale: [0.8, 1, 0.8]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-full p-2 shadow-lg">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                      </motion.div>
                    </DialogTitle>
                  </DialogHeader>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-base text-gray-600 mt-4 select-text"
                  >
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-3 bg-white/60 px-4 py-2 rounded-full shadow-sm border border-gray-200">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {customer.full_name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            📞 {customer.phone_number}
                          </div>
                        </div>
                      </div>
                      
                      {logs.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 }}
                          className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full shadow-sm border border-blue-200"
                        >
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-700">
                            {logs.length} cuộc hội thoại
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Chat Content */}
              <div 
                className="flex-1 px-6 py-4 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white/50"
                style={{
                  minHeight: 0,
                  scrollbarWidth: "thin",
                  scrollbarColor: "#cbd5e1 #f8fafc"
                }}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center h-60 space-y-6"
                    >
                      <motion.div className="relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="p-6 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 shadow-xl"
                        >
                          <RefreshCw className="h-10 w-10 text-blue-600" />
                        </motion.div>
                        <motion.div
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.6, 0.3]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute -inset-4 bg-blue-400 rounded-full opacity-20 blur-xl"
                        ></motion.div>
                      </motion.div>
                      
                      <motion.div
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="text-center"
                      >
                        <h3 className="text-blue-600 font-bold text-xl mb-2">
                          Đang tải cuộc hội thoại...
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Vui lòng chờ trong giây lát
                        </p>
                      </motion.div>
                    </motion.div>
                  ) : logs.length > 0 ? (
                    <motion.div
                      key="chats"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pb-6"
                    >
                      {/* Conversation container */}
                      <div className="max-w-5xl mx-auto space-y-6">
                        <AnimatePresence>
                          {logs.map((log, idx) => (
                            <motion.div
                              key={log.id}
                              initial={{ 
                                opacity: 0, 
                                y: 40, 
                                scale: 0.95
                              }}
                              animate={{ 
                                opacity: 1, 
                                y: 0, 
                                scale: 1
                              }}
                              exit={{ 
                                opacity: 0, 
                                y: -40, 
                                scale: 0.95
                              }}
                              transition={{ 
                                delay: idx * 0.15, 
                                duration: 0.6,
                                type: "spring",
                                stiffness: 200,
                                damping: 25
                              }}
                              className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-500 p-6"
                              style={{
                                background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.8) 100%)"
                              }}
                            >
                              <ZaloChatConversationView 
                                log={log} 
                                onImageClick={handleImageClick}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 30 }}
                      className="flex flex-col items-center justify-center h-60 text-gray-400 select-none"
                    >
                      <motion.div
                        animate={{
                          y: [0, -12, 0],
                          rotate: [0, 8, -8, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="relative mb-8"
                      >
                        <div className="absolute -inset-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full opacity-40 blur-2xl"></div>
                        <MessageCircle className="h-20 w-20 text-gray-300 relative z-10" />
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center"
                      >
                        <h3 className="font-bold text-2xl mb-3 text-gray-600">
                          Chưa có cuộc hội thoại
                        </h3>
                        <p className="text-gray-500 max-w-md text-center leading-relaxed">
                          Khách hàng này chưa có tin nhắn nào được gửi. <br />
                          Hãy bắt đầu cuộc hội thoại đầu tiên! 💬
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

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

export default CustomerLogModal;
