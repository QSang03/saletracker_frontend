import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, CalendarDays, CalendarRange, CalendarCheck,
  Settings, ToggleLeft, ToggleRight, Info
} from 'lucide-react';

type SelectionMode = 'single' | 'adjacent' | 'multiple';

interface ModernDaySelectorProps {
  value: number | number[];
  onChange: (value: number | number[]) => void;
  mode?: SelectionMode;
  onModeChange?: (mode: SelectionMode) => void;
  includeSaturday?: boolean; // Chỉ là prop, không có toggle
  adjacentDayCount?: number; // Số ngày liền kề cần chọn
  label?: string;
}

const weekDayOptions = [
  { value: 2, label: "Thứ 2", shortLabel: "T2", emoji: "📅", color: "from-blue-400 to-blue-500" },
  { value: 3, label: "Thứ 3", shortLabel: "T3", emoji: "📅", color: "from-green-400 to-green-500" },
  { value: 4, label: "Thứ 4", shortLabel: "T4", emoji: "📅", color: "from-yellow-400 to-yellow-500" },
  { value: 5, label: "Thứ 5", shortLabel: "T5", emoji: "📅", color: "from-orange-400 to-orange-500" },
  { value: 6, label: "Thứ 6", shortLabel: "T6", emoji: "📅", color: "from-purple-400 to-purple-500" },
  { value: 7, label: "Thứ 7", shortLabel: "T7", emoji: "🌸", color: "from-pink-400 to-pink-500" },
];

