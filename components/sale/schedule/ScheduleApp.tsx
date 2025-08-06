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

// Constants
const getDepartmentColor = (departmentId: number) => {
  const colors = [
    {
      bg: "bg-blue-500",
      light: "bg-blue-100",
      border: "border-blue-300",
      text: "text-blue-700",
    },
    {
      bg: "bg-green-500",
      light: "bg-green-100",
      border: "border-green-300",
      text: "text-green-700",
    },
    {
      bg: "bg-purple-500",
      light: "bg-purple-100",
      border: "border-purple-300",
      text: "text-purple-700",
    },
    {
      bg: "bg-orange-500",
      light: "bg-orange-100",
      border: "border-orange-300",
      text: "text-orange-700",
    },
    {
      bg: "bg-pink-500",
      light: "bg-pink-100",
      border: "border-pink-300",
      text: "text-pink-700",
    },
    {
      bg: "bg-teal-500",
      light: "bg-teal-100",
      border: "border-teal-300",
      text: "text-teal-700",
    },
    {
      bg: "bg-indigo-500",
      light: "bg-indigo-100",
      border: "border-indigo-300",
      text: "text-indigo-700",
    },
    {
      bg: "bg-red-500",
      light: "bg-red-100",
      border: "border-red-300",
      text: "text-red-700",
    },
    {
      bg: "bg-yellow-500",
      light: "bg-yellow-100",
      border: "border-yellow-300",
      text: "text-yellow-700",
    },
    {
      bg: "bg-cyan-500",
      light: "bg-cyan-100",
      border: "border-cyan-300",
      text: "text-cyan-700",
    },
  ];
  return colors[departmentId % colors.length];
};

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

