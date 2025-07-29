import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sunrise, Sun, Sunset, Moon, Clock, 
  Plus, Minus, ChevronDown
} from 'lucide-react';

const quickTimeSlots = [
  { value: "08:00", label: "8AM", icon: Sunrise, color: "text-amber-600" },
  { value: "12:00", label: "12PM", icon: Sun, color: "text-yellow-600" },
  { value: "14:00", label: "2PM", icon: Sun, color: "text-blue-600" },
  { value: "18:00", label: "6PM", icon: Sunset, color: "text-orange-600" },
  { value: "20:00", label: "8PM", icon: Moon, color: "text-purple-600" },
  { value: "22:00", label: "10PM", icon: Moon, color: "text-indigo-600" }
];

interface ModernTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const ModernTimePicker = ({ value, onChange, label }: ModernTimePickerProps) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customTime, setCustomTime] = useState({ hours: '12', minutes: '00' });
  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Update custom time from value
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':');
      setCustomTime({ hours, minutes });
      
      const isPreset = quickTimeSlots.some(slot => slot.value === value);
      if (!isPreset) {
        setShowCustom(true);
      }
    }
  }, [value]);

  // Handle custom time input
  const handleTimeInput = (type: 'hours' | 'minutes', inputValue: string) => {
    let newValue = inputValue.replace(/\D/g, '');
    if (newValue.length > 2) newValue = newValue.slice(0, 2);
    
    const updatedTime = { ...customTime, [type]: newValue };
    setCustomTime(updatedTime);
    
    if (updatedTime.hours.length === 2 && updatedTime.minutes.length === 2) {
      let hours = Math.min(23, Math.max(0, parseInt(updatedTime.hours) || 0)).toString().padStart(2, '0');
      let minutes = Math.min(59, Math.max(0, parseInt(updatedTime.minutes) || 0)).toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
      setCustomTime({ hours, minutes });
    }
  };

  // Adjust time
  const adjustTime = (type: 'hours' | 'minutes', increment: boolean) => {
    if (type === 'hours') {
      let newHour = parseInt(customTime.hours) + (increment ? 1 : -1);
      if (newHour < 0) newHour = 23;
      if (newHour > 23) newHour = 0;
      handleTimeInput('hours', newHour.toString());
    } else {
      let newMinute = parseInt(customTime.minutes) + (increment ? 1 : -1);
      if (newMinute < 0) newMinute = 59;
      if (newMinute > 59) newMinute = 0;
      handleTimeInput('minutes', newMinute.toString());
    }
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
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="h-4 w-4 text-gray-500" />
            </motion.div>
            {label}
          </label>
          
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

      <AnimatePresence mode="wait">
        {!showCustom ? (
          // Quick Time Slots - Compact
          <motion.div 
            key="quick-slots"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-3 gap-2"
          >
            {quickTimeSlots.map((slot, index) => {
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
            })}
          </motion.div>
        ) : (
          // Custom Time Input - Compact
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
                    let hours = Math.min(23, Math.max(0, parseInt(customTime.hours) || 0)).toString().padStart(2, '0');
                    setCustomTime((prev) => ({ ...prev, hours }));
                    if (customTime.minutes.length === 2) {
                      onChange(`${hours}:${customTime.minutes}`);
                    }
                  }}
                  onFocus={() => hoursInputRef.current?.select()}
                  className="w-8 h-8 text-center text-sm font-semibold bg-white rounded border border-gray-300 focus:border-blue-400 focus:outline-none transition-all"
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
                    setCustomTime((prev) => ({ ...prev, minutes }));
                    if (customTime.hours.length === 2) {
                      onChange(`${customTime.hours}:${minutes}`);
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

            {/* Quick minute buttons */}
            <motion.div 
              className="flex justify-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {['00', '15', '30', '45'].map((minute, index) => (
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
        {value && (
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
