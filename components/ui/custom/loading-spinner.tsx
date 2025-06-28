"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

type LoadingSpinnerProps = {
  size?: number;
  color?: string;
  className?: string;
  label?: string;
  duration?: number;
};

export function LoadingSpinner({
  size = 24,
  color = "text-indigo-500",
  className,
  label,
  duration = 1, // tốc độ xoay (giây/vòng)
}: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-center gap-2",
        label && "px-2 py-1",
        className
      )}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration, ease: "linear" }}
      >
        <Loader2
          className={clsx(color)}
          style={{ width: size, height: size }}
        />
      </motion.div>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
