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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertCircle,
  Save,
  X,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Settings,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  DepartmentSchedule,
  CreateDepartmentScheduleDto,
  UpdateDepartmentScheduleDto,
  ScheduleType,
  ScheduleStatus,
  DailyDatesConfig,
  HourlySlotsConfig,
} from "@/types/schedule";
import { ScheduleService } from "@/lib/schedule-api";

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
  department_ids: number[];
}

interface SelectedDay {
  date: number;
  month: number;
  year: number;
  department_ids: number[];
}

interface ConflictInfo {
  type: "time" | "date";
  conflicting_schedules: DepartmentSchedule[];
  departments: Department[];
}

// Màu sắc cố định theo Department ID
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
  "07:00",
  "07:30",
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
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
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

export default function ModernScheduleApp() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<"week" | "month">("week");

  // State cho departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [visibleDepartments, setVisibleDepartments] = useState<number[]>([]);

  // State cho schedules
  const [schedules, setSchedules] = useState<DepartmentSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // State cho selection
  const [selectedDays, setSelectedDays] = useState<SelectedDay[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
    null
  );

  // State cho dialogs và forms
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [editingSchedule, setEditingSchedule] =
    useState<DepartmentSchedule | null>(null);

  // State cho filters và search
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

  // Fetch departments
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

  // Fetch all schedules
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
      calendar.push({
        date: day,
        isCurrentMonth: false,
        isPrevMonth: true,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push({
        date: day,
        isCurrentMonth: true,
        isPrevMonth: false,
      });
    }

    // Next month days
    const remaining = 42 - calendar.length;
    for (let day = 1; day <= remaining; day++) {
      calendar.push({
        date: day,
        isCurrentMonth: false,
        isPrevMonth: false,
      });
    }

    return calendar;
  }, [currentMonth]);

  // Check for conflicts
  const checkConflicts = useCallback(
    (newDays: SelectedDay[], newTimeSlots: TimeSlot[]): ConflictInfo | null => {
      const conflictingSchedules: DepartmentSchedule[] = [];

      schedules.forEach((schedule) => {
        if (schedule.status !== ScheduleStatus.ACTIVE) return;

        if (schedule.schedule_type === ScheduleType.DAILY_DATES) {
          const config = schedule.schedule_config as DailyDatesConfig;
          const hasConflict = newDays.some(
            (day) =>
              config.dates.some(
                (date) =>
                  date.day_of_month === day.date &&
                  (date.month === day.month + 1 || !date.month)
              ) && schedule.department && day.department_ids.includes(schedule.department.id)
          );

          if (hasConflict) {
            conflictingSchedules.push(schedule);
          }
        } else if (schedule.schedule_type === ScheduleType.HOURLY_SLOTS) {
          const config = schedule.schedule_config as HourlySlotsConfig;
          const hasConflict = newTimeSlots.some((slot) =>
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
                schedule.department && slot.department_ids.includes(schedule.department.id)
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
            (schedule) => schedule.department && schedule.department.id === dept.id
          )
        );

        return {
          type: newDays.length > 0 ? "date" : "time",
          conflicting_schedules: conflictingSchedules,
          departments: conflictingDepartments,
        };
      }

      return null;
    },
    [schedules, departments]
  );

  // Event handlers
  const handleDayClick = useCallback(
    (date: number, isCurrentMonth: boolean) => {
      if (!isCurrentMonth || !selectedDepartment) {
        if (!selectedDepartment) {
          toast.error("Vui lòng chọn phòng ban trước");
        }
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      setSelectedDays((prev) => {
        const existingIndex = prev.findIndex(
          (day) => day.date === date && day.month === month && day.year === year
        );

        if (existingIndex !== -1) {
          return prev.filter((_, index) => index !== existingIndex);
        } else {
          return [
            ...prev,
            {
              date,
              month,
              year,
              department_ids: [selectedDepartment], // Single department
            },
          ];
        }
      });
    },
    [selectedDepartment, currentMonth] // Thay đổi dependency
  );

  const handleTimeSlotClick = useCallback(
    (dayIndex: number, time: string) => {
      if (!selectedDepartment) {
        toast.error("Vui lòng chọn phòng ban trước");
        return;
      }

      const endTime = timeSlots[timeSlots.indexOf(time) + 1] || "23:00";

      setSelectedTimeSlots((prev) => {
        const existingIndex = prev.findIndex(
          (slot) =>
            slot.day_of_week === dayIndex + 1 && slot.start_time === time
        );

        if (existingIndex !== -1) {
          return prev.filter((_, index) => index !== existingIndex);
        } else {
          return [
            ...prev,
            {
              day_of_week: dayIndex + 1,
              start_time: time,
              end_time: endTime,
              department_ids: [selectedDepartment], // Single department
            },
          ];
        }
      });
    },
    [selectedDepartment] // Thay đổi dependency
  );

  const handleSaveSchedule = async () => {
    if (!selectedDepartment) {
      toast.error("Vui lòng chọn phòng ban");
      return;
    }

    if (selectedDays.length === 0 && selectedTimeSlots.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ngày hoặc khung giờ");
      return;
    }

    // Check conflicts chỉ cho 1 phòng ban
    const conflicts = checkConflicts(selectedDays, selectedTimeSlots);
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

      const department = departments.find((d) => d.id === selectedDepartment);
      if (!department) return;

      let scheduleData: CreateDepartmentScheduleDto;

      if (selectedTimeSlots.length > 0) {
        // Create hourly slots schedule
        scheduleData = {
          name: formData.name || `Lịch khung giờ - ${department.name}`,
          description:
            formData.description ||
            `Lịch hoạt động khung giờ cho ${department.name}`,
          department_id: selectedDepartment!,
          status: ScheduleStatus.ACTIVE,
          schedule_type: ScheduleType.HOURLY_SLOTS,
          schedule_config: {
            type: "hourly_slots",
            slots: selectedTimeSlots.map((slot) => ({
              day_of_week: slot.day_of_week,
              start_time: slot.start_time,
              end_time: slot.end_time,
              activity_description: formData.description,
            })),
          } as HourlySlotsConfig,
        };
      } else {
        // Create daily dates schedule
        scheduleData = {
          name: formData.name || `Lịch theo ngày - ${department.name}`,
          description:
            formData.description ||
            `Lịch hoạt động theo ngày cho ${department.name}`,
          department_id: selectedDepartment!,
          status: ScheduleStatus.ACTIVE,
          schedule_type: ScheduleType.DAILY_DATES,
          schedule_config: {
            type: "daily_dates",
            dates: selectedDays.map((day) => ({
              day_of_month: day.date,
              month: day.month + 1,
              year: day.year,
              activity_description: formData.description,
            })),
          } as DailyDatesConfig,
        };
      }

      await ScheduleService.create(scheduleData);

      toast.success("Tạo lịch hoạt động thành công!");

      // Reset form và selections
      setSelectedDays([]);
      setSelectedTimeSlots([]);
      setSelectedDepartment(null); // Reset single selection
      setFormData({ name: "", description: "", start_time: "", end_time: "" });
      setIsCreateDialogOpen(false);

      // Refresh schedules
      const data = await ScheduleService.findAll();
      setSchedules(data.data);
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error("Không thể lưu lịch hoạt động");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Filter schedules based on search and filters
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
        typeof departmentId === "number" && visibleDepartments.includes(departmentId);

      return matchesSearch && matchesStatus && matchesType && matchesDepartment;
    });
  }, [schedules, searchTerm, statusFilter, typeFilter, visibleDepartments]);

  // Get schedules for specific slot or day
  const getSchedulesForSlot = useCallback(
    (dayIndex: number, time: string) => {
      return filteredSchedules.filter((schedule) => {
        if (schedule.schedule_type !== ScheduleType.HOURLY_SLOTS) return false;

        const config = schedule.schedule_config as HourlySlotsConfig;
        return config.slots.some(
          (slot) =>
            (slot.day_of_week === dayIndex + 1 || !slot.day_of_week) &&
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
    // Màu mặc định khi chưa chọn phòng ban
    return {
      bg: "bg-slate-500",
      light: "bg-slate-100",
      border: "border-slate-300",
      text: "text-slate-700",
    };
  }, [selectedDepartment]);

  const isDaySelected = useCallback(
    (date: number, month: number, year: number) => {
      return selectedDays.some(
        (day) => day.date === date && day.month === month && day.year === year
      );
    },
    [selectedDays]
  );

  const isTimeSlotSelected = useCallback(
    (dayIndex: number, time: string) => {
      return selectedTimeSlots.some(
        (slot) => slot.day_of_week === dayIndex + 1 && slot.start_time === time
      );
    },
    [selectedTimeSlots]
  );

  if (isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
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
                  className="flex items-center gap-2"
                >
                  {activeView === "week" ? (
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Xem theo tháng
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Xem theo tuần
                    </span>
                  )}
                </Button>

                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                      <span className="flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo lịch mới
                      </span>
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>

            {/* Department Legend & Controls */}
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Phòng ban & Bộ lọc
                  </CardTitle>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-500" />
                      <Input
                        placeholder="Tìm kiếm lịch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
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
                    const isSelected = selectedDepartment === dept.id; // Thay đổi logic so sánh

                    return (
                      <div key={dept.id} className="flex items-center gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`flex-1 justify-start gap-2 h-auto py-2 transition-all ${
                                isSelected
                                  ? `${color.light} ${color.border} ${color.text} border-2 ring-2 ring-blue-300` // Tăng highlight
                                  : "hover:bg-slate-50"
                              }`}
                              onClick={() => {
                                // Logic chọn single department
                                setSelectedDepartment(
                                  selectedDepartment === dept.id
                                    ? null
                                    : dept.id
                                );
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 mr-2 rounded-full ${color.bg}`}
                                />
                                <span className="truncate text-sm">
                                  {dept.name}
                                </span>
                                {isSelected && (
                                  <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />
                                )}
                              </div>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-pink-500 text-white shadow-lg border-none">
                            <div className="text-base font-semibold mb-1">
                              {dept.name}
                            </div>
                            <div className="text-sm">ID: {dept.id}</div>
                            <div className="text-sm">Slug: {dept.slug}</div>
                            {isSelected && (
                              <div className="text-sm mt-1 font-bold">
                                ✓ Đã chọn
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>

                        {/* Giữ nguyên button visibility */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8"
                          onClick={() => {
                            setVisibleDepartments((prev) =>
                              prev.includes(dept.id)
                                ? prev.filter((id) => id !== dept.id)
                                : [...prev, dept.id]
                            );
                          }}
                        >
                          {isVisible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {selectedDepartment && (
                  <div className="mt-4 p-3 rounded-lg border-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          getDepartmentColor(selectedDepartment).bg
                        }`}
                      />
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            getSelectedDepartmentColor().text
                          }`}
                        >
                          Phòng ban được chọn:{" "}
                          {
                            departments.find((d) => d.id === selectedDepartment)
                              ?.name
                          }
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Tất cả lịch sẽ được tạo cho phòng ban này
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDepartment(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Calendar View */}
            <div className="xl:col-span-3">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {activeView === "week" ? (
                        <span className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Lịch tuần - Khung giờ
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Lịch tháng - Theo ngày
                        </span>
                      )}
                    </CardTitle>

                    <div className="flex items-center gap-2">
                      {(selectedDays.length > 0 ||
                        selectedTimeSlots.length > 0) && (
                        <Badge variant="default" className="bg-blue-600">
                          {activeView === "week"
                            ? `${selectedTimeSlots.length} khung giờ`
                            : `${selectedDays.length} ngày`}{" "}
                          đã chọn
                        </Badge>
                      )}
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
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {activeView === "week" ? (
                    // Weekly Time Grid
                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        {/* Header */}
                        <div className="grid grid-cols-8 bg-slate-50 border-b">
                          <div className="p-3 font-medium text-center border-r">
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

                        {/* Time slots */}
                        <ScrollArea className="h-[600px]">
                          {timeSlots.map((time, timeIndex) => (
                            <div
                              key={time}
                              className="grid grid-cols-8 border-b hover:bg-slate-25"
                            >
                              <div className="p-2 text-center border-r font-mono text-sm bg-slate-50">
                                {time}
                              </div>

                              {Array.from({ length: 7 }, (_, dayIndex) => {
                                const isSelected = isTimeSlotSelected(
                                  dayIndex,
                                  time
                                );
                                const slotSchedules = getSchedulesForSlot(
                                  dayIndex,
                                  time
                                );

                                const selectedColor =
                                  getSelectedDepartmentColor();

                                return (
                                  <Tooltip key={dayIndex}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`p-1 border-r last:border-r-0 cursor-pointer transition-all min-h-[40px] relative
                                        ${
                                          isSelected
                                            ? `${selectedColor.light} ${selectedColor.border} border-2 shadow-md` // Dùng màu phòng ban
                                            : slotSchedules.length > 0
                                            ? "bg-slate-100"
                                            : "hover:bg-blue-50 hover:border-blue-200"
                                        }`}
                                        onClick={() =>
                                          handleTimeSlotClick(dayIndex, time)
                                        }
                                      >
                                        {/* Hiện thị schedules */}
                                        {slotSchedules.map(
                                          (schedule, index) => {
                                            const color = getDepartmentColor(
                                              schedule.department!.id
                                            );
                                            return (
                                              <div
                                                key={schedule.id}
                                                className={`text-xs p-1 mb-1 rounded ${color.light} ${color.border} border`}
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
                                          }
                                        )}

                                        {/* Icon check với màu phòng ban */}
                                        {isSelected && (
                                          <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className={`absolute inset-0 ${selectedColor.light} bg-opacity-30 rounded flex items-center justify-center border-2 ${selectedColor.border}`}
                                          >
                                            <CheckCircle
                                              className={`w-5 h-5 ${selectedColor.text} bg-white rounded-full`}
                                            />
                                          </motion.div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-sm">
                                        <p className="font-medium text-blue-800">
                                          {weekDays[dayIndex]} - {time}
                                        </p>
                                        {slotSchedules.length > 0 ? (
                                          <div className="mt-1">
                                            {slotSchedules.map((schedule) => (
                                              <p
                                                key={schedule.id}
                                                className="text-blue-900"
                                              >
                                                {schedule.name} (
                                                {schedule.department?.name})
                                              </p>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-blue-700">
                                            Click để chọn khung giờ
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>
                  ) : (
                    // Monthly Calendar
                    <div className="p-4">
                      {/* Calendar header */}
                      <div className="grid grid-cols-7 mb-2">
                        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(
                          (day) => (
                            <div
                              key={day}
                              className="p-3 text-center font-medium text-slate-600 border-b"
                            >
                              {day}
                            </div>
                          )
                        )}
                      </div>

                      {/* Calendar days */}
                      <div className="grid grid-cols-7 gap-0 border rounded-lg overflow-hidden">
                        {getMonthCalendar.map((day, index) => {
                          const isSelected = isDaySelected(
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

                          const selectedColor = getSelectedDepartmentColor();

                          return (
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`min-h-[80px] p-2 border-r border-b cursor-pointer transition-all relative
                                    ${
                                      !day.isCurrentMonth
                                        ? "bg-slate-50 text-slate-400"
                                        : isSelected
                                        ? `${selectedColor.light} ${selectedColor.border} border-2 shadow-lg` // Dùng màu phòng ban
                                        : daySchedules.length > 0
                                        ? "bg-green-50"
                                        : "hover:bg-blue-50 hover:border-blue-200"
                                    }`}
                                  onClick={() =>
                                    handleDayClick(day.date, day.isCurrentMonth)
                                  }
                                >
                                  {/* Số ngày với highlight theo phòng ban */}
                                  <div
                                    className={`font-medium text-sm mb-1 
                                      ${
                                        day.date === new Date().getDate() &&
                                        currentMonth.getMonth() ===
                                          new Date().getMonth() &&
                                        currentMonth.getFullYear() ===
                                          new Date().getFullYear() &&
                                        day.isCurrentMonth
                                          ? "text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center"
                                          : isSelected
                                          ? `${selectedColor.text} font-bold` // Dùng màu text phòng ban
                                          : ""
                                      }`}
                                  >
                                    {day.date}
                                  </div>

                                  {/* Hiển thị schedules */}
                                  <div className="space-y-1">
                                    {daySchedules
                                      .slice(0, 2)
                                      .map((schedule) => {
                                        const color = getDepartmentColor(
                                          schedule.department!.id
                                        );
                                        return (
                                          <div
                                            key={schedule.id}
                                            className={`text-xs p-1 rounded truncate ${color.light} ${color.text}`}
                                          >
                                            {schedule.name}
                                          </div>
                                        );
                                      })}

                                    {daySchedules.length > 2 && (
                                      <div className="text-xs text-slate-500">
                                        +{daySchedules.length - 2} khác
                                      </div>
                                    )}
                                  </div>

                                  {/* Icon check với màu phòng ban */}
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 bg-white rounded-full">
                                      <CheckCircle
                                        className={`w-5 h-5 ${selectedColor.text} border-2 border-white rounded-full`}
                                      />
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm">
                                  <p className="font-medium">
                                    Ngày {day.date}/
                                    {currentMonth.getMonth() + 1}/
                                    {currentMonth.getFullYear()}
                                  </p>
                                  {daySchedules.length > 0 ? (
                                    <div className="mt-1 max-w-xs">
                                      {daySchedules.map((schedule) => (
                                        <p
                                          key={schedule.id}
                                          className="text-slate-600 mb-1"
                                        >
                                          <span className="font-medium">
                                            {schedule.name}
                                          </span>
                                          <br />
                                          <span className="text-xs">
                                            ({schedule.department?.name})
                                          </span>
                                          {schedule.description && (
                                            <>
                                              <br />
                                              <span className="text-xs text-slate-500">
                                                {schedule.description}
                                              </span>
                                            </>
                                          )}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-slate-500">
                                      Click để chọn ngày
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Schedule List & Actions */}
            <div className="xl:col-span-1">
              <div className="space-y-4">
                {/* Selection Summary & Save */}
                {(selectedDays.length > 0 || selectedTimeSlots.length > 0) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-600" />
                        Đã chọn
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedDays.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">
                            {selectedDays.length} ngày đã chọn
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedDays.map((day, index) => (
                              <div
                                key={index}
                                className="text-xs bg-blue-50 rounded p-2"
                              >
                                {day.date}/{day.month + 1}/{day.year}
                                <div className="text-slate-600 mt-1">
                                  {day.department_ids
                                    .map(
                                      (id) =>
                                        departments.find((d) => d.id === id)
                                          ?.name
                                    )
                                    .join(", ")}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(selectedDays.length > 0 ||
                        selectedTimeSlots.length > 0) &&
                        selectedDepartment && (
                          <Badge
                            variant="default"
                            className={`${
                              getSelectedDepartmentColor().bg
                            } text-white`}
                          >
                            {activeView === "week"
                              ? `${selectedTimeSlots.length} khung giờ`
                              : `${selectedDays.length} ngày`}{" "}
                            đã chọn
                            <span className="ml-1">
                              •{" "}
                              {
                                departments.find(
                                  (d) => d.id === selectedDepartment
                                )?.name
                              }
                            </span>
                          </Badge>
                        )}

                      <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="w-full"
                        disabled={selectedDepartment === null}
                      >
                        <span className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          Lưu lịch
                        </span>
                      </Button>

                      <Button
                        onClick={() => {
                          setSelectedDays([]);
                          setSelectedTimeSlots([]);
                          setSelectedDepartment(null);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <span className="flex items-center gap-2">
                          <X className="w-4 h-4" />
                          Xóa chọn
                        </span>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Schedule List */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Lịch hoạt động
                      </span>
                      <Badge variant="outline">
                        {filteredSchedules.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2 p-4">
                        {isLoadingSchedules ? (
                          <div className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-slate-500">
                              Đang tải...
                            </p>
                          </div>
                        ) : filteredSchedules.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Không có lịch hoạt động</p>
                          </div>
                        ) : (
                          filteredSchedules.map((schedule) => {
                            const color = getDepartmentColor(
                              schedule.department!.id
                            );
                            return (
                              <Tooltip key={schedule.id}>
                                <TooltipTrigger asChild>
                                  <Card
                                    className={`cursor-pointer transition-all hover:shadow-md ${
                                      schedule.status !== ScheduleStatus.ACTIVE
                                        ? "opacity-60"
                                        : ""
                                    }`}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <h4 className="font-medium text-sm truncate">
                                            {schedule.name}
                                          </h4>
                                          <div className="flex items-center gap-2 mt-1">
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
                                              ? "default"
                                              : schedule.status ===
                                                ScheduleStatus.EXPIRED
                                              ? "destructive"
                                              : "secondary"
                                          }
                                          className="text-xs"
                                        >
                                          {schedule.status ===
                                          ScheduleStatus.ACTIVE
                                            ? "Hoạt động"
                                            : schedule.status ===
                                              ScheduleStatus.EXPIRED
                                            ? "Hết hạn"
                                            : "Tạm dừng"}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                          {schedule.schedule_type ===
                                          ScheduleType.HOURLY_SLOTS ? (
                                            <>
                                              <Clock className="w-3 h-3" />
                                              {
                                                (
                                                  schedule.schedule_config as HourlySlotsConfig
                                                ).slots.length
                                              }{" "}
                                              khung giờ
                                            </>
                                          ) : (
                                            <>
                                              <Calendar className="w-3 h-3" />
                                              {
                                                (
                                                  schedule.schedule_config as DailyDatesConfig
                                                ).dates.length
                                              }{" "}
                                              ngày
                                            </>
                                          )}
                                        </span>
                                      </div>

                                      {schedule.description && (
                                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                                          {schedule.description}
                                        </p>
                                      )}

                                      <div className="flex items-center justify-between mt-3">
                                        <span className="text-xs text-slate-400">
                                          {new Date(
                                            schedule.created_at
                                          ).toLocaleDateString("vi-VN")}
                                        </span>

                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingSchedule(schedule);
                                              // Load data for editing
                                              if (
                                                schedule.schedule_type ===
                                                ScheduleType.DAILY_DATES
                                              ) {
                                                const config =
                                                  schedule.schedule_config as DailyDatesConfig;
                                                setSelectedDays(
                                                  config.dates.map((date) => ({
                                                    date: date.day_of_month,
                                                    month: date.month
                                                      ? date.month - 1
                                                      : currentMonth.getMonth(),
                                                    year:
                                                      date.year ||
                                                      currentMonth.getFullYear(),
                                                    department_ids: [
                                                      schedule.department!.id,
                                                    ],
                                                  }))
                                                );
                                                setSelectedTimeSlots([]);
                                              } else {
                                                const config =
                                                  schedule.schedule_config as HourlySlotsConfig;
                                                setSelectedTimeSlots(
                                                  config.slots.map((slot) => ({
                                                    day_of_week:
                                                      slot.day_of_week,
                                                    start_time: slot.start_time,
                                                    end_time: slot.end_time,
                                                    department_ids: [
                                                      schedule.department!.id,
                                                    ],
                                                  }))
                                                );
                                                setSelectedDays([]);
                                              }
                                              setSelectedDepartment(
                                                schedule.department!.id,
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
                                            <Edit className="w-3 h-3" />
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (
                                                confirm(
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
                                                  toast.error(
                                                    "Không thể xóa lịch"
                                                  );
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
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  className="max-w-xs bg-pink-500 text-white border-none shadow-lg"
                                >
                                  <div className="text-sm">
                                    <p className="font-semibold mb-1">
                                      {schedule.name}
                                    </p>
                                    <p className="mb-1">
                                      {schedule.department?.name}
                                    </p>
                                    {schedule.description && (
                                      <p className="mb-2 opacity-90">
                                        {schedule.description}
                                      </p>
                                    )}

                                    <div className="space-y-1">
                                      <p className="font-semibold">Chi tiết:</p>
                                      {schedule.schedule_type ===
                                      ScheduleType.HOURLY_SLOTS ? (
                                        <div>
                                          {(
                                            schedule.schedule_config as HourlySlotsConfig
                                          ).slots.map((slot, i) => (
                                            <p key={i} className="text-xs">
                                              {slot.day_of_week
                                                ? weekDays[slot.day_of_week - 1]
                                                : "Mọi ngày"}
                                              : {slot.start_time} -{" "}
                                              {slot.end_time}
                                            </p>
                                          ))}
                                        </div>
                                      ) : (
                                        <div>
                                          {(
                                            schedule.schedule_config as DailyDatesConfig
                                          ).dates.map((date, i) => (
                                            <p key={i} className="text-xs">
                                              {date.day_of_month}/
                                              {date.month || "mọi tháng"}/
                                              {date.year || "mọi năm"}
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
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
        </div>

        {/* Create Schedule Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
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
                    className="mt-2"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nhập tên lịch..."
                  />
                </div>

                <div>
                  <Label>Loại lịch</Label>
                  <div className="mt-2">
                    <Badge variant="outline">
                      {selectedDays.length > 0
                        ? "Lịch theo ngày"
                        : "Lịch theo khung giờ"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  className="mt-2"
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

              <div>
                <Label>Phòng ban được chọn</Label>
                <div className="mt-2">
                  {selectedDepartment ? (
                    <Badge
                      className={`${getSelectedDepartmentColor().light} ${
                        getSelectedDepartmentColor().text
                      }`}
                    >
                      {
                        departments.find((d) => d.id === selectedDepartment)
                          ?.name
                      }
                    </Badge>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Chưa chọn phòng ban
                    </p>
                  )}
                </div>
              </div>

              {selectedDays.length > 0 && (
                <div>
                  <Label>Ngày đã chọn ({selectedDays.length})</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {selectedDays.map((day, index) => (
                      <div
                        key={index}
                        className="text-sm bg-blue-50 rounded p-2"
                      >
                        📅 {day.date}/{day.month + 1}/{day.year}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTimeSlots.length > 0 && (
                <div>
                  <Label>Khung giờ đã chọn ({selectedTimeSlots.length})</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {selectedTimeSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="text-sm bg-green-50 rounded p-2"
                      >
                        🕐 {weekDays[slot.day_of_week! - 1]} {slot.start_time} -{" "}
                        {slot.end_time}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                >
                  Hủy
                </Button>

                <Button
                  onClick={handleSaveSchedule}
                  disabled={
                    isSavingSchedule ||
                    !formData.name ||
                    selectedDepartment === null ||
                    (selectedDays.length === 0 &&
                      selectedTimeSlots.length === 0)
                  }
                >
                  {isSavingSchedule ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang lưu...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {editingSchedule ? "Cập nhật" : "Tạo lịch"}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Phát hiện xung đột lịch trình
              </DialogTitle>
            </DialogHeader>

            {conflictInfo && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    Lịch hoạt động bạn đang tạo có xung đột với{" "}
                    {conflictInfo.conflicting_schedules.length} lịch khác:
                  </p>

                  <div className="mt-3 space-y-2">
                    {conflictInfo.conflicting_schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="text-sm bg-white rounded p-2 border border-orange-200"
                      >
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-slate-600">
                          {schedule.department?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setIsConflictDialogOpen(false)}
                  >
                    Quay lại chỉnh sửa
                  </Button>

                  <Button
                    onClick={async () => {
                      setIsConflictDialogOpen(false);
                      await saveScheduleWithoutConflictCheck();
                    }}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Vẫn tạo lịch
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