export default function CompleteScheduleApp() {
  // Permission check
  const { user, getAllUserRoles } = usePermission();

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
    const managerRoles = userRoles.filter((role) => role.name.startsWith("manager-"));
    return managerRoles.map(role => role.name.replace("manager-", ""));
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

  // Lấy departments có thể truy cập dựa trên phân quyền
  const accessibleDepartments = useMemo(() => {
    if (!departments.length) return [];
    
    // Tất cả user đều có thể view tất cả departments có server_ip
    return departments.filter(dept => dept.server_ip);
  }, [departments]);

  // Kiểm tra xem tất cả data cần thiết đã sẵn sàng chưa
  const isDataReady = useMemo(() => {
    return !isLoadingDepartments && user !== null && departments.length > 0;
  }, [isLoadingDepartments, user, departments.length]);

  // Kiểm tra xem department có thể được thao tác (chọn/chỉnh sửa) không
  const isDepartmentEditable = useCallback((departmentId: number) => {
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
      const department = departments.find(dept => dept.id === departmentId);
      const canEdit = department && userManagerDepartmentSlugs.includes(department.slug);
      console.log(`[Permission Debug] isDepartmentEditable(${departmentId}):`, {
        department,
        userManagerDepartmentSlugs,
        canEdit,
        isDataReady
      });
      return canEdit || false;
    }
    
    // User thường không thể thao tác
    return false;
  }, [isAdmin, isScheduler, isManager, userManagerDepartmentSlugs, departments, isDataReady]);

  // Kiểm tra xem department có thể được chọn không (bao gồm cả view và edit)
  const isDepartmentAccessible = useCallback((departmentId: number) => {
    return accessibleDepartments.some(dept => dept.id === departmentId);
  }, [accessibleDepartments]);

  // Kiểm tra xem department có server_ip không
  const isDepartmentEnabled = useCallback((departmentId: number) => {
    const department = departments.find(dept => dept.id === departmentId);
    return department?.server_ip ? true : false;
  }, [departments]);

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

  const getMonthCalendar = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    const calendar: any[] = [];

    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
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
      setDepartmentSelections((prev) => {
        const newMap = new Map(prev);
        newMap.set(departmentId, selections);
        return newMap;
      });
    },
    []
  );

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
    (dayIndex: number, time: string) => {
      const now = new Date();
      const weekDates = getWeekDates();
      const slotDate = weekDates[dayIndex];

      const [hours, minutes] = time.split(":").map(Number);
      const slotDateTime = new Date(slotDate);
      slotDateTime.setHours(hours, minutes, 0, 0);

      return slotDateTime < now;
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

      const currentSelections = getCurrentDepartmentSelections();

      const existingIndex = currentSelections.days.findIndex(
        (day) => day.date === date && day.month === month && day.year === year
      );

      let newDays: SelectedDay[];
      if (existingIndex !== -1) {
        newDays = currentSelections.days.filter(
          (_, index) => index !== existingIndex
        );
      } else {
        newDays = [
          ...currentSelections.days,
          { date, month, year, department_id: selectedDepartment },
        ];
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

  // Handler cho mouse up
  const handleDayMouseUp = useCallback(() => {
    if (!monthlyDragState.isDragging || !selectedDepartment) return;

    const currentSelections = getCurrentDepartmentSelections();
    const range = getMonthlyDragSelectionRange();

    let newDays = [...currentSelections.days];

    if (monthlyDragState.isSelecting) {
      // Thêm các ngày chưa được chọn
      range.forEach(({ date, month, year }) => {
        const exists = newDays.some(
          (day) => day.date === date && day.month === month && day.year === year
        );
        if (!exists) {
          newDays.push({
            date,
            month,
            year,
            department_id: selectedDepartment,
          });
        }
      });
    } else {
      // Hủy chọn các ngày đã chọn
      range.forEach(({ date, month, year }) => {
        newDays = newDays.filter(
          (day) =>
            !(day.date === date && day.month === month && day.year === year)
        );
      });
    }

    updateDepartmentSelections(selectedDepartment, {
      ...currentSelections,
      days: newDays,
    });

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

              return (
                timeOverlap &&
                dayMatch &&
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
    const nextTime = timeSlots[index + 1] || "18:00";
    return formatTimeRange(time, nextTime);
  };

  const handleSaveSchedule = async () => {
    const { allDays, allTimeSlots } = getAllSelections();

    if (allDays.length === 0 && allTimeSlots.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ngày hoặc khung giờ");
      return;
    }

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
      console.log(`[EditSchedule Debug] Attempting to edit schedule for department ${schedule.department!.id}:`, {
        isDataReady,
        isLoadingDepartments,
        departmentsLength: departments.length,
        user: user?.id,
        isAdmin,
        isScheduler,
        isManager,
        userManagerDepartmentSlugs,
        isDepartmentEditable: isDepartmentEditable(schedule.department!.id)
      });

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
    [isDataReady, isDepartmentEditable, isAdmin, isScheduler, isManager, userManagerDepartmentSlugs, departments, user, isLoadingDepartments, departmentSelections, currentMonth]
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

      departmentSelections.forEach((selections, departmentId) => {
        if (selections.days.length === 0 && selections.timeSlots.length === 0)
          return;

        const department = departments.find((d) => d.id === departmentId);
        if (!department) return;

        // Create new schedules (same logic as before)
        if (selections.timeSlots.length > 0) {
          const scheduleData: CreateDepartmentScheduleDto = {
            name: formData.name || `Lịch khung giờ - ${department.name}`,
            description:
              formData.description ||
              `Lịch hoạt động khung giờ cho ${department.name}`,
            department_id: departmentId,
            status: ScheduleStatus.ACTIVE,
            schedule_type: ScheduleType.HOURLY_SLOTS,
            schedule_config: {
              type: "hourly_slots",
              slots: selections.timeSlots.map((slot) => ({
                day_of_week: slot.day_of_week,
                start_time: slot.start_time,
                end_time: slot.end_time,
                activity_description: formData.description,
              })),
            } as HourlySlotsConfig,
          };
          
          console.log('🔍 HOURLY SLOTS SCHEDULE DATA:', JSON.stringify(scheduleData, null, 2));
          promises.push(ScheduleService.create(scheduleData));
        }

        if (selections.days.length > 0) {
          const scheduleData: CreateDepartmentScheduleDto = {
            name: formData.name || `Lịch theo ngày - ${department.name}`,
            description:
              formData.description ||
              `Lịch hoạt động theo ngày cho ${department.name}`,
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
          
          console.log('🔍 DAILY DATES SCHEDULE DATA:', JSON.stringify(scheduleData, null, 2));
          promises.push(ScheduleService.create(scheduleData));
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
      setFormData({ name: "", description: "", start_time: "", end_time: "" });
      setIsCreateDialogOpen(false);

      // Refresh data
      const data = await ScheduleService.findAll();
      setSchedules(data.data);

      toast.success(
        isEditMode
          ? "Cập nhật lịch hoạt động thành công!"
          : "Lưu lịch hoạt động thành công!"
      );
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(
        isEditMode
          ? "Không thể cập nhật lịch hoạt động"
          : "Không thể lưu lịch hoạt động"
      );
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Helper functions
  const getSchedulesForSlot = useCallback(
    (dayIndex: number, time: string) => {
      const dayOfWeek = ((dayIndex + 1) % 7) + 1;
      return filteredSchedules.filter((schedule) => {
        if (schedule.schedule_type !== ScheduleType.HOURLY_SLOTS) return false;

        const config = schedule.schedule_config as HourlySlotsConfig;
        return config.slots.some(
          (slot) =>
            (slot.day_of_week === dayOfWeek || !slot.day_of_week) &&
            slot.start_time <= time &&
            slot.end_time > time
        );
      });
    },
    [filteredSchedules]
  );

  const isSlotHasExistingSchedule = useCallback(
    (dayIndex: number, time: string) => {
      const slotSchedules = getSchedulesForSlot(dayIndex, time);
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

  const isSlotBlockedByHiddenDepartment = useCallback(
    (dayIndex: number, time: string) => {
      const dayOfWeek = ((dayIndex + 1) % 7) + 1;

      // Kiểm tra selections từ phòng ban bị ẩn
      for (const [deptId, selections] of departmentSelections) {
        if (!visibleDepartments.includes(deptId)) {
          const hasSelection = selections.timeSlots.some(
            (slot) => slot.day_of_week === dayOfWeek && slot.start_time === time
          );
          if (hasSelection) return { isBlocked: true, departmentId: deptId };
        }
      }

      // ✅ SỬA LOGIC KIỂM TRA SCHEDULES
      // Thay vì tìm bất kỳ hidden schedule nào,
      // phải kiểm tra schedules cụ thể cho slot hiện tại
      const allSchedulesForThisSlot = schedules.filter((schedule) => {
        if (schedule.schedule_type !== ScheduleType.HOURLY_SLOTS) return false;

        const config = schedule.schedule_config as HourlySlotsConfig;
        return config.slots.some(
          (slot) =>
            (slot.day_of_week === dayOfWeek || !slot.day_of_week) &&
            slot.start_time <= time &&
            slot.end_time > time
        );
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

      if (!isCurrentMonth || !selectedDepartment || !isDepartmentEditable(selectedDepartment)) {
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

      // Kiểm tra các điều kiện như cũ
      if (
        isPastDay(date, month, year) ||
        isDayConflicted(date, month, year) ||
        isDayHasExistingSchedule(date, month, year) ||
        isBlockedByHidden ||
        isSunday
      ) {
        return;
      }

      // Xác định trạng thái chọn/hủy chọn
      const isCurrentlySelected = isDaySelected(date, month, year);

      setMonthlyDragState({
        isDragging: true,
        startDay: { date, month, year },
        currentDay: { date, month, year },
        isSelecting: !isCurrentlySelected,
      });
    },
    [
      isAdmin,
      selectedDepartment,
      currentMonth,
      isPastDay,
      isDayConflicted,
      isDayHasExistingSchedule,
      isDayBlockedByHiddenDepartment,
      isDaySelected,
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

      if (
        !isPastDay(date, month, year) &&
        !isDayConflicted(date, month, year) &&
        !isDayHasExistingSchedule(date, month, year) &&
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

      if (
        isCurrentMonth &&
        !isPastDay(date, month, year) &&
        !isDayConflicted(date, month, year) &&
        !isDayHasExistingSchedule(date, month, year) &&
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
    isDayHasExistingSchedule,
    isDayBlockedByHiddenDepartment,
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
    (dayIndex: number, time: string) => {
      const currentSelections = getCurrentDepartmentSelections();
      const dayOfWeek = ((dayIndex + 1) % 7) + 1;
      return currentSelections.timeSlots.some(
        (slot) => slot.day_of_week === dayOfWeek && slot.start_time === time
      );
    },
    [getCurrentDepartmentSelections]
  );

  const isDaySelectedByAnyDept = useCallback(
    (date: number, month: number, year: number) => {
      for (const [deptId, selections] of departmentSelections) {
        if (
          selections.days.some(
            (day) =>
              day.date === date && day.month === month && day.year === year
          )
        ) {
          return { isSelected: true, departmentId: deptId };
        }
      }
      return { isSelected: false, departmentId: null };
    },
    [departmentSelections]
  );

  const isTimeSlotSelectedByAnyDept = useCallback(
    (dayIndex: number, time: string) => {
      const dayOfWeek = ((dayIndex + 1) % 7) + 1;
      for (const [deptId, selections] of departmentSelections) {
        if (
          selections.timeSlots.some(
            (slot) => slot.day_of_week === dayOfWeek && slot.start_time === time
          )
        ) {
          return { isSelected: true, departmentId: deptId };
        }
      }
      return { isSelected: false, departmentId: null };
    },
    [departmentSelections]
  );

  const isTimeSlotConflicted = useCallback(
    (dayIndex: number, time: string) => {
      if (isPastTimeSlot(dayIndex, time)) {
        return true;
      }
      // Kiểm tra xung đột với lịch đã lưu từ phòng ban khác
      const slotSchedules = getSchedulesForSlot(dayIndex, time);
      const hasScheduleConflict = slotSchedules.some(
        (schedule) =>
          schedule.department &&
          schedule.department.id !== selectedDepartment &&
          schedule.status === ScheduleStatus.ACTIVE
      );

      if (hasScheduleConflict) return true;

      // Kiểm tra xung đột với selections đang có của các phòng ban khác
      const dayOfWeek = ((dayIndex + 1) % 7) + 1;
      for (const [deptId, selections] of departmentSelections) {
        if (deptId !== selectedDepartment) {
          const hasSelectionConflict = selections.timeSlots.some(
            (slot) => slot.day_of_week === dayOfWeek && slot.start_time === time
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
    (dayIndex: number, time: string) => {
      if (dayIndex === 0) return; // Không cho phép tương tác với Chủ nhật
      if (time >= "12:00" && time < "13:30") return;
      if (isPastTimeSlot(dayIndex, time)) return;
      if (isTimeSlotConflicted(dayIndex, time)) return;
      if (isSlotHasExistingSchedule(dayIndex, time)) return;
      const { isBlocked } = isSlotBlockedByHiddenDepartment(dayIndex, time);
      if (isBlocked) return;
      const { isSelected: isSelectedByOther, departmentId: otherDeptId } =
        isTimeSlotSelectedByAnyDept(dayIndex, time);
      if (isSelectedByOther && otherDeptId !== selectedDepartment) return;
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
      isSlotHasExistingSchedule, // ✅ THÊM dependency
      isPastTimeSlot,
      isSlotBlockedByHiddenDepartment,
      isTimeSlotSelectedByAnyDept,
      selectedDepartment,
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

    const range: { day: number; time: string }[] = [];
    for (let day = startDay; day <= endDay; day++) {
      if (day === 0) continue;
      for (
        let timeIndex = startTimeIndex;
        timeIndex <= endTimeIndex;
        timeIndex++
      ) {
        const time = timeSlots[timeIndex];

        // **Bỏ qua giờ nghỉ trưa**
        if (time >= "12:00" && time < "13:30") continue;
        if (isPastTimeSlot(day, time)) continue;
        if (isTimeSlotConflicted(day, time)) continue;
        if (isSlotHasExistingSchedule(day, time)) continue;
        const { isBlocked } = isSlotBlockedByHiddenDepartment(day, time);
        if (isBlocked) continue;
        const { isSelected: isSelectedByOther, departmentId: otherDeptId } =
          isTimeSlotSelectedByAnyDept(day, time);
        if (isSelectedByOther && otherDeptId !== selectedDepartment) continue;

        range.push({ day, time });
      }
    }

    return range;
  }, [
    dragState.startSlot,
    dragState.currentSlot,
    isTimeSlotConflicted,
    isSlotHasExistingSchedule, // ✅ THÊM dependency
    isPastTimeSlot,
    isSlotBlockedByHiddenDepartment,
    isTimeSlotSelectedByAnyDept,
    selectedDepartment,
  ]);

  const handleTimeSlotMouseDown = useCallback(
    (dayIndex: number, time: string, e: React.MouseEvent) => {
      e.preventDefault();
      
      if (dayIndex === 0) {
        toast.error("Không thể chọn Chủ nhật");
        return;
      }
      
      if (time >= "12:00" && time < "13:30") {
        toast.error("Không thể chọn giờ nghỉ trưa");
        return;
      }

      if (isPastTimeSlot(dayIndex, time)) {
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

      if (isSlotHasExistingSchedule(dayIndex, time)) {
        toast.error(
          "Ô này đã có lịch hoạt động trong hệ thống, không thể chỉnh sửa"
        );
        return;
      }

      if (isTimeSlotConflicted(dayIndex, time)) {
        toast.error("Ô này đang được sử dụng bởi phòng ban khác");
        return;
      }

      const { isBlocked, departmentId: blockedDeptId } =
        isSlotBlockedByHiddenDepartment(dayIndex, time);
      if (isBlocked) {
        const blockedDeptName = departments.find(
          (d) => d.id === blockedDeptId
        )?.name;
        toast.error(`Ô này đang được sử dụng bởi ${blockedDeptName} (đã ẩn)`);
        return;
      }

      const { isSelected: isSelectedByOther, departmentId: otherDeptId } =
        isTimeSlotSelectedByAnyDept(dayIndex, time);
      if (isSelectedByOther && otherDeptId !== selectedDepartment) {
        const otherDeptName = departments.find(
          (d) => d.id === otherDeptId
        )?.name;
        toast.error(`Ô này đang được chọn bởi ${otherDeptName}`);
        return;
      }

      // Xác định trạng thái chọn/hủy chọn dựa trên trạng thái của ô bắt đầu
      const currentSelections = getCurrentDepartmentSelections();
      const dayOfWeek = ((dayIndex + 1) % 7) + 1;
      const isCurrentlySelected = currentSelections.timeSlots.some(
        (slot) => slot.day_of_week === dayOfWeek && slot.start_time === time
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
      getCurrentDepartmentSelections,
      departments,
    ]
  );

  const isSlotInDragRange = useCallback(
    (dayIndex: number, time: string) => {
      if (!dragState.isDragging) return false;
      const range = getDragSelectionRange();
      return range.some((slot) => slot.day === dayIndex && slot.time === time);
    },
    [dragState.isDragging, getDragSelectionRange]
  );

  const handleTimeSlotMouseUp = useCallback(() => {
    if (!dragState.isDragging || !selectedDepartment) return;

    const currentSelections = getCurrentDepartmentSelections();
    const range = getDragSelectionRange();

    let newTimeSlots = [...currentSelections.timeSlots];

    if (dragState.isSelecting) {
      // Chọn thêm các ô chưa được chọn
      range.forEach(({ day, time }) => {
        const endTime = timeSlots[timeSlots.indexOf(time) + 1] || "23:00";
        const dayOfWeek = ((day + 1) % 7) + 1;
        const exists = newTimeSlots.some(
          (slot) => slot.day_of_week === dayOfWeek && slot.start_time === time
        );
        if (!exists) {
          newTimeSlots.push({
            day_of_week: dayOfWeek,
            start_time: time,
            end_time: endTime,
            department_id: selectedDepartment,
          });
        }
      });
    } else {
      // Hủy chọn các ô đã được chọn
      range.forEach(({ day, time }) => {
        const dayOfWeek = ((day + 1) % 7) + 1;
        newTimeSlots = newTimeSlots.filter(
          (slot) =>
            !(slot.day_of_week === dayOfWeek && slot.start_time === time)
        );
      });
    }

    updateDepartmentSelections(selectedDepartment, {
      ...currentSelections,
      timeSlots: newTimeSlots,
    });

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

  // Cập nhật visible departments dựa trên quyền truy cập
  useEffect(() => {
    if (accessibleDepartments.length > 0) {
      // Set visible cho tất cả departments có thể view (có server_ip)
      setVisibleDepartments(accessibleDepartments.map(d => d.id));
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

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
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
                  hoạt động. Chỉ Admin, Scheduler hoặc Manager mới có thể tạo, chỉnh sửa và xóa lịch
                  hoạt động.
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
                        Hoạt động
                      </SelectItem>
                      <SelectItem value={ScheduleStatus.INACTIVE}>
                        Tạm dừng
                      </SelectItem>
                      <SelectItem value={ScheduleStatus.EXPIRED}>
                        Đã hết hạn
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                          !canEdit 
                            ? "opacity-50 cursor-not-allowed" 
                            : ""
                        } ${
                          !canView 
                            ? "grayscale opacity-30" 
                            : ""
                        } ${
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
                          setSelectedDepartment(
                            selectedDepartment === dept.id ? null : dept.id
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 mr-2 rounded-full ${color.bg} shadow-sm ${
                              !canView ? "grayscale" : ""
                            }`}
                          />
                          <span className={`truncate text-sm ${
                            !canView ? "text-gray-400" : !canEdit ? "text-gray-600" : ""
                          }`}>
                            {dept.name}
                            {!isEnabled && (
                              <span className="text-xs text-red-500 ml-1">(No IP)</span>
                            )}
                            {canView && !canEdit && (
                              <span className="text-xs text-blue-500 ml-1">(View only)</span>
                            )}
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
                          <EyeOff className={`w-4 h-4 ${
                            canView ? "text-slate-400" : "text-gray-300"
                          }`} />
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
                      disabled={selectedDepartment ? !isDepartmentEditable(selectedDepartment) : !(isAdmin || isScheduler || userManagerDepartmentSlugs.length > 0)}
                      onClick={() => {
                        const canEdit = selectedDepartment ? isDepartmentEditable(selectedDepartment) : (isAdmin || isScheduler || userManagerDepartmentSlugs.length > 0);
                        if (!canEdit) {
                          toast.error("Bạn không có quyền thao tác phòng ban này");
                          return;
                        }
                        setSelectedDepartment(null);
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
                        Lịch tuần - Khung giờ (Cho các chiến dịch tuần và 3 ngày)
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
                        Lịch tháng - Theo ngày (Cho các chiến dịch theo giờ và ngày)
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
                            <div className="font-medium text-sm">
                              {day}
                            </div>
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
                                    timeSlots[timeIndex + 1] || "18:00"
                                  )}
                                  {time >= "12:00" && time < "13:30" && (
                                    <div className="text-xs mt-1">
                                      🍽️ Nghỉ trưa
                                    </div>
                                  )}
                                </div>
                              </div>

                              {Array.from({ length: 7 }, (_, dayIndex) => {
                                const isSelectedByCurrentDept =
                                  isTimeSlotSelected(dayIndex, time);
                                const {
                                  isSelected: isSelectedByAny,
                                  departmentId: selectedByDeptId,
                                } = isTimeSlotSelectedByAnyDept(dayIndex, time);
                                const {
                                  isBlocked: isBlockedByHidden,
                                  departmentId: blockedByDeptId,
                                } = isSlotBlockedByHiddenDepartment(
                                  dayIndex,
                                  time
                                );
                                const slotSchedules = getSchedulesForSlot(
                                  dayIndex,
                                  time
                                );
                                const isInDragRange = isSlotInDragRange(
                                  dayIndex,
                                  time
                                );
                                const isLunchBreak =
                                  time >= "12:00" && time < "13:30";
                                const isConflicted = isTimeSlotConflicted(
                                  dayIndex,
                                  time
                                );
                                const isPast = isPastTimeSlot(dayIndex, time);
                                const hasExistingSchedule =
                                  isSlotHasExistingSchedule(dayIndex, time);
                                const canInteract =
                                  dayIndex !== 6 && // Không cho phép tương tác với Chủ nhật
                                  !isLunchBreak &&
                                  !isConflicted &&
                                  !isPast &&
                                  !isBlockedByHidden &&
                                  !hasExistingSchedule &&
                                  !(
                                    isSelectedByAny &&
                                    selectedByDeptId !== selectedDepartment
                                  ) &&
                                  selectedDepartment;
                                const isPreviewSelection =
                                  isInDragRange &&
                                  dragState.isSelecting &&
                                  !isSelectedByCurrentDept &&
                                  !isPast &&
                                  !isBlockedByHidden &&
                                  !isConflicted &&
                                  !isLunchBreak;
                                const isPreviewDeselection =
                                  isInDragRange &&
                                  !dragState.isSelecting &&
                                  isSelectedByCurrentDept &&
                                  !isPast &&
                                  !isBlockedByHidden &&
                                  !isConflicted &&
                                  !isLunchBreak;

                                return (
                                  <div
                                    key={dayIndex}
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
                                    }`}
                                    onMouseDown={(e) =>
                                      canInteract &&
                                      handleTimeSlotMouseDown(dayIndex, time, e)
                                    }
                                    onMouseEnter={() =>
                                      canInteract &&
                                      handleTimeSlotMouseEnter(dayIndex, time)
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
                      {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, index) => (
                        <div
                          key={day}
                          className={`p-3 text-center font-medium border-b`}
                        >
                          {day}
                        </div>
                      ))}
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
                        const canInteract =
                          !isSunday &&
                          !isConflicted &&
                          !isPast &&
                          !isBlockedByHidden &&
                          !hasExistingSchedule;

                        return (
                          <div
                            key={index}
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
                                  : isBlockedByHidden && blockedByDeptId // ✅ STYLING CHO HIDDEN DEPARTMENT
                                  ? `${
                                      getDepartmentColor(blockedByDeptId).light
                                    } opacity-30 border-dashed`
                                  : daySchedules.length > 0
                                  ? "bg-green-50 cursor-pointer hover:bg-green-100"
                                  : "hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
                              }`}
                            onMouseDown={(e) => {
                              if (canInteract) {
                                handleDayMouseDown(
                                  day.date,
                                  day.isCurrentMonth,
                                  e
                                );
                              }
                            }}
                            onMouseEnter={() => {
                              if (canInteract) {
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
                                handleDayClick(day.date, day.isCurrentMonth);
                              }
                            }}
                          >
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
                                  !isConflicted;
                                const isPreviewDeselection =
                                  isInDragRange &&
                                  !monthlyDragState.isSelecting &&
                                  isSelectedByCurrentDept &&
                                  !isPast &&
                                  !isSunday &&
                                  !isConflicted;

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
                                          {weekDays[slot.day_of_week! - 1]}:
                                          <br />
                                          {slot.start_time} - {slot.end_time}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      <Button
                        onClick={() => {
                          setIsCreateDialogOpen(true);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={departmentSelections.size === 0 || !(isAdmin || isScheduler || userManagerDepartmentSlugs.length > 0)}
                      >
                        <span className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {(isAdmin || isScheduler || userManagerDepartmentSlugs.length > 0)
                            ? isEditMode
                              ? `Cập nhật lịch`
                              : `Lưu lịch (${departmentSelections.size} phòng ban)`
                            : "Bạn không có quyền lưu lịch"}
                        </span>
                      </Button>

                      <Button
                        onClick={() => {
                          setDepartmentSelections(new Map());
                          setSelectedDepartment(null);
                        }}
                        variant="outline"
                        disabled={!(isAdmin || isScheduler || userManagerDepartmentSlugs.length > 0)}
                        className="w-full hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center gap-2">
                          <X className="w-4 h-4" />
                          Xóa tất cả
                        </span>
                      </Button>
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
                                        ? "Hoạt động"
                                        : schedule.status ===
                                          ScheduleStatus.EXPIRED
                                        ? "Hết hạn"
                                        : "Tạm dừng"}
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
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={!isDataReady || !isDepartmentEditable(schedule.department!.id)}
                                        className="h-6 w-6 p-0 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditSchedule(schedule);
                                        }}
                                        title={
                                          !isDataReady 
                                            ? "Đang tải thông tin..." 
                                            : isDepartmentEditable(schedule.department!.id) 
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
                                        disabled={!isDataReady || !isDepartmentEditable(schedule.department!.id)}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={
                                          !isDataReady 
                                            ? "Đang tải thông tin..." 
                                            : isDepartmentEditable(schedule.department!.id) 
                                              ? "Xóa lịch" 
                                              : "Bạn không có quyền xóa lịch này"
                                        }
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!isDepartmentEditable(schedule.department!.id)) {
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
                  <Input
                    id="name"
                    value={formData.name}
                    className="mt-2 border-slate-200 focus:border-blue-400"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nhập tên lịch..."
                  />
                </div>

                <div>
                  <Label>Phạm vi tạo lịch</Label>
                  {isEditMode && editingDepartment ? (
                    <div className="mt-2 space-y-2">
                      <Select
                        value={editingDepartment.toString()}
                        onValueChange={(value) =>
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
                                  <span className={!canSelect ? "text-gray-400" : ""}>
                                    {dept.name}
                                    {!isEnabled && (
                                      <span className="text-xs text-red-500 ml-1">(No IP)</span>
                                    )}
                                    {isEnabled && !canEdit && (
                                      <span className="text-xs text-blue-500 ml-1">(No permission)</span>
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
                <Textarea
                  id="description"
                  value={formData.description}
                  className="mt-2 border-slate-200 focus:border-blue-400"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Mô tả chi tiết về lịch hoạt động..."
                  rows={3}
                />
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
      </div>
    </div>
  );
}
