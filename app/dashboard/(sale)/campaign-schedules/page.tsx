"use client"

import ScheduleApp from "@/components/sale/schedule/ScheduleApp";
import { motion } from "framer-motion";

export default function CampaignSchedule() {
  return (
    <motion.div 
      className="h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div 
        className="h-full overflow-y-auto p-6 space-y-6"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Header được dời từ ScheduleApp lên đây */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <motion.h2 
            className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-5"
            animate={{ 
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            style={{
              backgroundSize: "200% 200%"
            }}
          >
            🚀 Hệ thống quản lý lịch trình
          </motion.h2>
        </motion.div>

        <ScheduleApp />
      </motion.div>
    </motion.div>
  );
}
