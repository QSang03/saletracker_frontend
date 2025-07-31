"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

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

interface DepartmentStyle {
  name: string;
  color: string;
  lightColor: string;
  textColor: string;
  hoverColor: string;
  shadow: string;
  glow: string;
  selectedColor: string;
  selectedTextColor: string;
}

interface Event {
  id: string;
  title: string;
  departmentId: number;
  day: number;
  startTime: string;
  endTime: string;
  date: Date;
}

interface MonthDay {
  date: number;
  departmentId: number;
  isCurrentMonth: boolean;
}

interface SelectedDay {
  date: number;
  month: number;
  year: number;
  departmentId: number;
}

// Màu sắc tự động cho phòng ban
const colorPalettes = [
  {
    color: "bg-gradient-to-br from-blue-500 to-blue-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-blue-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-blue-50 hover:to-blue-100",
    shadow: "shadow-blue-100",
    glow: "shadow-lg shadow-blue-200/10",
    selectedColor: "bg-gradient-to-br from-blue-400 to-blue-500",
    selectedTextColor: "text-white",
  },
  {
    color: "bg-gradient-to-br from-green-500 to-green-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-green-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-green-50 hover:to-green-100",
    shadow: "shadow-green-100",
    glow: "shadow-lg shadow-green-200/10",
    selectedColor: "bg-gradient-to-br from-green-400 to-green-500",
    selectedTextColor: "text-white",
  },
  {
    color: "bg-gradient-to-br from-purple-500 to-purple-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-purple-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-purple-50 hover:to-purple-100",
    shadow: "shadow-purple-100",
    glow: "shadow-lg shadow-purple-200/10",
    selectedColor: "bg-gradient-to-br from-purple-400 to-purple-500",
    selectedTextColor: "text-white",
  },
  {
    color: "bg-gradient-to-br from-orange-500 to-orange-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-orange-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-orange-50 hover:to-orange-100",
    shadow: "shadow-orange-100",
    glow: "shadow-lg shadow-orange-200/10",
    selectedColor: "bg-gradient-to-br from-orange-400 to-orange-500",
    selectedTextColor: "text-white",
  },
  {
    color: "bg-gradient-to-br from-pink-500 to-pink-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-pink-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-pink-50 hover:to-pink-100",
    shadow: "shadow-pink-100",
    glow: "shadow-lg shadow-pink-200/10",
    selectedColor: "bg-gradient-to-br from-pink-400 to-pink-500",
    selectedTextColor: "text-white",
  },
  {
    color: "bg-gradient-to-br from-teal-500 to-teal-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-teal-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-teal-50 hover:to-teal-100",
    shadow: "shadow-teal-100",
    glow: "shadow-lg shadow-teal-200/10",
    selectedColor: "bg-gradient-to-br from-teal-400 to-teal-500",
    selectedTextColor: "text-white",
  },
  {
    color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-indigo-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-indigo-50 hover:to-indigo-100",
    shadow: "shadow-indigo-100",
    glow: "shadow-lg shadow-indigo-200/10",
    selectedColor: "bg-gradient-to-br from-indigo-400 to-indigo-500",
    selectedTextColor: "text-white",
  },
  {
    color: "bg-gradient-to-br from-red-500 to-red-600",
    lightColor: "bg-gradient-to-br from-slate-50 to-red-50",
    textColor: "text-slate-600",
    hoverColor: "hover:from-red-50 hover:to-red-100",
    shadow: "shadow-red-100",
    glow: "shadow-lg shadow-red-200/10",
    selectedColor: "bg-gradient-to-br from-red-400 to-red-500",
    selectedTextColor: "text-white",
  },
];

const timeBlocks = [
  {
    label: "Sáng",
    time: "08:00-12:00",
    slots: [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
    ],
  },
  {
    label: "Chiều",
    time: "13:30-15:45",
    slots: [
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
    ],
  },
];

