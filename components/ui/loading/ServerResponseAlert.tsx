"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type AlertType = "success" | "error" | "warning" | "confirm" | "loading";

interface ServerResponseAlertProps {
  type: AlertType;
  message: string;
  className?: string;
  onClose?: () => void;
}

const iconMap = {
  success: <CheckCircle className="h-6 w-6 text-green-500 animate-pop" />,
  error: <XCircle className="h-6 w-6 text-red-500 animate-pop" />,
  warning: <AlertTriangle className="h-6 w-6 text-yellow-500 animate-pop" />,
  confirm: <HelpCircle className="h-6 w-6 text-blue-500 animate-pop" />,
  loading: <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />,
};

const titleMap = {
  success: "Thành công",
  error: "Thất bại",
  warning: "Cảnh báo",
  confirm: "Xác nhận",
  loading: "Đang xử lý",
};

const styleMap = {
  success: "bg-green-100 text-green-800 border-green-300",
  error: "bg-red-100 text-red-800 border-red-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirm: "bg-blue-100 text-blue-800 border-blue-300",
  loading: "bg-gray-100 text-gray-800 border-gray-300",
};

const bgPulseMap = {
  success: "animate-pulse bg-green-50",
  error: "animate-pulse bg-red-50",
  warning: "animate-pulse bg-yellow-50",
  confirm: "animate-pulse bg-blue-50",
  loading: "animate-pulse bg-gray-50",
};

export function ServerResponseAlert({
  type,
  message,
  className,
  onClose,
}: ServerResponseAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type !== "loading") {
      const timeout = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [type, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "fixed top-6 left-1/2 -translate-x-1/2 z-[9999] rounded-md border px-4 py-3 shadow-lg flex items-center gap-3 w-fit max-w-sm",
            styleMap[type],
            bgPulseMap[type],
            className
          )}
        >
          {iconMap[type]}
          <div className="flex flex-col text-sm">
            <span className="font-semibold">{titleMap[type]}</span>
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
