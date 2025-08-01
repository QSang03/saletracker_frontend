import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sunrise, Sun, Sunset, Moon, Clock, 
  Plus, Minus, AlertCircle
} from 'lucide-react';

const defaultQuickTimeSlots = [
  { value: "08:00", label: "8AM", icon: Sunrise, color: "text-amber-600" },
  { value: "12:00", label: "12PM", icon: Sun, color: "text-yellow-600" },
  { value: "14:00", label: "2PM", icon: Sun, color: "text-blue-600" },
  { value: "18:00", label: "6PM", icon: Sunset, color: "text-orange-600" },
  { value: "20:00", label: "8PM", icon: Moon, color: "text-purple-600" },
  { value: "22:00", label: "10PM", icon: Moon, color: "text-indigo-600" }
];

interface TimeRange {
  startTime: string; // Format: "HH:mm"
  endTime: string;   // Format: "HH:mm"
}

interface ModernTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  timeRange?: TimeRange; // Khung giờ phút cụ thể
  quickSlots?: Array<{
    value: string;
    label: string;
    icon: any;
    color: string;
  }>; // Tùy chỉnh quick slots
  onError?: (error: string) => void; // Callback khi có lỗi
}

const ModernTimePicker = ({ 
  value, 
  onChange, 
  label, 
  timeRange = { startTime: "00:00", endTime: "23:59" },
  quickSlots = defaultQuickTimeSlots,
  onError
}: ModernTimePickerProps) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customTime, setCustomTime] = useState({ hours: '12', minutes: '00' });
  const [error, setError] = useState<string>('');
  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);

  // Convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes back to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Kiểm tra thời gian có hợp lệ không
  const isTimeInRange = (timeStr: string): boolean => {
    const timeMinutes = timeToMinutes(timeStr);
    const startMinutes = timeToMinutes(timeRange.startTime);
    const endMinutes = timeToMinutes(timeRange.endTime);
    
    // Handle overnight ranges (e.g., 22:30 - 06:30)
    if (startMinutes > endMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
    
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  };

  // Validate time value
  const validateTime = (timeValue: string): boolean => {
    if (!timeValue) return true;
    
    if (!isTimeInRange(timeValue)) {
      const errorMsg = `Thời gian phải trong khoảng ${timeRange.startTime} - ${timeRange.endTime}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
    
    setError('');
    return true;
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Filter quick slots based on time range
  const filteredQuickSlots = quickSlots.filter(slot => isTimeInRange(slot.value));

  // Update custom time from value
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':');
      setCustomTime({ hours, minutes });
      
      const isPreset = quickSlots.some(slot => slot.value === value);
      if (!isPreset) {
        setShowCustom(true);
      }
      
      validateTime(value);
    }
  }, [value, timeRange]);

  // Handle custom time input
  const handleTimeInput = (type: 'hours' | 'minutes', inputValue: string) => {
    let newValue = inputValue.replace(/\D/g, '');
    if (newValue.length > 2) newValue = newValue.slice(0, 2);
    
    const updatedTime = { ...customTime, [type]: newValue };
    setCustomTime(updatedTime);
    
    if (updatedTime.hours.length === 2 && updatedTime.minutes.length === 2) {
      let hours = Math.min(23, Math.max(0, parseInt(updatedTime.hours) || 0));
      let minutes = Math.min(59, Math.max(0, parseInt(updatedTime.minutes) || 0));
      
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const newTime = `${formattedHours}:${formattedMinutes}`;
      
      if (validateTime(newTime)) {
        onChange(newTime);
        setCustomTime({ hours: formattedHours, minutes: formattedMinutes });
      }
    }
  };

  // Get next valid time when adjusting
  const getNextValidTime = (currentTime: string, increment: boolean, type: 'hours' | 'minutes'): string => {
    const currentMinutes = timeToMinutes(currentTime);
    const startMinutes = timeToMinutes(timeRange.startTime);
    const endMinutes = timeToMinutes(timeRange.endTime);
    
    let newMinutes = currentMinutes;
    const step = type === 'hours' ? 60 : 1;
    
    if (increment) {
      newMinutes += step;
      // Handle day boundary
      if (newMinutes >= 1440) newMinutes = 0;
    } else {
      newMinutes -= step;
      // Handle day boundary
      if (newMinutes < 0) newMinutes = 1439;
    }
    
    // Find next valid time within range
    let attempts = 0;
    while (!isTimeInRange(minutesToTime(newMinutes)) && attempts < 1440) {
      if (increment) {
        newMinutes = (newMinutes + 1) % 1440;
      } else {
        newMinutes = newMinutes <= 0 ? 1439 : newMinutes - 1;
      }
      attempts++;
    }
    
    return minutesToTime(newMinutes);
  };

  // Adjust time with range validation
  const adjustTime = (type: 'hours' | 'minutes', increment: boolean) => {
    const currentTime = `${customTime.hours}:${customTime.minutes}`;
    const newTime = getNextValidTime(currentTime, increment, type);
    const [newHours, newMinutes] = newTime.split(':');
    
    setCustomTime({ hours: newHours, minutes: newMinutes });
    if (validateTime(newTime)) {
      onChange(newTime);
    }
  };

  // Generate quick minute options based on range
  const getValidMinuteOptions = (): string[] => {
    const currentHour = customTime.hours;
    const baseTime = `${currentHour}:`;
    
    return ['00', '15', '30', '45'].filter(minute => 
      isTimeInRange(`${currentHour}:${minute}`)
    );
  };

  // Format time range for display
  const formatTimeRange = (): string => {
    const startMinutes = timeToMinutes(timeRange.startTime);
    const endMinutes = timeToMinutes(timeRange.endTime);
    
    if (startMinutes > endMinutes) {
      return `${timeRange.startTime} - ${timeRange.endTime} (+1 ngày)`;
    }
    
    return `${timeRange.startTime} - ${timeRange.endTime}`;
  };

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      {label && (
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Clock className="h-4 w-4 text-gray-500" />
              </motion.div>
              {label}
            </label>
            <span className="text-xs text-gray-500 mt-1">
              Khung thời gian: {formatTimeRange()}
            </span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setShowCustom(!showCustom)}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              showCustom 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showCustom ? 'Gợi ý' : 'Tùy chỉnh'}
          </motion.button>
        </motion.div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!showCustom ? (
          // Quick Time Slots - Filtered by range
          <motion.div 
            key="quick-slots"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-3 gap-2"
          >
            {filteredQuickSlots.length > 0 ? (
              filteredQuickSlots.map((slot, index) => {
                const Icon = slot.icon;
                const isSelected = value === slot.value;
                
                return (
                  <motion.button
                    key={slot.value}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      onChange(slot.value);
                      setShowCustom(false);
                    }}
                    className={`p-2 rounded-lg border transition-all duration-200 text-center ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <motion.div
                      animate={{ 
                        rotate: isSelected ? [0, 10, -10, 0] : 0,
                        scale: isSelected ? [1, 1.1, 1] : 1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className={`h-4 w-4 mx-auto mb-1 ${isSelected ? 'text-blue-600' : slot.color}`} />
                    </motion.div>
                    <div className="text-xs font-medium">{slot.label}</div>
                  </motion.button>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-3 text-center text-gray-500 text-sm p-4"
              >
                Không có gợi ý nào phù hợp với khung thời gian đã chọn
              </motion.div>
            )}
          </motion.div>
        ) : (
          // Custom Time Input - With range validation
          <motion.div 
            key="custom-time"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            {/* Time Input */}
            <motion.div 
              className="flex items-center justify-center gap-2 mb-3"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Hours */}
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => adjustTime('hours', false)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </motion.button>
                
                <motion.input
                  whileFocus={{ scale: 1.05, borderColor: "#3b82f6" }}
                  ref={hoursInputRef}
                  type="text"
                  value={customTime.hours}
                  onChange={(e) => handleTimeInput('hours', e.target.value)}
                  onBlur={() => {
                    let hours = Math.min(23, Math.max(0, parseInt(customTime.hours) || 0));
                    const formattedHours = hours.toString().padStart(2, '0');
                    const testTime = `${formattedHours}:${customTime.minutes}`;
                    
                    // If current time is invalid, find nearest valid time
                    if (!isTimeInRange(testTime) && customTime.minutes.length === 2) {
                      const nearestTime = getNextValidTime(testTime, true, 'hours');
                      const [nearestHours, nearestMinutes] = nearestTime.split(':');
                      setCustomTime({ hours: nearestHours, minutes: nearestMinutes });
                      onChange(nearestTime);
                    } else {
                      setCustomTime((prev) => ({ ...prev, hours: formattedHours }));
                      if (customTime.minutes.length === 2) {
                        const newTime = `${formattedHours}:${customTime.minutes}`;
                        if (validateTime(newTime)) {
                          onChange(newTime);
                        }
                      }
                    }
                  }}
                  onFocus={() => hoursInputRef.current?.select()}
                  className={`w-8 h-8 text-center text-sm font-semibold bg-white rounded border transition-all ${
                    error ? 'border-red-300 focus:border-red-400' : 'border-gray-300 focus:border-blue-400'
                  } focus:outline-none`}
                  maxLength={2}
                />
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => adjustTime('hours', true)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </motion.button>
              </div>

              <motion.span 
                className="text-lg font-bold text-gray-400"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                :
              </motion.span>

              {/* Minutes */}
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => adjustTime('minutes', false)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </motion.button>
                
                <motion.input
                  whileFocus={{ scale: 1.05, borderColor: "#3b82f6" }}
                  ref={minutesInputRef}
                  type="text"
                  value={customTime.minutes}
                  onChange={(e) => handleTimeInput('minutes', e.target.value)}
                  onBlur={() => {
                    let minutes = Math.min(59, Math.max(0, parseInt(customTime.minutes) || 0)).toString().padStart(2, '0');
                    const testTime = `${customTime.hours}:${minutes}`;
                    
                    // If current time is invalid, find nearest valid time
                    if (!isTimeInRange(testTime) && customTime.hours.length === 2) {
                      const nearestTime = getNextValidTime(testTime, true, 'minutes');
                      const [nearestHours, nearestMinutes] = nearestTime.split(':');
                      setCustomTime({ hours: nearestHours, minutes: nearestMinutes });
                      onChange(nearestTime);
                    } else {
                      setCustomTime((prev) => ({ ...prev, minutes }));
                      if (customTime.hours.length === 2) {
                        const newTime = `${customTime.hours}:${minutes}`;
                        if (validateTime(newTime)) {
                          onChange(newTime);
                        }
                      }
                    }
                  }}
                  onFocus={() => minutesInputRef.current?.select()}
                  className="w-8 h-8 text-center text-sm font-semibold bg-white rounded border border-gray-300 focus:border-blue-400 focus:outline-none transition-all"
                  maxLength={2}
                />
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => adjustTime('minutes', true)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </motion.button>
              </div>
            </motion.div>

            {/* Quick minute buttons - Filtered by range */}
            <motion.div 
              className="flex justify-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {getValidMinuteOptions().map((minute, index) => (
                <motion.button
                  key={minute}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleTimeInput('minutes', minute)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    customTime.minutes === minute
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  :{minute}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Time Display */}
      <AnimatePresence>
        {value && !error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200"
          >
            <motion.div 
              className="flex items-center justify-center gap-2 text-sm text-blue-700"
              initial={{ x: -10 }}
              animate={{ x: 0 }}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1, repeat: Infinity }
                }}
              >
                <Clock className="h-3 w-3" />
              </motion.div>
              <motion.span 
                className="font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Đã chọn: {formatTime(value)}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ModernTimePicker;