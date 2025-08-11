import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import CountUpAnimation from './CountUpAnimation'; // Import component đã tạo trước đó

interface ElegantKPIProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "indigo" | "emerald" | "blue" | "rose";
  trendPrev?: number;
  description?: string;
  isCurrency?: boolean;
  accentFrom?: string;
  accentTo?: string;
  bg?: string;
  border?: string;
}

const ElegantKPI: React.FC<ElegantKPIProps> = ({
  label,
  value,
  icon,
  color = "indigo",
  trendPrev,
  description,
  isCurrency = false,
  accentFrom,
  accentTo,
  bg,
  border,
}) => {
  const defaults = {
    indigo: {
      from: "#6366f1",
      to: "#4f46e5",
      bg: "#eef2ff",
      border: "#c7d2fe",
    },
    emerald: {
      from: "#10b981",
      to: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    },
    blue: { from: "#3b82f6", to: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    rose: { from: "#f43f5e", to: "#e11d48", bg: "#fff1f2", border: "#fecdd3" },
  } as const;

  const palette = defaults[color] || defaults.indigo;
  const fromHex = accentFrom || palette.from;
  const toHex = accentTo || palette.to;
  const bgHex = bg || palette.bg;
  const borderHex = border || palette.border;

  const percent = useMemo(() => {
    if (trendPrev == null) return null;
    const p =
      trendPrev === 0
        ? value > 0
          ? 100
          : 0
        : Math.round(((value - trendPrev) / Math.max(1, trendPrev)) * 100);
    return p;
  }, [value, trendPrev]);

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden shadow-sm border`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ backgroundColor: bgHex, borderColor: borderHex }}
    >
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <motion.div
            className={`p-3 rounded-lg shadow-sm`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            style={{
              background: `linear-gradient(to bottom right, ${fromHex}, ${toHex})`,
            }}
          >
            <div className="text-white">{icon}</div>
          </motion.div>
          {percent !== null && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                percent >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {percent >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(percent)}%
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            <CountUpAnimation value={value} isCurrency={isCurrency} />
          </div>
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {label}
          </div>
          {description && (
            <div className="text-xs text-slate-500 dark:text-slate-500">
              {description}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ElegantKPI;