const selectionModes = [
  { 
    value: 'single' as SelectionMode, 
    label: "Chọn 1 ngày", 
    icon: Calendar, 
    description: "Chọn một ngày duy nhất",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  { 
    value: 'adjacent' as SelectionMode, 
    label: "Liền kề", 
    icon: CalendarRange, 
    description: "Chọn các ngày liên tiếp",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  { 
    value: 'multiple' as SelectionMode, 
    label: "Tùy chọn", 
    icon: CalendarCheck, 
    description: "Chọn các ngày bất kỳ",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  }
];

const ModernDaySelector = ({
  value,
  onChange,
  mode = 'single',
  onModeChange,
  includeSaturday = false,
  adjacentDayCount = 3,
  label = "Chọn ngày trong tuần"
}: ModernDaySelectorProps) => {
  // Get available days based on includeSaturday option
  const availableDays = includeSaturday ? weekDayOptions : weekDayOptions.slice(0, -1);

  // Handle day selection based on mode
  const handleDaySelect = (day: number) => {
    if (mode === 'single') {
      onChange(day);
    } else if (mode === 'adjacent') {
      handleAdjacentSelection(day);
    } else if (mode === 'multiple') {
      handleMultipleSelection(day);
    }
  };

  // Enhanced adjacent selection logic - chỉ cần click 1 lần
  const handleAdjacentSelection = (startDay: number) => {
    const range = [];
    let currentDay = startDay;
    
    // Tạo array các ngày liền kề
    for (let i = 0; i < adjacentDayCount; i++) {
      if (availableDays.some(d => d.value === currentDay)) {
        range.push(currentDay);
      }
      currentDay++;
      
      // Nếu vượt quá thứ 7, quay lại thứ 2 (xử lý tuần theo chu kỳ)
      if (currentDay > 7) {
        currentDay = 2;
      }
      
      // Nếu không bao gồm thứ 7 và gặp thứ 7, skip sang thứ 2
      if (!includeSaturday && currentDay === 7) {
        currentDay = 2;
      }
    }
    
    onChange(range);
  };

  // Handle multiple selection logic
  const handleMultipleSelection = (day: number) => {
    const currentValues = Array.isArray(value) ? value : [];
    if (currentValues.includes(day)) {
      onChange(currentValues.filter(d => d !== day));
    } else {
      onChange([...currentValues, day].sort());
    }
  };

  // Check if day is selected
  const isSelected = (day: number) => {
    if (mode === 'single') {
      return value === day;
    }
    return Array.isArray(value) && value.includes(day);
  };

  // Check if day is in current adjacent selection preview
  const isInAdjacentPreview = (day: number) => {
    if (mode !== 'adjacent') return false;
    const currentValues = Array.isArray(value) ? value : [];
    return currentValues.includes(day);
  };

  // Format selected days for display
  const getSelectedDisplay = () => {
    if (mode === 'single') {
      const selectedDay = availableDays.find(d => d.value === value);
      return selectedDay ? selectedDay.label : 'Chưa chọn';
    }
    
    const selectedValues = Array.isArray(value) ? value : [];
    if (selectedValues.length === 0) return 'Chưa chọn';
    
    const selectedLabels = selectedValues
      .map(v => availableDays.find(d => d.value === v)?.shortLabel)
      .filter(Boolean);
    
    return selectedLabels.join(', ');
  };

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <CalendarDays className="h-4 w-4 text-gray-500" />
          </motion.div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>

        {/* Info about current mode */}
        <div className="flex items-center gap-2">
          {mode === 'adjacent' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-100 text-green-700"
            >
              <Info className="h-3 w-3" />
              <span>{adjacentDayCount} ngày liền kề</span>
            </motion.div>
          )}
          
          {includeSaturday && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-pink-100 text-pink-700"
            >
              <span>🌸</span>
              <span>Có T7</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      {/* {onModeChange && (
        <motion.div 
          className="grid grid-cols-3 gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {selectionModes.map((modeOption, index) => {
            const Icon = modeOption.icon;
            const isSelected = mode === modeOption.value;
            
            return (
              <motion.button
                key={modeOption.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  onModeChange(modeOption.value);
                  onChange(modeOption.value === 'single' ? 0 : []);
                }}
                className={`p-2 rounded-lg border-2 transition-all duration-200 text-center ${
                  isSelected 
                    ? `${modeOption.borderColor} ${modeOption.bgColor}` 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <motion.div
                  animate={{ 
                    rotate: isSelected ? [0, 5, -5, 0] : 0,
                    scale: isSelected ? [1, 1.05, 1] : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${isSelected ? modeOption.color : 'text-gray-400'}`} />
                </motion.div>
                <div className={`text-xs font-medium ${isSelected ? modeOption.color : 'text-gray-600'}`}>
                  {modeOption.label}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )} */}

      {/* Day Selector */}
      <motion.div 
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {availableDays.map((day, index) => {
          const selected = isSelected(day.value);
          const inAdjacentPreview = isInAdjacentPreview(day.value);
          
          return (
            <motion.button
              key={day.value}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ 
                scale: 1.05, 
                y: -2,
                transition: { duration: 0.1 }
              }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleDaySelect(day.value)}
              className={`
                relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${selected 
                  ? `bg-gradient-to-r ${day.color} text-white shadow-lg` 
                  : inAdjacentPreview
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <motion.span 
                className="mr-1"
                animate={{ 
                  rotate: selected ? [0, 10, -10, 0] : 0 
                }}
                transition={{ duration: 0.3 }}
              >
                {day.emoji}
              </motion.span>
              {day.label}
              
              {/* Selection indicator */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center"
                  >
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Adjacent sequence indicator */}
              <AnimatePresence>
                {mode === 'adjacent' && selected && Array.isArray(value) && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold"
                  >
                    {value.indexOf(day.value) + 1}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Selected Days Display */}
      <AnimatePresence>
        {(value && ((Array.isArray(value) && value.length > 0) || (!Array.isArray(value) && value > 0))) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Calendar className="h-4 w-4" />
                </motion.div>
                <span className="text-sm font-medium">Đã chọn:</span>
              </div>
              <motion.span 
                className="text-sm font-semibold text-blue-800"
                key={getSelectedDisplay()}
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                {getSelectedDisplay()}
              </motion.span>
            </div>
            
            {/* Selection count và adjacent info */}
            {Array.isArray(value) && value.length > 1 && (
              <motion.div 
                className="text-xs text-blue-600 mt-1 flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <span>Tổng cộng: {value.length} ngày</span>
                {mode === 'adjacent' && (
                  <span className="text-green-600 font-medium">
                    ✓ {adjacentDayCount} ngày liền kề
                  </span>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex gap-2 overflow-hidden"
        >
          {/* Chỉ hiển thị nút 'Chọn tất cả' khi mode là 'multiple' */}
          {mode === 'multiple' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                const allDays = availableDays.map(d => d.value);
                onChange(allDays);
              }}
              className="flex-1 py-2 px-3 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors"
            >
              Chọn tất cả
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              onChange(mode === 'single' ? 0 : []);
            }}
            className="flex-1 py-2 px-3 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
          >
            {mode === 'single' ? 'Xóa ngày lựa chọn' : 'Xóa tất cả'}
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default ModernDaySelector;
