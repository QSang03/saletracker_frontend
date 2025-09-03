"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Lock,
  Users,
  Target,
  CheckCircle,
  Loader2,
  Save,
  X,
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  MousePointer,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { getDepartmentColor } from "@/lib/utils";
import { toast } from "sonner";
import {
  DepartmentSchedule,
  CreateDepartmentScheduleDto,
  ScheduleType,
  ScheduleStatus,
  DailyDatesConfig,
  HourlySlotsConfig,
} from "@/types/schedule";
import { ScheduleService } from "@/lib/schedule-api";
import { usePermission } from "@/hooks/usePermission";
import { useViewRole } from "@/hooks/useViewRole";
import { useScheduleCollaboration } from "@/hooks/useScheduleCollaboration";
import { PresenceList, CursorIndicator } from "@/components/schedule/PresenceIndicator";

import { TypingIndicator } from "@/components/schedule/LivePreview";
import { CellSelectionIndicator } from "@/components/schedule/CellSelectionIndicator";
import { EditActivityToastsContainer } from "@/components/schedule/EditActivityToast";
import { EditHistoryModal } from "@/components/schedule/EditHistoryModal";

// Types
interface Department {
  id: number;
  name: string;
  slug: string;
  server_ip: string;
  users?: any[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface TimeSlot {
  id?: string;
  day_of_week?: number;
  start_time: string;
  end_time: string;
  applicable_date?: string; // "YYYY-MM-DD", ngày áp dụng cụ thể, null = mọi ngày
  department_id: number;
}

interface SelectedDay {
  date: number;
  month: number;
  year: number;
  department_id: number;
}

interface DepartmentSelections {
  days: SelectedDay[];
  timeSlots: TimeSlot[];
}

interface ConflictInfo {
  type: "time" | "date";
  conflicting_schedules: DepartmentSchedule[];
  departments: Department[];
}

interface DragState {
  isDragging: boolean;
  startSlot: { day: number; time: string } | null;
  currentSlot: { day: number; time: string } | null;
  isSelecting: boolean;
}
interface MontylyDragState {
  isDragging: boolean;
  startDay: { date: number; month: number; year: number } | null;
  currentDay: { date: number; month: number; year: number } | null;
  isSelecting: boolean;
}

interface BulkScheduleConfig {
  enabled: boolean;
  type: "weeks" | "months";
  count: number;
  skipWeekends?: boolean;
  skipConflicts?: boolean;
}

// Constants

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

const weekDays = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

const LAST_SLOT_END = "17:45";

export default function CompleteScheduleApp() {
  // Permission check
  const { user, getAllUserRoles } = usePermission();
  const { isViewRole } = useViewRole();
  
  // ✅ SỬA: Tạo roomId theo tuần hiện tại với prefix môi trường để tách biệt dev/production
  const roomId = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Chủ nhật
    
    // Tách biệt hoàn toàn giữa dev và production
    const env = process.env.NODE_ENV || 'development';
    const envPrefix = env === 'production' ? 'prod' : 'dev';
    
    // ✅ BỎ timestamp để giữ nguyên room khi F5, chỉ đổi khi đổi tuần
    return `${envPrefix}:schedule:week:${startOfWeek.toISOString().split('T')[0]}`;
  }, []);

  // Schedule collaboration
  const {
    presences,
    editSessions,
    previewPatches,
    conflicts,
    versions,
    cellSelections,
    updatePresence,
    sendPresence,
    startEditSession,
    renewEditSession,
    stopEditSession,
    sendPreviewPatch,
    updateVersion,
    sendCellSelections,
    clearMySelections,
    getCellSelections,
    pingCellSelections,
    isFieldLocked,
    getFieldLockedBy,
    getPreviewPatchForField,
  } = useScheduleCollaboration(roomId);

  // ✅ THÊM: Tạo storage key riêng cho từng môi trường
  const storageKey = useMemo(() => {
    const env = process.env.NODE_ENV || 'development';
    const envPrefix = env === 'production' ? 'prod' : 'dev';
    return `${envPrefix}:schedule:selections:${user?.id || 'anonymous'}`;
  }, [user?.id]);

  const uiToDow = (dayIndex: number) => ((dayIndex + 1) % 7) + 1;
  const dowToUi = (dow: number) => (dow === 1 ? 6 : dow - 2);

  // ✅ THÊM: Helper chuẩn hóa fieldId - luôn dùng day_of_week (1..7). Nếu truyền vào là dayIndex (0..6) thì convert.
  const makeTimeSlotFieldId = (dayIndexOrDow: number, time: string, specificDate?: string) => {
    const dow = dayIndexOrDow >= 1 && dayIndexOrDow <= 7 ? dayIndexOrDow : uiToDow(dayIndexOrDow);
    return `time-slot-${dow}-${time}-${specificDate || ''}`;
  };