const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export default function ScheduleApp() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    time: string;
  } | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [eventIdCounter, setEventIdCounter] = useState(1);

  // State cho departments từ API
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentStyles, setDepartmentStyles] = useState<Record<number, DepartmentStyle>>({});
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [departmentError, setDepartmentError] = useState<string | null>(null);

  // State cho active department và selected days
  const [activeDepartmentId, setActiveDepartmentId] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<SelectedDay[]>([]);

  const [newEvent, setNewEvent] = useState({
    departmentId: 0,
    startTime: "",
    endTime: "",
  });

  const timeSlots = useMemo(
    () => timeBlocks.flatMap((block) => block.slots),
    []
  );

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        setDepartmentError(null);
        
        const response = await api.get("departments/all-unrestricted");
        const data = response.data;
        setDepartments(data);

        // Generate styles cho từng phòng ban
        const styles: Record<number, DepartmentStyle> = {};
        data.forEach((dept: Department, index: number) => {
          const colorIndex = index % colorPalettes.length;
          styles[dept.id] = {
            name: dept.name,
            ...colorPalettes[colorIndex],
          };
        });
        setDepartmentStyles(styles);

        // Set active department đầu tiên
        if (data.length > 0) {
          setActiveDepartmentId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        setDepartmentError('Không thể tải danh sách phòng ban');
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // Fix hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cập nhật newEvent khi activeDepartmentId thay đổi
  useEffect(() => {
    if (activeDepartmentId) {
      setNewEvent((prev) => ({ ...prev, departmentId: activeDepartmentId }));
    }
  }, [activeDepartmentId]);

  // Helper functions
  const getWeekDates = () => {
    const start = new Date(currentWeek);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const getMonthCalendar = useMemo((): MonthDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const calendar: MonthDay[] = [];

    // Generate department cho ngày (deterministic)
    const getDepartmentForDay = (day: number, month: number, year: number) => {
      const seed = day + month * 31 + year * 365;
      const deptIndex = seed % departments.length;
      return departments[deptIndex]?.id || departments[0]?.id || 1;
    };

    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonthNum = month === 0 ? 11 : month - 1;

    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      calendar.push({
        date: day,
        departmentId: getDepartmentForDay(day, prevMonthNum, prevYear),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push({
        date: day,
        departmentId: getDepartmentForDay(day, month, year),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remaining = 42 - calendar.length;
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;

    for (let day = 1; day <= remaining; day++) {
      calendar.push({
        date: day,
        departmentId: getDepartmentForDay(day, nextMonth, nextYear),
        isCurrentMonth: false,
      });
    }

    return calendar;
  }, [currentMonth, departments]);

  const isDaySelected = (date: number, month: number, year: number) => {
    return selectedDays.some(
      (day) => day.date === date && day.month === month && day.year === year
    );
  };

  const handleDayClick = (date: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth || !activeDepartmentId) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const dayKey = { date, month, year, departmentId: activeDepartmentId };

    setSelectedDays((prev) => {
      const isSelected = prev.some(
        (day) => day.date === date && day.month === month && day.year === year
      );

      if (isSelected) {
        return prev.filter(
          (day) =>
            !(day.date === date && day.month === month && day.year === year)
        );
      } else {
        return [...prev, dayKey];
      }
    });
  };

  const handleSlotClick = (day: number, time: string) => {
    if (!activeDepartmentId) return;
    
    setSelectedSlot({ day, time });
    setNewEvent({
      departmentId: activeDepartmentId,
      startTime: time,
      endTime: `${parseInt(time.split(":")[0]) + 1}:00`,
    });
    setEditingEvent(null);
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = () => {
    if (!selectedSlot || !activeDepartmentId) return;

    const weekDates = getWeekDates();
    const eventDate = weekDates[selectedSlot.day];

    const department = departments.find(d => d.id === newEvent.departmentId);
    const autoTitle = `Hoạt động ${department?.name || 'Phòng ban'}`;

    if (editingEvent) {
      setEvents(
        events.map((event) =>
          event.id === editingEvent.id
            ? { ...event, ...newEvent, title: autoTitle, date: eventDate }
            : event
        )
      );
    } else {
      const newEventObj: Event = {
        id: `event-${eventIdCounter}`,
        title: autoTitle,
        ...newEvent,
        day: selectedSlot.day,
        date: eventDate,
      };
      setEvents([...events, newEventObj]);
      setEventIdCounter((prev) => prev + 1);
    }

    setIsEventDialogOpen(false);
    setSelectedSlot(null);
    setEditingEvent(null);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setNewEvent({
      departmentId: event.departmentId,
      startTime: event.startTime,
      endTime: event.endTime,
    });
    setSelectedSlot({ day: event.day, time: event.startTime });
    setIsEventDialogOpen(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter((event) => event.id !== eventId));
  };

  const getEventsForSlot = (day: number, time: string) => {
    return events.filter(
      (event) =>
        event.day === day && event.startTime <= time && event.endTime > time
    );
  };

  // Loading state
  if (!isClient || isLoadingDepartments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <div className="text-lg font-medium text-slate-600">
            {isLoadingDepartments ? "Đang tải phòng ban..." : "Đang tải..."}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (departmentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-slate-600 mb-4">{departmentError}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-full mx-auto p-6">
        {/* Department Legend */}
        <motion.div
          className="flex gap-4 mb-8 justify-center flex-wrap"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {departments.map((dept, index) => {
            const style = departmentStyles[dept.id];
            if (!style) return null;

            return (
              <motion.div
                key={dept.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer"
                onClick={() => setActiveDepartmentId(dept.id)}
              >
                <Badge
                  variant="secondary"
                  className={`px-4 py-2 text-sm font-medium transition-all duration-300 border-2
                    ${
                      activeDepartmentId === dept.id
                        ? `${style.color} text-white border-transparent ${style.glow} shadow-xl`
                        : `${style.lightColor} ${style.textColor} border-transparent hover:border-gray-300`
                    }
                  `}
                >
                  <div
                    className={`w-4 h-4 rounded-full mr-3 ${
                      activeDepartmentId === dept.id ? "bg-white" : style.color
                    }`}
                  />
                  {dept.name}
                  {activeDepartmentId === dept.id && (
                    <CheckCircle className="h-4 w-4 ml-2 text-white" />
                  )}
                </Badge>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Instruction Text */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-3 text-slate-600 font-medium bg-gradient-to-r from-blue-50 to-purple-50 py-3 px-6 rounded-xl shadow-sm">
            <Target className="h-5 w-5 text-blue-500" />
            <span>
              Chọn phòng ban trên thanh legend, sau đó chọn khung giờ hoặc ngày để lên kế hoạch chiến dịch
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Weekly Calendar */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -2 }}
            className="transition-all duration-300"
          >
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="grid grid-cols-[auto_1fr] gap-3 items-start text-xl font-semibold text-slate-800">
                    <Calendar className="h-6 w-6 text-blue-500 mt-1" />
                    <div>
                      <div>Chọn khung giờ hoạt động chiến dịch</div>
                      <div className="text-sm italic text-slate-500 font-normal">
                        Chiến dịch tuần và chiến dịch 3 ngày
                      </div>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentWeek(
                            new Date(
                              currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000
                            )
                          )
                        }
                        className="hover:shadow-md transition-all duration-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.span
                      className="text-sm font-medium px-4 py-2 bg-slate-100 rounded-lg"
                      key={weekDates[0].getTime()}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {weekDates[0].toLocaleDateString("vi-VN")} -{" "}
                      {weekDates[5].toLocaleDateString("vi-VN")}
                    </motion.span>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentWeek(
                            new Date(
                              currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000
                            )
                          )
                        }
                        className="hover:shadow-md transition-all duration-200"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {/* Time column header */}
                  <div className="text-xs font-medium text-slate-500 p-3 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>

                  {/* Day headers */}
                  {weekDays.map((day, index) => (
                    <motion.div
                      key={day}
                      className="text-xs font-medium text-slate-700 p-3 text-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="font-semibold">{day}</div>
                      <div className="text-slate-500 mt-1">
                        {weekDates[index].getDate()}/
                        {weekDates[index].getMonth() + 1}
                      </div>
                    </motion.div>
                  ))}

                  {/* Time slots */}
                  {timeSlots.map((time, timeIndex) => (
                    <React.Fragment key={time}>
                      <div className="text-xs text-slate-500 p-3 border-r border-slate-200 font-medium bg-slate-50/50 flex flex-col items-center justify-center">
                        <div className="font-semibold">{time}</div>
                        {time === "08:00" && (
                          <div className="text-xs text-blue-600 mt-1">Sáng</div>
                        )}
                        {time === "13:30" && (
                          <div className="text-xs text-green-600 mt-1">
                            Chiều
                          </div>
                        )}
                      </div>
                      {Array.from({ length: 6 }, (_, dayIndex) => {
                        const slotEvents = getEventsForSlot(dayIndex, time);
                        return (
                          <motion.div
                            key={`${dayIndex}-${time}`}
                            className={`relative border border-slate-200 min-h-[60px] cursor-pointer group overflow-hidden rounded-sm
                              ${
                                time === "08:00"
                                  ? "border-t-2 border-t-blue-200"
                                  : ""
                              }
                              ${
                                time === "13:00"
                                  ? "border-t-2 border-t-green-200"
                                  : ""
                              }
                            `}
                            whileHover={{
                              backgroundColor: "#f8fafc",
                              scale: 1.01,
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                            }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleSlotClick(dayIndex, time)}
                            transition={{ duration: 0.2 }}
                          >
                            <AnimatePresence>
                              {slotEvents.map((event) => {
                                const style = departmentStyles[event.departmentId];
                                if (!style) return null;

                                return (
                                  <motion.div
                                    key={event.id}
                                    className={`absolute inset-1 ${style.lightColor} 
                                     ${style.textColor} rounded-lg p-2 text-xs
                                     border-l-4 border-blue-500
                                     cursor-pointer group/event`}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    whileHover={{ scale: 1.02 }}
                                    layout
                                    transition={{ duration: 0.2 }}
                                  >
                                    <div className="font-medium truncate">
                                      {event.title}
                                    </div>
                                    <div className="text-xs opacity-75 mt-1">
                                      {event.startTime} - {event.endTime}
                                    </div>
                                    <div className="absolute top-1 right-1 opacity-0 group-hover/event:opacity-100 transition-opacity duration-200">
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 hover:bg-white/80"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditEvent(event);
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-red-500 hover:bg-red-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteEvent(event.id);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="flex flex-col items-center gap-1">
                                <Plus className="h-5 w-5 text-slate-400" />
                                <div className="text-xs text-slate-500 font-medium">
                                  Chọn khung giờ
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Calendar */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -2 }}
            className="transition-all duration-300"
          >
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="grid grid-cols-[auto_1fr] gap-3 items-start text-xl font-semibold text-slate-800">
                    <Target className="h-6 w-6 text-green-500 mt-1" />
                    <div>
                      <div>Chọn ngày hoạt động chiến dịch</div>
                      <div className="text-sm italic text-slate-500 font-normal">
                        Chiến dịch giờ và chiến dịch ngày
                      </div>
                    </div>
                  </CardTitle>

                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() - 1
                            )
                          )
                        }
                        className="hover:shadow-md transition-all duration-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.span
                      className="text-sm font-medium px-4 py-2 bg-slate-100 rounded-lg"
                      key={currentMonth.getTime()}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      Tháng {currentMonth.getMonth() + 1},{" "}
                      {currentMonth.getFullYear()}
                    </motion.span>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1
                            )
                          )
                        }
                        className="hover:shadow-md transition-all duration-200"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-6">
                  {/* Day headers */}
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                    <div
                      key={day}
                      className="text-xs font-medium text-slate-500 p-3 text-center"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {getMonthCalendar.map((day, index) => {
                    const isSelected = isDaySelected(
                      day.date,
                      currentMonth.getMonth(),
                      currentMonth.getFullYear()
                    );
                    const selectedDay = selectedDays.find(
                      (selected) =>
                        selected.date === day.date &&
                        selected.month === currentMonth.getMonth() &&
                        selected.year === currentMonth.getFullYear()
                    );

                    const style = activeDepartmentId ? departmentStyles[activeDepartmentId] : null;

                    return (
                      <motion.div
                        key={`${day.date}-${day.isCurrentMonth}-${index}`}
                        className={`
                          aspect-square p-2 border cursor-pointer transition-all duration-300 rounded-lg relative
                          ${!day.isCurrentMonth ? "opacity-30" : ""} 
                          ${
                            isSelected && selectedDay
                              ? `${
                                  departmentStyles[selectedDay.departmentId]?.selectedColor
                                } border-white shadow-md`
                              : `bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50`
                          }
                        `}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{
                          scale: 1,
                          opacity: day.isCurrentMonth ? 1 : 0.3,
                        }}
                        transition={{
                          delay: index * 0.01,
                          duration: 0.3,
                        }}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: isSelected
                            ? "0 4px 12px rgba(0, 0, 0, 0.1)"
                            : "0 2px 8px rgba(0, 0, 0, 0.05)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          handleDayClick(day.date, day.isCurrentMonth)
                        }
                      >
                        <div
                          className={`
                          text-sm font-medium 
                          ${
                            isSelected && selectedDay
                              ? departmentStyles[selectedDay.departmentId]?.selectedTextColor
                              : day.isCurrentMonth
                              ? "text-slate-700"
                              : "text-slate-400"
                          }
                        `}
                        >
                          {day.date}
                        </div>

                        {/* Bottom indicator */}
                        <div className="mt-2 flex justify-center">
                          {isSelected ? (
                            <CheckCircle className="h-4 w-4 text-white" />
                          ) : (
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                day.isCurrentMonth
                                  ? "bg-slate-300"
                                  : "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>

                        {/* Active department indicator */}
                        {day.isCurrentMonth && !isSelected && style && (
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="space-y-4">
                  {/* Selected Days Count */}
                  {selectedDays.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        Đã chọn {selectedDays.length} ngày cho chiến dịch
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedDays.map((day, index) => {
                          const dept = departments.find(d => d.id === day.departmentId);
                          const style = departmentStyles[day.departmentId];
                          return (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                                style?.color || 'bg-gray-500'
                              }`}
                            >
                              {day.date}/{day.month + 1} - {dept?.name || 'N/A'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">
                      📋 Hướng dẫn:
                    </h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                        <span>Chọn phòng ban trên thanh legend trước</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                        <span>
                          Click vào ngày để chọn/bỏ chọn ngày hoạt động
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                        <span>Ngày đã chọn sẽ được tô màu theo phòng ban</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Floating Action Button */}
        <motion.div
          className="fixed bottom-8 right-8 z-50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring", bounce: 0.5 }}
        >
          <motion.button
            className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-xl flex items-center justify-center"
            whileHover={{
              scale: 1.1,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            }}
            whileTap={{ scale: 0.9 }}
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              y: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            onClick={() => {
              if (!activeDepartmentId) return;
              setNewEvent({
                departmentId: activeDepartmentId,
                startTime: "09:00",
                endTime: "10:00",
              });
              setEditingEvent(null);
              setIsEventDialogOpen(true);
            }}
          >
            <Plus className="h-8 w-8" />
          </motion.button>
        </motion.div>

        {/* Event Dialog */}
        <AnimatePresence>
          {isEventDialogOpen && activeDepartmentId && (
            <Dialog
              open={isEventDialogOpen}
              onOpenChange={setIsEventDialogOpen}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                  <div className="space-y-6 pt-4">
                    {/* Header */}
                    <div className="text-center border-b pb-4">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        Chọn khung giờ hoạt động chiến dịch
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Thiết lập thời gian cho{" "}
                        <span className="font-semibold">
                          {departments.find(d => d.id === activeDepartmentId)?.name}
                        </span>
                      </p>
                    </div>

                    {/* Show selected department */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center">
                          <Users className="h-3 w-3 text-blue-600" />
                        </div>
                        Phòng ban thực hiện
                      </label>
                      <div className={`h-12 px-4 rounded-lg border-2 flex items-center gap-3 ${departmentStyles[activeDepartmentId]?.lightColor}`}>
                        <div className={`w-4 h-4 rounded-full ${departmentStyles[activeDepartmentId]?.color}`} />
                        <span className={`font-medium ${departmentStyles[activeDepartmentId]?.textColor}`}>
                          {departments.find(d => d.id === activeDepartmentId)?.name}
                        </span>
                        <CheckCircle className={`h-4 w-4 ml-auto ${departmentStyles[activeDepartmentId]?.textColor}`} />
                      </div>
                    </div>

                    {/* Time selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-100 to-green-200 flex items-center justify-center">
                            <Clock className="h-3 w-3 text-green-600" />
                          </div>
                          Bắt đầu
                        </label>
                        <Select
                          value={newEvent.startTime}
                          onValueChange={(value) =>
                            setNewEvent({ ...newEvent, startTime: value })
                          }
                        >
                          <SelectTrigger className="h-12 bg-gradient-to-r from-slate-50 to-slate-100 border-2 hover:border-green-300 transition-all duration-200">
                            <SelectValue placeholder="Chọn giờ bắt đầu" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="text-xs font-semibold text-blue-600 px-3 py-2 bg-blue-50 sticky top-0">
                              ☀️ Khung sáng (8h-12h)
                            </div>
                            {timeBlocks[0].slots.map((time) => (
                              <SelectItem
                                key={time}
                                value={time}
                                className="py-2"
                              >
                                <span className="font-mono">{time}</span>
                              </SelectItem>
                            ))}
                            <div className="text-xs font-semibold text-orange-600 px-3 py-2 bg-orange-50 border-t sticky top-0">
                              🌅 Khung chiều (13h30-17h30)
                            </div>
                            {timeBlocks[1].slots.map((time) => (
                              <SelectItem
                                key={time}
                                value={time}
                                className="py-2"
                              >
                                <span className="font-mono">{time}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-100 to-orange-200 flex items-center justify-center">
                            <Clock className="h-3 w-3 text-orange-600" />
                          </div>
                          Kết thúc
                        </label>
                        <Select
                          value={newEvent.endTime}
                          onValueChange={(value) =>
                            setNewEvent({ ...newEvent, endTime: value })
                          }
                        >
                          <SelectTrigger className="h-12 bg-gradient-to-r from-slate-50 to-slate-100 border-2 hover:border-orange-300 transition-all duration-200">
                            <SelectValue placeholder="Chọn giờ kết thúc" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem
                                key={time}
                                value={time}
                                className="py-2"
                              >
                                <span className="font-mono">{time}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={handleSaveEvent}
                          className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-base"
                        >
                          {editingEvent
                            ? "🔄 Cập nhật khung giờ"
                            : "✅ Xác nhận khung giờ"}
                        </Button>
                      </motion.div>
                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          onClick={() => setIsEventDialogOpen(false)}
                          className="w-full h-12 border-2 hover:bg-slate-50 transition-all duration-300 font-semibold text-base"
                        >
                          ❌ Hủy bỏ
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </DialogContent>
              </motion.div>
            </Dialog>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
