import React from 'react';
import { motion } from 'framer-motion';

interface ElegantStatusBadgeProps {
  status: string;
}

const ElegantStatusBadge: React.FC<ElegantStatusBadgeProps> = ({ status }) => {
  const config = {
    pending: {
      label: "Chờ xử lý",
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      icon: "⏳",
    },
    quoted: {
      label: "Chưa chốt",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      icon: "💬",
    },
    completed: {
      label: "Đã chốt",
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      icon: "✅",
    },
    demand: {
      label: "Nhu cầu",
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
      icon: "🔥",
    },
    confirmed: {
      label: "Đã xác nhận",
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      icon: "📞",
    },
  };

  const statusConfig = config[status as keyof typeof config] || {
    label: status || "Không xác định",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    icon: "❓",
  };

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${statusConfig.color}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-xs">{statusConfig.icon}</span>
      <span>{statusConfig.label}</span>
    </motion.div>
  );
};

export default ElegantStatusBadge;
