"use client";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type ChartDataItem = {
  name: string;
  timestamp: number;
  [key: string]: string | number;
};

type ChartSeriesConfig = {
  [key: string]: {
    label: string;
    color: string;
  };
};

type Props = {
  data: ChartDataItem[];
  config: ChartSeriesConfig;
  onBarClick?: (params: {
    name: string;
    type: string;
    value: number;
    timestamp: number;
  }) => void;
};

const GenericBarChart = ({ data, config, onBarClick }: Props) => {
  return (
    <ChartContainer config={config}>
      <div className="w-full">
        <ResponsiveContainer width="100%" aspect={4}>
          <BarChart data={data} margin={{ bottom: 50 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (typeof value === "string") {
                  return value.split(" ")[0];
                }
                return String(value);
              }}
            />
            <Tooltip content={<ChartTooltipContent indicator="line" />} />
            {Object.entries(config).map(([key, cfg]) =>
              key === "name" || key === "timestamp" ? null : (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={cfg.color}
                  radius={4}
                  onClick={(entry: any, index: number) => {
                    const item = data[index];
                    if (onBarClick && item) {
                      onBarClick({
                        name: item.name,
                        timestamp: item.timestamp,
                        type: key,
                        value: Number(item[key]),
                      });
                    }
                  }}
                >
                  <LabelList position="top" dataKey={key} />
                </Bar>
              )
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};

export default GenericBarChart;