  // Kiểm tra xem user có phải admin không
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const userRoles = getAllUserRoles();
    return userRoles.some((role) => role.name === "admin");
  }, [user, getAllUserRoles]);

  // Kiểm tra xem user có phải scheduler không
  const isScheduler = useMemo(() => {
    if (!user) return false;
    const userRoles = getAllUserRoles();
    return userRoles.some((role) => role.name === "scheduler");
  }, [user, getAllUserRoles]);

  // Lấy tất cả slug của các phòng ban mà user là manager
  const userManagerDepartmentSlugs = useMemo(() => {
    if (!user) return [];
    const userRoles = getAllUserRoles();
    const managerRoles = userRoles.filter((role) =>
      role.name.startsWith("manager-")
    );
    return managerRoles.map((role) => role.name.replace("manager-", ""));
  }, [user, getAllUserRoles]);

  // Kiểm tra user có phải manager của ít nhất 1 phòng ban không
  const isManager = useMemo(() => {
    return userManagerDepartmentSlugs.length > 0;
  }, [userManagerDepartmentSlugs]);

  // View state
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<"week" | "month">("week");

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [schedules, setSchedules] = useState<DepartmentSchedule[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [bulkScheduleConfig, setBulkScheduleConfig] =
    useState<BulkScheduleConfig>({
      enabled: false,
      type: "weeks",
      count: 1,
      skipWeekends: true,
      skipConflicts: true,
    });
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{
    weeks: Date[];
    months: Date[];
  }>({ weeks: [], months: [] });

  // Lấy departments có thể truy cập dựa trên phân quyền
  const accessibleDepartments = useMemo(() => {
    if (!departments.length) return [];

    // Tất cả user đều có thể view tất cả departments có server_ip
    return departments.filter((dept) => dept.server_ip);
  }, [departments]);

  // Kiểm tra xem tất cả data cần thiết đã sẵn sàng chưa
  const isDataReady = useMemo(() => {
    return !isLoadingDepartments && user !== null && departments.length > 0;
  }, [isLoadingDepartments, user, departments.length]);

  // Kiểm tra xem department có thể được thao tác (chọn/chỉnh sửa) không
  const isDepartmentEditable = useCallback(
    (departmentId: number) => {
      // Nếu data chưa sẵn sàng, không cho phép edit
      if (!isDataReady) {
        return false;
      }

      // Admin và scheduler có thể thao tác tất cả departments
      if (isAdmin || isScheduler) {
        return true;
      }

      // Manager chỉ có thể thao tác department của mình
      if (isManager && userManagerDepartmentSlugs.length > 0) {
        const department = departments.find((dept) => dept.id === departmentId);
        const canEdit =
          department && userManagerDepartmentSlugs.includes(department.slug);

        return canEdit || false;
      }

      // User thường không thể thao tác
      return false;
    },
    [
      isAdmin,
      isScheduler,
      isManager,
      userManagerDepartmentSlugs,
      departments,
      isDataReady,
    ]
  );

  // Kiểm tra xem department có thể được chọn không (bao gồm cả view và edit)
  const isDepartmentAccessible = useCallback(
    (departmentId: number) => {
      return accessibleDepartments.some((dept) => dept.id === departmentId);
    },
    [accessibleDepartments]
  );

  // Kiểm tra xem department có server_ip không
  const isDepartmentEnabled = useCallback(
    (departmentId: number) => {
      const department = departments.find((dept) => dept.id === departmentId);
      return department?.server_ip ? true : false;
    },
    [departments]
  );

  // Visibility
  const [visibleDepartments, setVisibleDepartments] = useState<number[]>([]);

  // Selection state
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
    null
  );
  const [departmentSelections, setDepartmentSelections] = useState<
    Map<number, DepartmentSelections>
  >(new Map());

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startSlot: null,
    currentSlot: null,
    isSelecting: false,
  });
  const [monthlyDragState, setMonthlyDragState] = useState<MontylyDragState>({
    isDragging: false,
    startDay: null,
    currentDay: null,
    isSelecting: false,
  });

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [editingSchedule, setEditingSchedule] =
    useState<DepartmentSchedule | null>(null);
  
  // Edit history modal state
  const [isEditHistoryModalOpen, setIsEditHistoryModalOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<{
    userId: number;
    userName: string;
    departmentId: number;
    departmentName: string;
  } | null>(null);

  // Handle view history callback
  const handleViewHistory = useCallback((userId: number) => {
    // Find user info from edit sessions or preview patches
    const userSession = Array.from(editSessions.values()).find(session => session.userId === userId);
    const userPatch = Array.from(previewPatches.values()).find(patch => patch.userId === userId);
    
    if (userSession || userPatch) {
      const userInfo = userSession || userPatch!;
      // Get department name from departments array
      const department = departments.find(dept => dept.id === userInfo.departmentId);
      setSelectedUserForHistory({
        userId: userInfo.userId,
        userName: userInfo.userName,
        departmentId: userInfo.departmentId,
        departmentName: department?.name || 'Unknown',
      });
      setIsEditHistoryModalOpen(true);
    }
  }, [editSessions, previewPatches, departments]);
  // Focus target for auto-scroll/highlight
  const [focusTarget, setFocusTarget] = useState<
    | {
        date: string; // YYYY-MM-DD
        time?: string; // HH:mm (start of slot)
        scheduleId?: string;
      }
    | null
  >(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | "all">(
    "all"
  );
  const [typeFilter, setTypeFilter] = useState<ScheduleType | "all">("all");

  // editor mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalSelections, setOriginalSelections] = useState<
    Map<number, DepartmentSelections>
  >(new Map());
  const [editingDepartment, setEditingDepartment] = useState<number | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
  });

  const getWeekDates = useCallback(() => {
    const start = new Date(currentWeek);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [currentWeek]);

  const weekDates = getWeekDates();

  const getMonthCalendar = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDay = firstDay.getDay();
    startDay = (startDay + 6) % 7;
    const calendar: any[] = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0); // ngày cuối tháng trước
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      calendar.push({ date: day, isCurrentMonth: false, isPrevMonth: true });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push({ date: day, isCurrentMonth: true, isPrevMonth: false });
    }

    // Next month days
    const remaining = 42 - calendar.length;
    for (let day = 1; day <= remaining; day++) {
      calendar.push({ date: day, isCurrentMonth: false, isPrevMonth: false });
    }

    return calendar;
  }, [currentMonth]);

  const getCurrentDepartmentSelections =
    useCallback((): DepartmentSelections => {
      if (!selectedDepartment) {
        return { days: [], timeSlots: [] };
      }
      return (
        departmentSelections.get(selectedDepartment) || {
          days: [],
          timeSlots: [],
        }
      );
    }, [selectedDepartment, departmentSelections]);

  const updateDepartmentSelections = useCallback(
    (departmentId: number, selections: DepartmentSelections) => {
      console.log('[ScheduleApp] updateDepartmentSelections called:', { departmentId, selections });
      
      setDepartmentSelections((prev) => {
        const newMap = new Map(prev);
        
        // Check if this is a deselection (empty selections)
        const isEmptySelection = !selections.timeSlots || selections.timeSlots.length === 0;
        const hadPreviousSelections = prev.has(departmentId) && 
          prev.get(departmentId)?.timeSlots && 
          prev.get(departmentId)!.timeSlots.length > 0;
        
        if (isEmptySelection && hadPreviousSelections) {
          // User deselected all time slots for this department
          console.log('[ScheduleApp] User deselected all time slots for department:', departmentId);
          newMap.delete(departmentId);
        } else {
          newMap.set(departmentId, selections);
        }
        
        // Send cell selections to Redis for real-time collaboration
        if (user && isDataReady) {
          const currentSelections = Array.from(newMap.entries()).reduce((acc, [deptId, sel]) => {
            acc[deptId] = sel;
            return acc;
          }, {} as Record<string, any>);
          
          // Tạo danh sách các ô đang được chỉnh sửa
          const editingCells: string[] = [];
          for (const [deptId, selection] of newMap.entries()) {
            if (selection.timeSlots && selection.timeSlots.length > 0) {
              for (const timeSlot of selection.timeSlots) {
                const fieldId = makeTimeSlotFieldId(
                  timeSlot.day_of_week!, 
                  timeSlot.start_time, 
                  timeSlot.applicable_date
                );
                editingCells.push(fieldId);
              }
            }
          }
          
          const payload = {
            departmentSelections: currentSelections,
            selectedDepartment,
            activeView,
            editingCells, // Thêm thông tin các ô đang chỉnh sửa
            userId: user.id,
          };
          

          
          sendCellSelections(payload);
        } else {
          console.log('[ScheduleApp] Not sending cell selections:', { user: !!user, isDataReady });
        }
        
        return newMap;
      });
    },
    [user, isDataReady, selectedDepartment, activeView, sendCellSelections]
  );

  const turnOffBulk = useCallback(() => {
    setIsBulkMode(false);
    setBulkScheduleConfig((prev) => ({ ...prev, enabled: false }));
    setBulkPreview({ weeks: [], months: [] });
  }, []);

  // Clear only local state without sending to Redis
  const clearLocalSelections = useCallback(() => {
    console.log('[ScheduleApp] Clearing local selections only');
    setDepartmentSelections(new Map());
    setSelectedDepartment(null);
    turnOffBulk();
  }, [turnOffBulk]);

  // ✅ THÊM: Handler chuyên dụng để xóa chỉ selections của chính mình
  const handleClearAllMine = useCallback(() => {
    console.log('[ScheduleApp] handleClearAllMine: Clearing only own selections');
    
    // ✅ SỬA: Xóa hoàn toàn tất cả selections của user hiện tại
    const currentSelections = getCurrentDepartmentSelections();
    const allFieldIds: string[] = [];
    
    // Thu thập tất cả fieldIds cần clear
    if (currentSelections.timeSlots.length > 0) {
      currentSelections.timeSlots.forEach(slot => {
        if (slot.day_of_week) {
          const weekDates = getWeekDates();
          const dayIndex = dowToUi(slot.day_of_week);
          const specificDate = slot.applicable_date || weekDates[dayIndex]?.toISOString().split("T")[0];
          const fieldId = makeTimeSlotFieldId(dayIndex, slot.start_time, specificDate);
          allFieldIds.push(fieldId);
        }
      });
    }
    
    if (currentSelections.days.length > 0) {
      currentSelections.days.forEach(day => {
        const fieldId = `day-${day.date}-${day.month}-${day.year}`;
        allFieldIds.push(fieldId);
      });
    }
    
    console.log('[ScheduleApp] Clearing fieldIds:', allFieldIds);
    
    // 1) Xóa local state của chính mình
    setDepartmentSelections(new Map());
    setSelectedDepartment(null);
    setIsBulkMode(false);
    setBulkScheduleConfig(prev => ({ ...prev, enabled: false }));
    setBulkPreview({ weeks: [], months: [] });
    
    // ✅ SỬA: Reset drag states
    setDragState({
      isDragging: false,
      startSlot: null,
      currentSlot: null,
      isSelecting: false,
    });
    
    setMonthlyDragState({
      isDragging: false,
      startDay: null,
      currentDay: null,
      isSelecting: false,
    });

    // ✅ SỬA: Xóa hoàn toàn local storage
    try {
      // Xóa key chính
      localStorage.removeItem(storageKey);
      console.log('[ScheduleApp] Cleared main storage key:', storageKey);
      
      // ✅ SỬA: Không cần flag, sẽ xóa hoàn toàn Redis
      
      // ✅ THÊM: Xóa tất cả keys liên quan đến schedule selections
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('schedule:selections') ||
          key.includes('schedule:selections') ||
          key.includes('schedule:bulk') ||
          key.includes('schedule:config')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Xóa tất cả keys tìm thấy
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('[ScheduleApp] Cleared related storage key:', key);
      });
      
      console.log('[ScheduleApp] Total cleared keys:', keysToRemove.length + 1);
    } catch (error) {
      console.error('[ScheduleApp] Error clearing local storage:', error);
    }

    // ✅ SỬA: Clear tất cả edit sessions và selections trong Redis
    if (clearMySelections) {
      console.log('[ScheduleApp] Clearing all edit sessions and selections in Redis');
      clearMySelections('explicit');
    }

    // ✅ SỬA: Gửi payload rỗng để xóa hết selections trong Redis
    const emptyPayload = {
      departmentSelections: {},
      selectedDepartment: null,
      activeView,
    };
    
    // Gửi payload rỗng để xóa hết selections trong Redis
    sendCellSelections(emptyPayload);
    
    // ✅ THÊM: Đợi một chút rồi gửi lại để đảm bảo Redis đã clear
    setTimeout(() => {
      sendCellSelections(emptyPayload);
    }, 100);

    toast.success("Đã xóa tất cả các ô bạn đang chọn.");
  }, [sendCellSelections, activeView, setDepartmentSelections, setSelectedDepartment, setIsBulkMode, setBulkScheduleConfig, setBulkPreview, user, storageKey, clearMySelections, getCurrentDepartmentSelections, getWeekDates, makeTimeSlotFieldId, dowToUi]);

  // Utils for focus/scroll
  const formatDateStr = useCallback((d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Auto-scroll to target cell when focusTarget or view changes
  useEffect(() => {
    if (!focusTarget) return;

    const tryScroll = () => {
      if (activeView === "week" && focusTarget.time) {
        const el = document.querySelector(
          `[data-slot-date="${focusTarget.date}"][data-time="${focusTarget.time}"]`
        ) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (activeView === "month") {
        const el = document.querySelector(
          `[data-day-date="${focusTarget.date}"]`
        ) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };

    // Run after paint
    const t1 = setTimeout(tryScroll, 50);
    const t2 = setTimeout(tryScroll, 200); // retry once more in case of late paint

    // Clear highlight after a moment
    const clear = setTimeout(() => setFocusTarget(null), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(clear);
    };
  }, [focusTarget, activeView, currentWeek, currentMonth]);

  const canOpenBulk = useMemo(() => {
    if (!selectedDepartment || !isDepartmentEditable(selectedDepartment))
      return false;
    const sel = getCurrentDepartmentSelections();
    return activeView === "week"
      ? sel.timeSlots.length > 0 // cần có khung giờ
      : sel.days.length > 0; // cần có ngày
  }, [
    selectedDepartment,
    isDepartmentEditable,
    getCurrentDepartmentSelections,
    activeView,
  ]);

  const getAllSelections = useCallback(() => {
    const allDays: SelectedDay[] = [];
    const allTimeSlots: TimeSlot[] = [];

    departmentSelections.forEach((selections, deptId) => {
      // ✅ CHỈ TÍNH CÁC DEPARTMENT ĐANG VISIBLE
      if (visibleDepartments.includes(deptId)) {
        allDays.push(...selections.days);
        allTimeSlots.push(...selections.timeSlots);
      }
    });

    return { allDays, allTimeSlots };
  }, [departmentSelections, visibleDepartments]);

  const isPastDay = useCallback((date: number, month: number, year: number) => {
    const slotDate = new Date(year, month, date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    slotDate.setHours(0, 0, 0, 0);
    return slotDate < today;
  }, []);

  const isPastTimeSlot = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      const now = new Date();
      let slotDate: Date;

      if (specificDate) {
        slotDate = new Date(specificDate);
      } else {
        const weekDates = getWeekDates();
        slotDate = weekDates[dayIndex];
      }

      // Tính thời gian kết thúc của khung giờ
      const timeIndex = timeSlots.indexOf(time);
      const endTime = timeSlots[timeIndex + 1] || LAST_SLOT_END;

      const [endHours, endMinutes] = endTime.split(":").map(Number);
      const slotEndDateTime = new Date(slotDate);
      slotEndDateTime.setHours(endHours, endMinutes, 0, 0);

      // Chỉ chặn khi khung giờ đã hoàn toàn kết thúc
      return slotEndDateTime <= now;
    },
    [getWeekDates]
  );

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const matchesSearch =
        schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || schedule.status === statusFilter;
      const matchesType =
        typeFilter === "all" || schedule.schedule_type === typeFilter;
      const departmentId = schedule.department?.id;
      const matchesDepartment =
        typeof departmentId === "number" &&
        visibleDepartments.includes(departmentId);

      return matchesSearch && matchesStatus && matchesType && matchesDepartment;
    });
  }, [schedules, searchTerm, statusFilter, typeFilter, visibleDepartments]);

  // Find earliest occurrence date (and time for weekly) of a schedule
  const getFirstOccurrence = useCallback(
    (schedule: DepartmentSchedule): { date: Date; time?: string } | null => {
      if (schedule.schedule_type === ScheduleType.DAILY_DATES) {
        const cfg = schedule.schedule_config as DailyDatesConfig;
        if (!cfg.dates.length) return null;
        // Pick earliest by year/month/day
        const sorted = [...cfg.dates].sort((a, b) => {
          const ay = a.year ?? new Date().getFullYear();
          const by = b.year ?? new Date().getFullYear();
          if (ay !== by) return ay - by;
          if (a.month !== b.month) return a.month - b.month;
          return a.day_of_month - b.day_of_month;
        });
        const d0 = sorted[0];
        const y = d0.year ?? new Date().getFullYear();
        return { date: new Date(y, d0.month - 1, d0.day_of_month) };
      } else {
        const cfg = schedule.schedule_config as HourlySlotsConfig;
        if (!cfg.slots.length) return null;
        // Prefer specific_date slots first, else next upcoming in current week by day_of_week
        const specific = cfg.slots
          .filter((s) => !!s.applicable_date)
          .sort((a, b) => a.applicable_date!.localeCompare(b.applicable_date!));
        if (specific.length) {
          const d = new Date(specific[0].applicable_date!);
          return { date: d, time: specific[0].start_time };
        }
        // Fall back: pick the smallest day_of_week then use current week date
        const generic = [...cfg.slots].sort((a, b) => a.day_of_week - b.day_of_week);
        const s0 = generic[0];
        const week = getWeekDates();
        const uiIdx = dowToUi(s0.day_of_week); // 0..6
        return { date: week[uiIdx], time: s0.start_time };
      }
    }, [getWeekDates]
  );

  const focusScheduleInCalendar = useCallback(
    (schedule: DepartmentSchedule) => {
      const occ = getFirstOccurrence(schedule);
      if (!occ) return;
      const dateStr = formatDateStr(occ.date);
      if (schedule.schedule_type === ScheduleType.DAILY_DATES) {
        setActiveView("month");
        // Ensure currentMonth matches the occurrence month
        setCurrentMonth(new Date(occ.date.getFullYear(), occ.date.getMonth(), 1));
        setFocusTarget({ date: dateStr, scheduleId: schedule.id });
      } else {
        setActiveView("week");
        // Ensure currentWeek covers the occurrence date
        setCurrentWeek(new Date(occ.date));
        setFocusTarget({ date: dateStr, time: occ.time, scheduleId: schedule.id });
      }
    }, [getFirstOccurrence, formatDateStr, setActiveView, setCurrentMonth, setCurrentWeek, setFocusTarget]
  );

  const getSchedulesForDay = useCallback(
    (date: number, month: number, year: number) => {
      return filteredSchedules.filter((schedule) => {
        if (schedule.schedule_type !== ScheduleType.DAILY_DATES) return false;

        const config = schedule.schedule_config as DailyDatesConfig;
        return config.dates.some(
          (d) =>
            d.day_of_month === date &&
            (d.month === month + 1 || !d.month) &&
            (d.year === year || !d.year)
        );
      });
    },
    [filteredSchedules]
  );

  const isDayHasExistingSchedule = useCallback(
    (date: number, month: number, year: number) => {
      const daySchedules = getSchedulesForDay(date, month, year);
      // Kiểm tra xem có schedule nào của chính phòng ban đang chọn không
      // Nếu đang edit, loại trừ schedule đang edit
      return daySchedules.some(
        (schedule) =>
          schedule.department &&
          schedule.department.id === selectedDepartment &&
          schedule.status === ScheduleStatus.ACTIVE &&
          // ✅ THÊM: Loại trừ schedule đang edit
          (!isEditMode ||
            !editingSchedule ||
            Number(schedule.id) !== Number(editingSchedule.id))
      );
    },
    [getSchedulesForDay, selectedDepartment, isEditMode, editingSchedule]
  );

  // ✅ THÊM: Kiểm tra xem ngày có bị chặn bởi lịch đã có không (bất kỳ phòng ban nào)
  const isDayBlockedByExistingSchedule = useCallback(
    (date: number, month: number, year: number) => {
      const daySchedules = getSchedulesForDay(date, month, year);
      return daySchedules.some(
        (schedule) =>
          schedule.status === ScheduleStatus.ACTIVE
      );
    },
    [getSchedulesForDay]
  );

  const isDayConflicted = useCallback(
    (date: number, month: number, year: number) => {
      if (isPastDay(date, month, year)) {
        return true;
      }
      const daySchedules = getSchedulesForDay(date, month, year);
      // Nếu có schedule từ phòng ban khác (không phải phòng ban đang chọn)
      return daySchedules.some(
        (schedule) =>
          schedule.department &&
          schedule.department.id !== selectedDepartment &&
          schedule.status === ScheduleStatus.ACTIVE
      );
    },
    [getSchedulesForDay, selectedDepartment, isPastDay]
  );

  // Event handlers
  const handleDayClick = useCallback(
    (date: number, isCurrentMonth: boolean) => {
      // Kiểm tra quyền thao tác
      if (!selectedDepartment || !isDepartmentEditable(selectedDepartment)) {
        if (!selectedDepartment) {
          toast.error("Vui lòng chọn phòng ban trước");
        } else {
          toast.error("Bạn không có quyền thao tác phòng ban này");
        }
        return;
      }

      if (!isCurrentMonth || !selectedDepartment) {
        if (!selectedDepartment) {
          toast.error("Vui lòng chọn phòng ban trước");
        }
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      if (isPastDay(date, month, year)) {
        toast.error("Không thể chọn ngày đã qua");
        return;
      }

      if (isDayConflicted(date, month, year)) {
        toast.error(
          "Không thể chọn ngày này vì đã có lịch hoạt động của phòng ban khác"
        );
        return;
      }
      if (isDayHasExistingSchedule(date, month, year)) {
        toast.error(
          "Ngày này đã có lịch hoạt động trong hệ thống, không thể chỉnh sửa"
        );
        return;
      }
      
      // ✅ THÊM: Kiểm tra ngày bị chặn bởi lịch đã có (bất kỳ phòng ban nào)
      if (isDayBlockedByExistingSchedule(date, month, year)) {
        toast.error(
          "Ngày này đã có lịch hoạt động của phòng ban khác, không thể chỉnh sửa"
        );
        return;
      }

      const currentSelections = getCurrentDepartmentSelections();

      const existingIndex = currentSelections.days.findIndex(
        (day) => day.date === date && day.month === month && day.year === year
      );

      let newDays: SelectedDay[];
      if (existingIndex !== -1) {
        // ✅ THÊM: Nếu đã chọn rồi thì xóa đi (toggle)
        newDays = currentSelections.days.filter(
          (_, index) => index !== existingIndex
        );
        toast.success("Đã xóa ngày này khỏi lịch");
      } else {
        // ✅ THÊM: Nếu chưa chọn thì thêm vào
        newDays = [
          ...currentSelections.days,
          { date, month, year, department_id: selectedDepartment },
        ];
        toast.success("Đã thêm ngày này vào lịch");
      }

      updateDepartmentSelections(selectedDepartment, {
        ...currentSelections,
        days: newDays,
      });
    },
    [
      isAdmin,
      selectedDepartment,
      currentMonth,
      isPastDay,
      isDayConflicted,
      isDayHasExistingSchedule,
      getCurrentDepartmentSelections,
      updateDepartmentSelections,
    ]
  );

  const isDaySelected = useCallback(
    (date: number, month: number, year: number) => {
      const currentSelections = getCurrentDepartmentSelections();
      return currentSelections.days.some(
        (day) => day.date === date && day.month === month && day.year === year
      );
    },
    [getCurrentDepartmentSelections]
  );

  const isDaySelectedByAnyDept = useCallback(
    (date: number, month: number, year: number) => {
      // Check local selections first
      for (const [deptId, selections] of departmentSelections) {
        if (
          selections.days &&
          selections.days.some(
            (day) =>
              day.date === date && day.month === month && day.year === year
          )
        ) {
          return { isSelected: true, departmentId: deptId, userId: user?.id };
        }
      }

      // Check remote selections from Redis
      for (const [userId, remoteSelections] of cellSelections) {
        if (userId === user?.id) continue; // Skip own selections
        
        const remoteDeptSelections = remoteSelections.departmentSelections;
        if (!remoteDeptSelections) continue;

        for (const [deptId, selections] of Object.entries(remoteDeptSelections)) {
          const typedSelections = selections as any;
          if (typedSelections.days && typedSelections.days.some(
            (day: any) =>
              day.date === date && day.month === month && day.year === year
          )) {
            return { isSelected: true, departmentId: parseInt(deptId), userId };
          }
        }
      }
      
      return { isSelected: false, departmentId: null, userId: null };
    },
    [departmentSelections, cellSelections, user]
  );

  // Handler cho mouse up
  const handleDayMouseUp = useCallback(() => {
    if (!monthlyDragState.isDragging || !selectedDepartment) return;

    const currentSelections = getCurrentDepartmentSelections();
    const range = getMonthlyDragSelectionRange();

    let newDays = [...currentSelections.days];

    if (monthlyDragState.isSelecting) {
      // ✅ THÊM: Logic toggle selection - Nếu ngày đã chọn thì xóa, nếu chưa chọn thì thêm
      range.forEach(({ date, month, year }) => {
        const exists = newDays.some(
          (day) => day.date === date && day.month === month && day.year === year
        );
        if (exists) {
          // Nếu ngày đã chọn thì xóa (toggle off)
          newDays = newDays.filter(
            (day) =>
              !(day.date === date && day.month === month && day.year === year)
          );
        } else {
          // Nếu ngày chưa chọn thì thêm (toggle on)
          newDays.push({
            date,
            month,
            year,
            department_id: selectedDepartment,
          });
        }
      });
    } else {
      // ✅ THÊM: Logic toggle selection ngược lại - Nếu ngày đã chọn thì xóa, nếu chưa chọn thì thêm
      range.forEach(({ date, month, year }) => {
        const exists = newDays.some(
          (day) => day.date === date && day.month === month && day.year === year
        );
        if (exists) {
          // Nếu ngày đã chọn thì xóa (toggle off)
          newDays = newDays.filter(
            (day) =>
              !(day.date === date && day.month === month && day.year === year)
          );
        } else {
          // Nếu ngày chưa chọn thì thêm (toggle on)
          newDays.push({
            date,
            month,
            year,
            department_id: selectedDepartment,
          });
        }
      });
    }

    // ✅ THÊM: Xóa edit sessions và clear selections trong Redis cho các ngày bị toggle off
    const removedDays: string[] = [];
    const addedDays: string[] = [];
    
    // So sánh selections cũ và mới để xác định ngày nào bị xóa
    currentSelections.days.forEach(oldDay => {
      const exists = newDays.some(newDay => 
        newDay.date === oldDay.date &&
        newDay.month === oldDay.month &&
        newDay.year === oldDay.year
      );
      
      if (!exists) {
        // Ngày này bị xóa - tạo fieldId để clear
        const fieldId = `day-${oldDay.date}-${oldDay.month}-${oldDay.year}`;
        removedDays.push(fieldId);
      }
    });
    
    // So sánh selections mới và cũ để xác định ngày nào được thêm
    newDays.forEach(newDay => {
      const exists = currentSelections.days.some(oldDay => 
        oldDay.date === newDay.date &&
        oldDay.month === newDay.month &&
        oldDay.year === newDay.year
      );
      
      if (!exists) {
        // Ngày này được thêm - tạo fieldId để track
        const fieldId = `day-${newDay.date}-${newDay.month}-${newDay.year}`;
        addedDays.push(fieldId);
      }
    });
    
    // Cập nhật selections trong localStorage
    updateDepartmentSelections(selectedDepartment, {
      ...currentSelections,
      days: newDays,
    });
    
    // ✅ THÊM: Clear edit sessions và selections trong Redis cho các ngày bị xóa
    if (removedDays.length > 0 && clearMySelections) {
      console.log('[ScheduleApp] Clearing edit sessions for removed days:', removedDays);
      clearMySelections('explicit', removedDays);
    }
    
    // ✅ THÊM: Start edit sessions trong Redis cho các ngày được thêm
    if (addedDays.length > 0) {
      addedDays.forEach(fieldId => {
        startEditSession(fieldId, 'calendar_cell', {
          userId: user?.id,
          userName: user?.fullName || user?.nickName || user?.username || 'Unknown',
          departmentId: selectedDepartment,
          departmentName: departments.find(d => d.id === selectedDepartment)?.name || 'Unknown',
          avatar_zalo: user?.avatarZalo,
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30000).toISOString(),
        });
      });
    }

    setMonthlyDragState({
      isDragging: false,
      startDay: null,
      currentDay: null,
      isSelecting: false,
    });
  }, [
    monthlyDragState,
    selectedDepartment,
    getCurrentDepartmentSelections,
    updateDepartmentSelections,
    clearMySelections,
    startEditSession,
    user,
    departments,
  ]);

  // Schedule operations
  const checkConflicts = useCallback(
    (
      allDays: SelectedDay[],
      allTimeSlots: TimeSlot[],
      excludeScheduleId?: number
    ): ConflictInfo | null => {
      const conflictingSchedules: DepartmentSchedule[] = [];

      schedules.forEach((schedule) => {
        if (excludeScheduleId && Number(schedule.id) === excludeScheduleId)
          return;
        if (schedule.status !== ScheduleStatus.ACTIVE) return;

        if (schedule.schedule_type === ScheduleType.DAILY_DATES) {
          const config = schedule.schedule_config as DailyDatesConfig;
          const hasConflict = allDays.some(
            (day) =>
              config.dates.some(
                (date) =>
                  date.day_of_month === day.date &&
                  (date.month === day.month + 1 || !date.month)
              ) &&
              schedule.department &&
              day.department_id === schedule.department.id
          );

          if (hasConflict) {
            conflictingSchedules.push(schedule);
          }
        } else if (schedule.schedule_type === ScheduleType.HOURLY_SLOTS) {
          const config = schedule.schedule_config as HourlySlotsConfig;
          const hasConflict = allTimeSlots.some((slot) =>
            config.slots.some((existingSlot) => {
              const slotStart = slot.start_time;
              const slotEnd = slot.end_time;
              const existingStart = existingSlot.start_time;
              const existingEnd = existingSlot.end_time;

              const timeOverlap =
                slotStart < existingEnd && slotEnd > existingStart;
              const dayMatch =
                slot.day_of_week === existingSlot.day_of_week ||
                !existingSlot.day_of_week;

              const dateMatch =
                !existingSlot.applicable_date ||
                !slot.applicable_date ||
                existingSlot.applicable_date === slot.applicable_date;

              return (
                timeOverlap &&
                dayMatch &&
                dateMatch &&
                schedule.department &&
                slot.department_id === schedule.department.id
              );
            })
          );

          if (hasConflict) {
            conflictingSchedules.push(schedule);
          }
        }
      });

      if (conflictingSchedules.length > 0) {
        const conflictingDepartments = departments.filter((dept) =>
          conflictingSchedules.some(
            (schedule) =>
              schedule.department && schedule.department.id === dept.id
          )
        );

        return {
          type: allDays.length > 0 ? "date" : "time",
          conflicting_schedules: conflictingSchedules,
          departments: conflictingDepartments,
        };
      }

      return null;
    },
    [schedules, departments]
  );

  const formatTimeRange = (startTime: string, endTime: string) => {
    const formatTime12Hour = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      const period = hours < 12 ? "SA" : hours === 12 ? "TR" : "CH";
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
    };

    return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
  };

  // Sử dụng trong component
  const getTimeSlotDisplay = (time: string, index: number) => {
    const nextTime = timeSlots[index + 1] || LAST_SLOT_END;
    return formatTimeRange(time, nextTime);
  };

  const handleSaveSchedule = async () => {
    const { allDays, allTimeSlots } = getAllSelections();

    if (allDays.length === 0 && allTimeSlots.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ngày hoặc khung giờ");
      return;
    }

    console.log("Final selections before save:", {
      allDays: allDays.length,
      allTimeSlots: allTimeSlots.length,
      departmentSelections: Array.from(departmentSelections.entries()),
    });

    const conflicts = checkConflicts(
      allDays,
      allTimeSlots,
      editingSchedule?.id ? Number(editingSchedule.id) : undefined
    );
    if (conflicts) {
      setConflictInfo(conflicts);
      setIsConflictDialogOpen(true);
      return;
    }

    await saveScheduleWithoutConflictCheck();
  };
  // Cập nhật hàm edit schedule
  const handleEditSchedule = useCallback(
    (schedule: DepartmentSchedule) => {
      console.log(
        `[EditSchedule Debug] Attempting to edit schedule for department ${
          schedule.department!.id
        }:`,
        {
          isDataReady,
          isLoadingDepartments,
          departmentsLength: departments.length,
          user: user?.id,
          isAdmin,
          isScheduler,
          isManager,
          userManagerDepartmentSlugs,
          isDepartmentEditable: isDepartmentEditable(schedule.department!.id),
        }
      );

      if (!isDepartmentEditable(schedule.department!.id)) {
        // Nếu data chưa sẵn sàng, cho user biết
        if (!isDataReady) {
          toast.error("Đang tải thông tin, vui lòng thử lại sau");
        } else {
          toast.error("Bạn không có quyền chỉnh sửa lịch hoạt động này");
        }
        return;
      }

      setEditingSchedule(schedule);
      setIsEditMode(true);

      if (schedule.schedule_type === ScheduleType.DAILY_DATES) {
        setActiveView("month");
        toast.info("Đã chuyển sang lịch tháng để chỉnh sửa ngày");
      } else if (schedule.schedule_type === ScheduleType.HOURLY_SLOTS) {
        setActiveView("week");
        toast.info("Đã chuyển sang lịch tuần để chỉnh sửa khung giờ");
      }

      // Backup selections hiện tại
      setOriginalSelections(new Map(departmentSelections));

      // Load data cho editing
      const newSelections = new Map();

      if (schedule.schedule_type === ScheduleType.DAILY_DATES) {
        const config = schedule.schedule_config as DailyDatesConfig;
        newSelections.set(schedule.department!.id, {
          days: config.dates.map((date) => ({
            date: date.day_of_month,
            month: date.month ? date.month - 1 : currentMonth.getMonth(),
            year: date.year || currentMonth.getFullYear(),
            department_id: schedule.department!.id,
          })),
          timeSlots: [],
        });
        if (config.dates.length > 0) {
          const firstDate = config.dates[0];
          if (firstDate.month && firstDate.year) {
            setCurrentMonth(new Date(firstDate.year, firstDate.month - 1));
          }
        }
      } else {
        const config = schedule.schedule_config as HourlySlotsConfig;
        newSelections.set(schedule.department!.id, {
          days: [],
          timeSlots: config.slots.map((slot) => ({
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            department_id: schedule.department!.id,
            applicable_date: slot.applicable_date,
          })),
        });
      }

      setDepartmentSelections(newSelections);
      setSelectedDepartment(schedule.department!.id);
      setEditingDepartment(schedule.department!.id);

      setFormData({
        name: schedule.name,
        description: schedule.description || "",
        start_time: "",
        end_time: "",
      });

      setIsCreateDialogOpen(true);

      toast.success(
        "Đã vào chế độ chỉnh sửa. Bạn có thể thay đổi lịch trên calendar và thông tin trong form."
      );
    },
    [
      isDataReady,
      isDepartmentEditable,
      isAdmin,
      isScheduler,
      isManager,
      userManagerDepartmentSlugs,
      departments,
      user,
      isLoadingDepartments,
      departmentSelections,
      currentMonth,
    ]
  );

  // Thêm hàm để thay đổi department trong edit mode
  const handleChangeDepartmentInEdit = useCallback(
    (newDepartmentId: number) => {
      if (!isEditMode || !editingSchedule) return;

      const currentSelections = departmentSelections.get(editingDepartment!);
      if (!currentSelections) return;

      // Xóa selections cũ
      const newDepartmentSelections = new Map(departmentSelections);
      newDepartmentSelections.delete(editingDepartment!);

      // Thêm selections mới với department mới
      const updatedSelections = {
        days: currentSelections.days.map((day) => ({
          ...day,
          department_id: newDepartmentId,
        })),
        timeSlots: currentSelections.timeSlots.map((slot) => ({
          ...slot,
          department_id: newDepartmentId,
        })),
      };

      newDepartmentSelections.set(newDepartmentId, updatedSelections);
      setDepartmentSelections(newDepartmentSelections);
      setEditingDepartment(newDepartmentId);
      setSelectedDepartment(newDepartmentId);

      toast.success(
        `Đã chuyển lịch sang phòng ban: ${
          departments.find((d) => d.id === newDepartmentId)?.name
        }`
      );
    },
    [
      isEditMode,
      editingSchedule,
      editingDepartment,
      departmentSelections,
      departments,
    ]
  );

  const saveScheduleWithoutConflictCheck = async () => {
    try {
      setIsSavingSchedule(true);

      if (isEditMode && editingSchedule) {
        // Update existing schedule
        await ScheduleService.remove(editingSchedule.id);
      }

      const promises: Promise<any>[] = [];
      let totalSchedulesCreated = 0;

      departmentSelections.forEach((selections, departmentId) => {
        if (selections.days.length === 0 && selections.timeSlots.length === 0)
          return;

        const department = departments.find((d) => d.id === departmentId);
        if (!department) return;

        // Group by applicable dates for bulk naming
        if (selections.timeSlots.length > 0) {
          const groupedByDate = selections.timeSlots.reduce((acc, slot) => {
            const dateKey = slot.applicable_date || "general";
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(slot);
            return acc;
          }, {} as Record<string, TimeSlot[]>);

          Object.entries(groupedByDate).forEach(([dateKey, slots]) => {
            const scheduleName = isBulkMode
              ? `${formData.name || "Lịch hàng loạt"} - ${department.name} (${
                  dateKey !== "general"
                    ? new Date(dateKey).toLocaleDateString("vi-VN")
                    : "Tổng quát"
                })`
              : `${formData.name || `Lịch khung giờ - ${department.name}`}`;

            const scheduleData: CreateDepartmentScheduleDto = {
              name: scheduleName,
              description:
                formData.description ||
                `Lịch hoạt động khung giờ cho ${department.name}${
                  isBulkMode ? " (Tạo hàng loạt)" : ""
                }`,
              department_id: departmentId,
              status: ScheduleStatus.ACTIVE,
              schedule_type: ScheduleType.HOURLY_SLOTS,
              schedule_config: {
                type: "hourly_slots",
                slots: slots.map((slot) => ({
                  day_of_week: slot.day_of_week,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  applicable_date:
                    slot.applicable_date ||
                    (() => {
                      const weekDates = getWeekDates();
                      const targetDayIndex = dowToUi(slot.day_of_week!);
                      const applicableDate =
                        getWeekDates()[targetDayIndex] || new Date();
                      return applicableDate.toISOString().split("T")[0];
                    })(),
                  activity_description: formData.description,
                })),
              } as HourlySlotsConfig,
            };

            promises.push(ScheduleService.create(scheduleData));
            totalSchedulesCreated++;
          });
        }

        if (selections.days.length > 0) {
          const scheduleName = isBulkMode
            ? `${formData.name || "Lịch hàng loạt"} - ${department.name} (${
                selections.days.length
              } ngày)`
            : `${formData.name || `Lịch theo ngày - ${department.name}`}`;

          const scheduleData: CreateDepartmentScheduleDto = {
            name: scheduleName,
            description:
              formData.description ||
              `Lịch hoạt động theo ngày cho ${department.name}${
                isBulkMode ? " (Tạo hàng loạt)" : ""
              }`,
            department_id: departmentId,
            status: ScheduleStatus.ACTIVE,
            schedule_type: ScheduleType.DAILY_DATES,
            schedule_config: {
              type: "daily_dates",
              dates: selections.days.map((day) => ({
                day_of_month: day.date,
                month: day.month + 1,
                year: day.year,
                activity_description: formData.description,
              })),
            } as DailyDatesConfig,
          };

          promises.push(ScheduleService.create(scheduleData));
          totalSchedulesCreated++;
        }
      });

      await Promise.all(promises);

      // Reset states
      setDepartmentSelections(new Map());
      setSelectedDepartment(null);
      setEditingSchedule(null);
      setIsEditMode(false);
      setEditingDepartment(null);
      setOriginalSelections(new Map());
      setIsBulkMode(false);
      setBulkScheduleConfig({
        enabled: false,
        type: "weeks",
        count: 1,
        skipWeekends: true,
        skipConflicts: true,
      });
      setBulkPreview({ weeks: [], months: [] });
      setFormData({ name: "", description: "", start_time: "", end_time: "" });
      setIsCreateDialogOpen(false);

      // Refresh data
      const data = await ScheduleService.findAll();
      setSchedules(data.data);

      toast.success(
        isBulkMode
          ? `Tạo thành công ${totalSchedulesCreated} lịch hàng loạt!`
          : isEditMode
          ? "Cập nhật lịch hoạt động thành công!"
          : "Lưu lịch hoạt động thành công!"
      );
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(
        isBulkMode
          ? "Không thể tạo lịch hàng loạt"
          : isEditMode
          ? "Không thể cập nhật lịch hoạt động"
          : "Không thể lưu lịch hoạt động"
      );
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Helper functions
  const getSchedulesForSlot = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      const dayOfWeek = uiToDow(dayIndex);
      return filteredSchedules.filter((schedule) => {
        if (schedule.schedule_type !== ScheduleType.HOURLY_SLOTS) return false;

        const config = schedule.schedule_config as HourlySlotsConfig;
        return config.slots.some((slot) => {
          const timeMatch = slot.start_time <= time && slot.end_time > time;
          const dayMatch = slot.day_of_week === dayOfWeek || !slot.day_of_week;
          // ✅ THÊM: Kiểm tra applicable_date
          const dateMatch =
            !slot.applicable_date ||
            !specificDate ||
            slot.applicable_date === specificDate;

          return timeMatch && dayMatch && dateMatch;
        });
      });
    },
    [filteredSchedules]
  );

  const isSlotHasExistingSchedule = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      const slotSchedules = getSchedulesForSlot(dayIndex, time, specificDate);
      // Kiểm tra xem có schedule nào của chính phòng ban đang chọn không
      // Nếu đang edit, loại trừ schedule đang edit
      return slotSchedules.some(
        (schedule) =>
          schedule.department &&
          schedule.department.id === selectedDepartment &&
          schedule.status === ScheduleStatus.ACTIVE &&
          // ✅ THÊM: Loại trừ schedule đang edit
          (!isEditMode ||
            !editingSchedule ||
            Number(schedule.id) !== Number(editingSchedule.id))
      );
    },
    [getSchedulesForSlot, selectedDepartment, isEditMode, editingSchedule]
  );

  // ✅ THÊM: Kiểm tra xem ô có bị chặn bởi lịch đã có không (bất kỳ phòng ban nào)
  const isSlotBlockedByExistingSchedule = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      const slotSchedules = getSchedulesForSlot(dayIndex, time, specificDate);
      return slotSchedules.some(
        (schedule) =>
          schedule.status === ScheduleStatus.ACTIVE
      );
    },
    [getSchedulesForSlot]
  );

  const isSlotBlockedByHiddenDepartment = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      const dayOfWeek = uiToDow(dayIndex);

      // Kiểm tra selections từ phòng ban bị ẩn
      for (const [deptId, selections] of departmentSelections) {
        if (!visibleDepartments.includes(deptId)) {
          const hasSelection = selections.timeSlots.some(
            (slot) =>
              slot.day_of_week === dayOfWeek &&
              slot.start_time === time &&
              (!slot.applicable_date ||
                !specificDate ||
                slot.applicable_date === specificDate)
          );
          if (hasSelection) return { isBlocked: true, departmentId: deptId };
        }
      }

      const allSchedulesForThisSlot = schedules.filter((schedule) => {
        if (schedule.schedule_type !== ScheduleType.HOURLY_SLOTS) return false;

        const config = schedule.schedule_config as HourlySlotsConfig;
        return config.slots.some((slot) => {
          const timeMatch = slot.start_time <= time && slot.end_time > time;
          const dayMatch = slot.day_of_week === dayOfWeek || !slot.day_of_week;
          // ✅ THÊM: Kiểm tra applicable_date
          const dateMatch =
            !slot.applicable_date ||
            !specificDate ||
            slot.applicable_date === specificDate;

          return timeMatch && dayMatch && dateMatch;
        });
      });

      // Kiểm tra xem có schedule nào của phòng ban bị ẩn không
      const hiddenScheduleForThisSlot = allSchedulesForThisSlot.find(
        (schedule) =>
          schedule.department &&
          !visibleDepartments.includes(schedule.department.id) &&
          schedule.status === ScheduleStatus.ACTIVE
      );

      if (hiddenScheduleForThisSlot) {
        return {
          isBlocked: true,
          departmentId: hiddenScheduleForThisSlot.department!.id,
        };
      }

      return { isBlocked: false, departmentId: null };
    },
    [departmentSelections, visibleDepartments, schedules]
  );

  const isDayBlockedByHiddenDepartment = useCallback(
    (date: number, month: number, year: number) => {
      // Kiểm tra selections từ phòng ban bị ẩn
      for (const [deptId, selections] of departmentSelections) {
        if (!visibleDepartments.includes(deptId)) {
          const hasSelection = selections.days.some(
            (day) =>
              day.date === date && day.month === month && day.year === year
          );
          if (hasSelection) return { isBlocked: true, departmentId: deptId };
        }
      }

      // ✅ SỬA LOGIC KIỂM TRA SCHEDULES CHO NGÀY CỤ THỂ
      const daySchedules = schedules.filter((schedule) => {
        if (schedule.schedule_type !== ScheduleType.DAILY_DATES) return false;

        const config = schedule.schedule_config as DailyDatesConfig;
        return config.dates.some(
          (d) =>
            d.day_of_month === date &&
            (d.month === month + 1 || !d.month) &&
            (d.year === year || !d.year)
        );
      });

      const hiddenSchedule = daySchedules.find(
        (schedule) =>
          schedule.department &&
          !visibleDepartments.includes(schedule.department.id) &&
          schedule.status === ScheduleStatus.ACTIVE
      );

      if (hiddenSchedule) {
        return { isBlocked: true, departmentId: hiddenSchedule.department!.id };
      }

      return { isBlocked: false, departmentId: null };
    },
    [departmentSelections, visibleDepartments, schedules]
  );

  const handleDayMouseDown = useCallback(
    (date: number, isCurrentMonth: boolean, e: React.MouseEvent) => {
      e.preventDefault();

      if (
        !isCurrentMonth ||
        !selectedDepartment ||
        !isDepartmentEditable(selectedDepartment)
      ) {
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const currentDate = new Date(year, month, date);
      const isSunday = currentDate.getDay() === 0;

      const { isBlocked: isBlockedByHidden } = isDayBlockedByHiddenDepartment(
        date,
        month,
        year
      );

      // ✅ THÊM: Kiểm tra ngày đang được chỉnh sửa bởi user khác
      const fieldId = `day-${date}-${month}-${year}`;
      const lockedBy = getFieldLockedBy(fieldId);
      
      if (lockedBy) {
        if (lockedBy.userId === user?.id) {
          // Nếu chính mình đang chọn ngày này, thì cho phép bắt đầu drag để quét
          console.log('[ScheduleApp] User starting drag from own selected day, will toggle selection during drag');
          // Không xóa ngay - để cho phép drag để quét
          // Logic toggle sẽ được xử lý trong handleDayMouseUp
        } else {
          // Người khác đang chọn ngày này
          toast.error(`Ngày này đang được ${lockedBy.userName} chọn`);
          return;
        }
      }
      
      // ✅ THÊM: Kiểm tra nếu chính mình đang chọn ngày này thì cho phép drag để quét
      const isCurrentlySelected = isDaySelected(date, month, year);
      if (isCurrentlySelected) {
        console.log('[ScheduleApp] User starting drag from own selected day, will toggle selection during drag');
        // Không xóa ngay - để cho phép drag để quét
        // Logic toggle sẽ được xử lý trong handleDayMouseUp
      }

      // Kiểm tra các điều kiện như cũ
      if (
        isPastDay(date, month, year) ||
        isDayConflicted(date, month, year) ||
        isDayHasExistingSchedule(date, month, year) ||
        isDayBlockedByExistingSchedule(date, month, year) || // ✅ THÊM: Kiểm tra ngày bị chặn bởi lịch đã có
        isBlockedByHidden ||
        isSunday
      ) {
        return;
      }



      setMonthlyDragState({
        isDragging: true,
        startDay: { date, month, year },
        currentDay: { date, month, year },
        isSelecting: !isCurrentlySelected,
      });
    },
    [
      user?.id,
      selectedDepartment,
      currentMonth,
      isPastDay,
      isDayConflicted,
      isDayHasExistingSchedule,
      isDayBlockedByHiddenDepartment,
      isDaySelected,
      getFieldLockedBy,
    ]
  );

  const handleDayMouseEnter = useCallback(
    (date: number, isCurrentMonth: boolean) => {
      // ✅ FIX: Chỉ xử lý drag cho ngày thuộc tháng hiện tại
      if (!isCurrentMonth || !monthlyDragState.isDragging) {
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const currentDate = new Date(year, month, date);
      const isSunday = currentDate.getDay() === 0;

      const { isBlocked: isBlockedByHidden } = isDayBlockedByHiddenDepartment(
        date,
        month,
        year
      );

      // ✅ THÊM: Kiểm tra ngày đang được chỉnh sửa bởi user khác
      const fieldId = `day-${date}-${month}-${year}`;
      const lockedBy = getFieldLockedBy(fieldId);
      if (lockedBy && lockedBy.userId !== user?.id) {
        return; // Bỏ qua ngày bị người khác chọn
      }

      // ✅ THÊM: Kiểm tra ngày có schedule đã tồn tại (bất kỳ phòng ban nào)
      const daySchedules = getSchedulesForDay(date, month, year);
      if (daySchedules.length > 0) {
        return; // Bỏ qua ngày có lịch đã tồn tại
      }

      if (
        !isPastDay(date, month, year) &&
        !isDayConflicted(date, month, year) &&
        !isDayHasExistingSchedule(date, month, year) &&
        !isDayBlockedByExistingSchedule(date, month, year) && // ✅ THÊM: Kiểm tra ngày bị chặn bởi lịch đã có
        !isBlockedByHidden &&
        !isSunday
      ) {
        setMonthlyDragState((prev) => ({
          ...prev,
          currentDay: { date, month, year },
        }));
      }
    },
    [
      monthlyDragState.isDragging,
      currentMonth,
      user?.id,
      isPastDay,
      isDayConflicted,
      isDayHasExistingSchedule,
      isDayBlockedByHiddenDepartment,
    ]
  );

  const getMonthlyDragSelectionRange = useCallback(() => {
    if (!monthlyDragState.startDay || !monthlyDragState.currentDay) return [];

    const start = monthlyDragState.startDay;
    const end = monthlyDragState.currentDay;

    const startDate = new Date(start.year, start.month, start.date);
    const endDate = new Date(end.year, end.month, end.date);

    // Đảm bảo startDate <= endDate
    const minDate = startDate <= endDate ? startDate : endDate;
    const maxDate = startDate <= endDate ? endDate : startDate;

    const range = [];
    const currentDate = new Date(minDate);

    while (currentDate <= maxDate) {
      const date = currentDate.getDate();
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();

      const isCurrentMonth =
        month === currentMonth.getMonth() &&
        year === currentMonth.getFullYear();
      const isSunday = currentDate.getDay() === 0;

      const { isBlocked: isBlockedByHidden } = isDayBlockedByHiddenDepartment(
        date,
        month,
        year
      );

      // ✅ THÊM: Kiểm tra ngày đang được chỉnh sửa bởi user khác
      const fieldId = `day-${date}-${month}-${year}`;
      const lockedBy = getFieldLockedBy(fieldId);
      if (lockedBy && lockedBy.userId !== user?.id) {
        continue; // Bỏ qua ngày bị người khác chọn
      }

      // ✅ THÊM: Kiểm tra ngày đang được chọn bởi người khác
      const { isSelected: isSelectedByOther, userId: otherUserId } = isDaySelectedByAnyDept(
        date, month, year
      );
      if (isSelectedByOther && otherUserId !== user?.id) {
        continue; // Bỏ qua ngày bị người khác chọn
      }

      if (
        isCurrentMonth &&
        !isPastDay(date, month, year) &&
        !isDayConflicted(date, month, year) &&
        !isDayHasExistingSchedule(date, month, year) && // ✅ THÊM: Kiểm tra ngày đã có lịch của chính mình
        // ✅ SỬA: Chỉ kiểm tra ngày bị chặn bởi lịch đã có (bất kỳ phòng ban nào)
        !isDayBlockedByExistingSchedule(date, month, year) &&
        // ✅ THÊM: Kiểm tra ngày có schedule đã tồn tại (bất kỳ phòng ban nào)
        !(() => {
          const daySchedules = getSchedulesForDay(date, month, year);
          return daySchedules.length > 0;
        })() &&
        !isBlockedByHidden &&
        !isSunday
      ) {
        range.push({ date, month, year });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return range;
  }, [
    monthlyDragState.startDay,
    monthlyDragState.currentDay,
    currentMonth,
    isPastDay,
    isDayConflicted,
    isDayBlockedByExistingSchedule, // ✅ SỬA: Chỉ giữ dependency này
    isDayBlockedByHiddenDepartment,
    isDaySelectedByAnyDept, // ✅ THÊM dependency
    getFieldLockedBy, // ✅ THÊM dependency
    user, // ✅ THÊM dependency
  ]);

  const isDayInMonthlyDragRange = useCallback(
    (date: number, month: number, year: number) => {
      if (!monthlyDragState.isDragging) return false;

      // ✅ FIX: Chỉ check cho ngày thuộc tháng hiện tại
      const isCurrentMonth =
        month === currentMonth.getMonth() &&
        year === currentMonth.getFullYear();
      if (!isCurrentMonth) return false;

      const range = getMonthlyDragSelectionRange();
      return range.some(
        (day) => day.date === date && day.month === month && day.year === year
      );
    },
    [monthlyDragState.isDragging, currentMonth, getMonthlyDragSelectionRange] // ✅ Thêm currentMonth
  );

  const getSelectedDepartmentColor = useCallback(() => {
    if (selectedDepartment) {
      return getDepartmentColor(selectedDepartment);
    }
    return {
      bg: "bg-slate-500",
      light: "bg-slate-100",
      border: "border-slate-300",
      text: "text-slate-700",
    };
  }, [selectedDepartment]);

  const isTimeSlotSelected = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      const currentSelections = getCurrentDepartmentSelections();
      const dayOfWeek = uiToDow(dayIndex);
      return currentSelections.timeSlots.some(
        (slot) =>
          slot.day_of_week === dayOfWeek &&
          slot.start_time === time &&
          (!slot.applicable_date ||
            !specificDate ||
            slot.applicable_date === specificDate)
      );
    },
    [getCurrentDepartmentSelections]
  );

  

  const isTimeSlotSelectedByAnyDept = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      const dayOfWeek = uiToDow(dayIndex);
      
      // Check local selections first
      for (const [deptId, selections] of departmentSelections) {
        if (
          selections.timeSlots &&
          selections.timeSlots.some(
            (slot) =>
              slot.day_of_week === dayOfWeek &&
              slot.start_time === time &&
              (!slot.applicable_date ||
                !specificDate ||
                slot.applicable_date === specificDate)
          )
        ) {
          return { isSelected: true, departmentId: deptId, userId: user?.id };
        }
      }

      // Check remote selections from Redis
      for (const [userId, remoteSelections] of cellSelections) {
        if (userId === user?.id) {
          continue; // Skip own selections
        }
        
        const remoteDeptSelections = remoteSelections.departmentSelections;
        if (!remoteDeptSelections) {
          continue;
        }
        for (const [deptId, selections] of Object.entries(remoteDeptSelections)) {
          const typedSelections = selections as any;
          if (typedSelections.timeSlots && typedSelections.timeSlots.some(
            (slot: any) =>
              slot.day_of_week === dayOfWeek &&
              slot.start_time === time &&
              (!slot.applicable_date ||
                !specificDate ||
                slot.applicable_date === specificDate)
          )) {
            return { isSelected: true, departmentId: parseInt(deptId), userId };
          }
        }
      }
      
      return { isSelected: false, departmentId: null, userId: null };
    },
    [departmentSelections, cellSelections, user]
  );

  const isTimeSlotConflicted = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      if (isPastTimeSlot(dayIndex, time, specificDate)) {
        return true;
      }
      // Kiểm tra xung đột với lịch đã lưu từ phòng ban khác
      const slotSchedules = getSchedulesForSlot(dayIndex, time, specificDate);
      const hasScheduleConflict = slotSchedules.some(
        (schedule) =>
          schedule.department &&
          schedule.department.id !== selectedDepartment &&
          schedule.status === ScheduleStatus.ACTIVE
      );

      if (hasScheduleConflict) return true;

      // Kiểm tra xung đột với selections đang có của các phòng ban khác
      const dayOfWeek = uiToDow(dayIndex);
      for (const [deptId, selections] of departmentSelections) {
        if (deptId !== selectedDepartment) {
          const hasSelectionConflict = selections.timeSlots.some(
            (slot) =>
              slot.day_of_week === dayOfWeek &&
              slot.start_time === time &&
              (!slot.applicable_date ||
                !specificDate ||
                slot.applicable_date === specificDate)
          );
          if (hasSelectionConflict) return true;
        }
      }

      return false;
    },
    [
      getSchedulesForSlot,
      selectedDepartment,
      departmentSelections,
      isPastTimeSlot,
    ]
  );

  const handleTimeSlotMouseEnter = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      if (dayIndex === 6) {
        return;
      }
      if (time >= "12:00" && time < "13:30") return;
      if (isPastTimeSlot(dayIndex, time, specificDate)) return;
      if (isTimeSlotConflicted(dayIndex, time, specificDate)) return;
      if (isSlotHasExistingSchedule(dayIndex, time, specificDate)) return;
      
      // ✅ THÊM: Kiểm tra ô bị chặn bởi lịch đã có (bất kỳ phòng ban nào)
      if (isSlotBlockedByExistingSchedule(dayIndex, time, specificDate)) return;
      
      // ✅ THÊM: Kiểm tra ô có schedule đã tồn tại (bất kỳ phòng ban nào)
      const slotSchedules = getSchedulesForSlot(dayIndex, time, specificDate);
      if (slotSchedules.length > 0) return;
      
      const { isBlocked } = isSlotBlockedByHiddenDepartment(
        dayIndex,
        time,
        specificDate
      );
      if (isBlocked) return;
      
      const { isSelected: isSelectedByOther, departmentId: otherDeptId, userId: otherUserId } =
        isTimeSlotSelectedByAnyDept(dayIndex, time, specificDate);
      if (isSelectedByOther && otherUserId !== user?.id) return; // ✅ SỬA: Chỉ cho phép chọn ô của chính mình
      
      // Kiểm tra ô đang được chỉnh sửa bởi user khác (dùng khóa chuẩn hoá)
      const fieldId = makeTimeSlotFieldId(dayIndex, time, specificDate);
      const lockedBy = getFieldLockedBy(fieldId);
      if (lockedBy && lockedBy.userId !== user?.id) return; // ✅ SỬA: Chỉ cho phép chỉnh sửa ô của chính mình
      
      if (dragState.isDragging && dragState.startSlot) {
        const startDate = weekDates[dragState.startSlot.day]
          .toISOString()
          .split("T")[0];
        const currentDate = weekDates[dayIndex].toISOString().split("T")[0];
        if (startDate !== currentDate) return; // Không cho drag qua ngày khác
      }
      if (dragState.isDragging) {
        setDragState((prev) => ({
          ...prev,
          currentSlot: { day: dayIndex, time },
        }));
      }
    },
    [
      dragState.isDragging,
      isTimeSlotConflicted,
      isSlotHasExistingSchedule,
      isSlotBlockedByExistingSchedule, // ✅ THÊM dependency
      isPastTimeSlot,
      isSlotBlockedByHiddenDepartment,
      isTimeSlotSelectedByAnyDept,
      getFieldLockedBy,
      selectedDepartment,
      user, // ✅ THÊM dependency
      weekDates,
    ]
  );

  const getDragSelectionRange = useCallback(() => {
    if (!dragState.startSlot || !dragState.currentSlot) return [];

    const startDay = Math.min(
      dragState.startSlot.day,
      dragState.currentSlot.day
    );
    const endDay = Math.max(dragState.startSlot.day, dragState.currentSlot.day);
    const startTimeIndex = Math.min(
      timeSlots.indexOf(dragState.startSlot.time),
      timeSlots.indexOf(dragState.currentSlot.time)
    );
    const endTimeIndex = Math.max(
      timeSlots.indexOf(dragState.startSlot.time),
      timeSlots.indexOf(dragState.currentSlot.time)
    );

    const range: { day: number; time: string; applicable_date: string }[] = [];
    for (let day = startDay; day <= endDay; day++) {
      if (day === 6) continue;
      for (
        let timeIndex = startTimeIndex;
        timeIndex <= endTimeIndex;
        timeIndex++
      ) {
        const time = timeSlots[timeIndex];

        // **Bỏ qua giờ nghỉ trưa**
        if (time >= "12:00" && time < "13:30") continue;
        const weekDates = getWeekDates();
        const specificDate = weekDates[day]?.toISOString().split("T")[0];
        if (isPastTimeSlot(day, time, specificDate)) continue;
        if (isTimeSlotConflicted(day, time, specificDate)) continue;
        // ✅ SỬA: Chỉ kiểm tra ô bị chặn bởi lịch đã có (bất kỳ phòng ban nào)
        if (isSlotBlockedByExistingSchedule(day, time, specificDate)) continue;
        
        // ✅ THÊM: Kiểm tra ô có schedule đã tồn tại (bất kỳ phòng ban nào)
        const slotSchedules = getSchedulesForSlot(day, time, specificDate);
        if (slotSchedules.length > 0) continue;
        const { isBlocked } = isSlotBlockedByHiddenDepartment(
          day,
          time,
          specificDate
        );
        if (isBlocked) continue;
        const { isSelected: isSelectedByOther, departmentId: otherDeptId, userId: otherUserId } =
          isTimeSlotSelectedByAnyDept(day, time, specificDate);
        if (isSelectedByOther && otherUserId !== user?.id) continue; // ✅ SỬA: Chỉ cho phép chọn ô của chính mình
        
        // Kiểm tra ô đang được chỉnh sửa bởi user khác (dùng khóa chuẩn hoá)
        const fieldId = makeTimeSlotFieldId(day, time, specificDate);
        const lockedBy = getFieldLockedBy(fieldId);
        if (lockedBy && lockedBy.userId !== user?.id) continue; // ✅ SỬA: Chỉ cho phép chỉnh sửa ô của chính mình

        range.push({ day, time, applicable_date: specificDate });
      }
    }

    return range;
  }, [
    dragState.startSlot,
    dragState.currentSlot,
    isTimeSlotConflicted,
    isSlotBlockedByExistingSchedule, // ✅ SỬA: Chỉ giữ dependency này
    isPastTimeSlot,
    isSlotBlockedByHiddenDepartment,
    isTimeSlotSelectedByAnyDept,
    getFieldLockedBy,
    selectedDepartment,
    user, // ✅ THÊM dependency
  ]);

  const handleTimeSlotMouseDown = useCallback(
    (
      dayIndex: number,
      time: string,
      specificDate: string,
      e: React.MouseEvent
    ) => {
      console.log("handleTimeSlotMouseDown", {
        dayIndex,
        time,
        specificDate,
        selectedDepartment,
        isPast: isPastTimeSlot(dayIndex, time, specificDate),
        hasExistingSchedule: isSlotHasExistingSchedule(
          dayIndex,
          time,
          specificDate
        ),
        isConflicted: isTimeSlotConflicted(
          dayIndex,
          time,
          weekDates[dayIndex].toISOString().split("T")[0]
        ),
        isBlockedByHidden: isSlotBlockedByHiddenDepartment(
          dayIndex,
          time,
          specificDate
        ),
        isSelectedByAnyDept: isTimeSlotSelectedByAnyDept(
          dayIndex,
          time,
          specificDate
        ),
      });
      e.preventDefault();

      if (dayIndex === 6) {
        toast.error("Không thể chọn Chủ nhật");
        return;
      }

      if (time >= "12:00" && time < "13:30") {
        toast.error("Không thể chọn giờ nghỉ trưa");
        return;
      }

      if (isPastTimeSlot(dayIndex, time, specificDate)) {
        toast.error("Không thể chọn khung giờ đã qua");
        return;
      }

      if (!selectedDepartment || !isDepartmentEditable(selectedDepartment)) {
        if (!selectedDepartment) {
          toast.error("Vui lòng chọn phòng ban trước");
        } else {
          toast.error("Bạn không có quyền thao tác phòng ban này");
        }
        return;
      }

      if (isSlotHasExistingSchedule(dayIndex, time, specificDate)) {
        toast.error(
          "Ô này đã có lịch hoạt động trong hệ thống, không thể chỉnh sửa"
        );
        return;
      }
      
      // ✅ THÊM: Kiểm tra ô bị chặn bởi lịch đã có (bất kỳ phòng ban nào)
      if (isSlotBlockedByExistingSchedule(dayIndex, time, specificDate)) {
        toast.error(
          "Ô này đã có lịch hoạt động của phòng ban khác, không thể chỉnh sửa"
        );
        return;
      }

      if (
        isTimeSlotConflicted(
          dayIndex,
          time,
          weekDates[dayIndex].toISOString().split("T")[0]
        )
      ) {
        toast.error("Ô này đang được sử dụng bởi phòng ban khác");
        return;
      }

      const { isBlocked, departmentId: blockedDeptId } =
        isSlotBlockedByHiddenDepartment(dayIndex, time, specificDate);
      if (isBlocked) {
        const blockedDeptName = departments.find(
          (d) => d.id === blockedDeptId
        )?.name;
        toast.error(`Ô này đang được sử dụng bởi ${blockedDeptName} (đã ẩn)`);
        return;
      }

      const { isSelected: isSelectedByOther, departmentId: otherDeptId, userId: otherUserId } =
        isTimeSlotSelectedByAnyDept(dayIndex, time, specificDate);
      if (isSelectedByOther) {
        // Nếu chính mình đang chọn ô này, thì cho phép bắt đầu drag để quét
        if (otherUserId === user?.id) {
          console.log('[ScheduleApp] User starting drag from own selected cell, will toggle selection during drag');
          
          // Không xóa ngay - để cho phép drag để quét
          // Logic toggle sẽ được xử lý trong handleTimeSlotMouseUp
        }
        
        // Nếu người khác đang chọn ô này
        if (otherDeptId !== selectedDepartment) {
          const otherDeptName = departments.find(
            (d) => d.id === otherDeptId
          )?.name;
          toast.error(`Ô này đang được chọn bởi ${otherDeptName}`);
          return;
        }
      }

      // Kiểm tra ô đang được chỉnh sửa bởi user khác
      const fieldId = makeTimeSlotFieldId(dayIndex, time, specificDate);
      const lockedBy = getFieldLockedBy(fieldId);
      if (lockedBy) {
        // Nếu chính mình đang chỉnh sửa ô này, thì xóa nó
        if (lockedBy.userId === user?.id) {
          console.log('[ScheduleApp] User clicking on own editing cell, clearing it');
          clearMySelections('explicit', [fieldId]);
          return;
        }
        
        const lockedByUser = Array.from(presences.values()).find(p => p.userId === lockedBy.userId);
        const userName = lockedByUser?.userName || lockedBy.userName || 'Unknown User';
        toast.error(`Ô này đang được chỉnh sửa bởi ${userName}`);
        return;
      }

      // Xác định trạng thái chọn/hủy chọn dựa trên trạng thái của ô bắt đầu
      const currentSelections = getCurrentDepartmentSelections();
      const dayOfWeek = uiToDow(dayIndex);
      const isCurrentlySelected = currentSelections.timeSlots.some(
        (slot) =>
          slot.day_of_week === dayOfWeek &&
          slot.start_time === time &&
          (!slot.applicable_date ||
            !specificDate ||
            slot.applicable_date === specificDate)
      );

      setDragState({
        isDragging: true,
        startSlot: { day: dayIndex, time },
        currentSlot: { day: dayIndex, time },
        // Nếu ô đầu tiên đã được chọn thì mặc định là hủy chọn, ngược lại là chọn
        isSelecting: !isCurrentlySelected,
      });
    },
    [
      isPastTimeSlot,
      isAdmin,
      selectedDepartment,
      isSlotHasExistingSchedule, // ✅ THÊM dependency
      isTimeSlotConflicted,
      isSlotBlockedByHiddenDepartment,
      isTimeSlotSelectedByAnyDept,
      getFieldLockedBy,
      getCurrentDepartmentSelections,
      clearMySelections,
      user,
      departments,
    ]
  );

  const isSlotInDragRange = useCallback(
    (dayIndex: number, time: string, specificDate: string) => {
      if (!dragState.isDragging) return false;
      const range = getDragSelectionRange();
      // So sánh cả specificDate nếu có
      return range.some(
        (slot) =>
          slot.day === dayIndex &&
          slot.time === time &&
          (!specificDate ||
            !slot.applicable_date ||
            slot.applicable_date === specificDate)
      );
    },
    [dragState.isDragging, getDragSelectionRange]
  );

  const handleTimeSlotMouseUp = useCallback(() => {
    if (!dragState.isDragging || !selectedDepartment) return;

    const currentSelections = getCurrentDepartmentSelections();
    const range = getDragSelectionRange();

    let newTimeSlots = [...currentSelections.timeSlots];

    if (dragState.isSelecting) {
      // ✅ THÊM: Logic toggle selection - Nếu ô đã chọn thì xóa, nếu chưa chọn thì thêm
      range.forEach(({ day, time }) => {
        const endTime = timeSlots[timeSlots.indexOf(time) + 1] || LAST_SLOT_END;
        const dayOfWeek = uiToDow(day);
        const weekDates = getWeekDates();
        const applicableDate = weekDates[day].toISOString().split("T")[0];
        
        // Kiểm tra xem ô này đã được chọn chưa
        const exists = newTimeSlots.some(
          (slot) => 
            slot.day_of_week === dayOfWeek && 
            slot.start_time === time &&
            (!slot.applicable_date ||
              !applicableDate ||
              slot.applicable_date === applicableDate)
        );
        
        if (exists) {
          // Nếu ô đã chọn thì xóa (toggle off)
          newTimeSlots = newTimeSlots.filter(
            (slot) =>
              !(slot.day_of_week === dayOfWeek && 
                slot.start_time === time &&
                (!slot.applicable_date ||
                  !applicableDate ||
                  slot.applicable_date === applicableDate))
          );
        } else {
          // Nếu ô chưa chọn thì thêm (toggle on)
          newTimeSlots.push({
            day_of_week: dayOfWeek,
            start_time: time,
            end_time: endTime,
            department_id: selectedDepartment,
            applicable_date: applicableDate,
          });
        }
      });
    } else {
      // ✅ THÊM: Logic toggle selection ngược lại - Nếu ô đã chọn thì xóa, nếu chưa chọn thì thêm
      range.forEach(({ day, time }) => {
        const endTime = timeSlots[timeSlots.indexOf(time) + 1] || LAST_SLOT_END;
        const dayOfWeek = uiToDow(day);
        const weekDates = getWeekDates();
        const applicableDate = weekDates[day].toISOString().split("T")[0];
        
        // Kiểm tra xem ô này đã được chọn chưa
        const exists = newTimeSlots.some(
          (slot) => 
            slot.day_of_week === dayOfWeek && 
            slot.start_time === time &&
            (!slot.applicable_date ||
              !applicableDate ||
              slot.applicable_date === applicableDate)
        );
        
        if (exists) {
          // Nếu ô đã chọn thì xóa (toggle off)
          newTimeSlots = newTimeSlots.filter(
            (slot) =>
              !(slot.day_of_week === dayOfWeek && 
                slot.start_time === time &&
                (!slot.applicable_date ||
                  !applicableDate ||
                  slot.applicable_date === applicableDate))
          );
        } else {
          // Nếu ô chưa chọn thì thêm (toggle on)
          newTimeSlots.push({
            day_of_week: dayOfWeek,
            start_time: time,
            end_time: endTime,
            department_id: selectedDepartment,
            applicable_date: applicableDate,
          });
        }
      });
    }

    // ✅ THÊM: Xóa edit sessions và clear selections trong Redis cho các ô bị toggle off
    const removedSlots: string[] = [];
    const addedSlots: string[] = [];
    
    // So sánh selections cũ và mới để xác định ô nào bị xóa
    currentSelections.timeSlots.forEach(oldSlot => {
      const exists = newTimeSlots.some(newSlot => 
        newSlot.day_of_week === oldSlot.day_of_week &&
        newSlot.start_time === oldSlot.start_time &&
        (!newSlot.applicable_date || !oldSlot.applicable_date || newSlot.applicable_date === oldSlot.applicable_date)
      );
      
              if (!exists && oldSlot.day_of_week) {
          // Ô này bị xóa - tạo fieldId để clear
          const weekDates = getWeekDates();
          const dayIndex = dowToUi(oldSlot.day_of_week);
          const specificDate = oldSlot.applicable_date || weekDates[dayIndex]?.toISOString().split("T")[0];
          const fieldId = makeTimeSlotFieldId(dayIndex, oldSlot.start_time, specificDate);
          removedSlots.push(fieldId);
        }
    });
    
    // So sánh selections mới và cũ để xác định ô nào được thêm
    newTimeSlots.forEach(newSlot => {
      const exists = currentSelections.timeSlots.some(oldSlot => 
        oldSlot.day_of_week === newSlot.day_of_week &&
        oldSlot.start_time === newSlot.start_time &&
        (!oldSlot.applicable_date || !newSlot.applicable_date || oldSlot.applicable_date === newSlot.applicable_date)
      );
      
              if (!exists && newSlot.day_of_week) {
          // Ô này được thêm - tạo fieldId để track
          const weekDates = getWeekDates();
          const dayIndex = dowToUi(newSlot.day_of_week);
          const specificDate = newSlot.applicable_date || weekDates[dayIndex]?.toISOString().split("T")[0];
          const fieldId = makeTimeSlotFieldId(dayIndex, newSlot.start_time, specificDate);
          addedSlots.push(fieldId);
        }
    });
    
    // Cập nhật selections trong localStorage
    updateDepartmentSelections(selectedDepartment, {
      ...currentSelections,
      timeSlots: newTimeSlots,
    });
    
    // ✅ THÊM: Clear edit sessions và selections trong Redis cho các ô bị xóa
    if (removedSlots.length > 0 && clearMySelections) {
      console.log('[ScheduleApp] Clearing edit sessions for removed slots:', removedSlots);
      clearMySelections('explicit', removedSlots);
    }
    
    // ✅ THÊM: Start edit sessions cho các ô mới được thêm
    if (addedSlots.length > 0) {
      addedSlots.forEach(fieldId => {
        // Parse fieldId để lấy thông tin
        const match = fieldId.match(/time-slot-(\d+)-(.+)-(.+)/);
        if (match) {
          const [, dayOfWeek, time, specificDate] = match;
          const dayIndex = dowToUi(parseInt(dayOfWeek));
          
          startEditSession(fieldId, 'calendar_cell', {
            dayIndex,
            time,
            date: specificDate || undefined,
          });
        }
      });
    }

    setDragState({
      isDragging: false,
      startSlot: null,
      currentSlot: null,
      isSelecting: false,
    });
  }, [
    dragState,
    selectedDepartment,
    getCurrentDepartmentSelections,
    getDragSelectionRange,
    updateDepartmentSelections,
  ]);

  // Data fetching
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const response = await api.get("departments/all-unrestricted");
        const data = response.data;
        setDepartments(data);
        // Sẽ được cập nhật lại trong useEffect riêng cho accessibleDepartments
      } catch (error: any) {
        console.error("Error fetching departments:", error);
        toast.error("Không thể tải danh sách phòng ban");
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // Presence tracking với cell selection
  useEffect(() => {
    if (!user || !isDataReady) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const calendarCell = target.closest('[data-slot-date], [data-day-date]');
      
      if (calendarCell) {
        // Lấy thông tin cell đang hover
        let cellInfo = {};
        if (calendarCell.hasAttribute('data-slot-date')) {
          const date = calendarCell.getAttribute('data-slot-date')!;
          const time = calendarCell.getAttribute('data-time')!;
          const dayIndex = parseInt(calendarCell.getAttribute('data-day-index') || '0');
          cellInfo = { dayIndex, time, date, cellType: 'timeSlot' };
        } else if (calendarCell.hasAttribute('data-day-date')) {
          const date = calendarCell.getAttribute('data-day-date')!;
          const [year, month, day] = date.split('-').map(Number);
          cellInfo = { date: day, month: month - 1, year, cellType: 'day' };
        }
        
        sendPresence({
          userId: user.id,
          userName: (user.fullName || user.nickName || user.username || 'Unknown').replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống'),
          departmentId: user.departments?.[0]?.id || 0,
          departmentName: user.departments?.[0]?.name || 'Unknown',
          avatar_zalo: user.avatarZalo, // ✅ THÊM: Avatar Zalo của user
          position: { 
            x: e.clientX, 
            y: e.clientY,
            ...cellInfo
          },
          isEditing: false,
          lastSeen: new Date().toISOString(),
        });
      }
    };

    // Thêm tracking cho click events để hiển thị selection
    const handleCellClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Tìm tất cả các loại cell có thể click
      const calendarCell = target.closest('[data-slot-date], [data-day-date], .time-slot, .day-cell, td[data-day], td[data-time]');
      
      if (calendarCell) {
        // Gửi thông tin về cell được click
        let cellInfo = {};
        
        // Kiểm tra các data attributes khác nhau
        if (calendarCell.hasAttribute('data-slot-date')) {
          const date = calendarCell.getAttribute('data-slot-date')!;
          const time = calendarCell.getAttribute('data-time')!;
          const dayIndex = parseInt(calendarCell.getAttribute('data-day-index') || '0');
          cellInfo = { dayIndex, time, date, cellType: 'timeSlot', action: 'clicked' };
        } else if (calendarCell.hasAttribute('data-day-date')) {
          const date = calendarCell.getAttribute('data-day-date')!;
          const [year, month, day] = date.split('-').map(Number);
          cellInfo = { date: day, month: month - 1, year, cellType: 'day', action: 'clicked' };
        } else if (calendarCell.hasAttribute('data-day')) {
          const day = calendarCell.getAttribute('data-day')!;
          cellInfo = { date: parseInt(day), cellType: 'day', action: 'clicked' };
        } else if (calendarCell.hasAttribute('data-time')) {
          const time = calendarCell.getAttribute('data-time')!;
          cellInfo = { time, cellType: 'timeSlot', action: 'clicked' };
        } else {
          // Fallback: gửi thông tin cơ bản
          cellInfo = { cellType: 'unknown', action: 'clicked' };
        }
        
        const presenceData = {
          userId: user.id,
          userName: user.fullName || user.nickName || user.username || 'Unknown',
          departmentId: user.departments?.[0]?.id || 0,
          departmentName: user.departments?.[0]?.name || 'Unknown',
          avatar_zalo: user.avatarZalo, // ✅ THÊM: Avatar Zalo của user
          position: { 
            x: e.clientX, 
            y: e.clientY,
            ...cellInfo
          },
          isEditing: true, // Đánh dấu là đang tương tác
          lastSeen: new Date().toISOString(),
        };
        
        sendPresence(presenceData);
      }
    };

    // Throttle mouse move events để tránh spam
    let timeoutId: NodeJS.Timeout;
    const throttledMouseMove = (e: MouseEvent) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleMouseMove(e);
        
        // Gửi mouse position real-time
        if (user) {
          const presenceData = {
            userId: user.id,
            userName: user.fullName || user.nickName || user.username || 'Unknown',
            departmentId: user.departments?.[0]?.id || 0,
            departmentName: user.departments?.[0]?.name || 'Unknown',
            avatar_zalo: user.avatarZalo, // ✅ THÊM: Avatar Zalo của user
            position: { 
              x: e.clientX, 
              y: e.clientY,
              cellType: 'timeSlot' as const,
              action: 'move' as const
            },
            isEditing: false,
            lastSeen: new Date().toISOString(),
          };
          sendPresence(presenceData);
        }
      }, 50); // Giảm delay để real-time hơn
    };

    document.addEventListener('mousemove', throttledMouseMove);
    document.addEventListener('click', handleCellClick);
    document.addEventListener('mousedown', handleCellClick);
    document.addEventListener('mouseup', handleCellClick);

    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('click', handleCellClick);
      document.removeEventListener('mousedown', handleCellClick);
      document.removeEventListener('mouseup', handleCellClick);
      clearTimeout(timeoutId);
    };
  }, [user, isDataReady, sendPresence]);

  // Tự động gửi presence khi component mount
  useEffect(() => {
    if (user && isDataReady) {
      const initialPresence = {
        userId: user.id,
        userName: user.fullName || user.nickName || user.username || 'Unknown',
        departmentId: user.departments?.[0]?.id || 0,
        departmentName: user.departments?.[0]?.name || 'Unknown',
        avatar_zalo: user.avatarZalo, // ✅ THÊM: Avatar Zalo của user
        position: { 
          x: 0, 
          y: 0,
          cellType: 'timeSlot' as const,
          action: 'move' as const
        },
        isEditing: false,
        lastSeen: new Date().toISOString(),
      };
      sendPresence(initialPresence);
    }
  }, [user, isDataReady, sendPresence]);

  // Cập nhật visible departments dựa trên quyền truy cập
  useEffect(() => {
    if (accessibleDepartments.length > 0) {
      // Set visible cho tất cả departments có thể view (có server_ip)
      setVisibleDepartments(accessibleDepartments.map((d) => d.id));
    } else {
      setVisibleDepartments([]);
    }
  }, [accessibleDepartments]);

  useEffect(() => {
    const fetchAllSchedules = async () => {
      try {
        setIsLoadingSchedules(true);
        const data = await ScheduleService.findAll();
        setSchedules(data.data);
      } catch (error: any) {
        console.error("Error fetching schedules:", error);
        toast.error("Không thể tải lịch hoạt động");
      } finally {
        setIsLoadingSchedules(false);
      }
    };

    fetchAllSchedules();
  }, []);

  useEffect(() => {
    if (isBulkMode && bulkScheduleConfig.enabled && selectedDepartment) {
      handleGenerateBulkSchedule(); // chạy ngay lúc bật bulk, dù count=1
    }
  }, [
    isBulkMode,
    bulkScheduleConfig.enabled,
    bulkScheduleConfig.count,
    bulkScheduleConfig.type,
    selectedDepartment,
  ]);

  useEffect(() => {
    if (!selectedDepartment && isBulkMode) {
      turnOffBulk();
      return;
    }
    if (selectedDepartment) {
      const sel = departmentSelections.get(selectedDepartment) || {
        days: [],
        timeSlots: [],
      };
      const hasTemplate =
        activeView === "week" ? sel.timeSlots.length > 0 : sel.days.length > 0;
      if (!hasTemplate && isBulkMode) turnOffBulk(); // <--- NEW
    }
  }, [
    selectedDepartment,
    departmentSelections,
    activeView,
    isBulkMode,
    turnOffBulk,
  ]);

  useEffect(() => {
    if (!isBulkMode) return;
    setBulkScheduleConfig((prev) => ({
      ...prev,
      type: activeView === "week" ? "weeks" : "months",
    }));
  }, [activeView, isBulkMode]);

  // Drag handling
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isDragging) {
        setDragState({
          isDragging: false,
          startSlot: null,
          currentSlot: null,
          isSelecting: false,
        });
      }
      if (monthlyDragState.isDragging) {
        handleDayMouseUp();
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging || monthlyDragState.isDragging) {
        e.preventDefault();
      }
    };

    if (dragState.isDragging || monthlyDragState.isDragging) {
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.body.style.userSelect = "";
    };
  }, [dragState.isDragging, monthlyDragState.isDragging, handleDayMouseUp]);



  // Load cell selections from Redis when component mounts
  useEffect(() => {
    if (isDataReady && user) {
      console.log('[ScheduleApp] Loading cell selections from Redis for room:', roomId);
      
      // ✅ SỬA: Không clear local state khi mount, chỉ load từ Redis
      // setDepartmentSelections(new Map());
      // setSelectedDepartment(null);
      
      getCellSelections();
    }
  }, [isDataReady, user, getCellSelections, roomId]);

  // ✅ THÊM: Lưu selections vào local storage theo môi trường
  useEffect(() => {
    if (departmentSelections.size > 0 && user) {
      try {
        const dataToSave = {
          departmentSelections: Object.fromEntries(departmentSelections),
          selectedDepartment,
          timestamp: Date.now(),
          weekStart: (() => {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            return startOfWeek.toISOString().split('T')[0];
          })(),
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        console.log('[ScheduleApp] Saved selections to local storage:', storageKey, dataToSave);
      } catch (error) {
        console.error('[ScheduleApp] Error saving to local storage:', error);
      }
    }
  }, [departmentSelections, selectedDepartment, user, storageKey, roomId]);

  // ✅ SỬA: Khôi phục selections từ local storage khi component mount
  useEffect(() => {
    if (user && !isLoadingDepartments) {
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          // ✅ SỬA: Chỉ khôi phục nếu là cùng tuần và data không quá cũ (trong vòng 1 giờ)
          const isRecent = Date.now() - parsed.timestamp < 60 * 60 * 1000;
          const currentWeekStart = new Date();
          currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
          const isSameWeek = parsed.weekStart === currentWeekStart.toISOString().split('T')[0];
          
          // ✅ SỬA: Không restore nếu local state đã trống (user đã xóa)
          if (departmentSelections.size === 0) {
            console.log('[ScheduleApp] Local state is empty, not restoring from localStorage');
            localStorage.removeItem(storageKey);
            return;
          }
          
          if (isRecent && isSameWeek && parsed.departmentSelections) {
            console.log('[ScheduleApp] Restoring from local storage:', storageKey, parsed);
            const restoredSelections = new Map(
              Object.entries(parsed.departmentSelections).map(([key, value]) => [
                parseInt(key),
                value as DepartmentSelections
              ])
            );
            setDepartmentSelections(restoredSelections);
            if (parsed.selectedDepartment) {
              setSelectedDepartment(parsed.selectedDepartment);
            }
          } else {
            console.log('[ScheduleApp] Local storage data is outdated or from different week, clearing');
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error('[ScheduleApp] Error reading from local storage:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [user, isLoadingDepartments, storageKey, roomId]);

  // ✅ SỬA: Restore local selections from Redis data
  useEffect(() => {
    if (cellSelections.size > 0) {
      // ✅ SỬA: Không restore nếu local state đã trống (user đã xóa)
      if (departmentSelections.size === 0) {
        return;
      }
      
      // Find our own selections and restore them
      let foundOwnSelections = false;
      for (const [userId, selections] of cellSelections) {
        if (userId === user?.id && selections.departmentSelections) {
          console.log('[ScheduleApp] Found own selections, restoring:', selections);
          
          // ✅ SỬA: Chỉ restore khi local state trống hoặc có sự thay đổi từ Redis
          setDepartmentSelections(prev => {
            // Nếu local state đã có selections, chỉ merge những gì mới từ Redis
            if (prev.size > 0) {
              const newDepartmentSelections = new Map(prev);
              for (const [deptId, deptSelections] of Object.entries(selections.departmentSelections)) {
                const typedSelections = deptSelections as DepartmentSelections;
                // Chỉ cập nhật nếu Redis có data mới hơn
                if (typedSelections.timeSlots.length > 0 || typedSelections.days.length > 0) {
                  newDepartmentSelections.set(parseInt(deptId), typedSelections);
                }
              }
              return newDepartmentSelections;
            } else {
              // Local state trống, restore toàn bộ từ Redis
              const newDepartmentSelections = new Map();
              for (const [deptId, deptSelections] of Object.entries(selections.departmentSelections)) {
                newDepartmentSelections.set(parseInt(deptId), deptSelections as DepartmentSelections);
              }
              return newDepartmentSelections;
            }
          });
          
          // Restore selected department
          if (selections.selectedDepartment) {
            setSelectedDepartment(selections.selectedDepartment);
          }
          
          foundOwnSelections = true;
          break;
        }
      }
      
      // ✅ SỬA: Không clear local state nếu đang có selections
      if (!foundOwnSelections && departmentSelections.size === 0) {
        console.log('[ScheduleApp] No own selections found and local state is empty, keeping current state');
      }
      
      // Keep other users' selections in cellSelections state (don't clear them)
      const otherUsersSelections = Array.from(cellSelections.entries()).filter(([userId]) => userId !== user?.id);
      console.log('[ScheduleApp] Other users selections:', otherUsersSelections);

    } else {
      // ✅ SỬA: Chỉ clear local state nếu thực sự cần thiết
      if (departmentSelections.size === 0) {
        console.log('[ScheduleApp] cellSelections is empty and local state is empty, keeping current state');
      }
    }
  }, [cellSelections, user, departmentSelections.size]);

  // Ping Redis to refresh TTL for cell selections
  useEffect(() => {
    if (!user || !isDataReady) return;

    const pingInterval = setInterval(() => {
      pingCellSelections();
    }, 60000); // Ping every minute

    return () => clearInterval(pingInterval);
  }, [user, isDataReady, pingCellSelections]);

  // Cleanup edit sessions on unmount
  useEffect(() => {
    return () => {
      // Stop all active edit sessions when component unmounts
      editSessions.forEach((session) => {
        if (session.userId === user?.id) {
          stopEditSession(session.fieldId);
        }
      });
    };
  }, [editSessions, user, stopEditSession]);

  // Clear own selections when user leaves the page or switches tabs
  useEffect(() => {
    if (!user || !isDataReady) return;

    const handleBeforeUnload = () => {
      // Chỉ xóa khi mình đang chỉnh sửa (có selections)
      const hasOwnSelections = departmentSelections && 
        Object.keys(departmentSelections).length > 0;
      
      if (hasOwnSelections && user?.id) {
        console.log('[ScheduleApp] F5 detected, clearing own selections for user:', user.id);
        
        // Clear local state immediately
        setDepartmentSelections(new Map());
        setSelectedDepartment(null);
        
        // ✅ THÊM: Xóa local storage
        try {
          localStorage.removeItem(storageKey);
          console.log('[ScheduleApp] Cleared local storage:', storageKey);
        } catch (error) {
          console.error('[ScheduleApp] Error clearing local storage:', error);
        }
        
        // Tạo danh sách các ô đang được chỉnh sửa để xóa
        const editingCells: string[] = [];
        for (const [deptId, selection] of departmentSelections.entries()) {
          if (selection.timeSlots && selection.timeSlots.length > 0) {
            for (const timeSlot of selection.timeSlots) {
              const fieldId = makeTimeSlotFieldId(
                timeSlot.day_of_week!, 
                timeSlot.start_time, 
                timeSlot.applicable_date
              );
              editingCells.push(fieldId);
            }
          }
        }
        
        console.log('[ScheduleApp] Clearing cells for user', user.id, ':', editingCells);
        
        if (clearMySelections) {
          clearMySelections('leave', editingCells);
        } else {
          const emptyPayload = {
            departmentSelections: {},
            selectedDepartment: null,
            activeView,
            editingCells: [], // Xóa tất cả ô đang chỉnh sửa
            userId: user.id, // Chỉ xóa ô của user này
          };
          sendCellSelections(emptyPayload);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && user) {
        // TẠM THỜI COMMENT OUT để test
        // console.log('[ScheduleApp] Tab hidden, clearing own selections');
        // if (clearMySelections) {
        //   clearMySelections('hidden');
        // } else {
        //   const emptyPayload = {
        //     departmentSelections: {},
        //     selectedDepartment: null,
        //     activeView,
        //   };
        //   sendCellSelections(emptyPayload);
        // }
      } else if (document.visibilityState === 'visible' && user) {
        // Quay lại tab -> chỉ GET, KHÔNG clear
        console.log('[ScheduleApp] Tab visible, getting selections');
        getCellSelections();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Chỉ remove event listeners, không gọi handleBeforeUnload khi unmount
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isDataReady, activeView, sendCellSelections, storageKey]); // ✅ THÊM storageKey dependency

  // Helper function
  const getWeekDatesForDate = useCallback((date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const weekDate = new Date(start);
      weekDate.setDate(start.getDate() + i);
      return weekDate;
    });
  }, []);

  const generateWeeklyBulkSelections = useCallback(
    async (
      targetWeek: Date,
      template: DepartmentSelections,
      targetMap: Map<number, DepartmentSelections>
    ) => {
      if (!selectedDepartment) return;

      const dest = targetMap.get(selectedDepartment) || {
        days: [],
        timeSlots: [],
      };

      // key để chống duplicate trong cùng 1 targetMap
      const k = (s: TimeSlot) =>
        `${s.applicable_date ?? ""}|${s.day_of_week}|${s.start_time}|${
          s.end_time
        }`;
      const existing = new Set(dest.timeSlots.map(k));

      // ✅ Tuần MẪU luôn là currentWeek (nơi user chọn slot)
      const baseWeekDates = getWeekDatesForDate(currentWeek);
      const baseStart = new Date(baseWeekDates[0].toDateString());
      const baseEnd = new Date(baseWeekDates[6].toDateString());
      const inRange = (d: Date) => d >= baseStart && d <= baseEnd;

      // ✅ Chỉ lấy các slot được chọn trong tuần mẫu
      const seedSlots = template.timeSlots
        .filter(
          (s) => s.applicable_date && inRange(new Date(s.applicable_date!))
        )
        .filter((s, i, arr) => {
          const key = `${s.day_of_week}|${s.start_time}|${s.end_time}`;
          return (
            arr.findIndex(
              (x) => `${x.day_of_week}|${x.start_time}|${x.end_time}` === key
            ) === i
          );
        });

      // Tuần đích để tính applicable_date mới cho từng slot
      const tgtWeekDates = getWeekDatesForDate(targetWeek);

      for (const s of seedSlots) {
        const dayIdx = dowToUi(s.day_of_week!); // 0..6 (T2..CN)

        // Bỏ CN nếu muốn
        if (bulkScheduleConfig.skipWeekends && dayIdx === 6) continue;

        const dateStr = tgtWeekDates[dayIdx]?.toISOString().split("T")[0];
        if (!dateStr) continue;

        // Bỏ qua các xung đột / quá khứ nếu được cấu hình
        if (bulkScheduleConfig.skipConflicts) {
          if (isPastTimeSlot(dayIdx, s.start_time, dateStr)) continue;
          if (isTimeSlotConflicted(dayIdx, s.start_time, dateStr)) continue;
        }

        const newSlot: TimeSlot = {
          ...s,
          applicable_date: dateStr, // ✅ đổi sang ngày của tuần đích
          department_id: selectedDepartment,
        };

        const kk = k(newSlot);
        if (!existing.has(kk)) {
          dest.timeSlots.push(newSlot);
          existing.add(kk);
        }
      }

      targetMap.set(selectedDepartment, dest);
    },
    [
      selectedDepartment,
      bulkScheduleConfig,
      currentWeek,
      getWeekDatesForDate,
      isPastTimeSlot,
      isTimeSlotConflicted,
    ]
  );

  const generateMonthlyBulkSelections = useCallback(
    async (
      targetMonth: Date,
      template: DepartmentSelections,
      targetMap: Map<number, DepartmentSelections>,
      isCurrentPeriod = false
    ) => {
      if (!selectedDepartment) return;

      const dest = targetMap.get(selectedDepartment) || {
        days: [],
        timeSlots: [],
      };
      const key = (y: number, m: number, d: number) => `${y}-${m}-${d}`;
      const existing = new Set(
        dest.days.map((d) => key(d.year, d.month, d.date))
      );

      // ✅ chỉ seed từ THÁNG đang xem
      const baseM = currentMonth.getMonth();
      const baseY = currentMonth.getFullYear();
      const seedDays = template.days
        .filter((d) => d.month === baseM && d.year === baseY)
        .filter(
          (d, i, arr) =>
            arr.findIndex(
              (x) =>
                x.date === d.date && x.month === d.month && x.year === d.year
            ) === i
        );

      if (isCurrentPeriod) {
        for (const d of seedDays) {
          const k = key(d.year, d.month, d.date);
          if (!existing.has(k)) {
            existing.add(k);
            dest.days.push({ ...d, department_id: selectedDepartment });
          }
        }
        targetMap.set(selectedDepartment, dest);
        return;
      }

      // Các tháng tương lai
      for (const d of seedDays) {
        const y = targetMonth.getFullYear();
        const m = targetMonth.getMonth();

        // ngày 29/30/31 có tồn tại không?
        const probe = new Date(y, m, d.date);
        if (probe.getMonth() !== m) continue;

        const isSunday = probe.getDay() === 0; // ✅ CN = 0
        if (bulkScheduleConfig.skipWeekends && isSunday) continue;

        if (bulkScheduleConfig.skipConflicts) {
          if (isPastDay(d.date, m, y)) continue;
          if (isDayConflicted(d.date, m, y)) continue;
        }

        const k = key(y, m, d.date);
        if (existing.has(k)) continue;

        dest.days.push({
          date: d.date,
          month: m,
          year: y,
          department_id: selectedDepartment,
        });
        existing.add(k);
      }

      targetMap.set(selectedDepartment, dest);
    },
    [
      selectedDepartment,
      bulkScheduleConfig,
      isDayConflicted,
      isPastDay,
      currentMonth,
    ]
  );

  // Hàm tạo danh sách các tuần/tháng tiếp theo
  const generateBulkPeriods = useCallback(() => {
    const periods: Date[] = [];

    if (bulkScheduleConfig.type === "weeks") {
      // THÊM tuần hiện tại làm base (i = 0)
      for (let i = 0; i < bulkScheduleConfig.count + 1; i++) {
        // +1 để bao gồm tuần hiện tại
        const weekStart = new Date(currentWeek);
        weekStart.setDate(weekStart.getDate() + i * 7);
        periods.push(weekStart);
      }
    } else {
      // THÊM tháng hiện tại làm base (i = 0)
      for (let i = 0; i < bulkScheduleConfig.count + 1; i++) {
        // +1 để bao gồm tháng hiện tại
        const monthStart = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + i,
          1
        );
        periods.push(monthStart);
      }
    }

    return periods;
  }, [bulkScheduleConfig, currentWeek, currentMonth]);

  // Hàm áp dụng selections hiện tại cho tất cả periods
  const handleGenerateBulkSchedule = useCallback(async () => {
    if (!selectedDepartment || !isBulkMode) return;

    const currentSelections = getCurrentDepartmentSelections();
    if (
      currentSelections.days.length === 0 &&
      currentSelections.timeSlots.length === 0
    ) {
      toast.error("Vui lòng chọn ít nhất một ngày hoặc khung giờ để làm mẫu");
      return;
    }

    // Tạo periods bao gồm CẢ tuần/tháng hiện tại
    const periods: Date[] = [];

    if (bulkScheduleConfig.type === "weeks") {
      // Bắt đầu từ tuần hiện tại (i = 0), sau đó + thêm các tuần tiếp theo
      for (let i = 0; i <= bulkScheduleConfig.count; i++) {
        // <= để bao gồm tuần hiện tại
        const weekStart = new Date(currentWeek);
        weekStart.setDate(weekStart.getDate() + i * 7);
        periods.push(weekStart);
      }
    } else {
      // Bắt đầu từ tháng hiện tại (i = 0), sau đó + thêm các tháng tiếp theo
      for (let i = 0; i <= bulkScheduleConfig.count; i++) {
        // <= để bao gồm tháng hiện tại
        const monthStart = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + i,
          1
        );
        periods.push(monthStart);
      }
    }

    const newBulkSelections = new Map(departmentSelections);

    // Clear selections cũ của department này trước khi tạo bulk
    newBulkSelections.set(selectedDepartment, { days: [], timeSlots: [] });

    // Tạo selections cho từng period
    for (const [index, period] of periods.entries()) {
      if (bulkScheduleConfig.type === "weeks") {
        await generateWeeklyBulkSelections(
          period,
          currentSelections,
          newBulkSelections
        );
      } else {
        await generateMonthlyBulkSelections(
          period,
          currentSelections,
          newBulkSelections,
          index === 0
        );
      }
    }

    setDepartmentSelections(newBulkSelections);

    toast.success(
      `Đã tạo lịch hàng loạt: ${periods.length} ${
        bulkScheduleConfig.type === "weeks" ? "tuần" : "tháng"
      } x ${
        currentSelections.timeSlots.length + currentSelections.days.length
      } mục = ${
        periods.length *
        (currentSelections.timeSlots.length + currentSelections.days.length)
      } items tổng cộng`
    );
  }, [
    selectedDepartment,
    isBulkMode,
    getCurrentDepartmentSelections,
    bulkScheduleConfig,
    currentWeek,
    currentMonth,
    departmentSelections,
    generateWeeklyBulkSelections,
    generateMonthlyBulkSelections,
    toast,
    setDepartmentSelections,
  ]);

  if (isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          </motion.div>
          <p className="text-lg text-slate-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 relative">
      {/* Cursor indicators for other users */}
      <AnimatePresence>
        {Array.from(presences.values()).map((presence) => (
          <CursorIndicator key={presence.userId} presence={presence} />
        ))}
      </AnimatePresence>
      
      {/* Cell selection indicators for other users */}
      <CellSelectionIndicator presences={presences} />
      
      <div className="max-w-full p-5 mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-blue-600" />
                Quản lý lịch hoạt động
              </h1>
              <p className="text-slate-600">
                Lên kế hoạch và quản lý lịch hoạt động cho tất cả phòng ban
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Collaboration Status */}
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 font-medium">
                  {presences.size} người đang xem
                  {presences.size > 0 && ` (${Array.from(presences.values()).map(p => {
                    // Fix encoding for display
                    const fixedName = p.userName.replace(/Ã/g, 'ă').replace(/á»/g, 'ộ').replace(/viÃªn/g, 'viên').replace(/há»/g, 'hệ').replace(/thá»/g, 'thống');
                    return fixedName;
                  }).join(', ')})`}
                </span>
                {presences.size > 0 && (
                  <PresenceList presences={Array.from(presences.values())} maxDisplay={3} />
                )}
              </div>
              

              
              {/* Typing Indicators */}
              {previewPatches.size > 0 && (
                <TypingIndicator patches={Array.from(previewPatches.values())} />
              )}
              
              <Button
                onClick={() =>
                  setActiveView(activeView === "week" ? "month" : "week")
                }
                variant="outline"
                className="flex items-center gap-2 hover:bg-blue-50"
              >
                {activeView === "week" ? (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Xem theo tháng
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Xem theo tuần
                  </span>
                )}
              </Button>
              

            </div>
          </div>

          {/* Permission Notice */}
          {!isAdmin && !isScheduler && !isManager && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Chế độ chỉ xem:</strong> Bạn chỉ có quyền xem lịch
                  hoạt động. Chỉ Admin, Scheduler hoặc Manager mới có thể tạo,
                  chỉnh sửa và xóa lịch hoạt động.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Department Legend & Controls */}
          <Card className="mb-2 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Phòng ban & Bộ lọc
                </CardTitle>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Tìm kiếm lịch..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48 border-slate-200 focus:border-blue-400"
                    />
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(value: any) => setStatusFilter(value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value={ScheduleStatus.ACTIVE}>
                        Lịch Đang Hoạt động
                      </SelectItem>
                      <SelectItem value={ScheduleStatus.INACTIVE}>
                        Lịch Đã Xác Nhận
                      </SelectItem>
                      <SelectItem value={ScheduleStatus.EXPIRED}>
                        Đã hết hạn
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Bulk Scheduling Controls */}
                  {!isViewRole && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant={isBulkMode ? "default" : "outline"}
                        onClick={() => {
                          if (isBulkMode) {
                            turnOffBulk();
                          } else {
                            setIsBulkMode(true);
                            setBulkScheduleConfig((prev) => ({
                              ...prev,
                              enabled: true,
                            }));
                          }
                        }}
                        className="flex items-center gap-2 hover:bg-blue-50"
                        disabled={!canOpenBulk}
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {isBulkMode
                            ? "Thoát chế độ bulk"
                            : "Sắp lịch hàng loạt"}
                        </span>
                      </Button>

                    {isBulkMode && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border">
                        <Select value={bulkScheduleConfig.type} disabled>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weeks">Tuần</SelectItem>
                            <SelectItem value="months">Tháng</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={bulkScheduleConfig.count}
                          onChange={(e) =>
                            setBulkScheduleConfig((prev) => ({
                              ...prev,
                              count: Math.max(
                                1,
                                Math.min(12, parseInt(e.target.value) || 1)
                              ),
                            }))
                          }
                          className="w-20"
                        />

                        <span className="text-sm text-slate-600">
                          {bulkScheduleConfig.type === "weeks"
                            ? "tuần tiếp theo"
                            : "tháng tiếp theo"}
                        </span>
                      </div>
                    )}
                  </div>
                    )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {departments.map((dept) => {
                  const color = getDepartmentColor(dept.id);
                  const isVisible = visibleDepartments.includes(dept.id);
                  const isSelected = selectedDepartment === dept.id;
                  const hasSelections =
                    departmentSelections.has(dept.id) &&
                    (departmentSelections.get(dept.id)!.days.length > 0 ||
                      departmentSelections.get(dept.id)!.timeSlots.length > 0);

                  // Kiểm tra quyền truy cập và trạng thái enable
                  const isAccessible = isDepartmentAccessible(dept.id);
                  const isEnabled = isDepartmentEnabled(dept.id);
                  const canView = isAccessible && isEnabled;
                  const canEdit = isDepartmentEditable(dept.id) && isEnabled;

                  return (
                    <div key={dept.id} className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEdit}
                        className={`flex-1 justify-start gap-2 h-auto py-2 transition-all hover:scale-105 ${
                          !canEdit ? "opacity-50 cursor-not-allowed" : ""
                        } ${!canView ? "grayscale opacity-30" : ""} ${
                          isSelected
                            ? `${color.light} ${color.border} ${color.text} border-2 ring-2 ring-blue-300 shadow-md`
                            : hasSelections
                            ? `${color.light} ${color.border} border-2 shadow-sm`
                            : canEdit
                            ? "hover:bg-slate-50 hover:shadow-sm"
                            : ""
                        }`}
                        onClick={() => {
                          if (!canEdit) {
                            if (!canView) {
                              toast.error(
                                "Phòng ban này chưa có cấu hình server IP"
                              );
                            } else {
                              toast.error(
                                "Bạn không có quyền thao tác với phòng ban này"
                              );
                            }
                            return;
                          }
                          const newSelected =
                            selectedDepartment === dept.id ? null : dept.id;
                          setSelectedDepartment(newSelected);
                          if (newSelected === null) turnOffBulk(); // <--- NEW
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 mr-2 rounded-full ${
                              color.bg
                            } shadow-sm ${!canView ? "grayscale" : ""}`}
                          />
                          <span
                            className={`truncate text-sm ${
                              !canView
                                ? "text-gray-400"
                                : !canEdit
                                ? "text-gray-600"
                                : ""
                            }`}
                          >
                            {dept.name}
                          </span>
                          {isSelected && canEdit && (
                            <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />
                          )}
                          {hasSelections && !isSelected && canView && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-xs"
                            >
                              {(() => {
                                const selections = departmentSelections.get(
                                  dept.id
                                )!;
                                const total =
                                  selections.days.length +
                                  selections.timeSlots.length;
                                return total;
                              })()}
                            </Badge>
                          )}
                        </div>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canView}
                        className={`p-1 h-8 w-8 ${
                          canView
                            ? "hover:bg-slate-100"
                            : "opacity-30 cursor-not-allowed grayscale"
                        }`}
                        onClick={() => {
                          if (!canView) {
                            toast.error(
                              "Phòng ban này chưa có cấu hình server IP"
                            );
                            return;
                          }
                          setVisibleDepartments((prev) =>
                            prev.includes(dept.id)
                              ? prev.filter((id) => id !== dept.id)
                              : [...prev, dept.id]
                          );
                        }}
                      >
                        {isVisible && canView ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff
                            className={`w-4 h-4 ${
                              canView ? "text-slate-400" : "text-gray-300"
                            }`}
                          />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {selectedDepartment && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 rounded-lg border-2 bg-gradient-to-r from-blue-50 to-indigo-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        getDepartmentColor(selectedDepartment).bg
                      } shadow-sm`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          getSelectedDepartmentColor().text
                        }`}
                      >
                        Phòng ban đang chọn:{" "}
                        {
                          departments.find((d) => d.id === selectedDepartment)
                            ?.name
                        }
                      </p>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                        <MousePointer className="w-3 h-3" />
                        {activeView === "week"
                          ? "Click & kéo để chọn nhiều khung giờ (trừ Chủ nhật)"
                          : "Click & kéo để chọn nhiều ngày, click ngày để chọn lẻ (trừ Chủ nhật)"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        selectedDepartment
                          ? !isDepartmentEditable(selectedDepartment)
                          : !(
                              isAdmin ||
                              isScheduler ||
                              userManagerDepartmentSlugs.length > 0
                            )
                      }
                      onClick={() => {
                        const canEdit = selectedDepartment
                          ? isDepartmentEditable(selectedDepartment)
                          : isAdmin ||
                            isScheduler ||
                            userManagerDepartmentSlugs.length > 0;
                        if (!canEdit) {
                          toast.error(
                            "Bạn không có quyền thao tác phòng ban này"
                          );
                          return;
                        }
                        setSelectedDepartment(null);
                        turnOffBulk();
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Tổng quan lịch đã chọn - SỬA PHẦN NÀY */}
              {departmentSelections.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Tổng quan lịch đã chọn:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Array.from(departmentSelections.entries())
                      .filter(([deptId]) => visibleDepartments.includes(deptId)) // ✅ THÊM FILTER NÀY
                      .map(([deptId, selections]) => {
                        if (
                          selections.days.length === 0 &&
                          selections.timeSlots.length === 0
                        )
                          return null;

                        const dept = departments.find((d) => d.id === deptId);
                        const color = getDepartmentColor(deptId);

                        return (
                          <div
                            key={deptId}
                            className={`text-xs p-2 rounded ${color.light} ${color.border} border shadow-sm`}
                          >
                            <div className={`font-medium ${color.text}`}>
                              {dept?.name}
                            </div>
                            <div className="text-slate-600">
                              📅 {selections.days.length} ngày, 🕐{" "}
                              {selections.timeSlots.length} khung giờ
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Calendar View */}
          <div className="xl:col-span-3">
            <Card className="h-full shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {activeView === "week" ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Lịch tuần - Khung giờ (Cho các chiến dịch tuần và 3
                        ngày)
                        {dragState.isDragging && (
                          <Badge
                            variant="default"
                            className="bg-green-600 animate-pulse"
                          >
                            <MousePointer className="w-3 h-3 mr-1" />
                            Đang chọn...
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Lịch tháng - Theo ngày (Cho các chiến dịch theo giờ và
                        ngày)
                      </span>
                    )}
                  </CardTitle>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const { allDays, allTimeSlots } = getAllSelections();
                      const totalSelections =
                        allDays.length + allTimeSlots.length;
                      const visibleDepartmentCount = Array.from(
                        departmentSelections.entries()
                      )
                        .filter(([deptId]) =>
                          visibleDepartments.includes(deptId)
                        )
                        .filter(
                          ([_, selections]) =>
                            selections.days.length > 0 ||
                            selections.timeSlots.length > 0
                        ).length;

                      return (
                        totalSelections > 0 && (
                          <Badge
                            variant="default"
                            className="bg-blue-600 shadow-sm"
                          >
                            {activeView === "week"
                              ? `${allTimeSlots.length} khung giờ`
                              : `${allDays.length} ngày`}{" "}
                            từ {visibleDepartmentCount} phòng ban
                          </Badge>
                        )
                      );
                    })()}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (activeView === "week") {
                          setCurrentWeek(
                            new Date(
                              currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000
                            )
                          );
                        } else {
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() - 1
                            )
                          );
                        }
                      }}
                      className="hover:bg-blue-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <span className="font-medium min-w-[200px] text-center">
                      {activeView === "week"
                        ? `${weekDates[0].toLocaleDateString(
                            "vi-VN"
                          )} - ${weekDates[6].toLocaleDateString("vi-VN")}`
                        : `Tháng ${
                            currentMonth.getMonth() + 1
                          }, ${currentMonth.getFullYear()}`}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (activeView === "week") {
                          setCurrentWeek(
                            new Date(
                              currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000
                            )
                          );
                        } else {
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1
                            )
                          );
                        }
                      }}
                      className="hover:bg-blue-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {activeView === "week" ? (
                  // Weekly Time Grid with Drag Selection
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* Header */}
                      <div className="grid grid-cols-8 bg-slate-50 border-b">
                        <div className="p-3 font-medium text-center border-r bg-slate-100">
                          Giờ
                        </div>
                        {weekDays.map((day, index) => (
                          <div
                            key={index}
                            className={`p-3 text-center border-r last:border-r-0`}
                          >
                            <div className="font-medium text-sm">{day}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {weekDates[index].getDate()}/
                              {weekDates[index].getMonth() + 1}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Time slots with drag selection */}
                      <ScrollArea className="h-[800px]">
                        <div className="select-none">
                          {timeSlots.map((time, timeIndex) => (
                            <div
                              key={time}
                              className="grid grid-cols-8 border-b hover:bg-slate-25"
                            >
                              <div
                                className={`p-2 text-center border-r min-h-[50px] flex flex-col justify-center ${
                                  time >= "12:00" && time < "13:30"
                                    ? "bg-rose-100"
                                    : "bg-slate-50"
                                }`}
                              >
                                {/* Hiển thị range time với background màu */}
                                <div
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    time >= "12:00" && time < "13:30"
                                      ? "bg-rose-200 text-rose-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {formatTimeRange(
                                    time,
                                    timeSlots[timeIndex + 1] || LAST_SLOT_END
                                  )}
                                  {time >= "12:00" && time < "13:30" && (
                                    <div className="text-xs mt-1">
                                      🍽️ Nghỉ trưa
                                    </div>
                                  )}
                                </div>
                              </div>

                              {Array.from({ length: 7 }, (_, dayIndex) => {
                                const specificDate = weekDates[dayIndex]
                                  .toISOString()
                                  .split("T")[0];
                                const isSelectedByCurrentDept =
                                  isTimeSlotSelected(
                                    dayIndex,
                                    time,
                                    specificDate
                                  );
                                const {
                                  isSelected: isSelectedByAny,
                                  departmentId: selectedByDeptId,
                                  userId: selectedByUserId,
                                } = isTimeSlotSelectedByAnyDept(
                                  dayIndex,
                                  time,
                                  specificDate
                                );
                                const {
                                  isBlocked: isBlockedByHidden,
                                  departmentId: blockedByDeptId,
                                } = isSlotBlockedByHiddenDepartment(
                                  dayIndex,
                                  time,
                                  specificDate
                                );
                                const slotSchedules = getSchedulesForSlot(
                                  dayIndex,
                                  time,
                                  specificDate
                                );
                                const isInDragRange = isSlotInDragRange(
                                  dayIndex,
                                  time,
                                  specificDate
                                );
                                const isLunchBreak =
                                  time >= "12:00" && time < "13:30";
                                const isConflicted = isTimeSlotConflicted(
                                  dayIndex,
                                  time,
                                  specificDate
                                );
                                const isPast = isPastTimeSlot(
                                  dayIndex,
                                  time,
                                  specificDate
                                );
                                const hasExistingSchedule =
                                  isSlotHasExistingSchedule(
                                    dayIndex,
                                    time,
                                    specificDate
                                  );
                                const canInteract =
                                  !isLunchBreak &&
                                  !isConflicted &&
                                  !isPast &&
                                  !isBlockedByHidden &&
                                  // ✅ SỬA: Cho phép tương tác với ô đã chọn để có thể drag quét
                                  (!hasExistingSchedule || isSelectedByCurrentDept) &&
                                  !isSlotBlockedByExistingSchedule(dayIndex, time, specificDate) && // ✅ THÊM: Kiểm tra ô bị chặn bởi lịch đã có
                                  !(
                                    isSelectedByAny &&
                                    selectedByDeptId !== selectedDepartment
                                  ) &&
                                  selectedDepartment &&
                                  // ✅ THÊM: Kiểm tra ô đang được chỉnh sửa bởi user khác
                                  !(() => {
                                    const fieldId = makeTimeSlotFieldId(dayIndex, time, specificDate);
                                    const lockedBy = getFieldLockedBy(fieldId);
                                    return lockedBy && lockedBy.userId !== user?.id;
                                  })() &&
                                  // ✅ SỬA: Cho phép tương tác với ô đã chọn để có thể drag quét
                                  (slotSchedules.length === 0 || isSelectedByCurrentDept);
                                const isPreviewSelection =
                                  isInDragRange &&
                                  dragState.isSelecting &&
                                  !isSelectedByCurrentDept &&
                                  !isPast &&
                                  !isBlockedByHidden &&
                                  !isConflicted &&
                                  !isLunchBreak &&
                                  !isSlotBlockedByExistingSchedule(dayIndex, time, specificDate) && // ✅ THÊM: Kiểm tra ô bị chặn bởi lịch đã có
                                  // ✅ THÊM: Không cho preview selection cho ô đã có lịch
                                  slotSchedules.length === 0;
                                const isPreviewDeselection =
                                  isInDragRange &&
                                  !dragState.isSelecting &&
                                  isSelectedByCurrentDept &&
                                  !isPast &&
                                  !isBlockedByHidden &&
                                  !isConflicted &&
                                  !isLunchBreak &&
                                  !isSlotBlockedByExistingSchedule(dayIndex, time, specificDate) && // ✅ THÊM: Kiểm tra ô bị chặn bởi lịch đã có
                                  // ✅ THÊM: Không cho preview deselection cho ô đã có lịch
                                  slotSchedules.length === 0;

                                return (
                                  <div
                                    key={dayIndex}
                                    data-slot-date={specificDate}
                                    data-time={time}
                                    className={`p-1 border-r last:border-r-0 min-h-[40px] relative
                                    ${
                                      dayIndex === 6 // Chủ nhật
                                        ? "bg-gray-200 opacity-50 cursor-not-allowed"
                                        : isLunchBreak
                                        ? "bg-gray-200 opacity-50 cursor-not-allowed"
                                        : isPast // Thêm styling cho slot quá khứ
                                        ? "bg-gray-200 opacity-50 cursor-not-allowed"
                                        : isBlockedByHidden
                                        ? "bg-gray-200 opacity-50 cursor-not-allowed border-dashed border-gray-400"
                                        : isSelectedByAny &&
                                          selectedByDeptId !==
                                            selectedDepartment // **THÊM ĐIỀU KIỆN NÀY**
                                        ? "bg-orange-200 opacity-60 cursor-not-allowed border-orange-200 border-2"
                                        : hasExistingSchedule // ✅ THÊM: Styling cho ô đã có lịch
                                        ? "bg-red-100 opacity-70 cursor-not-allowed border-red-300 border-2"
                                        : isConflicted &&
                                          !isLunchBreak &&
                                          !isPast
                                        ? "cursor-not-allowed opacity-90"
                                        : canInteract
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed"
                                    }
                                    ${
                                      isPreviewSelection
                                        ? `${
                                            getSelectedDepartmentColor().light
                                          } ${
                                            getSelectedDepartmentColor().border
                                          } border-2 shadow-md opacity-70 scale-105`
                                        : isPreviewDeselection
                                        ? "bg-red-100 border-red-300 border-2 opacity-70 scale-95"
                                        : isSelectedByCurrentDept &&
                                          selectedDepartment
                                        ? `${
                                            getSelectedDepartmentColor().light
                                          } ${
                                            getSelectedDepartmentColor().border
                                          } border-2 shadow-md hover:scale-105`
                                        : isSelectedByAny && selectedByDeptId
                                        ? `${
                                            getDepartmentColor(selectedByDeptId)
                                              .light
                                          } ${
                                            getDepartmentColor(selectedByDeptId)
                                              .border
                                          } border-2 shadow-sm`
                                        : isBlockedByHidden && blockedByDeptId // ✅ STYLING CHO HIDDEN DEPARTMENT
                                        ? `${
                                            getDepartmentColor(blockedByDeptId)
                                              .light
                                          } opacity-30 border-dashed`
                                        : slotSchedules.length > 0
                                        ? "bg-gray-100"
                                        : selectedDepartment && !isConflicted
                                        ? "hover:bg-gray-50 hover:border-blue-200 hover:shadow-sm"
                                        : "hover:bg-slate-50"
                                    } ${
                                      focusTarget &&
                                      focusTarget.date === specificDate &&
                                      focusTarget.time === time
                                        ? "ring-2 ring-blue-400"
                                        : ""
                                    }`}
                                    onMouseDown={(e) => {
                                      if (!canInteract) return;
                                      
                                      // ✅ THÊM: Kiểm tra ô có schedule đã tồn tại
                                      if (slotSchedules.length > 0) {
                                        toast.error("Ô này đã có lịch hoạt động, không thể chỉnh sửa");
                                        return;
                                      }
                                      
                                      // ✅ THÊM: Logic mới - Nhấn giữ để quét từ ô đã chọn
                                      if (isSelectedByCurrentDept && selectedDepartment) {
                                        console.log('[ScheduleApp] User starting drag from selected cell, will toggle selection during drag');
                                        
                                        // Bắt đầu drag với mode toggle (không xóa ngay)
                                        const fieldId = makeTimeSlotFieldId(dayIndex, time, specificDate);
                                        
                                        // Start edit session
                                        startEditSession(fieldId, 'calendar_cell', {
                                          dayIndex,
                                          time,
                                          date: specificDate,
                                        });
                                        
                                        // Gọi handleTimeSlotMouseDown với mode toggle
                                        handleTimeSlotMouseDown(dayIndex, time, specificDate, e);
                                        return;
                                      }
                                      
                                      // Check if field is locked by another user
                                      const fieldId = makeTimeSlotFieldId(dayIndex, time, specificDate);
                                      if (isFieldLocked(fieldId)) {
                                        const lockedBy = getFieldLockedBy(fieldId);
                                        if (lockedBy) {
                                          toast.error(`Ô này đang được chỉnh sửa bởi ${lockedBy.userName}`);
                                          return;
                                        }
                                      }
                                      
                                      // Start edit session
                                      startEditSession(fieldId, 'calendar_cell', {
                                        dayIndex,
                                        time,
                                        date: specificDate,
                                      });
                                      
                                      handleTimeSlotMouseDown(dayIndex, time, specificDate, e);
                                    }}
                                    onMouseEnter={() =>
                                      canInteract &&
                                      handleTimeSlotMouseEnter(
                                        dayIndex,
                                        time,
                                        specificDate
                                      )
                                    }
                                    onMouseUp={
                                      canInteract
                                        ? handleTimeSlotMouseUp
                                        : undefined
                                    }
                                  >
                                    {/* Existing schedules */}
                                    {slotSchedules.map((schedule, idx) => {
                                      const color = getDepartmentColor(
                                        schedule.department!.id
                                      );
                                      return (
                                        <div
                                          key={schedule.id}
                                          className={`text-xs p-1 mb-1 rounded ${color.light} ${color.border} border shadow-sm`}
                                          style={{ zIndex: idx + 1 }}
                                        >
                                          <div
                                            className={`font-medium ${color.text}`}
                                          >
                                            {schedule.name}
                                          </div>
                                          <div className="text-slate-600">
                                            {schedule.department?.name}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {/* ✅ HIỂN THỊ CHO Ô BỊ BLOCK */}
                                    {isBlockedByHidden && blockedByDeptId && (
                                      <div className="absolute inset-0 bg-slate-300 bg-opacity-20 rounded flex items-center justify-center border border-slate-400 border-dashed">
                                        <EyeOff className="w-4 h-4 text-slate-500 opacity-60" />
                                      </div>
                                    )}
                                    
                                    {/* ✅ THÊM: Hiển thị cho ô đã có lịch bị khóa */}
                                    {hasExistingSchedule && (
                                      <div className="absolute inset-0 bg-red-100 bg-opacity-80 rounded flex items-center justify-center border-2 border-red-300 border-dashed">
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white shadow-md">
                                          <Lock className="w-4 h-4 text-red-600" />
                                          <span className="text-xs font-medium text-red-600">
                                            Đã có lịch
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Selection indicators */}
                                    {isSelectedByCurrentDept &&
                                      selectedDepartment &&
                                      !isInDragRange && (
                                        <motion.div
                                          initial={{ scale: 0, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          exit={{ scale: 0, opacity: 0 }}
                                          className={`absolute inset-0 ${
                                            getSelectedDepartmentColor().light
                                          } bg-opacity-30 rounded flex items-center justify-center border-2 ${
                                            getSelectedDepartmentColor().border
                                          }`}
                                        >
                                          <CheckCircle
                                            className={`w-5 h-5 ${
                                              getSelectedDepartmentColor().text
                                            } bg-white rounded-full shadow-sm`}
                                          />
                                        </motion.div>
                                      )}

                                    {/* Remote user selection/editing indicators - PADLOCK */}
                                    {(() => {
                                      // Kiểm tra ô được chọn bởi user khác
                                      const { isSelected: isSelectedByRemote, userId: remoteUserId } = isTimeSlotSelectedByAnyDept(dayIndex, time, specificDate);
                                      
                                      // Kiểm tra ô đang được chỉnh sửa bởi user khác
                                      const fieldId = makeTimeSlotFieldId(dayIndex, time, specificDate);
                                      const lockedBy = getFieldLockedBy(fieldId);
                                      
                                      // Nếu ô được chọn HOẶC đang được chỉnh sửa bởi user khác
                                      if ((isSelectedByRemote && remoteUserId && remoteUserId !== user?.id) || lockedBy) {
                                        // Lấy thông tin user
                                        let targetUser = null;
                                        let title = '';
                                        
                                        if (isSelectedByRemote && remoteUserId) {
                                          targetUser = Array.from(presences.values()).find(p => p.userId === remoteUserId);
                                          title = `Được chọn bởi ${targetUser?.userName || 'Unknown'}`;
                                        } else if (lockedBy) {
                                          targetUser = Array.from(presences.values()).find(p => p.userId === lockedBy.userId);
                                          title = `Đang chỉnh sửa bởi ${targetUser?.userName || lockedBy.userName}`;
                                        }
                                        
                                        if (targetUser || lockedBy) {
                                          // Lấy tên user từ nhiều nguồn
                                          let userName = 'Unknown';
                                          if (targetUser?.userName) {
                                            userName = targetUser.userName;
                                          } else if (lockedBy?.userName) {
                                            userName = lockedBy.userName;
                                          } else if (targetUser?.departmentName) {
                                            userName = `${targetUser.departmentName} User`;
                                          } else if (lockedBy?.departmentId) {
                                            const dept = departments.find(d => d.id === lockedBy.departmentId);
                                            userName = dept ? `${dept.name} User` : 'Unknown User';
                                          }
                                          
                                          return (
                                            <motion.div
                                              initial={{ scale: 0, opacity: 0 }}
                                              animate={{ scale: 1, opacity: 1 }}
                                              exit={{ scale: 0, opacity: 0 }}
                                              className="absolute inset-0 bg-slate-100 bg-opacity-80 rounded flex items-center justify-center border-2 border-orange-300 border-dashed"
                                              title={title}
                                            >
                                              <div className="flex items-center gap-2 p-2 rounded-lg bg-white shadow-md">
                                                <Lock className="w-4 h-4 text-orange-600" />
                                                <span className="text-xs font-medium text-orange-600">
                                                  {userName}
                                                </span>
                                              </div>
                                            </motion.div>
                                          );
                                        }
                                      }
                                      return null;
                                    })()}

                                    {/* Drag preview */}
                                    {isPreviewSelection && (
                                      <div
                                        className={`absolute inset-0 ${
                                          getSelectedDepartmentColor().light
                                        } bg-opacity-50 rounded flex items-center justify-center border-2 ${
                                          getSelectedDepartmentColor().border
                                        } border-dashed animate-pulse`}
                                      >
                                        <Plus
                                          className={`w-4 h-4 ${
                                            getSelectedDepartmentColor().text
                                          } opacity-70`}
                                        />
                                      </div>
                                    )}

                                    {isPreviewDeselection && (
                                      <div className="absolute inset-0 bg-red-100 bg-opacity-50 rounded flex items-center justify-center border-2 border-red-300 border-dashed animate-pulse">
                                        <X className="w-4 h-4 text-red-600 opacity-70" />
                                      </div>
                                    )}

                                    {/* ✅ THÊM: Toggle Selection Visual Indicators */}
                                    {(() => {
                                      // Chỉ hiển thị khi đang drag và ô này trong drag range
                                      if (!dragState.isDragging || !isInDragRange) return null;
                                      
                                      // Xác định trạng thái hiện tại của ô
                                      const isCurrentlySelected = isTimeSlotSelected(dayIndex, time, specificDate);
                                      
                                      // Hiển thị dấu + cho ô chưa chọn, dấu X cho ô đã chọn
                                      if (!isCurrentlySelected) {
                                        // Ô chưa chọn - hiển thị dấu +
                                        return (
                                          <div
                                            className={`absolute inset-0 ${
                                              getSelectedDepartmentColor().light
                                            } bg-opacity-50 rounded flex items-center justify-center border-2 ${
                                              getSelectedDepartmentColor().border
                                            } border-dashed animate-pulse`}
                                          >
                                            <Plus
                                              className={`w-4 h-4 ${
                                                getSelectedDepartmentColor().text
                                              } opacity-70`}
                                            />
                                          </div>
                                        );
                                      } else {
                                        // Ô đã chọn - hiển thị dấu X
                                        return (
                                          <div className="absolute inset-0 bg-red-100 bg-opacity-50 rounded flex items-center justify-center border-2 border-red-300 border-dashed animate-pulse">
                                            <X className="w-4 h-4 text-red-600 opacity-70" />
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  // Monthly Calendar
                  <div className="p-4">
                    {/* Calendar header */}
                    <div className="grid grid-cols-7 mb-2">
                      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(
                        (day, index) => (
                          <div
                            key={day}
                            className={`p-3 text-center font-medium border-b`}
                          >
                            {day}
                          </div>
                        )
                      )}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-0 border rounded-lg overflow-hidden shadow-sm">
                      {getMonthCalendar.map((day, index) => {
                        const isSelectedByCurrentDept = day.isCurrentMonth
                          ? isDaySelected(
                              day.date,
                              currentMonth.getMonth(),
                              currentMonth.getFullYear()
                            )
                          : false;
                        const {
                          isSelected: isSelectedByAny,
                          departmentId: selectedByDeptId,
                        } = day.isCurrentMonth
                          ? isDaySelectedByAnyDept(
                              day.date,
                              currentMonth.getMonth(),
                              currentMonth.getFullYear()
                            )
                          : { isSelected: false, departmentId: null };

                        const {
                          isBlocked: isBlockedByHidden,
                          departmentId: blockedByDeptId,
                        } = day.isCurrentMonth
                          ? isDayBlockedByHiddenDepartment(
                              day.date,
                              currentMonth.getMonth(),
                              currentMonth.getFullYear()
                            )
                          : { isBlocked: false, departmentId: null };
                        const daySchedules = day.isCurrentMonth
                          ? getSchedulesForDay(
                              day.date,
                              currentMonth.getMonth(),
                              currentMonth.getFullYear()
                            )
                          : [];

                        const hasExistingSchedule = day.isCurrentMonth
                          ? isDayHasExistingSchedule(
                              day.date,
                              currentMonth.getMonth(),
                              currentMonth.getFullYear()
                            )
                          : false;

                        const currentDate = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth(),
                          day.date
                        );
                        const isSunday =
                          day.isCurrentMonth && currentDate.getDay() === 0;
                        const isConflicted =
                          day.isCurrentMonth &&
                          isDayConflicted(
                            day.date,
                            currentMonth.getMonth(),
                            currentMonth.getFullYear()
                          );

                        const isPast =
                          day.isCurrentMonth &&
                          isPastDay(
                            day.date,
                            currentMonth.getMonth(),
                            currentMonth.getFullYear()
                          );
                        // ✅ SỬA: Logic canInteract hoàn chỉnh giống weekly view
                        const isLockedByOther = (() => {
                          const fieldId = `day-${day.date}-${currentMonth.getMonth()}-${currentMonth.getFullYear()}`;
                          const lockedBy = getFieldLockedBy(fieldId);
                          return lockedBy && lockedBy.userId !== user?.id;
                        })();
                        
                        // ✅ SỬA: Logic canInteract hoàn toàn giống weekly view
                        const canInteract =
                          !isSunday &&
                          !isConflicted &&
                          !isPast &&
                          !isBlockedByHidden &&
                          // ✅ SỬA: Cho phép tương tác với ngày đã chọn để có thể drag quét
                          (!hasExistingSchedule || isSelectedByCurrentDept) &&
                          !isDayBlockedByExistingSchedule(day.date, currentMonth.getMonth(), currentMonth.getFullYear()) && // ✅ THÊM: Kiểm tra ngày bị chặn bởi lịch đã có
                          // ✅ SỬA: Không cho phép tương tác với ngày bị người khác khóa
                          !isLockedByOther &&
                          // ✅ SỬA: Cho phép tương tác với ngày đã chọn để có thể drag quét (giống weekly view)
                          (daySchedules.length === 0 || isSelectedByCurrentDept) &&
                          // ✅ THÊM: Cho phép tương tác với ô đã chọn để có thể drag quét
                          (!isSelectedByCurrentDept || true); // Luôn cho phép tương tác với ô đã chọn

                        return (
                          <div
                            key={index}
                            data-day-date={`${currentMonth.getFullYear()}-${String(
                              currentMonth.getMonth() + 1
                            ).padStart(2, "0")}-${String(day.date).padStart(
                              2,
                              "0"
                            )}`}
                            className={`min-h-[80px] p-2 border-r border-b transition-all relative hover:shadow-sm
                              ${
                                !day.isCurrentMonth
                                  ? "bg-slate-50 text-slate-400"
                                  : isPast
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                  : isSunday
                                  ? "bg-red-50 text-red-400 cursor-not-allowed opacity-60"
                                  : isBlockedByHidden
                                  ? "bg-slate-200 opacity-40 cursor-not-allowed border-dashed border-slate-400"
                                  : isConflicted
                                  ? "cursor-not-allowed opacity-90"
                                  : isSelectedByCurrentDept &&
                                    selectedDepartment
                                  ? `${getSelectedDepartmentColor().light} ${
                                      getSelectedDepartmentColor().border
                                    } border-2 shadow-lg cursor-pointer transform hover:scale-105`
                                  : isSelectedByAny && selectedByDeptId
                                  ? `${
                                      getDepartmentColor(selectedByDeptId).light
                                    } ${
                                      getDepartmentColor(selectedByDeptId)
                                        .border
                                    } border-2 cursor-pointer shadow-sm`
                                  : isBlockedByHidden && blockedByDeptId
                                  ? `${
                                      getDepartmentColor(blockedByDeptId).light
                                    } opacity-30 border-dashed`
                                  : isLockedByOther // ✅ THÊM: Styling cho ngày bị người khác khóa
                                  ? "bg-yellow-100 opacity-70 cursor-not-allowed border-yellow-300 border-2"
                                  : hasExistingSchedule // ✅ THÊM: Styling cho ngày đã có lịch
                                  ? "bg-red-100 opacity-70 cursor-not-allowed border-red-300 border-2"
                                  : daySchedules.length > 0
                                  ? "bg-green-50 cursor-pointer hover:bg-green-100"
                                  : "hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
                              } ${
                                focusTarget &&
                                focusTarget.date === `${currentMonth.getFullYear()}-${String(
                                  currentMonth.getMonth() + 1
                                ).padStart(2, "0")}-${String(day.date).padStart(
                                  2,
                                  "0"
                                )}`
                                  ? "ring-2 ring-blue-400"
                                  : ""
                              }`}
                            onMouseDown={(e) => {
                              if (canInteract) {
                                // ✅ THÊM: Kiểm tra ngày có schedule đã tồn tại
                                if (daySchedules.length > 0) {
                                  toast.error("Ngày này đã có lịch hoạt động, không thể chỉnh sửa");
                                  return;
                                }
                                
                                // ✅ SỬA: Logic hoàn toàn giống weekly view - cho phép drag để quét
                                console.log('[ScheduleApp] User starting interaction with day, will handle in mouseUp');
                                
                                // Gọi handleDayMouseDown để bắt đầu drag (giống weekly view)
                                handleDayMouseDown(day.date, day.isCurrentMonth, e);
                              }
                            }}
                            onMouseEnter={() => {
                              if (canInteract) {
                                // ✅ THÊM: Kiểm tra ngày có schedule đã tồn tại
                                if (daySchedules.length > 0) {
                                  return; // Không cho phép drag vào ngày đã có lịch
                                }
                                
                                handleDayMouseEnter(
                                  day.date,
                                  day.isCurrentMonth
                                );
                              }
                            }}
                            onMouseUp={
                              canInteract ? handleDayMouseUp : undefined
                            }
                            onClick={() => {
                              if (canInteract) {
                                // ✅ THÊM: Kiểm tra ngày có schedule đã tồn tại
                                if (daySchedules.length > 0) {
                                  toast.error("Ngày này đã có lịch hoạt động, không thể chỉnh sửa");
                                  return;
                                }
                                
                                // ✅ SỬA: Logic hoàn toàn giống weekly view - cho phép drag để quét
                                console.log('[ScheduleApp] User starting interaction with day, will handle in mouseUp');
                                
                                // Gọi handleDayClick để xử lý click (giống weekly view)
                                handleDayClick(day.date, day.isCurrentMonth);
                              }
                            }}
                          >
                                                          {/* ✅ THÊM: Indicator cho ngày bị người khác khóa */}
                              {isLockedByOther && (
                                <div className="absolute top-1 left-1">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                </div>
                              )}
                              
                              {/* Day number */}
                              <div
                                className={`font-medium text-sm mb-1 
                                ${
                                  day.date === new Date().getDate() &&
                                  currentMonth.getMonth() ===
                                    new Date().getMonth() &&
                                  currentMonth.getFullYear() ===
                                    new Date().getFullYear() &&
                                  day.isCurrentMonth &&
                                  !isSunday
                                    ? "text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                                    : isSelectedByCurrentDept &&
                                      selectedDepartment &&
                                      !isSunday
                                    ? `${
                                        getSelectedDepartmentColor().text
                                      } font-bold`
                                    : isSunday
                                    ? "w-6 h-6 text-red-400"
                                    : "w-6 h-6"
                                }`}
                              >
                              {day.date}
                              {(() => {
                                if (!day.isCurrentMonth) return null;
                                const isInDragRange = isDayInMonthlyDragRange(
                                  day.date,
                                  currentMonth.getMonth(),
                                  currentMonth.getFullYear()
                                );
                                const isPreviewSelection =
                                  isInDragRange &&
                                  monthlyDragState.isSelecting &&
                                  !isSelectedByCurrentDept &&
                                  !isPast &&
                                  !isSunday &&
                                  !isConflicted &&
                                  !isDayBlockedByExistingSchedule(day.date, currentMonth.getMonth(), currentMonth.getFullYear()) && // ✅ THÊM: Kiểm tra ngày bị chặn bởi lịch đã có
                                  // ✅ THÊM: Không cho preview selection cho ngày đã có lịch
                                  daySchedules.length === 0;
                                const isPreviewDeselection =
                                  isInDragRange &&
                                  !monthlyDragState.isSelecting &&
                                  isSelectedByCurrentDept &&
                                  !isPast &&
                                  !isSunday &&
                                  !isConflicted &&
                                  !isDayBlockedByExistingSchedule(day.date, currentMonth.getMonth(), currentMonth.getFullYear()) && // ✅ THÊM: Kiểm tra ngày bị chặn bởi lịch đã có
                                  // ✅ THÊM: Không cho preview deselection cho ngày đã có lịch
                                  daySchedules.length === 0;

                                if (isPreviewSelection) {
                                  return (
                                    <div
                                      className={`absolute inset-0 ${
                                        getSelectedDepartmentColor().light
                                      } bg-opacity-50 rounded flex items-center justify-center border-2 ${
                                        getSelectedDepartmentColor().border
                                      } border-dashed animate-pulse`}
                                    >
                                      <Plus
                                        className={`w-4 h-4 ${
                                          getSelectedDepartmentColor().text
                                        } opacity-70`}
                                      />
                                    </div>
                                  );
                                } else if (isPreviewDeselection) {
                                  return (
                                    <div className="absolute inset-0 bg-red-100 bg-opacity-50 rounded flex items-center justify-center border-2 border-red-300 border-dashed animate-pulse">
                                      <X className="w-4 h-4 text-red-600 opacity-70" />
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            {/* ✅ THÊM HIỂN THỊ CHO NGÀY BỊ BLOCK */}
                            {isBlockedByHidden && blockedByDeptId && (
                              <div className="absolute top-1 left-1 bg-slate-300 bg-opacity-20 rounded flex items-center justify-center border border-slate-400 border-dashed p-1">
                                <EyeOff className="w-3 h-3 text-slate-500 opacity-60" />
                              </div>
                            )}
                            
                            {/* ✅ THÊM: Hiển thị cho ngày đã có lịch bị khóa */}
                            {hasExistingSchedule && (
                              <div className="absolute top-1 right-1 bg-red-100 bg-opacity-80 rounded flex items-center justify-center border-2 border-red-300 border-dashed p-1">
                                <div className="flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-red-600" />
                                  <span className="text-xs font-medium text-red-600">
                                    Lịch
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Day schedules - MỚI */}
                            {!isSunday && day.isCurrentMonth && (
                              <div className="space-y-1">
                                {daySchedules.slice(0, 2).map((schedule) => {
                                  const color = getDepartmentColor(
                                    schedule.department!.id
                                  );
                                  return (
                                    <div
                                      key={schedule.id}
                                      className={`text-xs p-1 mb-1 rounded ${color.light} ${color.border} border shadow-sm`}
                                    >
                                      {/* Tên lịch */}
                                      <div
                                        className={`font-medium ${color.text} truncate`}
                                      >
                                        {schedule.name}
                                      </div>
                                      {/* Tên phòng ban */}
                                      <div className="text-slate-600 truncate">
                                        {schedule.department?.name}
                                      </div>
                                    </div>
                                  );
                                })}

                                {daySchedules.length > 2 && (
                                  <div className="text-xs text-slate-500 font-medium">
                                    +{daySchedules.length - 2} lịch khác
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Selection indicator */}
                            {isSelectedByCurrentDept &&
                              selectedDepartment &&
                              !isSunday && (
                                <div className="absolute top-1 right-1 bg-white rounded-full shadow-md">
                                  <CheckCircle
                                    className={`w-5 h-5 ${
                                      getSelectedDepartmentColor().text
                                    } border-2 border-white rounded-full`}
                                  />
                                </div>
                              )}

                            {/* ✅ THÊM: Toggle Selection Visual Indicators cho Monthly View */}
                            {(() => {
                              // Chỉ hiển thị khi đang drag và ngày này trong drag range
                              if (!monthlyDragState.isDragging || !isDayInMonthlyDragRange(day.date, currentMonth.getMonth(), currentMonth.getFullYear())) return null;
                              
                              // Xác định trạng thái hiện tại của ngày
                              const isCurrentlySelected = isDaySelected(day.date, currentMonth.getMonth(), currentMonth.getFullYear());
                              
                              // Hiển thị dấu + cho ngày chưa chọn, dấu X cho ngày đã chọn
                              if (!isCurrentlySelected) {
                                // Ngày chưa chọn - hiển thị dấu +
                                return (
                                  <div
                                    className={`absolute inset-0 ${
                                      getSelectedDepartmentColor().light
                                    } bg-opacity-50 rounded flex items-center justify-center border-2 ${
                                      getSelectedDepartmentColor().border
                                    } border-dashed animate-pulse`}
                                  >
                                    <Plus
                                      className={`w-4 h-4 ${
                                        getSelectedDepartmentColor().text
                                      } opacity-70`}
                                    />
                                  </div>
                                );
                              } else {
                                // Ngày đã chọn - hiển thị dấu X
                                return (
                                  <div className="absolute inset-0 bg-red-100 bg-opacity-50 rounded flex items-center justify-center border-2 border-red-300 border-dashed animate-pulse">
                                    <X className="w-4 h-4 text-red-600 opacity-70" />
                                  </div>
                                );
                              }
                            })()}
                            
                            {/* ✅ THÊM: Giao diện khóa ô người khác chọn */}
                            {isLockedByOther && (
                              <div className="absolute inset-0 bg-yellow-100 bg-opacity-80 rounded flex items-center justify-center border-2 border-yellow-300 border-dashed">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-4 h-4 text-yellow-600" />
                                  <span className="text-xs font-medium text-yellow-600">
                                    {(() => {
                                      // Lấy thông tin người đang chọn giống weekly view
                                      const fieldId = `day-${day.date}-${currentMonth.getMonth()}-${currentMonth.getFullYear()}`;
                                      const lockedBy = getFieldLockedBy(fieldId);
                                      
                                      if (lockedBy) {
                                        // Lấy tên user từ nhiều nguồn giống weekly view
                                        let userName = 'Unknown';
                                        if (lockedBy.userName) {
                                          userName = lockedBy.userName;
                                        } else if (lockedBy.departmentId) {
                                          const dept = departments.find(d => d.id === lockedBy.departmentId);
                                          userName = dept ? `${dept.name} User` : 'Unknown User';
                                        }
                                        return `${userName} đang chọn`;
                                      }
                                      
                                      // Fallback: Lấy từ cellSelections nếu có
                                      const { isSelected: isSelectedByOther, userId: otherUserId } = isDaySelectedByAnyDept(
                                        day.date, currentMonth.getMonth(), currentMonth.getFullYear()
                                      );
                                      
                                      if (isSelectedByOther && otherUserId && otherUserId !== user?.id) {
                                        // Tìm user trong presences
                                        const targetUser = Array.from(presences.values()).find(p => p.userId === otherUserId);
                                        if (targetUser?.userName) {
                                          return `${targetUser.userName} đang chọn`;
                                        }
                                      }
                                      
                                      return 'Đang chọn';
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="space-y-4">
              {/* Selection Summary */}
              {departmentSelections.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-600" />
                        Lịch đã chọn
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {Array.from(departmentSelections.entries())
                          .filter(([deptId]) =>
                            visibleDepartments.includes(deptId)
                          )
                          .map(([deptId, selections]) => {
                            if (
                              selections.days.length === 0 &&
                              selections.timeSlots.length === 0
                            )
                              return null;

                            const dept = departments.find(
                              (d) => d.id === deptId
                            );
                            const color = getDepartmentColor(deptId);

                            return (
                              <div
                                key={deptId}
                                className={`p-3 rounded-lg ${color.light} ${color.border} border shadow-sm`}
                              >
                                <div
                                  className={`font-medium text-sm ${color.text} mb-2`}
                                >
                                  {dept?.name}
                                </div>

                                {selections.days.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs font-medium text-slate-700 mb-1">
                                      {selections.days.length} ngày:
                                    </p>
                                    <div className="text-xs text-slate-600">
                                      {selections.days
                                        .slice(0, 3)
                                        .map((day, idx) => (
                                          <span key={idx}>
                                            {day.date}/{day.month + 1}
                                            {idx <
                                            Math.min(
                                              2,
                                              selections.days.length - 1
                                            )
                                              ? ", "
                                              : ""}
                                          </span>
                                        ))}
                                      {selections.days.length > 3 && " ..."}
                                    </div>
                                  </div>
                                )}

                                {selections.timeSlots.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-700 mb-1">
                                      🕐 {selections.timeSlots.length} khung giờ
                                      được chọn:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selections.timeSlots.map((slot, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className="text-xs font-medium"
                                        >
                                          <div>
                                            {
                                              weekDays[
                                                dowToUi(slot.day_of_week!)
                                              ]
                                            }{" "}
                                            {slot.start_time}-{slot.end_time}
                                          </div>
                                          {/* ✅ THÊM: Hiển thị applicable_date */}
                                          {slot.applicable_date && (
                                            <div className="text-xs text-blue-600 mt-1">
                                              📅{" "}
                                              {new Date(
                                                slot.applicable_date
                                              ).toLocaleDateString("vi-VN")}
                                            </div>
                                          )}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {/* Bulk Schedule Preview */}
                                {/* Thêm thông báo trong bulk mode */}
                                {isBulkMode && bulkScheduleConfig.enabled && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200"
                                  >
                                    <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                                      <Sparkles className="w-4 h-4" />
                                      Chế độ sắp lịch hàng loạt đang BẬT
                                    </h4>
                                    <div className="text-xs text-purple-700">
                                      <p>
                                        📅 Lịch sẽ được tự động nhân bản cho{" "}
                                        <strong>
                                          {bulkScheduleConfig.count + 1}
                                        </strong>{" "}
                                        {bulkScheduleConfig.type === "weeks"
                                          ? "tuần"
                                          : "tháng"}
                                        (bao gồm{" "}
                                        {bulkScheduleConfig.type === "weeks"
                                          ? "tuần"
                                          : "tháng"}{" "}
                                        hiện tại + {bulkScheduleConfig.count}{" "}
                                        {bulkScheduleConfig.type === "weeks"
                                          ? "tuần"
                                          : "tháng"}{" "}
                                        tiếp theo)
                                      </p>
                                      <p className="mt-1">
                                        🧮 <strong>Dự kiến:</strong>{" "}
                                        {getCurrentDepartmentSelections()
                                          .timeSlots.length +
                                          getCurrentDepartmentSelections().days
                                            .length}{" "}
                                        items × {bulkScheduleConfig.count + 1}{" "}
                                        {bulkScheduleConfig.type === "weeks"
                                          ? "tuần"
                                          : "tháng"}{" "}
                                        ={" "}
                                        {(getCurrentDepartmentSelections()
                                          .timeSlots.length +
                                          getCurrentDepartmentSelections().days
                                            .length) *
                                          (bulkScheduleConfig.count + 1)}{" "}
                                        items tổng
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {!isViewRole && (
                        <Button
                          onClick={() => {
                            setIsCreateDialogOpen(true);
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={
                            departmentSelections.size === 0 ||
                            !(
                              isAdmin ||
                              isScheduler ||
                              userManagerDepartmentSlugs.length > 0
                            )
                          }
                        >
                        <span className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {isAdmin ||
                          isScheduler ||
                          userManagerDepartmentSlugs.length > 0
                            ? isEditMode
                              ? `Cập nhật lịch`
                              : isBulkMode
                              ? `Lưu lịch hàng loạt (${
                                  bulkScheduleConfig.count
                                } ${
                                  bulkScheduleConfig.type === "weeks"
                                    ? "tuần"
                                    : "tháng"
                                })`
                              : `Lưu lịch (${departmentSelections.size} phòng ban)`
                            : "Bạn không có quyền lưu lịch"}
                        </span>
                      </Button>
                        )}

                                              {!isViewRole && (
                          <Button
                            onClick={handleClearAllMine}
                            variant="outline"
                            disabled={
                              !(
                                isAdmin ||
                                isScheduler ||
                                userManagerDepartmentSlugs.length > 0
                              )
                            }
                            className="w-full hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="flex items-center gap-2">
                              <X className="w-4 h-4" />
                              Xóa tất cả
                            </span>
                          </Button>
                        )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Schedule List */}
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Lịch hoạt động
                    </span>
                    <Badge variant="outline" className="bg-blue-50">
                      {filteredSchedules.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2 p-4">
                      {isLoadingSchedules ? (
                        <div className="text-center py-8">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <Loader2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                          </motion.div>
                          <p className="text-sm text-slate-500">Đang tải...</p>
                        </div>
                      ) : (
                        filteredSchedules.map((schedule) => {
                          const color = getDepartmentColor(
                            schedule.department!.id
                          );
                          return (
                            <motion.div
                              key={schedule.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.02 }}
                            >
                              <Card
                                className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                                  color.border
                                } ${
                                  schedule.status !== ScheduleStatus.ACTIVE
                                    ? "opacity-60"
                                    : ""
                                }`}
                                onClick={() => focusScheduleInCalendar(schedule)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm truncate mb-1">
                                        {schedule.name}
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-2 h-2 rounded-full ${color.bg}`}
                                        />
                                        <span className="text-xs text-slate-500 truncate">
                                          {schedule.department?.name}
                                        </span>
                                      </div>
                                    </div>

                                    <Badge
                                      variant={
                                        schedule.status ===
                                        ScheduleStatus.ACTIVE
                                          ? "active"
                                          : schedule.status ===
                                            ScheduleStatus.EXPIRED
                                          ? "destructive"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {schedule.status === ScheduleStatus.ACTIVE
                                        ? "Lịch Đang Hoạt động"
                                        : schedule.status ===
                                          ScheduleStatus.EXPIRED
                                        ? "Hết hạn"
                                        : "Lịch Đã Xác Nhận"}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                    <span className="flex items-center gap-1">
                                      {schedule.schedule_type ===
                                      ScheduleType.HOURLY_SLOTS ? (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {
                                            (
                                              schedule.schedule_config as HourlySlotsConfig
                                            ).slots.length
                                          }{" "}
                                          khung giờ
                                          {(() => {
                                            const config =
                                              schedule.schedule_config as HourlySlotsConfig;
                                            const hasSpecificDates =
                                              config.slots.some(
                                                (slot) => slot.applicable_date
                                              );
                                            if (hasSpecificDates) {
                                              const uniqueDates = [
                                                ...new Set(
                                                  config.slots
                                                    .filter(
                                                      (slot) =>
                                                        slot.applicable_date
                                                    )
                                                    .map(
                                                      (slot) =>
                                                        slot.applicable_date
                                                    )
                                                ),
                                              ];
                                              return (
                                                <span className="ml-1 text-blue-600">
                                                  (
                                                  {uniqueDates.length > 1
                                                    ? `${uniqueDates.length} ngày cụ thể`
                                                    : new Date(
                                                        uniqueDates[0]!
                                                      ).toLocaleDateString(
                                                        "vi-VN"
                                                      )}
                                                  )
                                                </span>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {
                                            (
                                              schedule.schedule_config as DailyDatesConfig
                                            ).dates.length
                                          }{" "}
                                          ngày
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  {schedule.description && (
                                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                                      {schedule.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">
                                      {new Date(
                                        schedule.created_at
                                      ).toLocaleDateString("vi-VN")}
                                    </span>

                                    <div className="flex items-center gap-1">
                                      {!isViewRole && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={
                                              !isDataReady ||
                                              !isDepartmentEditable(
                                                schedule.department!.id
                                              )
                                            }
                                            className="h-6 w-6 p-0 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditSchedule(schedule);
                                            }}
                                            title={
                                              !isDataReady
                                                ? "Đang tải thông tin..."
                                                : isDepartmentEditable(
                                                    schedule.department!.id
                                                  )
                                                ? "Chỉnh sửa lịch"
                                                : "Bạn không có quyền chỉnh sửa lịch này"
                                            }
                                          >
                                            {!isDataReady ? (
                                              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                            ) : (
                                              <Edit className="w-3 h-3 text-blue-600" />
                                            )}
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={
                                              !isDataReady ||
                                              !isDepartmentEditable(
                                                schedule.department!.id
                                              )
                                            }
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={
                                              !isDataReady
                                                ? "Đang tải thông tin..."
                                                : isDepartmentEditable(
                                                    schedule.department!.id
                                                  )
                                                ? "Xóa lịch"
                                                : "Bạn không có quyền xóa lịch này"
                                            }
                                            onClick={async (e) => {
                                          e.stopPropagation();
                                          if (
                                            !isDepartmentEditable(
                                              schedule.department!.id
                                            )
                                          ) {
                                            toast.error(
                                              "Bạn không có quyền xóa lịch hoạt động này"
                                            );
                                            return;
                                          }
                                          if (
                                            window.confirm(
                                              "Bạn có chắc chắn muốn xóa lịch này?"
                                            )
                                          ) {
                                            try {
                                              await ScheduleService.remove(
                                                schedule.id
                                              );
                                              toast.success(
                                                "Xóa lịch thành công"
                                              );
                                              const data =
                                                await ScheduleService.findAll();
                                              setSchedules(data.data);
                                            } catch (error) {
                                              toast.error("Không thể xóa lịch");
                                            }
                                          }
                                        }}
                                      >
                                        {!isDataReady ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3 h-3" />
                                        )}
                                      </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Create/Edit Schedule Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Edit className="w-5 h-5 text-orange-600" />
                    Chỉnh sửa lịch hoạt động
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800"
                    >
                      Chế độ Edit
                    </Badge>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-blue-600" />
                    Tạo lịch hoạt động mới
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Edit Mode Notice */}
              {isEditMode && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Edit className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Chế độ chỉnh sửa:</strong> Bạn có thể thay đổi lịch
                    trên calendar, đổi phòng ban, và cập nhật thông tin. Các
                    thay đổi sẽ thay thế hoàn toàn lịch cũ.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tên lịch hoạt động *</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={formData.name}
                      className="mt-2 border-slate-200 focus:border-blue-400"
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                        // Send preview patch
                        sendPreviewPatch('schedule-name', e.target.value);
                      }}
                      placeholder="Nhập tên lịch..."
                    />
                    
                    {/* Live Preview */}
                    {(() => {
                      const patch = getPreviewPatchForField('schedule-name');
                      if (patch && patch.content !== formData.name) {
                        return (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="text-sm text-blue-600 opacity-60 mt-2">
                              {patch.userName}: {patch.content}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div>
                  <Label>Phạm vi tạo lịch</Label>
                  {isEditMode && editingDepartment ? (
                    <div className="mt-2 space-y-2">
                      <Select
                        value={editingDepartment.toString()}
                        onValueChange={(value: string) =>
                          handleChangeDepartmentInEdit(Number(value))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn phòng ban" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => {
                            const canEdit = isDepartmentEditable(dept.id);
                            const isEnabled = isDepartmentEnabled(dept.id);
                            const canSelect = canEdit && isEnabled;

                            return (
                              <SelectItem
                                key={dept.id}
                                value={dept.id.toString()}
                                disabled={!canSelect}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      getDepartmentColor(dept.id).bg
                                    } ${!canSelect ? "grayscale" : ""}`}
                                  />
                                  <span
                                    className={
                                      !canSelect ? "text-gray-400" : ""
                                    }
                                  >
                                    {dept.name}
                                    {!isEnabled && (
                                      <span className="text-xs text-red-500 ml-1">
                                        (No IP)
                                      </span>
                                    )}
                                    {isEnabled && !canEdit && (
                                      <span className="text-xs text-blue-500 ml-1">
                                        (No permission)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        💡 Thay đổi phòng ban sẽ chuyển toàn bộ lịch sang phòng
                        ban mới
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-blue-50">
                        {departmentSelections.size} phòng ban
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Mô tả</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    value={formData.description}
                    className="mt-2 border-slate-200 focus:border-blue-400"
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }));
                      // Send preview patch
                      sendPreviewPatch('schedule-description', e.target.value);
                    }}
                    placeholder="Mô tả chi tiết về lịch hoạt động..."
                    rows={3}
                  />
                  
                  {/* Live Preview */}
                  {(() => {
                    const patch = getPreviewPatchForField('schedule-description');
                    if (patch && patch.content !== formData.description) {
                      return (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="text-sm text-blue-600 opacity-60 mt-2">
                            {patch.userName}: {patch.content}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Schedule Details */}
              <div>
                <Label>Chi tiết lịch theo phòng ban</Label>
                <div className="mt-2 max-h-60 overflow-y-auto space-y-3">
                  {Array.from(departmentSelections.entries()).map(
                    ([deptId, selections]) => {
                      if (
                        selections.days.length === 0 &&
                        selections.timeSlots.length === 0
                      )
                        return null;

                      const dept = departments.find((d) => d.id === deptId);
                      const color = getDepartmentColor(deptId);

                      return (
                        <div
                          key={deptId}
                          className={`p-3 border rounded-lg ${color.light} ${color.border} shadow-sm`}
                        >
                          <div
                            className={`font-medium text-sm ${color.text} mb-2 flex items-center gap-2`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full ${color.bg}`}
                            />
                            {dept?.name}
                          </div>

                          {selections.days.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-slate-700 mb-1">
                                📅 {selections.days.length} ngày được chọn:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {selections.days.map((day, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {day.date}/{day.month + 1}/{day.year}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {selections.timeSlots.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">
                                🕐 {selections.timeSlots.length} khung giờ được
                                chọn:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {selections.timeSlots.map((slot, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {weekDays[slot.day_of_week! - 1]}{" "}
                                    {slot.start_time}-{slot.end_time}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isEditMode) {
                        // Khôi phục selections ban đầu
                        setDepartmentSelections(originalSelections);
                        setSelectedDepartment(
                          editingSchedule?.department?.id || null
                        );
                      }
                      setIsCreateDialogOpen(false);
                      setEditingSchedule(null);
                      setIsEditMode(false);
                      setEditingDepartment(null);
                      setOriginalSelections(new Map());
                      setFormData({
                        name: "",
                        description: "",
                        start_time: "",
                        end_time: "",
                      });
                    }}
                    className="hover:bg-slate-50"
                  >
                    {isEditMode ? "Hủy thay đổi" : "Hủy"}
                  </Button>

                  {isEditMode && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDepartmentSelections(originalSelections);
                        setSelectedDepartment(
                          editingSchedule?.department?.id || null
                        );
                        setEditingDepartment(
                          editingSchedule?.department?.id || null
                        );
                        toast.success("Đã khôi phục lịch ban đầu");
                      }}
                      className="text-orange-600 hover:bg-orange-50"
                    >
                      <span className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Khôi phục
                      </span>
                    </Button>
                  )}
                </div>

                <Button
                  onClick={handleSaveSchedule}
                  disabled={
                    isSavingSchedule ||
                    !formData.name ||
                    departmentSelections.size === 0
                  }
                  className="bg-blue-600 hover:bg-blue-700 shadow-md"
                >
                  {isSavingSchedule ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isEditMode ? "Đang cập nhật..." : "Đang lưu..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {isEditMode
                        ? "Cập nhật lịch"
                        : `Tạo lịch (${departmentSelections.size} phòng ban)`}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Conflict Warning Dialog */}
        <Dialog
          open={isConflictDialogOpen}
          onOpenChange={setIsConflictDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Phát hiện xung đột lịch trình
              </DialogTitle>
            </DialogHeader>

            {conflictInfo && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800 mb-3">
                    Lịch hoạt động bạn đang tạo có xung đột với{" "}
                    <span className="font-bold">
                      {conflictInfo.conflicting_schedules.length}
                    </span>{" "}
                    lịch khác:
                  </p>

                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {conflictInfo.conflicting_schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="text-sm bg-white rounded p-2 border border-orange-200 shadow-sm"
                      >
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-slate-600 text-xs">
                          {schedule.department?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsConflictDialogOpen(false)}
                    className="flex-1"
                  >
                    Quay lại chỉnh sửa
                  </Button>

                  <Button
                    onClick={async () => {
                      setIsConflictDialogOpen(false);
                      await saveScheduleWithoutConflictCheck();
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    Vẫn tạo lịch
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Activity Toasts */}
        <EditActivityToastsContainer
          editSessions={editSessions}
          previewPatches={previewPatches}
          departments={departments}
          onViewHistory={handleViewHistory}
        />

        {/* Edit History Modal */}
        {selectedUserForHistory && (
          <EditHistoryModal
            isOpen={isEditHistoryModalOpen}
            onClose={() => {
              setIsEditHistoryModalOpen(false);
              setSelectedUserForHistory(null);
            }}
            userId={selectedUserForHistory.userId}
            userName={selectedUserForHistory.userName}
            departmentId={selectedUserForHistory.departmentId}
            departmentName={selectedUserForHistory.departmentName}
            editSessions={Array.from(editSessions.values()).filter(session => session.userId === selectedUserForHistory.userId)}
            previewPatches={Array.from(previewPatches.values()).filter(patch => patch.userId === selectedUserForHistory.userId)}
          />
        )}
      </div>
    </div>
  );
}
