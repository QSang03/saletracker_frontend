"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as ExcelJS from "exceljs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  Upload,
  Image,
  Link,
  FileText,
  Sparkles,
  Calendar,
  Clock,
  Bell,
  Mail,
  Users,
  Check,
  ChevronRight,
  Target,
  Send,
  MessageSquare,
  Timer,
  CalendarCheck,
  Megaphone,
  Package,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  X,
  Hash,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CampaignType,
  CampaignFormData,
  Campaign,
  CampaignWithDetails,
} from "@/types";
import ModernTimePicker from "../common/ModernTimePicker";
import ModernAttachmentSelector from "../common/ModernAttachmentSelector";
import ModernDaySelector from "../common/ModernDaySelector"; // Import component mới
import { useDebounce, useDebouncedCallback } from "@/hooks/useDebounce";
import { campaignAPI } from "@/lib/campaign-api";

type SelectionMode = "single" | "adjacent" | "multiple";

interface CampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  availableUsers?: Array<{ id: string; fullName: string; email: string }>;
  mode: "create" | "edit"; // Thêm mode prop
  initialData?: CampaignWithDetails | null; // Thêm initial data cho edit mode
}

const campaignTypeOptions = [
  {
    value: CampaignType.HOURLY_KM,
    label: "Chương trình KM 1 giờ",
    icon: Timer,
    color: "from-blue-500 to-cyan-500",
    description: "Gửi tin nhắn theo giờ",
    emoji: "⏰",
  },
  {
    value: CampaignType.DAILY_KM,
    label: "Chương trình KM 1 ngày",
    icon: CalendarCheck,
    color: "from-purple-500 to-pink-500",
    description: "Chiến dịch hàng ngày",
    emoji: "📅",
  },
  {
    value: CampaignType.THREE_DAY_KM,
    label: "Chương trình KM trong 3 ngày",
    icon: Calendar,
    color: "from-orange-500 to-red-500",
    description: "Kéo dài 3 ngày liên tiếp",
    emoji: "🗓️",
  },
  {
    value: CampaignType.WEEKLY_SP,
    label: "Chương trình gửi SP 1 tuần / lần",
    icon: Package,
    color: "from-green-500 to-emerald-500",
    description: "Sản phẩm hàng tuần",
    emoji: "📦",
  },
  {
    value: CampaignType.WEEKLY_BBG,
    label: "Chương trình gửi BBG 1 tuần / lần",
    icon: Briefcase,
    color: "from-indigo-500 to-purple-500",
    description: "Báo giá hàng tuần",
    emoji: "💼",
  },
];

interface ReminderItem {
  content: string;
  minutes: number;
}

