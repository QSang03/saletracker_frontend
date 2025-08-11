import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Eye, EyeOff } from "lucide-react";
import { numberCompact } from "@/lib/order-helper";

// Types (cần định nghĩa hoặc import từ file types)
export type ChartPoint = {
  name: string;
  timestamp: number;
  demand: number;
  completed: number;
  quoted: number;
  pending: number;
};

// Elegant color palette - softer but still noble
export const chartConfig = {
  demand: {
    label: "Nhu cầu",
    color: "#0ea5e9", // Sky 500 (xanh biển)
    lightColor: "#7dd3fc", // Sky 300
    bgColor: "#f0f9ff", // Sky 50
  },
  completed: {
    label: "Đã chốt",
    color: "#10b981", // Emerald 500
    lightColor: "#6ee7b7", // Emerald 300
    bgColor: "#ecfdf5", // Emerald 50
  },
  quoted: {
    label: "Chưa chốt",
    color: "#ef4444", // Red 500
    lightColor: "#fca5a5", // Red 300
    bgColor: "#fef2f2", // Red 50
  },
  pending: {
    label: "Chờ xử lý",
    color: "#2dd4bf", // Mint/Teal 400
    lightColor: "#99f6e4", // Mint/Teal 200
    bgColor: "#f0fdfa", // Mint/Teal 50
  },
};

const seriesOrder: Array<keyof ChartPoint> = [
  "demand",
  "completed",
  "quoted",
  "pending",
];

interface ElegantBarChartProps {
  data: ChartPoint[];
  visibleSeries: Record<string, boolean>;
  onToggleSeries: (key: keyof typeof chartConfig) => void;
  onBarClick: (data: {
    name: string;
    type: string;
    value: number;
    timestamp: number;
  }) => void;
}

const ElegantBarChart: React.FC<ElegantBarChartProps> = ({
  data,
  visibleSeries,
  onToggleSeries,
  onBarClick,
}) => {
  // Limit to 7 data points for better readability
  const limitedData = useMemo(() => data.slice(-7), [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-lg border border-slate-200/50 dark:border-slate-700/50 p-3 shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {chartConfig[entry.dataKey as keyof typeof chartConfig]
                  ?.label || entry.name}
                :
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {numberCompact(entry.value)}
              </span>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  const handleBarClick = (data: any, key: string) => {
    if (data && data.payload) {
      onBarClick({
        name: data.payload.name,
        type: key,
        value: data.payload[key],
        timestamp: data.payload.timestamp,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Series Toggle Controls */}
      <div className="flex flex-wrap gap-2">
        {seriesOrder.map((key) => {
          const config = chartConfig[key as keyof typeof chartConfig];
          if (!config) return null;
          return (
            <motion.button
              key={key}
              onClick={() => onToggleSeries(key as keyof typeof chartConfig)}
              className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 border
              ${
                visibleSeries[key as keyof typeof visibleSeries]
                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"
              }
            `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
            >
              <div className="flex items-center gap-2">
                {visibleSeries[key as keyof typeof visibleSeries] ? (
                  <Eye
                    className="w-3.5 h-3.5"
                    style={{ color: config.color }}
                  />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: visibleSeries[
                      key as keyof typeof visibleSeries
                    ]
                      ? config.color
                      : "#cbd5e1",
                  }}
                />
                <span
                  className={
                    visibleSeries[key as keyof typeof visibleSeries]
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400"
                  }
                >
                  {config.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Chart Container */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={limitedData}
            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              dx={-10}
            />
            <RechartsTooltip content={<CustomTooltip />} />

            {seriesOrder.map((key) => {
              const config = chartConfig[key as keyof typeof chartConfig];
              if (!config) return null;
              const isVisible =
                visibleSeries[key as keyof typeof visibleSeries];
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  hide={!isVisible}
                  fill={config.color}
                  radius={[2, 2, 0, 0]}
                  cursor={isVisible ? "pointer" : "default"}
                  onClick={
                    isVisible
                      ? (data) => handleBarClick(data, key as string)
                      : undefined
                  }
                >
                  {limitedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={config.color}
                      style={{
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {seriesOrder.map((key) => {
          const config = chartConfig[key as keyof typeof chartConfig];
          if (!config) return null;
          const total = limitedData.reduce(
            (sum, item) =>
              sum +
              (visibleSeries[key as keyof typeof visibleSeries]
                ? (item[key] as number)
                : 0),
            0
          );
          return (
            <div key={key} className="text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{
                  backgroundColor: visibleSeries[
                    key as keyof typeof visibleSeries
                  ]
                    ? config.color
                    : "#cbd5e1",
                }}
              />
              <div
                className={`text-sm font-semibold ${
                  visibleSeries[key as keyof typeof visibleSeries]
                    ? "text-slate-700 dark:text-slate-300"
                    : "text-slate-400"
                }`}
              >
                {numberCompact(total)}
              </div>
              <div className="text-xs text-slate-500">{config.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ElegantBarChart;
