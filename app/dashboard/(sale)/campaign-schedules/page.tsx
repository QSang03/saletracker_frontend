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
        <ScheduleApp />
    </motion.div>
  );
}
