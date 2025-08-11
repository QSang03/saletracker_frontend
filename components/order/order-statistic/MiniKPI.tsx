import React from 'react';
import { motion } from 'framer-motion';
import CountUpAnimation from './CountUpAnimation'; // Import component đã tạo trước đó

interface MiniKPIProps {
  label: string;
  value: number;
  color?: string;
  icon: React.ReactNode;
  suffix?: string;
  isAlert?: boolean;
}

const MiniKPI: React.FC<MiniKPIProps> = ({
  label,
  value,
  color = "indigo",
  icon,
  suffix = "",
  isAlert = false,
}) => {
  const colorClasses = {
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <motion.div
      className={`relative rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm border ${
        isAlert
          ? "border-red-200 dark:border-red-800"
          : "border-slate-200 dark:border-slate-700"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div
            className={`p-2 rounded-md bg-gradient-to-br ${
              colorClasses[color as keyof typeof colorClasses] ||
              colorClasses.indigo
            }`}
          >
            <div className="text-white text-sm">{icon}</div>
          </div>
          {isAlert && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-red-500 rounded-full"
            />
          )}
        </div>
        <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
          <CountUpAnimation value={value} />
          {suffix}
        </div>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}
        </div>
      </div>
    </motion.div>
  );
};

export default MiniKPI;
