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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
  });

  // Data fetching
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const response = await api.get("departments/all-unrestricted");
        const data = response.data;
        setDepartments(data);
        setVisibleDepartments(data.map((d: Department) => d.id));
      } catch (error: any) {
        console.error("Error fetching departments:", error);
        toast.error("Không thể tải danh sách phòng ban");
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

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
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        e.preventDefault();
      }
    };

    if (dragState.isDragging) {
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.body.style.userSelect = "";
    };
  }, [dragState.isDragging]);

  // Utility functions
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

    departmentSelections.forEach((selections) => {
      allDays.push(...selections.days);
      allTimeSlots.push(...selections.timeSlots);
    });

    return { allDays, allTimeSlots };
  }, [departmentSelections]);

  // Drag utilities
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
      for (
        let timeIndex = startTimeIndex;
        timeIndex <= endTimeIndex;
        timeIndex++
      ) {
        range.push({ day, time: timeSlots[timeIndex] });
      }
    }

    return range;
  }, [dragState.startSlot, dragState.currentSlot]);

  const isSlotInDragRange = useCallback(
    (dayIndex: number, time: string) => {
      if (!dragState.isDragging) return false;
      const range = getDragSelectionRange();
      return range.some((slot) => slot.day === dayIndex && slot.time === time);
    },
    [dragState.isDragging, getDragSelectionRange]
  );

  // Event handlers
  const handleDayClick = useCallback(
    (date: number, isCurrentMonth: boolean) => {
      // Chỉ admin mới có quyền thao tác
      if (!isAdmin) {
        toast.error("Bạn không có quyền thao tác trên lịch hoạt động");
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
      getCurrentDepartmentSelections,
      updateDepartmentSelections,
    ]
  );

  const handleTimeSlotMouseDown = useCallback(
    (dayIndex: number, time: string, e: React.MouseEvent) => {
      e.preventDefault();
      
      // Chỉ admin mới có quyền thao tác
      if (!isAdmin) {
        toast.error("Bạn không có quyền thao tác trên lịch hoạt động");
        return;
      }

      if (!selectedDepartment) {
        toast.error("Vui lòng chọn phòng ban trước");
        return;
      }

      const currentSelections = getCurrentDepartmentSelections();
      const dayOfWeek = ((dayIndex + 1) % 7) + 1;
      const isCurrentlySelected = currentSelections.timeSlots.some(
        (slot) => slot.day_of_week === dayOfWeek && slot.start_time === time
      );

      setDragState({
        isDragging: true,
        startSlot: { day: dayIndex, time },
        currentSlot: { day: dayIndex, time },
        isSelecting: !isCurrentlySelected,
      });
    },
    [isAdmin, selectedDepartment, getCurrentDepartmentSelections]
  );

  const handleTimeSlotMouseEnter = useCallback(
    (dayIndex: number, time: string) => {
      if (dragState.isDragging) {
        setDragState((prev) => ({
          ...prev,
          currentSlot: { day: dayIndex, time },
        }));
      }
    },
    [dragState.isDragging]
  );

  const handleTimeSlotMouseUp = useCallback(() => {
    if (!dragState.isDragging || !selectedDepartment) return;

    const currentSelections = getCurrentDepartmentSelections();
    const range = getDragSelectionRange();

    let newTimeSlots = [...currentSelections.timeSlots];

    range.forEach(({ day, time }) => {
      const endTime = timeSlots[timeSlots.indexOf(time) + 1] || "23:00";
      const existingIndex = newTimeSlots.findIndex(
        (slot) => slot.day_of_week === day + 1 && slot.start_time === time
      );

      if (dragState.isSelecting) {
        if (existingIndex === -1) {
          newTimeSlots.push({
            day_of_week: ((day + 1) % 7) + 1,
            start_time: time,
            end_time: endTime,
            department_id: selectedDepartment,
          });
        }
      } else {
        if (existingIndex !== -1) {
          newTimeSlots = newTimeSlots.filter(
            (_, index) => index !== existingIndex
          );
        }
      }
    });

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

  // Schedule operations
  const checkConflicts = useCallback(
    (allDays: SelectedDay[], allTimeSlots: TimeSlot[]): ConflictInfo | null => {
      const conflictingSchedules: DepartmentSchedule[] = [];

      schedules.forEach((schedule) => {
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

  const handleSaveSchedule = async () => {
    const { allDays, allTimeSlots } = getAllSelections();

    if (allDays.length === 0 && allTimeSlots.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ngày hoặc khung giờ");
      return;
    }

    const conflicts = checkConflicts(allDays, allTimeSlots);
    if (conflicts) {
      setConflictInfo(conflicts);
      setIsConflictDialogOpen(true);
      return;
    }

    await saveScheduleWithoutConflictCheck();
  };

  const saveScheduleWithoutConflictCheck = async () => {
    try {
      setIsSavingSchedule(true);
      const promises: Promise<any>[] = [];

      departmentSelections.forEach((selections, departmentId) => {
        if (selections.days.length === 0 && selections.timeSlots.length === 0)
          return;

        const department = departments.find((d) => d.id === departmentId);
        if (!department) return;

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
          promises.push(ScheduleService.create(scheduleData));
        }
      });

      await Promise.all(promises);

      setDepartmentSelections(new Map());
      setSelectedDepartment(null);
      setFormData({ name: "", description: "", start_time: "", end_time: "" });
      setIsCreateDialogOpen(false);

      const data = await ScheduleService.findAll();
      setSchedules(data.data);
      toast.success("Lưu lịch hoạt động thành công!");
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error("Không thể lưu lịch hoạt động");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Filter schedules
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

  const isDaySelected = useCallback(
    (date: number, month: number, year: number) => {
      const currentSelections = getCurrentDepartmentSelections();
      return currentSelections.days.some(
        (day) => day.date === date && day.month === month && day.year === year
      );
    },
    [getCurrentDepartmentSelections]
  );

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
                Lên kế hoạch và quản lý lịch hoạt động cho tất cả phòng ban với
                drag selection
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

              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button 
                    disabled={!isAdmin}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      {isAdmin ? "Tạo lịch mới" : "Chỉ admin mới có quyền tạo lịch"}
                    </span>
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Permission Notice */}
          {!isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Chế độ chỉ xem:</strong> Bạn chỉ có quyền xem lịch hoạt động. 
                  Chỉ Admin mới có thể tạo, chỉnh sửa và xóa lịch hoạt động.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Department Legend & Controls */}
          <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {departments.map((dept) => {
                  const color = getDepartmentColor(dept.id);
                  const isVisible = visibleDepartments.includes(dept.id);
                  const isSelected = selectedDepartment === dept.id;
                  const hasSelections =
                    departmentSelections.has(dept.id) &&
                    (departmentSelections.get(dept.id)!.days.length > 0 ||
                      departmentSelections.get(dept.id)!.timeSlots.length > 0);

                  return (
                    <div key={dept.id} className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin}
                        className={`flex-1 justify-start gap-2 h-auto py-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSelected
                            ? `${color.light} ${color.border} ${color.text} border-2 ring-2 ring-blue-300 shadow-md`
                            : hasSelections
                            ? `${color.light} ${color.border} border-2 shadow-sm`
                            : "hover:bg-slate-50 hover:shadow-sm"
                        }`}
                        onClick={() => {
                          if (!isAdmin) {
                            toast.error("Bạn không có quyền chọn phòng ban để thao tác");
                            return;
                          }
                          setSelectedDepartment(
                            selectedDepartment === dept.id ? null : dept.id
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 mr-2 rounded-full ${color.bg} shadow-sm`}
                          />
                          <span className="truncate text-sm">{dept.name}</span>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />
                          )}
                          {hasSelections && !isSelected && (
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
                        className="p-1 h-8 w-8 hover:bg-slate-100"
                        onClick={() => {
                          setVisibleDepartments((prev) =>
                            prev.includes(dept.id)
                              ? prev.filter((id) => id !== dept.id)
                              : [...prev, dept.id]
                          );
                        }}
                      >
                        {isVisible ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
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
                        Click & kéo để chọn nhiều khung giờ, click ngày để chọn
                        lịch theo ngày
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!isAdmin}
                      onClick={() => {
                        if (!isAdmin) {
                          toast.error("Bạn không có quyền thao tác");
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
                      }
                    )}
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
                        Lịch tuần - Khung giờ
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
                        Lịch tháng - Theo ngày
                      </span>
                    )}
                  </CardTitle>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const { allDays, allTimeSlots } = getAllSelections();
                      const totalSelections =
                        allDays.length + allTimeSlots.length;
                      return (
                        totalSelections > 0 && (
                          <Badge
                            variant="default"
                            className="bg-blue-600 shadow-sm"
                          >
                            {activeView === "week"
                              ? `${allTimeSlots.length} khung giờ`
                              : `${allDays.length} ngày`}{" "}
                            từ {departmentSelections.size} phòng ban
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
                            className="p-3 text-center border-r last:border-r-0"
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
                      <ScrollArea className="h-[600px]">
                        <div className="select-none">
                          {timeSlots.map((time, timeIndex) => (
                            <div
                              key={time}
                              className="grid grid-cols-8 border-b hover:bg-slate-25"
                            >
                              <div className="p-2 text-center border-r font-mono text-sm bg-slate-50 font-medium">
                                {time}
                              </div>

                              {Array.from({ length: 7 }, (_, dayIndex) => {
                                const isSelectedByCurrentDept =
                                  isTimeSlotSelected(dayIndex, time);
                                const {
                                  isSelected: isSelectedByAny,
                                  departmentId: selectedByDeptId,
                                } = isTimeSlotSelectedByAnyDept(dayIndex, time);
                                const slotSchedules = getSchedulesForSlot(
                                  dayIndex,
                                  time
                                );
                                const isInDragRange = isSlotInDragRange(
                                  dayIndex,
                                  time
                                );
                                const isPreviewSelection =
                                  isInDragRange &&
                                  dragState.isSelecting &&
                                  !isSelectedByCurrentDept;
                                const isPreviewDeselection =
                                  isInDragRange &&
                                  !dragState.isSelecting &&
                                  isSelectedByCurrentDept;

                                return (
                                  <div
                                    key={dayIndex}
                                    className={`p-1 border-r last:border-r-0 cursor-pointer transition-all min-h-[40px] relative
                                      ${
                                        isPreviewSelection
                                          ? `${
                                              getSelectedDepartmentColor().light
                                            } ${
                                              getSelectedDepartmentColor()
                                                .border
                                            } border-2 shadow-md opacity-70 scale-105`
                                          : isPreviewDeselection
                                          ? "bg-red-100 border-red-300 border-2 opacity-70 scale-95"
                                          : isSelectedByCurrentDept &&
                                            selectedDepartment
                                          ? `${
                                              getSelectedDepartmentColor().light
                                            } ${
                                              getSelectedDepartmentColor()
                                                .border
                                            } border-2 shadow-md transform hover:scale-105`
                                          : isSelectedByAny && selectedByDeptId
                                          ? `${
                                              getDepartmentColor(
                                                selectedByDeptId
                                              ).light
                                            } ${
                                              getDepartmentColor(
                                                selectedByDeptId
                                              ).border
                                            } border-2 shadow-sm`
                                          : slotSchedules.length > 0
                                          ? "bg-slate-100 hover:bg-slate-150"
                                          : selectedDepartment
                                          ? "hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm"
                                          : "hover:bg-slate-50"
                                      }`}
                                    onMouseDown={(e) =>
                                      handleTimeSlotMouseDown(dayIndex, time, e)
                                    }
                                    onMouseEnter={() =>
                                      handleTimeSlotMouseEnter(dayIndex, time)
                                    }
                                    onMouseUp={handleTimeSlotMouseUp}
                                  >
                                    {/* Existing schedules */}
                                    {slotSchedules.map((schedule, index) => {
                                      const color = getDepartmentColor(
                                        schedule.department!.id
                                      );
                                      return (
                                        <div
                                          key={schedule.id}
                                          className={`text-xs p-1 mb-1 rounded ${color.light} ${color.border} border shadow-sm`}
                                          style={{ zIndex: index + 1 }}
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
                      {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                        <div
                          key={day}
                          className="p-3 text-center font-medium text-slate-600 border-b bg-slate-50"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-0 border rounded-lg overflow-hidden shadow-sm">
                      {getMonthCalendar.map((day, index) => {
                        const isSelectedByCurrentDept = isDaySelected(
                          day.date,
                          currentMonth.getMonth(),
                          currentMonth.getFullYear()
                        );
                        const {
                          isSelected: isSelectedByAny,
                          departmentId: selectedByDeptId,
                        } = isDaySelectedByAnyDept(
                          day.date,
                          currentMonth.getMonth(),
                          currentMonth.getFullYear()
                        );
                        const daySchedules = day.isCurrentMonth
                          ? getSchedulesForDay(
                              day.date,
                              currentMonth.getMonth(),
                              currentMonth.getFullYear()
                            )
                          : [];

                        const currentDate = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth(),
                          day.date
                        );
                        const isSunday =
                          day.isCurrentMonth && currentDate.getDay() === 0;

                        return (
                          <div
                            key={index}
                            className={`min-h-[80px] p-2 border-r border-b transition-all relative hover:shadow-sm
                            ${
                              !day.isCurrentMonth
                                ? "bg-slate-50 text-slate-400"
                                : isSunday
                                ? "bg-red-50 text-red-400 cursor-not-allowed opacity-60"
                                : isSelectedByCurrentDept && selectedDepartment
                                ? `${getSelectedDepartmentColor().light} ${
                                    getSelectedDepartmentColor().border
                                  } border-2 shadow-lg cursor-pointer transform hover:scale-105`
                                : isSelectedByAny && selectedByDeptId
                                ? `${
                                    getDepartmentColor(selectedByDeptId).light
                                  } ${
                                    getDepartmentColor(selectedByDeptId).border
                                  } border-2 cursor-pointer shadow-sm`
                                : daySchedules.length > 0
                                ? "bg-green-50 cursor-pointer hover:bg-green-100"
                                : "hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (!isSunday) {
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
                                  ? "text-red-400"
                                  : ""
                              }`}
                            >
                              {day.date}
                            </div>

                            {/* Day schedules */}
                            {!isSunday && (
                              <div className="space-y-1">
                                {daySchedules.slice(0, 2).map((schedule) => {
                                  const color = getDepartmentColor(
                                    schedule.department!.id
                                  );
                                  return (
                                    <div
                                      key={schedule.id}
                                      className={`text-xs p-1 rounded truncate ${color.light} ${color.text} shadow-sm`}
                                    >
                                      {schedule.name}
                                    </div>
                                  );
                                })}

                                {daySchedules.length > 2 && (
                                  <div className="text-xs text-slate-500 font-medium">
                                    +{daySchedules.length - 2} khác
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
                        {Array.from(departmentSelections.entries()).map(
                          ([deptId, selections]) => {
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
                                      {selections.timeSlots.length} khung giờ:
                                    </p>
                                    <div className="text-xs text-slate-600">
                                      {selections.timeSlots
                                        .slice(0, 2)
                                        .map((slot, idx) => (
                                          <div key={idx}>
                                            {weekDays[slot.day_of_week! - 1]}{" "}
                                            {slot.start_time}
                                          </div>
                                        ))}
                                      {selections.timeSlots.length > 2 && (
                                        <div>
                                          +{selections.timeSlots.length - 2}{" "}
                                          khác
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          if (!isAdmin) {
                            toast.error("Bạn không có quyền lưu lịch hoạt động");
                            return;
                          }
                          setIsCreateDialogOpen(true);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={departmentSelections.size === 0 || !isAdmin}
                      >
                        <span className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {isAdmin ? `Lưu lịch (${departmentSelections.size} phòng ban)` : "Chỉ admin mới có quyền lưu lịch"}
                        </span>
                      </Button>

                      <Button
                        onClick={() => {
                          if (!isAdmin) {
                            toast.error("Bạn không có quyền xóa tất cả lịch");
                            return;
                          }
                          setDepartmentSelections(new Map());
                          setSelectedDepartment(null);
                        }}
                        variant="outline"
                        disabled={!isAdmin}
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
                                        disabled={!isAdmin}
                                        className="h-6 w-6 p-0 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!isAdmin) {
                                            toast.error("Bạn không có quyền chỉnh sửa lịch hoạt động");
                                            return;
                                          }
                                          setEditingSchedule(schedule);

                                          // Load data for editing
                                          if (
                                            schedule.schedule_type ===
                                            ScheduleType.DAILY_DATES
                                          ) {
                                            const config =
                                              schedule.schedule_config as DailyDatesConfig;
                                            const newSelections = new Map();
                                            newSelections.set(
                                              schedule.department!.id,
                                              {
                                                days: config.dates.map(
                                                  (date) => ({
                                                    date: date.day_of_month,
                                                    month: date.month
                                                      ? date.month - 1
                                                      : currentMonth.getMonth(),
                                                    year:
                                                      date.year ||
                                                      currentMonth.getFullYear(),
                                                    department_id:
                                                      schedule.department!.id,
                                                  })
                                                ),
                                                timeSlots: [],
                                              }
                                            );
                                            setDepartmentSelections(
                                              newSelections
                                            );
                                          } else {
                                            const config =
                                              schedule.schedule_config as HourlySlotsConfig;
                                            const newSelections = new Map();
                                            newSelections.set(
                                              schedule.department!.id,
                                              {
                                                days: [],
                                                timeSlots: config.slots.map(
                                                  (slot) => ({
                                                    day_of_week:
                                                      slot.day_of_week,
                                                    start_time: slot.start_time,
                                                    end_time: slot.end_time,
                                                    department_id:
                                                      schedule.department!.id,
                                                  })
                                                ),
                                              }
                                            );
                                            setDepartmentSelections(
                                              newSelections
                                            );
                                          }

                                          setSelectedDepartment(
                                            schedule.department!.id
                                          );
                                          setFormData({
                                            name: schedule.name,
                                            description:
                                              schedule.description || "",
                                            start_time: "",
                                            end_time: "",
                                          });
                                          setIsCreateDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="w-3 h-3 text-blue-600" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={!isAdmin}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!isAdmin) {
                                            toast.error("Bạn không có quyền xóa lịch hoạt động");
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
                                        <Trash2 className="w-3 h-3" />
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
                <Plus className="w-5 h-5 text-blue-600" />
                {editingSchedule
                  ? "Chỉnh sửa lịch hoạt động"
                  : "Tạo lịch hoạt động mới"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
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
                  <div className="mt-2">
                    <Badge variant="outline" className="bg-blue-50">
                      {departmentSelections.size} phòng ban
                    </Badge>
                  </div>
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingSchedule(null);
                    setFormData({
                      name: "",
                      description: "",
                      start_time: "",
                      end_time: "",
                    });
                  }}
                  className="hover:bg-slate-50"
                >
                  Hủy
                </Button>

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
                      Đang lưu...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {editingSchedule
                        ? "Cập nhật"
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