// Enhanced Step Indicator with framer-motion
const StepIndicator = ({
  currentStep,
  totalSteps,
  labels,
}: {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}) => {
  return (
    <motion.div
      className="relative mb-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-1 bg-gray-200 rounded-full">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      <div className="relative flex justify-between">
        {labels.map((label, index) => {
          const isActive = index < currentStep;
          const isCurrent = index === currentStep - 1;
          return (
            <motion.div
              key={index}
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                  isActive && !isCurrent && "bg-blue-500 text-white",
                  isCurrent && "bg-blue-600 text-white",
                  !isActive && "bg-gray-200 text-gray-500"
                )}
                whileHover={{ scale: 1.1 }}
                animate={
                  isCurrent
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(59, 130, 246, 0.7)",
                          "0 0 0 10px rgba(59, 130, 246, 0)",
                          "0 0 0 0 rgba(59, 130, 246, 0)",
                        ],
                      }
                    : {}
                }
                transition={
                  isCurrent
                    ? {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                    : {}
                }
              >
                <AnimatePresence mode="wait">
                  {isActive && !isCurrent ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.span
                      key="number"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              <motion.span
                className={cn(
                  "text-xs mt-1 text-center font-medium transition-colors duration-200",
                  isActive ? "text-gray-900" : "text-gray-500"
                )}
                animate={{
                  color: isActive ? "#111827" : "#6b7280",
                  fontWeight: isCurrent ? 600 : 500,
                }}
              >
                {label}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Enhanced Text Counter
const TextCounter = ({ current, max }: { current: number; max: number }) => {
  const percentage = (current / max) * 100;
  const isWarning = percentage > 70;
  const isDanger = percentage > 90;

  return (
    <motion.span
      className={cn(
        "text-xs transition-colors duration-200",
        isWarning && !isDanger && "text-amber-600",
        isDanger && "text-red-600",
        !isWarning && "text-gray-500"
      )}
      animate={{
        scale: isDanger ? [1, 1.05, 1] : 1,
        color: isDanger ? "#ef4444" : isWarning ? "#f59e0b" : "#6b7280",
      }}
      transition={isDanger ? { duration: 1, repeat: Infinity } : {}}
    >
      {current}/{max}
    </motion.span>
  );
};

export default function CampaignModal({
  open,
  onOpenChange,
  onSubmit,
  availableUsers = [],
  mode = "create",
  initialData = null,
}: CampaignModalProps) {
  // State management
  const [currentTab, setCurrentTab] = useState("basic");
  const [campaignName, setCampaignName] = useState("");
  const [selectedType, setSelectedType] = useState<CampaignType | "">("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [attachmentType, setAttachmentType] = useState<
    "image" | "link" | "file" | null
  >(null);
  const [attachmentData, setAttachmentData] = useState<string>("");

  // Enhanced day selection states
  const [selectedDays, setSelectedDays] = useState<number | number[]>([]);
  const [daySelectionMode, setDaySelectionMode] =
    useState<SelectionMode>("single");
  const [includeSaturday, setIncludeSaturday] = useState(true);

  const [timeOfDay, setTimeOfDay] = useState("");
  const [reminders, setReminders] = useState<ReminderItem[]>([
    { content: "", minutes: 30 },
  ]);
  const [recipientsTo, setRecipientsTo] = useState("");
  const [recipientsCc, setRecipientsCc] = useState<string[]>([]);
  const [reportInterval, setReportInterval] = useState("60");
  const [stopSendingTime, setStopSendingTime] = useState("");
  const [customEmails, setCustomEmails] = useState<string[]>([""]);
  const [customerFile, setCustomerFile] = useState<File | null>(null);
  const [uploadedCustomers, setUploadedCustomers] = useState<
    Array<{ phone_number: string; full_name: string; salutation?: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const debouncedCampaignName = useDebounce(campaignName, 300);
  const debouncedMessageContent = useDebounce(messageContent, 400);
  const [usersWithEmail, setUsersWithEmail] = useState<
    Array<{
      id: number;
      fullName: string;
      email: string;
      employeeCode?: string;
    }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  // ✅ SIMPLIFIED ALERT SYSTEM - Chỉ cần 2 states thay vì 3
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
    id: string;
  } | null>(null);

  const alertRef = useRef<{
    id: string;
    type: string;
    isPersistent: boolean;
    timestamp: number;
  } | null>(null);

  const setAlertSafe = useCallback(
    (
      alertData: {
        type: "success" | "error" | "warning" | "info";
        message: string;
      } | null
    ) => {
      const timestamp = Date.now();
      const alertId = `alert_${timestamp}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      if (alertData === null) {
        setAlert(null);
        alertRef.current = null;
        return;
      }

      const isPersistent =
        alertData.type === "error" || alertData.type === "warning";

      alertRef.current = {
        id: alertId,
        type: alertData.type,
        isPersistent,
        timestamp,
      };

      const alertWithId = {
        ...alertData,
        id: alertId,
      };

      setTimeout(() => {
        setAlert(alertWithId);

        if (!isPersistent) {
          setTimeout(() => {
            if (alertRef.current?.id === alertId) {
              setAlert(null);
              alertRef.current = null;
            }
          }, 5000);
        }
      }, 10); // 10ms delay để đảm bảo ref sync
    },
    []
  );

  useEffect(() => {
    if (open) {
      loadUsersWithEmail().then(() => {
        if (mode === "edit" && initialData) {
          loadCampaignData(initialData);
        } else if (mode === "create") {
        }
      });
    }
  }, [open, mode, initialData]);

  // Move resetForm definition above this useEffect
  const resetForm = useCallback(() => {
    if (
      alert &&
      (alert.type === "error" || alert.type === "warning") &&
      alertRef.current?.isPersistent
    ) {
      return; // Không reset để giữ alert hiện tại
    }

    // Reset theo thứ tự để tránh conflict
    setCurrentTab("basic");
    setCampaignName("");
    setSelectedType("");
    setStartTime("");
    setEndTime("");
    setSelectedDays([]);
    setDaySelectionMode("single");
    setIncludeSaturday(true);
    setTimeOfDay("");
    setMessageContent("");
    setAttachmentType(null);
    setAttachmentData("");
    setReminders([{ content: "", minutes: 30 }]);

    // ✅ Reset email states theo thứ tự đúng
    setRecipientsTo("");
    setRecipientsCc([]);
    setCustomEmails([""]);
    setReportInterval("60");
    setStopSendingTime("");

    // ✅ Reset customer states
    setCustomerFile(null);
    setUploadedCustomers([]);

    // Reset UI states
    setIsSubmitting(false);
    setShowSuccess(false);

    // ✅ CHỈ RESET ALERT KHI KHÔNG PHẢI ERROR/WARNING
    if (
      !alert ||
      (alert.type !== "error" && alert.type !== "warning") ||
      !alertRef.current?.isPersistent
    ) {
      setAlertSafe(null);
    } else {
    }
  }, [alert, setAlertSafe]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        // ✅ IMPROVED LOGIC: Chỉ reset khi không có persistent alert
        const shouldReset =
          mode === "create" && (!alert || !alertRef.current?.isPersistent);

        if (shouldReset) {
          resetForm();
        } else {
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [open, mode, alert, resetForm]);

  // ✅ SỬA LOGIC - TÁCH RIÊNG RECIPIENTS_TO RA KHỎI PHÂN LOẠI
  useEffect(() => {
    if (
      mode === "edit" &&
      initialData?.email_reports &&
      usersWithEmail.length > 0
    ) {
      const { recipients_to, recipients_cc } = initialData.email_reports;
      let primaryRecipient = "";

      if (typeof recipients_to === "string" && recipients_to.trim()) {
        const firstEmail = recipients_to.split(",")[0]?.trim();
        primaryRecipient = firstEmail || "";
      }

      setRecipientsTo(primaryRecipient);

      const remainingEmails: string[] = [];

      if (typeof recipients_to === "string" && recipients_to.trim()) {
        const allToEmails = recipients_to
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        if (allToEmails.length > 1) {
          remainingEmails.push(...allToEmails.slice(1));
        }
      }

      if (Array.isArray(recipients_cc)) {
        const ccEmails = recipients_cc.map((e) => e.trim()).filter(Boolean);
        remainingEmails.push(...ccEmails);
      }

      const normalizedSystem = usersWithEmail.map((u) =>
        u.email.trim().toLowerCase()
      );

      const systemEmails: string[] = [];
      const externalEmails: string[] = [];

      remainingEmails.forEach((email, index) => {
        const normalizedEmail = email.trim().toLowerCase();
        const isSystem = normalizedSystem.includes(normalizedEmail);

        if (isSystem) {
          systemEmails.push(email);
        } else {
          externalEmails.push(email);
        }
      });

      /*-----------------------------------------------------------
      4. SET VÀO UI
    -----------------------------------------------------------*/
      // System emails → MultiSelectCombobox
      setRecipientsCc(systemEmails);

      setCustomEmails(
        externalEmails.length > 0 ? [...externalEmails, ""] : [""]
      );
    }
  }, [usersWithEmail, mode, initialData]);

  useEffect(() => {
    if (open) {
      loadUsersWithEmail();
    }
  }, [open]);

  const loadUsersWithEmail = async () => {
    try {
      setLoadingUsers(true);
      const users = await campaignAPI.getUsersWithEmail();
      setUsersWithEmail(users);
    } catch (error) {
      console.error("Error loading users with email:", error);
      setUsersWithEmail([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadCampaignData = (campaign: CampaignWithDetails) => {
    setCampaignName(campaign.name);
    setSelectedType(campaign.campaign_type);

    // Load message content
    if (campaign.messages?.text) {
      setMessageContent(campaign.messages.text);
    }

    // Load attachment if exists
    if (campaign.messages?.attachment) {
      setAttachmentType(campaign.messages.attachment.type);
      if (campaign.messages.attachment.type === "link") {
        setAttachmentData(campaign.messages.attachment.url || "");
      } else if (
        campaign.messages.attachment.type === "image" ||
        campaign.messages.attachment.type === "file"
      ) {
        setAttachmentData(campaign.messages.attachment.base64 || "");
      }
    }

    // Load schedule config
    if (campaign.schedule_config) {
      const config = campaign.schedule_config;

      if (config.type === "hourly") {
        setStartTime(config.start_time || "");
        setEndTime(config.end_time || "");
      } else if (config.type === "3_day") {
        setSelectedDays(config.days_of_week || []);
        setTimeOfDay(config.time_of_day || "");
      } else if (config.type === "weekly") {
        setSelectedDays(config.day_of_week || 0);
        setTimeOfDay(config.time_of_day || "");
      }
    } else {
      console.warn("No schedule_config found"); // Debug log
      // Set default values based on campaign type
      if (
        campaign.campaign_type === CampaignType.HOURLY_KM ||
        campaign.campaign_type === CampaignType.DAILY_KM
      ) {
        setStartTime("");
        setEndTime("");
      } else {
        setSelectedDays([]);
        setTimeOfDay("");
      }
    }

    // Load reminders
    if (campaign.reminders && campaign.reminders.length > 0) {
      setReminders(campaign.reminders);
    } else {
      // Reset to default if no reminders
      setReminders([{ content: "", minutes: 30 }]);
    }

    // Load email reports
    if (campaign.email_reports) {
      const reports = campaign.email_reports;

      setReportInterval((reports.report_interval_minutes || 60).toString());
      setStopSendingTime(
        reports.stop_sending_at_time?.replace(":00", "") || ""
      );
    } else {
      console.warn("No email_reports found");
      setReportInterval("60");
      setStopSendingTime("");
    }

    // Load customers
    if (campaign.customers && campaign.customers.length > 0) {
      setUploadedCustomers(campaign.customers);
    } else {
      setUploadedCustomers([]);
    }
  };

  // Progress calculation
  const calculateProgress = () => {
    let progress = 0;
    const totalSteps = needsReminderTab ? 5 : 4;

    if (campaignName && selectedType) progress += 100 / totalSteps;
    if (canProceedFromTab2) progress += 100 / totalSteps;
    if (needsReminderTab && canProceedFromTab3) progress += 100 / totalSteps;
    if (recipientsTo || customEmails.some((e) => e))
      progress += (100 / totalSteps) * 0.5;
    if (uploadedCustomers.length > 0) progress += (100 / totalSteps) * 0.5;

    return Math.min(progress, 100);
  };

  // Tab navigation logic
  const canProceedFromTab1 = Boolean(campaignName?.trim() && selectedType);

  // For edit mode, allow proceeding to tab 2 even if some data is missing
  const canProceedFromTab2 = Boolean(
    mode === "edit" || // Allow proceeding in edit mode
      (messageContent?.trim() &&
        (selectedType === CampaignType.HOURLY_KM ||
        selectedType === CampaignType.DAILY_KM
          ? startTime && endTime
          : selectedType === CampaignType.THREE_DAY_KM
          ? Array.isArray(selectedDays)
            ? selectedDays.length > 0 && timeOfDay
            : selectedDays && timeOfDay
          : selectedType === CampaignType.WEEKLY_SP ||
            selectedType === CampaignType.WEEKLY_BBG
          ? selectedDays && timeOfDay
          : false))
  );

  const needsReminderTab =
    selectedType === CampaignType.HOURLY_KM ||
    selectedType === CampaignType.DAILY_KM;

  // For edit mode, allow proceeding to tab 3 even if some data is missing
  const canProceedFromTab3 =
    mode === "edit" || // Allow proceeding in edit mode
    !needsReminderTab ||
    reminders.every((r) => r.content?.trim() && r.minutes > 0);

  const getTabLabels = () => {
    const labels = ["Thông tin", "Lịch trình"];
    if (needsReminderTab) labels.push("Nhắc lại");
    labels.push("Email", "Khách hàng");
    return labels;
  };

  const getCurrentStepNumber = () => {
    const steps = ["basic", "schedule", "reminders", "email", "customers"];
    if (!needsReminderTab) steps.splice(2, 1);
    return steps.indexOf(currentTab) + 1;
  };

  // Handle tab change with animation
  const handleTabChange = (tab: string) => {
    // In edit mode, allow navigation to any tab
    if (mode === "edit") {
      setCurrentTab(tab);
      return;
    }

    // Create mode validation
    if (tab === "schedule" && !canProceedFromTab1) return;
    if (tab === "reminders" && !canProceedFromTab2) return;
    if (
      tab === "email" &&
      (!canProceedFromTab2 || (needsReminderTab && !canProceedFromTab3))
    )
      return;
    if (
      tab === "customers" &&
      (!canProceedFromTab2 || (needsReminderTab && !canProceedFromTab3))
    )
      return;

    setCurrentTab(tab);
  };

  // Enhanced day selection logic
  const handleDaySelectionChange = (days: number | number[]) => {
    if (selectedType === CampaignType.THREE_DAY_KM) {
      // For 3-day campaigns, use adjacent mode
      setDaySelectionMode("adjacent");
      setSelectedDays(days);
    } else if (
      selectedType === CampaignType.WEEKLY_SP ||
      selectedType === CampaignType.WEEKLY_BBG
    ) {
      // For weekly campaigns, use single mode
      setDaySelectionMode("single");
      setSelectedDays(days);
    }
  };

  const handleDaySelectionModeChange = (mode: SelectionMode) => {
    setDaySelectionMode(mode);
    // Reset selection when changing mode
    setSelectedDays(mode === "single" ? 0 : []);
  };

  // Helper functions (same as before)
  const addReminder = () =>
    setReminders((prev) => [...prev, { content: "", minutes: 30 }]);

  const removeReminder = (index: number) => {
    if (reminders.length > 1)
      setReminders(reminders.filter((_, i) => i !== index));
  };

  const updateReminder = (
    index: number,
    field: keyof ReminderItem,
    value: string | number
  ) => {
    setReminders(
      reminders.map((reminder, i) =>
        i === index ? { ...reminder, [field]: value } : reminder
      )
    );
  };

  const addCustomEmail = () => setCustomEmails((prev) => [...prev, ""]);

  const removeCustomEmail = (index: number) => {
    if (customEmails.length > 1)
      setCustomEmails(customEmails.filter((_, i) => i !== index));
  };

  const updateCustomEmail = (index: number, value: string) => {
    setCustomEmails(
      customEmails.map((email, i) => (i === index ? value : email))
    );
  };

  // ✅ SIMPLIFIED ALERT HANDLERS WITH ENHANCED PROTECTION
  const handleCloseAlert = useCallback(() => {
    if (!alert || !alertRef.current?.isPersistent) {
      setAlertSafe(null);
    } else {
      console.warn("⚠️ [ALERT] Persistent alert close attempted but blocked!");
    }
  }, [alert, setAlertSafe]);

  const handleManualCloseAlert = useCallback(() => {
    setAlertSafe(null);
  }, [setAlertSafe]);

  const handleCSVFallback = useCallback(
    async (file: File, originalExcelError: any): Promise<boolean> => {
      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || "");
          reader.onerror = () => reject(new Error("FileReader failed"));
          reader.readAsText(file);
        });

        // Check empty file
        if (!text || text.trim() === "") {
          setAlertSafe({
            type: "error",
            message: `❌ Lỗi đọc file!

📋 Excel: ${
              originalExcelError instanceof Error
                ? originalExcelError.message
                : "Không đọc được"
            }
📋 CSV: File trống hoặc không hợp lệ

💡 Vui lòng:
• Kiểm tra file có đúng định dạng không
• Thử tải file mẫu và làm lại
• Đảm bảo file không bị hỏng`,
          });
          return false;
        }

        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length === 0) {
          setAlertSafe({
            type: "error",
            message: `❌ File không có dữ liệu!

📋 Excel: ${
              originalExcelError instanceof Error
                ? originalExcelError.message
                : "Không đọc được"
            }
📋 CSV: Không có dòng dữ liệu hợp lệ

💡 Vui lòng kiểm tra lại file và thử lại!`,
          });
          return false;
        }

        // Parse CSV headers
        const header = lines[0].split(",").map((h) => h.trim().toUpperCase());
        const csvFoundHeaders = header.map((h, idx) => h || `CỘT ${idx + 1}`);

        let fullNameIdx = -1,
          phoneNumberIdx = -1,
          salutationIdx = -1;
        header.forEach((h, idx) => {
          if (h === "TÊN KHÁCH HÀNG") fullNameIdx = idx;
          if (h === "SỐ ĐIỆN THOẠI") phoneNumberIdx = idx;
          if (h === "NGƯỜI LIÊN HỆ") salutationIdx = idx;
        });

        // Check required headers
        const csvMissingHeaders: string[] = [];
        if (fullNameIdx === -1) csvMissingHeaders.push("TÊN KHÁCH HÀNG");
        if (phoneNumberIdx === -1) csvMissingHeaders.push("SỐ ĐIỆN THOẠI");

        if (csvMissingHeaders.length > 0) {
          setAlertSafe({
            type: "error",
            message: `❌ Cả Excel và CSV đều sai định dạng header!

📋 Excel: ${
              originalExcelError instanceof Error
                ? originalExcelError.message
                : "Không đọc được"
            }
📋 CSV thiếu cột: ${csvMissingHeaders.join(", ")}

🔍 Header CSV hiện tại: ${csvFoundHeaders.join(", ")}

✅ Header cần có:
• TÊN KHÁCH HÀNG (bắt buộc)
• SỐ ĐIỆN THOẠI (bắt buộc)
• NGƯỜI LIÊN HỆ (tùy chọn)

💡 Vui lòng tải file mẫu và làm theo đúng định dạng!`,
          });
          return false;
        }

        // Parse customer data
        const csvCustomers = lines
          .slice(1)
          .map((line) => {
            const columns = line.split(",");
            const fullName =
              fullNameIdx >= 0 ? columns[fullNameIdx]?.trim() || "" : "";
            const phoneNumber =
              phoneNumberIdx >= 0 ? columns[phoneNumberIdx]?.trim() || "" : "";
            const salutation =
              salutationIdx >= 0 ? columns[salutationIdx]?.trim() || "" : "";

            return {
              phone_number: phoneNumber,
              full_name: fullName,
              salutation,
            };
          })
          .filter((customer) => customer.phone_number && customer.full_name);

        if (csvCustomers.length === 0) {
          setAlertSafe({
            type: "error",
            message: `❌ Không có dữ liệu hợp lệ!

📋 Excel: ${
              originalExcelError instanceof Error
                ? originalExcelError.message
                : "Không đọc được"
            }
📋 CSV: Có dữ liệu nhưng không hợp lệ

💡 Vui lòng kiểm tra:
• Các dòng dữ liệu có đầy đủ thông tin không?
• Định dạng số điện thoại và tên có chính xác không?`,
          });
          return false;
        }

        setUploadedCustomers(csvCustomers);

        // ✅ DELAY QUAN TRỌNG ĐỂ ĐẢM BẢO CUSTOMERS ĐÃ ĐƯỢC SET XONG
        await new Promise((resolve) => setTimeout(resolve, 300));

        setAlertSafe({
          type: "warning",
          message: `⚠️ Excel lỗi nhưng đã import CSV thành công!

✅ Import thành công ${csvCustomers.length} khách hàng từ CSV

ℹ️ Lỗi Excel: ${
            originalExcelError instanceof Error
              ? originalExcelError.message
              : "Không đọc được"
          }

💡 Khuyến nghị: Sử dụng file Excel (.xlsx) để có hiệu suất tốt hơn!`,
        });
        return true;
      } catch (error) {
        console.error("💥 [CSV FALLBACK] Failed:", error);
        setAlertSafe({
          type: "error",
          message: `❌ Lỗi nghiêm trọng khi xử lý file!

📋 Excel: ${
            originalExcelError instanceof Error
              ? originalExcelError.message
              : "Không đọc được"
          }
📋 CSV: ${error instanceof Error ? error.message : "Không xử lý được"}

💡 Vui lòng:
• Kiểm tra file có bị hỏng không
• Thử tải file mẫu và làm lại
• Liên hệ hỗ trợ nếu vẫn lỗi`,
        });
        return false;
      }
    },
    [setAlertSafe]
  );

  const handleCustomerFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      // ✅ VALIDATION FILE TRƯỚC KHI XỬ LÝ
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "text/csv",
        "application/csv",
      ];

      if (file.size > maxSize) {
        setAlertSafe({
          type: "error",
          message: `❌ File quá lớn!

📊 Kích thước file: ${(file.size / 1024 / 1024).toFixed(2)}MB
📊 Giới hạn cho phép: 10MB

💡 Vui lòng:
• Giảm số lượng khách hàng trong file
• Nén file trước khi upload
• Chia nhỏ file thành nhiều phần`,
        });
        event.target.value = "";
        return;
      }

      if (
        !allowedTypes.includes(file.type) &&
        !file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)
      ) {
        setAlertSafe({
          type: "error",
          message: `❌ Định dạng file không được hỗ trợ!

📋 File hiện tại: ${file.type || "Không xác định"}
📋 Tên file: ${file.name}

✅ Định dạng được hỗ trợ:
• Excel (.xlsx, .xls)
• CSV (.csv)

💡 Vui lòng chọn file đúng định dạng!`,
        });
        event.target.value = "";
        return;
      }

      setCustomerFile(file);

      try {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();

        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          setAlertSafe({
            type: "error",
            message: `❌ Không tìm thấy worksheet trong file Excel!

📋 File: ${file.name}
📋 Loại: ${file.type}

💡 Vui lòng:
• Đảm bảo file Excel có ít nhất 1 sheet
• Thử mở file bằng Excel để kiểm tra
• Tải file mẫu và làm theo đúng định dạng`,
          });
          event.target.value = "";
          return;
        }
        const customers: Array<{
          phone_number: string;
          full_name: string;
          salutation?: string;
        }> = [];

        // ✅ KIỂM TRA WORKSHEET CÓ DỮ LIỆU KHÔNG
        if (worksheet.rowCount <= 1) {
          setAlertSafe({
            type: "error",
            message: `❌ Worksheet trống!

📋 File: ${file.name}
📋 Số dòng: ${worksheet.rowCount}

💡 Vui lòng:
• Đảm bảo file có dữ liệu (ít nhất 2 dòng)
• Dòng 1: Tiêu đề cột
• Dòng 2+: Dữ liệu khách hàng`,
          });
          event.target.value = "";
          return;
        }

        // Read headers
        const headerRow = worksheet.getRow(1);
        let fullNameCol = 0,
          phoneNumberCol = 0,
          salutationCol = 0;
        const foundHeaders: string[] = [];

        headerRow.eachCell((cell, colNumber) => {
          const value = cell.value?.toString().trim().toUpperCase();
          foundHeaders.push(value || `CỘT ${colNumber}`);
          if (value === "TÊN KHÁCH HÀNG") fullNameCol = colNumber;
          if (value === "SỐ ĐIỆN THOẠI") phoneNumberCol = colNumber;
          if (value === "NGƯỜI LIÊN HỆ") salutationCol = colNumber;
        });

        // Check required headers
        const missingHeaders: string[] = [];
        if (!fullNameCol) missingHeaders.push("TÊN KHÁCH HÀNG");
        if (!phoneNumberCol) missingHeaders.push("SỐ ĐIỆN THOẠI");

        if (missingHeaders.length > 0) {
          setAlertSafe({
            type: "error",
            message: `❌ Sai định dạng header! Thiếu cột: ${missingHeaders.join(
              ", "
            )}

📋 File: ${file.name}
🔍 Header hiện tại: ${foundHeaders.join(", ")}

✅ Header cần có:
• TÊN KHÁCH HÀNG (bắt buộc)
• SỐ ĐIỆN THOẠI (bắt buộc)
• NGƯỜI LIÊN HỆ (tùy chọn)

💡 Vui lòng:
• Tải file mẫu để xem định dạng chuẩn
• Đảm bảo dòng đầu tiên là tiêu đề cột
• Sử dụng chính xác tên cột như trên`,
          });
          event.target.value = "";
          return;
        }

        // Read data with progress tracking
        let validCustomers = 0;
        let invalidRows: string[] = [];
        let processedRows = 0;
        const totalDataRows = worksheet.rowCount - 1; // Excluding header

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header row

          processedRows++;
          const fullName =
            row.getCell(fullNameCol).value?.toString().trim() || "";
          const phoneNumber =
            row.getCell(phoneNumberCol).value?.toString().trim() || "";
          const salutation = salutationCol
            ? row.getCell(salutationCol).value?.toString().trim() || ""
            : "";

          // ✅ VALIDATION DỮ LIỆU CHI TIẾT HƠN
          const validationErrors = [];
          if (!fullName) validationErrors.push("Tên");
          if (!phoneNumber) validationErrors.push("SĐT");

          // Validate phone number format (basic)
          if (
            phoneNumber &&
            !/^[0-9+\-\s()]{8,15}$/.test(phoneNumber.replace(/\s/g, ""))
          ) {
            validationErrors.push("SĐT không hợp lệ");
          }

          if (validationErrors.length === 0) {
            customers.push({
              phone_number: phoneNumber,
              full_name: fullName,
              salutation,
            });
            validCustomers++;
          } else {
            invalidRows.push(
              `Dòng ${rowNumber}: ${validationErrors.join(", ")}`
            );
          }
        });

        if (customers.length === 0) {
          setAlertSafe({
            type: "error",
            message: `❌ Không có dữ liệu hợp lệ!

📊 Tổng số dòng xử lý: ${processedRows}
📊 Dòng hợp lệ: 0
📊 Dòng lỗi: ${invalidRows.length}

🔍 Chi tiết lỗi:
${invalidRows.slice(0, 5).join("\n")}
${invalidRows.length > 5 ? `\n... và ${invalidRows.length - 5} dòng khác` : ""}

💡 Vui lòng:
• Kiểm tra dữ liệu trong file
• Đảm bảo có đủ thông tin Tên và SĐT
• Kiểm tra định dạng số điện thoại`,
          });
          event.target.value = "";
          return;
        }

        setUploadedCustomers(customers);

        // ✅ DELAY ĐỂ ĐẢM BẢO CUSTOMERS ĐÃ ĐƯỢC SET
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (invalidRows.length > 0) {
          setAlertSafe({
            type: "warning",
            message: `⚠️ Import thành công với cảnh báo!

✅ Import thành công: ${validCustomers} khách hàng
⚠️ Bỏ qua: ${invalidRows.length} dòng lỗi
📊 Tỷ lệ thành công: ${Math.round(
              (validCustomers / (validCustomers + invalidRows.length)) * 100
            )}%

🔍 Chi tiết dòng lỗi:
${invalidRows.slice(0, 3).join("\n")}
${invalidRows.length > 3 ? `\n... và ${invalidRows.length - 3} dòng khác` : ""}

💡 Bạn có thể tiếp tục hoặc sửa lỗi và import lại.`,
          });
        } else {
          setAlertSafe({
            type: "success",
            message: `🎉 Import Excel thành công!

✅ Đã import: ${validCustomers} khách hàng
📊 Tỷ lệ thành công: 100%
📋 File: ${file.name}

🚀 Sẵn sàng để tạo chiến dịch!`,
          });
        }
      } catch (error) {
        console.error("💥 [FILE UPLOAD] Excel processing failed:", error);
        await new Promise((resolve) => setTimeout(resolve, 200));

        try {
          const csvSuccess = await handleCSVFallback(file, error);

          // ✅ CHỈ RESET INPUT KHI CSV FALLBACK THẤT BẠI
          if (!csvSuccess) {
            event.target.value = "";
          }
        } catch (fallbackError) {
          console.error("💥 [CSV FALLBACK] Also failed:", fallbackError);
          // Reset states khi cả Excel và CSV đều fail
          setCustomerFile(null);
          setUploadedCustomers([]);
          event.target.value = "";
          setAlertSafe({
            type: "error",
            message: `❌ Không thể xử lý file!

📋 Excel: ${error instanceof Error ? error.message : "Không đọc được"}
📋 CSV: ${
              fallbackError instanceof Error
                ? fallbackError.message
                : "Không xử lý được"
            }

💡 Vui lòng:
• Kiểm tra file có bị hỏng không
• Thử tải file mẫu và làm lại
• Liên hệ hỗ trợ nếu vẫn lỗi`,
          });
        }
      }
    },
    [handleCSVFallback, setAlertSafe]
  );

  const downloadSampleFile = () => {
    // Đường dẫn file mẫu trong thư mục public
    const fileUrl = "/file_mau_cau_hinh_gui_tin_nhan.xlsx";
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = "file_mau_cau_hinh_gui_tin_nhan.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = async () => {
    // Basic validation that always applies
    const hasEmails =
      recipientsTo.trim() ||
      customEmails.some((e) => e.trim()) ||
      recipientsCc.length > 0;

    if (!campaignName?.trim() || !selectedType) {
      console.warn("Missing basic campaign data");
      return;
    }

    // For create mode, enforce stricter validation
    if (mode === "create") {
      if (
        !canProceedFromTab1 ||
        !canProceedFromTab2 ||
        (needsReminderTab && !canProceedFromTab3)
      ) {
        console.warn("Validation failed for create mode");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const campaignData: CampaignFormData = {
        ...(mode === "edit" && initialData ? { id: initialData.id } : {}),
        name: campaignName,
        campaign_type: selectedType as CampaignType,
        messages: {
          type: "initial",
          text: messageContent || "", // Allow empty message in edit mode
          attachment:
            attachmentType && attachmentData
              ? {
                  type: attachmentType,
                  ...(attachmentType === "image" || attachmentType === "file"
                    ? {
                        base64: attachmentData,
                        ...(attachmentType === "file"
                          ? { filename: "attachment" }
                          : {}),
                      }
                    : { url: attachmentData }),
                }
              : null,
        } as any,
      };

      // Schedule config với validation linh hoạt hơn cho edit mode
      if (
        selectedType === CampaignType.HOURLY_KM ||
        selectedType === CampaignType.DAILY_KM
      ) {
        campaignData.schedule_config = {
          type: "hourly",
          start_time: startTime || undefined, // Allow empty for edit mode
          end_time: endTime || undefined, // Allow empty for edit mode
          remind_after_minutes: reminders.length > 0 ? reminders[0].minutes : 0,
        };
      } else if (selectedType === CampaignType.THREE_DAY_KM) {
        campaignData.schedule_config = {
          type: "3_day",
          days_of_week:
            Array.isArray(selectedDays) && selectedDays.length > 0
              ? selectedDays
              : Array.isArray(selectedDays)
              ? []
              : [selectedDays as number].filter((d) => d !== 0),
          time_of_day: timeOfDay || undefined,
        };
      } else if (
        selectedType === CampaignType.WEEKLY_SP ||
        selectedType === CampaignType.WEEKLY_BBG
      ) {
        campaignData.schedule_config = {
          type: "weekly",
          day_of_week: Array.isArray(selectedDays)
            ? selectedDays[0] || 0
            : (selectedDays as number) || 0,
          time_of_day: timeOfDay || undefined,
        };
      }

      // Reminders
      if (needsReminderTab) {
        campaignData.reminders = reminders.filter(
          (r) => r.content?.trim() && r.minutes > 0
        );
      }

      // ✅ SỬA LOGIC SUBMIT - Không merge customEmails vào recipients_to
      if (hasEmails && !recipientsTo.trim()) {
        // Có emails nhưng không có Recipients TO
        console.warn("❌ Submit blocked: Missing Recipients TO");

        // Focus vào Recipients TO input để user chú ý
        const recipientsToInput = document.querySelector(
          'input[placeholder="example@email.com"]'
        ) as HTMLInputElement;
        if (recipientsToInput) {
          recipientsToInput.focus();
          recipientsToInput.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }

        return; // Không submit
      }

      if (
        recipientsTo.trim() ||
        customEmails.some((e) => e.trim()) ||
        recipientsCc.length > 0
      ) {
        const recipientsToString = recipientsTo.trim();

        const allCcEmails = [
          ...recipientsCc, // System emails
          ...customEmails.filter((e) => e.trim()), // External emails từ custom inputs
        ];

        campaignData.email_reports = {
          recipients_to: recipientsToString, // ✅ Chỉ 1 mail
          recipients_cc: allCcEmails, // ✅ Array chứa tất cả mail còn lại
          report_interval_minutes: reportInterval
            ? parseInt(reportInterval, 10)
            : undefined,
          stop_sending_at_time: stopSendingTime || undefined,
          is_active: true,
          send_when_campaign_completed: false,
        };
      }

      // Customers
      if (uploadedCustomers.length > 0) {
        campaignData.customers = uploadedCustomers;
      }

      await onSubmit(campaignData);
      setShowSuccess(true);
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error(
        `Error ${mode === "edit" ? "updating" : "creating"} campaign:`,
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle =
    mode === "edit" ? "Chỉnh Sửa Chiến Dịch" : "Tạo Chiến Dịch Mới";
  const submitButtonText = mode === "edit" ? "Cập nhật" : "Tạo chiến dịch";
  const successMessage =
    mode === "edit" ? "Cập nhật thành công!" : "Tạo thành công!";
  const successDescription =
    mode === "edit"
      ? "Chiến dịch của bạn đã được cập nhật"
      : "Chiến dịch của bạn đã được tạo";

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
          <DialogContent className="!max-w-[85vw] !max-h-[85vh] p-0 bg-white flex flex-col">
            {alert && (
              <motion.div
                key={`alert-${alert.id}`}
                className="absolute top-4 left-4 right-4 z-[10000]"
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <div className="relative">
                  {alertRef.current?.isPersistent ? (
                    // ✅ CUSTOM PERSISTENT ALERT - Không có auto-close logic
                    <div
                      className={`
                      p-4 rounded-lg border-l-4 shadow-lg
                      ${
                        alert.type === "error"
                          ? "bg-red-50 border-red-500 text-red-800"
                          : "bg-yellow-50 border-yellow-500 text-yellow-800"
                      }
                    `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {alert.type === "error" ? (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium mb-1">
                              {alert.type === "error" ? "Lỗi" : "Cảnh báo"}
                            </div>
                            <div className="text-sm whitespace-pre-line">
                              {alert.message}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleManualCloseAlert}
                          className="flex-shrink-0 ml-4 p-1 rounded-md hover:bg-red-100 transition-colors"
                          aria-label="Đóng thông báo"
                          title="Đóng thông báo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ✅ STANDARD ALERT CHO SUCCESS/INFO - Có auto-close
                    <ServerResponseAlert
                      type={alert.type as any}
                      message={alert.message}
                      onClose={handleCloseAlert}
                      duration={alert.type === "success" ? 4000 : 3000}
                    />
                  )}
                </div>
              </motion.div>
            )}
            {/* Animated background */}
            <motion.div
              className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl opacity-50 pointer-events-none"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* FIXED HEADER - Update với dynamic title */}
            <motion.div
              className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white relative z-10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
                  <motion.div
                    className="p-2 bg-white/20 rounded-lg"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Target className="h-5 w-5" />
                  </motion.div>
                  {modalTitle}
                </DialogTitle>
              </DialogHeader>

              {/* Progress bar */}
              <motion.div
                className="mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-white/80">Tiến độ</span>
                  <motion.span
                    className="text-sm font-medium"
                    key={Math.round(calculateProgress())}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                  >
                    {Math.round(calculateProgress())}%
                  </motion.span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white/90 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${calculateProgress()}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* FIXED STEP INDICATOR */}
            <motion.div
              className="flex-shrink-0 px-6 py-3 bg-gray-50 border-b relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <StepIndicator
                currentStep={getCurrentStepNumber()}
                totalSteps={needsReminderTab ? 5 : 4}
                labels={getTabLabels()}
              />
            </motion.div>

            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Tabs
                value={currentTab}
                onValueChange={handleTabChange}
                className="h-full"
              >
                <div className="p-6 space-y-6">
                  {/* Tab 1: Basic Information */}
                  <TabsContent value="basic" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Target className="h-5 w-5 text-blue-600" />
                            </motion.div>
                            Thông tin cơ bản
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Campaign name */}
                          <motion.div
                            className="space-y-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <Label className="text-sm font-medium">
                              Tên chương trình{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={campaignName}
                              onChange={(e) => setCampaignName(e.target.value)}
                              placeholder="VD: Khuyến mãi mùa hè 2024..."
                              className="h-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                            />
                          </motion.div>

                          {/* Campaign type */}
                          <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Label className="text-sm font-medium">
                              Loại chương trình{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {campaignTypeOptions.map((option, index) => {
                                const isSelected =
                                  selectedType === option.value;
                                return (
                                  <motion.button
                                    key={option.value}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + index * 0.1 }}
                                    whileHover={{
                                      scale: 1.02,
                                      y: -2,
                                      transition: { duration: 0.1 },
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={() =>
                                      setSelectedType(
                                        isSelected ? "" : option.value
                                      )
                                    }
                                    className={cn(
                                      "p-4 rounded-lg border-2 transition-all duration-200 text-left",
                                      isSelected
                                        ? "border-blue-500 bg-blue-50 shadow-lg"
                                        : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <motion.span
                                        className="text-2xl"
                                        animate={
                                          isSelected
                                            ? {
                                                rotate: [0, 10, -10, 0],
                                                scale: [1, 1.1, 1],
                                              }
                                            : {}
                                        }
                                        transition={{ duration: 0.5 }}
                                      >
                                        {option.emoji}
                                      </motion.span>
                                      <div className="flex-1">
                                        <h3 className="font-medium text-sm mb-1">
                                          {option.label}
                                        </h3>
                                        <p className="text-xs text-gray-600">
                                          {option.description}
                                        </p>
                                      </div>
                                      <AnimatePresence>
                                        {isSelected && (
                                          <motion.div
                                            initial={{
                                              scale: 0,
                                              rotate: -90,
                                            }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            exit={{ scale: 0, rotate: 90 }}
                                          >
                                            <Check className="h-4 w-4 text-blue-600" />
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  {/* Tab 2: Schedule & Content */}
                  <TabsContent value="schedule" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Clock className="h-5 w-5 text-purple-600" />
                            </motion.div>
                            Lịch trình & Nội dung
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Time configuration */}
                          {(selectedType === CampaignType.HOURLY_KM ||
                            selectedType === CampaignType.DAILY_KM) && (
                            <motion.div
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <ModernTimePicker
                                value={startTime}
                                onChange={setStartTime}
                                label="Giờ bắt đầu gửi *"
                              />
                              <ModernTimePicker
                                value={endTime}
                                onChange={setEndTime}
                                label="Giờ kết thúc gửi *"
                              />
                            </motion.div>
                          )}

                          {/* 3-day campaign schedule */}
                          {selectedType === CampaignType.THREE_DAY_KM && (
                            <motion.div
                              className="space-y-4"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <ModernDaySelector
                                value={selectedDays}
                                onChange={handleDaySelectionChange}
                                mode="adjacent"
                                adjacentDayCount={3}
                                includeSaturday={includeSaturday}
                                label="Chọn 3 ngày liền kề *"
                              />
                              <ModernTimePicker
                                value={timeOfDay}
                                onChange={setTimeOfDay}
                                label="Thời gian gửi trong ngày *"
                              />
                            </motion.div>
                          )}

                          {/* Weekly campaign schedule */}
                          {(selectedType === CampaignType.WEEKLY_SP ||
                            selectedType === CampaignType.WEEKLY_BBG) && (
                            <motion.div
                              className="space-y-4"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <ModernDaySelector
                                value={selectedDays}
                                onChange={handleDaySelectionChange}
                                mode="single"
                                onModeChange={handleDaySelectionModeChange}
                                includeSaturday={includeSaturday}
                                label="Chọn ngày trong tuần *"
                              />
                              <ModernTimePicker
                                value={timeOfDay}
                                onChange={setTimeOfDay}
                                label="Thời gian gửi trong ngày *"
                              />
                            </motion.div>
                          )}

                          {/* Message content */}
                          <motion.div
                            className="space-y-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Label className="text-sm font-medium flex items-center justify-between">
                              <span>
                                Nội dung tin nhắn{" "}
                                <span className="text-red-500">*</span>
                              </span>
                              <TextCounter
                                current={messageContent.length}
                                max={500}
                              />
                            </Label>
                            <Textarea
                              value={messageContent}
                              onChange={(e) =>
                                setMessageContent(e.target.value)
                              }
                              placeholder="Nhập nội dung tin nhắn hấp dẫn của bạn..."
                              rows={4}
                              className="resize-none transition-all duration-200 focus:ring-2 focus:ring-purple-500"
                              maxLength={500}
                            />
                          </motion.div>

                          {/* Attachment */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <ModernAttachmentSelector
                              type={attachmentType}
                              onTypeChange={setAttachmentType}
                              data={attachmentData}
                              onDataChange={setAttachmentData}
                            />
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  {/* Tab 3: Reminders */}
                  {needsReminderTab && (
                    <TabsContent value="reminders" className="mt-0">
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border border-gray-200 shadow-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                              <motion.div
                                animate={{
                                  rotate: [0, 15, -15, 0],
                                  scale: [1, 1.1, 1],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              >
                                <Bell className="h-5 w-5 text-orange-600" />
                              </motion.div>
                              Cấu hình nhắc lại
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <AnimatePresence>
                              {reminders.map((reminder, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                  transition={{
                                    duration: 0.3,
                                    delay: index * 0.1,
                                  }}
                                  layout
                                  className="border border-gray-200 rounded-lg p-4 space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <motion.h4
                                      className="font-medium text-sm"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      Lần nhắc thứ {index + 1}
                                    </motion.h4>
                                    {reminders.length > 1 && (
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeReminder(index)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <motion.div
                                            whileHover={{ rotate: 90 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <X className="h-4 w-4" />
                                          </motion.div>
                                        </Button>
                                      </motion.div>
                                    )}
                                  </div>

                                  <div className="space-y-3">
                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      <Label className="text-sm">
                                        Nội dung nhắc lại
                                      </Label>
                                      <motion.div
                                        whileFocus={{ scale: 1.01 }}
                                        transition={{ duration: 0.1 }}
                                      >
                                        <Textarea
                                          value={reminder.content}
                                          onChange={(e) =>
                                            updateReminder(
                                              index,
                                              "content",
                                              e.target.value
                                            )
                                          }
                                          placeholder="VD: Ưu đãi sắp hết hạn! Nhanh tay nhận ngay..."
                                          rows={2}
                                          className="resize-none mt-1 transition-all duration-200 focus:ring-2 focus:ring-orange-500"
                                        />
                                      </motion.div>
                                    </motion.div>

                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.3 }}
                                    >
                                      <Label className="text-sm">
                                        Thời gian chờ:
                                        <motion.span
                                          className="font-semibold text-orange-600 ml-1"
                                          key={reminder.minutes}
                                          initial={{
                                            scale: 1.2,
                                            color: "#ea580c",
                                          }}
                                          animate={{
                                            scale: 1,
                                            color: "#ea580c",
                                          }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          {reminder.minutes} phút
                                        </motion.span>
                                      </Label>
                                      <motion.div
                                        className="mt-2"
                                        whileHover={{ scale: 1.01 }}
                                        transition={{ duration: 0.1 }}
                                      >
                                        <Slider
                                          value={[reminder.minutes]}
                                          onValueChange={(value) =>
                                            updateReminder(
                                              index,
                                              "minutes",
                                              value[0]
                                            )
                                          }
                                          min={5}
                                          max={120}
                                          step={5}
                                          className="transition-all duration-200"
                                        />
                                      </motion.div>
                                      <motion.div
                                        className="flex justify-between text-xs text-gray-500 mt-1"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                      >
                                        <span>5 phút</span>
                                        <span>2 giờ</span>
                                      </motion.div>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                onClick={addReminder}
                                className="w-full border-dashed hover:bg-orange-50 hover:border-orange-200 transition-all duration-200"
                              >
                                <motion.div
                                  animate={{ rotate: [0, 2, 0] }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                  className="mr-2"
                                >
                                  <Plus className="h-4 w-4 inline-block" />
                                  <span className="inline-block">
                                    Thêm lần nhắc mới
                                  </span>
                                </motion.div>
                              </Button>
                            </motion.div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </TabsContent>
                  )}
                  {/* Tab 4: Email Reports */}
                  <TabsContent value="email" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <motion.div
                              animate={{
                                rotate: [0, -10, 10, 0],
                                scale: [1, 1.05, 1],
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            >
                              <Mail className="h-5 w-5 text-green-600" />
                            </motion.div>
                            Cấu hình email báo cáo
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* System emails */}
                          <motion.div
                            className="space-y-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 20,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              >
                                <Users className="h-3 w-3 text-gray-500" />
                              </motion.div>
                              Email từ hệ thống
                            </Label>

                            {/* ✅ SỬA MultiSelectCombobox - Loại bỏ Recipients TO khỏi options */}
                            {loadingUsers ? (
                              <motion.div
                                className="flex items-center justify-center p-4 text-sm text-gray-500"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                Đang tải danh sách email...
                              </motion.div>
                            ) : (
                              <motion.div
                                whileHover={{ scale: 1.01 }}
                                transition={{ duration: 0.1 }}
                              >
                                <MultiSelectCombobox
                                  key={`multiselect-${recipientsTo}-${mode}`}
                                  options={usersWithEmail
                                    .filter((user) => {
                                      // ✅ LOẠI BỎ email đã là Recipients TO khỏi options
                                      const isRecipientsTo =
                                        user.email.trim().toLowerCase() ===
                                        recipientsTo.trim().toLowerCase();
                                      return !isRecipientsTo;
                                    })
                                    .map((user) => ({
                                      value: user.email,
                                      label: `${user.fullName}${
                                        user.employeeCode
                                          ? ` (${user.employeeCode})`
                                          : ""
                                      } - ${user.email}`,
                                    }))}
                                  value={recipientsCc}
                                  onChange={(values) =>
                                    setRecipientsCc(
                                      values.map((v) => v.toString())
                                    )
                                  }
                                  placeholder={
                                    usersWithEmail.length === 0
                                      ? "Không có email nào trong hệ thống"
                                      : usersWithEmail.filter(
                                          (user) =>
                                            user.email.trim().toLowerCase() !==
                                            recipientsTo.trim().toLowerCase()
                                        ).length === 0
                                      ? "Tất cả email hệ thống đã được sử dụng"
                                      : "Chọn người nhận từ hệ thống..."
                                  }
                                />
                              </motion.div>
                            )}

                            {/* ✅ THÊM MESSAGE KHI KHÔNG CÓ USER NÀO CÓ EMAIL */}
                            {usersWithEmail.length === 0 && !loadingUsers && (
                              <motion.p
                                className="text-sm text-gray-500 mt-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                Không có user nào có email trong hệ thống
                              </motion.p>
                            )}
                          </motion.div>

                          <motion.div
                            className="space-y-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                          >
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 15,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              >
                                <AtSign className="h-3 w-3 text-blue-500" />
                              </motion.div>
                              Người nhận chính{" "}
                              <span className="text-red-500">*</span>
                            </Label>

                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.1 }}
                            >
                              <Input
                                value={recipientsTo}
                                onChange={(e) => {
                                  setRecipientsTo(e.target.value);
                                }}
                                placeholder="example@email.com"
                                type="email"
                                className={cn(
                                  "transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                                  !recipientsTo.trim() &&
                                    (recipientsCc.length > 0 ||
                                      customEmails.some((e) => e.trim()))
                                    ? "border-orange-300 bg-orange-50"
                                    : ""
                                )}
                              />
                            </motion.div>

                            {/* ✅ THÊM MESSAGE KHI RECIPIENTS TO LÀ SYSTEM EMAIL */}
                            {recipientsTo &&
                              usersWithEmail.some(
                                (user) =>
                                  user.email.trim().toLowerCase() ===
                                  recipientsTo.trim().toLowerCase()
                              ) && (
                                <motion.div
                                  className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                >
                                  <div className="flex items-center gap-2 text-blue-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>
                                      Email <strong>"{recipientsTo}"</strong> đã
                                      được chọn làm người nhận chính nên không
                                      hiện trong danh sách CC
                                    </span>
                                  </div>
                                </motion.div>
                              )}

                            {/* ✅ MESSAGE KHI KHÔNG CÓ EMAIL NÀO KHÁC */}
                            {usersWithEmail.length > 0 &&
                              usersWithEmail.filter(
                                (user) =>
                                  user.email.trim().toLowerCase() !==
                                  recipientsTo.trim().toLowerCase()
                              ).length === 0 && (
                                <motion.p
                                  className="text-sm text-orange-600 mt-1"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                >
                                  ⚠️ Tất cả email hệ thống đã được sử dụng làm
                                  người nhận chính
                                </motion.p>
                              )}

                            {/* Original message khi không có user */}
                            {usersWithEmail.length === 0 && !loadingUsers && (
                              <motion.p
                                className="text-sm text-gray-500 mt-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                Không có user nào có email trong hệ thống
                              </motion.p>
                            )}

                            {/* ✅ WARNING STATE - Khi TO trống nhưng có emails trong CC */}
                            {!recipientsTo.trim() &&
                              (recipientsCc.length > 0 ||
                                customEmails.some((e) => e.trim())) && (
                                <motion.div
                                  className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div className="flex items-start gap-2 text-orange-700">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        Người nhận chính trống!
                                      </div>
                                      <div className="text-xs mt-1 text-orange-600">
                                        Email cần có ít nhất 1 người nhận chính
                                        để gửi báo cáo.
                                      </div>
                                    </div>
                                  </div>

                                  {/* ✅ SUGGESTION BUTTONS */}
                                  <div className="mt-3 space-y-2">
                                    <div className="text-xs text-orange-600 font-medium">
                                      💡 Gợi ý: Chọn một email từ danh sách CC
                                      để làm người nhận chính:
                                    </div>

                                    <div className="space-y-1">
                                      {/* System emails suggestions */}
                                      {recipientsCc
                                        .slice(0, 2)
                                        .map((email, index) => (
                                          <motion.button
                                            key={`system-${index}`}
                                            className="w-full text-left text-xs p-2 bg-white border border-orange-200 rounded hover:bg-orange-25 hover:border-orange-300 transition-all duration-200 flex items-center justify-between group"
                                            onClick={() => {
                                              setRecipientsTo(email);
                                              setRecipientsCc(
                                                recipientsCc.filter(
                                                  (e) => e !== email
                                                )
                                              );
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                              <span className="text-blue-700">
                                                {email}
                                              </span>
                                              <Badge
                                                variant="outline"
                                                className="text-xs px-1 py-0"
                                              >
                                                Hệ thống
                                              </Badge>
                                            </div>
                                            <ArrowRight className="h-3 w-3 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </motion.button>
                                        ))}

                                      {/* Custom emails suggestions */}
                                      {customEmails
                                        .filter((e) => e.trim())
                                        .slice(0, 2)
                                        .map((email, index) => (
                                          <motion.button
                                            key={`custom-${index}`}
                                            className="w-full text-left text-xs p-2 bg-white border border-orange-200 rounded hover:bg-orange-25 hover:border-orange-300 transition-all duration-200 flex items-center justify-between group"
                                            onClick={() => {
                                              setRecipientsTo(email);
                                              const updatedCustomEmails =
                                                customEmails.filter(
                                                  (e) => e !== email
                                                );
                                              setCustomEmails(
                                                updatedCustomEmails.length > 0
                                                  ? updatedCustomEmails
                                                  : [""]
                                              );
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                              <span className="text-green-700">
                                                {email}
                                              </span>
                                              <Badge
                                                variant="outline"
                                                className="text-xs px-1 py-0"
                                              >
                                                Tùy chỉnh
                                              </Badge>
                                            </div>
                                            <ArrowRight className="h-3 w-3 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </motion.button>
                                        ))}

                                      {/* Show more button if there are more emails */}
                                      {recipientsCc.length +
                                        customEmails.filter((e) => e.trim())
                                          .length >
                                        4 && (
                                        <div className="text-xs text-orange-500 text-center mt-1">
                                          ... và{" "}
                                          {recipientsCc.length +
                                            customEmails.filter((e) => e.trim())
                                              .length -
                                            4}{" "}
                                          email khác
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                          </motion.div>

                          {/* Custom emails */}
                          <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <motion.div
                                animate={{
                                  scale: [1, 1.1, 1],
                                  rotate: [0, 5, -5, 0],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              >
                                <AtSign className="h-3 w-3 text-gray-500" />
                              </motion.div>
                              Email tùy chỉnh (CC)
                            </Label>

                            <AnimatePresence>
                              {customEmails.map((email, index) => (
                                <motion.div
                                  key={index}
                                  className="flex items-center gap-2"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  <Input
                                    value={email}
                                    onChange={(e) => {
                                      updateCustomEmail(index, e.target.value);
                                    }}
                                    placeholder="example@email.com"
                                    type="email"
                                    className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                                  />
                                  {customEmails.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        removeCustomEmail(index);
                                      }}
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addCustomEmail}
                                className="border-dashed hover:bg-green-50 hover:border-green-200 transition-all duration-200"
                              >
                                <motion.div
                                  animate={{ rotate: [0, 2, 0] }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                  className="mr-2"
                                >
                                  <Plus className="h-4 w-4 inline-block" />
                                  <span className="inline-block">
                                    Thêm email
                                  </span>
                                </motion.div>
                              </Button>
                            </motion.div>
                          </motion.div>

                          {/* Settings */}
                          <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <motion.div
                              className="space-y-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 }}
                            >
                              <Label className="text-sm flex items-center gap-2">
                                <motion.div
                                  animate={{
                                    rotate: [0, 360],
                                    scale: [1, 1.05, 1],
                                  }}
                                  transition={{
                                    rotate: {
                                      duration: 4,
                                      repeat: Infinity,
                                      ease: "linear",
                                    },
                                    scale: {
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    },
                                  }}
                                >
                                  <Clock className="h-3 w-3 text-gray-500" />
                                </motion.div>
                                Tần suất gửi báo cáo
                              </Label>
                              <motion.div
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                              >
                                <Select
                                  value={reportInterval}
                                  onValueChange={setReportInterval}
                                >
                                  <SelectTrigger className="transition-all duration-200 hover:border-green-300">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="30">
                                      <motion.div
                                        className="flex items-center gap-2"
                                        whileHover={{ x: 2 }}
                                      >
                                        <span>⚡</span>
                                        Mỗi 30 phút
                                      </motion.div>
                                    </SelectItem>
                                    <SelectItem value="60">
                                      <motion.div
                                        className="flex items-center gap-2"
                                        whileHover={{ x: 2 }}
                                      >
                                        <span>🕐</span>
                                        Mỗi 1 giờ
                                      </motion.div>
                                    </SelectItem>
                                    <SelectItem value="120">
                                      <motion.div
                                        className="flex items-center gap-2"
                                        whileHover={{ x: 2 }}
                                      >
                                        <span>🕑</span>
                                        Mỗi 2 giờ
                                      </motion.div>
                                    </SelectItem>
                                    <SelectItem value="240">
                                      <motion.div
                                        className="flex items-center gap-2"
                                        whileHover={{ x: 2 }}
                                      >
                                        <span>🕓</span>
                                        Mỗi 4 giờ
                                      </motion.div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </motion.div>
                            </motion.div>

                            <motion.div
                              className="space-y-2"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 }}
                            >
                              <motion.div
                                whileHover={{ scale: 1.005 }}
                                transition={{ duration: 0.1 }}
                              >
                                <ModernTimePicker
                                  value={stopSendingTime}
                                  onChange={setStopSendingTime}
                                  label="Thời gian dừng gửi"
                                />
                              </motion.div>
                            </motion.div>
                          </motion.div>

                          {/* Summary indicator */}
                          <AnimatePresence>
                            {(recipientsCc.length > 0 ||
                              customEmails.some((email) => email.trim())) && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="bg-green-50 border border-green-200 rounded-lg p-3"
                              >
                                <div className="flex items-center gap-2 text-green-700">
                                  <motion.div
                                    animate={{
                                      scale: [1, 1.2, 1],
                                      rotate: [0, -10, 10, 0],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                    }}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </motion.div>
                                  <span className="text-sm font-medium">
                                    Email đã cấu hình:
                                  </span>
                                  <motion.span
                                    className="text-sm font-semibold"
                                    key={
                                      recipientsCc.length +
                                      customEmails.filter((e) => e.trim())
                                        .length
                                    }
                                    initial={{ scale: 1.2, color: "#059669" }}
                                    animate={{ scale: 1, color: "#059669" }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {recipientsCc.length +
                                      customEmails.filter((e) => e.trim())
                                        .length}{" "}
                                    người nhận
                                  </motion.span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  {/* Tab 5: Customer Import */}
                  <TabsContent value="customers" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
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
                              <Users className="h-5 w-5 text-indigo-600" />
                            </motion.div>
                            Import danh sách khách hàng
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Upload area */}
                          <motion.div
                            className="relative"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <input
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              onChange={handleCustomerFileUpload}
                              className="hidden"
                              id="customer-upload"
                            />
                            <label
                              htmlFor="customer-upload"
                              className="block cursor-pointer"
                            >
                              <motion.div
                                whileHover={{
                                  scale: 1.01,
                                  borderColor: "#9ca3af",
                                }}
                                whileTap={{ scale: 0.99 }}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-all duration-200 bg-gray-50 hover:bg-gray-100"
                              >
                                <motion.div
                                  animate={{
                                    y: [0, -5, 0],
                                    rotate: [0, 2, -2, 0],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                </motion.div>
                                <motion.p
                                  className="text-lg font-medium text-gray-700 mb-1"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  Kéo thả hoặc nhấn để tải file
                                </motion.p>
                                <motion.p
                                  className="text-sm text-gray-500"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  Hỗ trợ CSV, Excel (.xlsx, .xls) - Tối đa 10MB
                                </motion.p>
                              </motion.div>
                            </label>
                          </motion.div>

                          {/* Download sample */}
                          <motion.div
                            className="text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                onClick={downloadSampleFile}
                                size="sm"
                                className="hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-200"
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
                                  className="mr-2"
                                >
                                  <Download className="h-4 w-4 inline-block" />
                                  <span className="inline-block">
                                    Tải file mẫu
                                  </span>
                                </motion.div>
                              </Button>
                            </motion.div>
                          </motion.div>

                          {/* Preview uploaded customers */}
                          <AnimatePresence>
                            {uploadedCustomers.length > 0 && (
                              <motion.div
                                className="space-y-3"
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                              >
                                <motion.div
                                  className="flex items-center justify-between"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 }}
                                >
                                  <div className="flex items-center gap-2">
                                    <motion.div
                                      animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 360],
                                      }}
                                      transition={{
                                        scale: {
                                          duration: 1,
                                          repeat: Infinity,
                                        },
                                        rotate: {
                                          duration: 2,
                                          repeat: Infinity,
                                          ease: "linear",
                                        },
                                      }}
                                    >
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    </motion.div>
                                    <motion.span
                                      className="font-medium"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      Đã tải thành công{" "}
                                      <motion.span
                                        className="text-green-600 font-bold"
                                        key={uploadedCustomers.length}
                                        initial={{
                                          scale: 1.3,
                                          color: "#059669",
                                        }}
                                        animate={{
                                          scale: 1,
                                          color: "#059669",
                                        }}
                                        transition={{ duration: 0.3 }}
                                      >
                                        {uploadedCustomers.length}
                                      </motion.span>{" "}
                                      khách hàng
                                    </motion.span>
                                  </div>
                                  <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setCustomerFile(null);
                                        setUploadedCustomers([]);
                                      }}
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <motion.div
                                        whileHover={{ rotate: 90 }}
                                        transition={{ duration: 0.2 }}
                                        className="mr-1"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </motion.div>
                                      Xóa
                                    </Button>
                                  </motion.div>
                                </motion.div>

                                <motion.div
                                  className="border rounded-lg overflow-hidden"
                                  initial={{ opacity: 0, scale: 0.98 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <motion.div
                                    className="bg-gray-50 px-4 py-2 border-b"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                  >
                                    <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
                                      <motion.div
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 }}
                                      >
                                        Số điện thoại
                                      </motion.div>
                                      <motion.div
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 }}
                                      >
                                        Tên khách hàng
                                      </motion.div>
                                      <motion.div
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.7 }}
                                      >
                                        Xưng hô
                                      </motion.div>
                                    </div>
                                  </motion.div>
                                  <div className="max-h-48 overflow-y-auto">
                                    <AnimatePresence>
                                      {uploadedCustomers
                                        .slice(0, 10)
                                        .map((customer, index) => (
                                          <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{
                                              delay: 0.5 + index * 0.05,
                                              duration: 0.3,
                                            }}
                                            whileHover={{
                                              backgroundColor: "#f9fafb",
                                              scale: 1.005,
                                            }}
                                            className="grid grid-cols-3 gap-4 px-4 py-2 border-b border-gray-100 cursor-default"
                                          >
                                            <motion.div
                                              className="text-sm font-mono"
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              transition={{
                                                delay: 0.6 + index * 0.05,
                                              }}
                                            >
                                              {customer.phone_number}
                                            </motion.div>
                                            <motion.div
                                              className="text-sm font-medium"
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              transition={{
                                                delay: 0.7 + index * 0.05,
                                              }}
                                            >
                                              {customer.full_name}
                                            </motion.div>
                                            <motion.div
                                              className="text-sm text-gray-600"
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              transition={{
                                                delay: 0.8 + index * 0.05,
                                              }}
                                            >
                                              {customer.salutation || "--"}
                                            </motion.div>
                                          </motion.div>
                                        ))}
                                    </AnimatePresence>
                                  </div>
                                  {uploadedCustomers.length > 10 && (
                                    <motion.div
                                      className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 1 }}
                                    >
                                      <motion.span
                                        animate={{
                                          scale: [1, 1.05, 1],
                                        }}
                                        transition={{
                                          duration: 2,
                                          repeat: Infinity,
                                          ease: "easeInOut",
                                        }}
                                      >
                                        ... và {uploadedCustomers.length - 10}{" "}
                                        khách hàng khác
                                      </motion.span>
                                    </motion.div>
                                  )}
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Info */}
                          <motion.div
                            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ scale: 1.005 }}
                          >
                            <div className="flex gap-3">
                              <motion.div
                                animate={{
                                  rotate: [0, 10, -10, 0],
                                  scale: [1, 1.1, 1],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                                className="flex-shrink-0 mt-0.5"
                              >
                                <AlertCircle className="h-5 w-5 text-blue-600" />
                              </motion.div>
                              <div className="text-sm text-blue-800">
                                <motion.p
                                  className="font-medium mb-1"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  Định dạng file:
                                </motion.p>
                                <motion.ul
                                  className="space-y-0.5 text-xs"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  {[
                                    "Dòng đầu tiên là tiêu đề cột",
                                    "Cột 1: Số điện thoại (bắt buộc)",
                                    "Cột 2: Tên khách hàng (bắt buộc)",
                                    "Cột 3: Xưng hô (tùy chọn)",
                                  ].map((item, index) => (
                                    <motion.li
                                      key={index}
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{
                                        delay: 0.6 + index * 0.1,
                                      }}
                                    >
                                      • {item}
                                    </motion.li>
                                  ))}
                                </motion.ul>
                              </div>
                            </div>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>
                  {/* Keeping the existing logic but adding motion wrappers */}
                </div>
              </Tabs>
            </div>

            {/* ENHANCED FOOTER */}
            <motion.div
              className="flex-shrink-0 p-4 bg-gray-50 border-t shadow-lg relative z-10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex justify-between items-center">
                <div className="flex-shrink-0">
                  <AnimatePresence>
                    {currentTab !== "basic" && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (currentTab === "schedule")
                              setCurrentTab("basic");
                            else if (currentTab === "reminders")
                              setCurrentTab("schedule");
                            else if (currentTab === "email")
                              setCurrentTab(
                                needsReminderTab ? "reminders" : "schedule"
                              );
                            else if (currentTab === "customers")
                              setCurrentTab("email");
                          }}
                          size="sm"
                          className="flex items-center gap-1 hover:bg-gray-100 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180 inline-block" />
                          <span className="inline-block">Quay lại</span>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={async () => {
                      // ✅ KHÔNG GỌI resetForm() KHI CÓ ERROR ALERT
                      if (
                        alert &&
                        (alert.type === "error" || alert.type === "warning")
                      ) {
                        onOpenChange(false);
                        return;
                      }

                      if (mode === "create") {
                        resetForm();
                        // Đợi một chút để state được reset hoàn toàn
                        await new Promise((resolve) => setTimeout(resolve, 50));
                      } else {
                        if (initialData) {
                          loadCampaignData(initialData);
                          await new Promise((resolve) =>
                            setTimeout(resolve, 50)
                          );
                        }
                      }
                      onOpenChange(false);
                    }}
                    disabled={isSubmitting}
                    size="sm"
                    className="hover:bg-gray-100 transition-colors"
                  >
                    Hủy
                  </Button>

                  {currentTab !== "customers" ? (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={() => {
                          if (currentTab === "basic" && canProceedFromTab1)
                            setCurrentTab("schedule");
                          else if (
                            currentTab === "schedule" &&
                            canProceedFromTab2
                          ) {
                            setCurrentTab(
                              needsReminderTab ? "reminders" : "email"
                            );
                          } else if (
                            currentTab === "reminders" &&
                            canProceedFromTab3
                          )
                            setCurrentTab("email");
                          else if (currentTab === "email")
                            setCurrentTab("customers");
                        }}
                        disabled={
                          (currentTab === "basic" && !canProceedFromTab1) ||
                          (currentTab === "schedule" && !canProceedFromTab2) ||
                          (currentTab === "reminders" && !canProceedFromTab3)
                        }
                        size="sm"
                        className="flex items-center gap-1 hover:bg-blue-700 transition-colors"
                      >
                        <span className="inline-block">Tiếp tục</span>
                        <ArrowRight className="h-4 w-4 inline-block" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 flex items-center gap-2 transition-colors"
                        size="sm"
                      >
                        {isSubmitting ? (
                          <>
                            <motion.div
                              className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                            {mode === "edit"
                              ? "Đang cập nhật..."
                              : "Đang tạo..."}
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 inline-block" />
                            <span className="ml-2 inline-block">
                              {submitButtonText}
                            </span>
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Enhanced Success overlay */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="bg-white rounded-lg p-6 text-center shadow-xl max-w-sm"
                    initial={{ scale: 0.5, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.5, y: 20 }}
                    transition={{
                      type: "spring",
                      damping: 25,
                      stiffness: 300,
                    }}
                  >
                    <motion.div
                      className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        damping: 25,
                        stiffness: 300,
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </motion.div>
                    </motion.div>
                    <motion.h3
                      className="text-lg font-semibold text-gray-900 mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {successMessage}
                    </motion.h3>
                    <motion.p
                      className="text-gray-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {successDescription}
                    </motion.p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
