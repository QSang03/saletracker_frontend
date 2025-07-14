'use client';

import React, { useMemo, useCallback } from 'react';
import {
  Bar, BarChart, Line, LineChart, RadialBarChart, RadialBar, Cell,
  CartesianGrid, XAxis, YAxis, ResponsiveContainer
} from 'recharts';
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SimpleSelect from './SimpleSelect';

export interface ChartDataItem {
  name: string;
  paid: number;
  promised: number;
  no_info: number;
}

export interface PieDataItem {
  name: string;
  value: number;
  fill: string;
}

export const chartConfig = {
  paid:    { label: 'Đã thanh toán',    color: '#10b981' },
  promised:{ label: 'Khách hẹn trả',    color: '#60A5FA' },
  no_info: { label: 'Chưa có thông tin', color: '#D1D5DB' },
} as const;

interface ChartSectionProps {
  chartType: 'bar' | 'line' | 'radial';
  setChartType: (type: 'bar' | 'line' | 'radial') => void;
  chartData: ChartDataItem[];
  pieData: PieDataItem[];
  onChartClick: (data: unknown, category: string) => void;
  loading?: boolean;
  error?: string | null;
}

const BarChartComponent = React.memo<{ data: ChartDataItem[]; onChartClick: any; chartKey: string }>(
  ({ data, onChartClick, chartKey }) => {
    const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
    
    return (
      <ChartContainer config={chartConfig} className="h-96 w-full" key={`bar-${chartKey}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={memoizedData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            key={`barchart-${chartKey}`}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              content={<ChartTooltipContent indicator="line" labelKey="name" nameKey="dataKey" />}
            />
            {(['paid', 'promised', 'no_info'] as const).map(key => (
              <Bar
                key={`${key}-${chartKey}`}
                dataKey={key}
                fill={chartConfig[key].color}
                radius={[4, 4, 0, 0]}
                onClick={(d) => onChartClick(d, key)}
                className="cursor-pointer hover:opacity-80"
                isAnimationActive={false}
                animationDuration={0}
              />
            ))}
            <ChartLegend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              content={(legendProps) => (
                <ChartLegendContent
                  nameKey="dataKey"
                  payload={legendProps.payload ? [...legendProps.payload] : undefined}
                  verticalAlign={legendProps.verticalAlign === "middle" ? "bottom" : legendProps.verticalAlign as "top" | "bottom"}
                />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }
);
BarChartComponent.displayName = 'BarChartComponent';

const LineChartComponent = React.memo<{ data: ChartDataItem[]; chartKey: string }>(({ data, chartKey }) => {
  const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
  
  return (
    <ChartContainer config={chartConfig} className="h-96 w-full" key={`line-${chartKey}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={memoizedData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          key={`linechart-${chartKey}`}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} />
          <ChartTooltip
            cursor={{ stroke: '#8884d8', strokeWidth: 2 }}
            content={<ChartTooltipContent indicator="line" labelKey="name" nameKey="dataKey" />}
          />
          {(['paid', 'promised', 'no_info'] as const).map(key => (
            <Line
              key={`${key}-${chartKey}`}
              type="monotone"
              dataKey={key}
              stroke={chartConfig[key].color}
              strokeWidth={3}
              dot={{ r: 6, fill: chartConfig[key].color }}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
              animationDuration={0}
            />
          ))}
          <ChartLegend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            content={(legendProps) => (
              <ChartLegendContent
                nameKey="dataKey"
                payload={legendProps.payload ? [...legendProps.payload] : undefined}
                verticalAlign={legendProps.verticalAlign === "middle" ? "bottom" : legendProps.verticalAlign as "top" | "bottom"}
              />
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});
LineChartComponent.displayName = 'LineChartComponent';

const RadialBarChartComponent = React.memo<{ data: PieDataItem[]; onChartClick: any; chartKey: string }>(
  ({ data, onChartClick, chartKey }) => {
    const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
    
    return (
      <ChartContainer config={chartConfig} className="h-96 w-full" key={`radial-${chartKey}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="10%"
            outerRadius="80%"
            barSize={10}
            data={memoizedData}
            key={`radialchart-${chartKey}`}
          >
            <RadialBar
              label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
              background
              dataKey="value"
              onClick={(d) => onChartClick(d, d.name)}
              isAnimationActive={false}
              animationDuration={0}
            >
              {memoizedData.map((entry, index) => (
                <Cell key={`cell-${index}-${chartKey}`} fill={entry.fill} />
              ))}
            </RadialBar>
            <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
            <ChartLegend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              content={(props) => (
                <ChartLegendContent
                  nameKey="name"
                  payload={props.payload ? [...props.payload] : undefined}
                  verticalAlign={props.verticalAlign === "middle" ? "bottom" : props.verticalAlign as "top" | "bottom"}
                />
              )}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }
);
RadialBarChartComponent.displayName = 'RadialBarChartComponent';

// Separate chart type selector to prevent state update conflicts
const ChartTypeSelector = React.memo<{ 
  value: string; 
  onChange: (value: string) => void; 
}>(({ value, onChange }) => {
  return (
    <SimpleSelect
      value={value}
      onChange={onChange}
      options={[
        { value: 'bar', label: 'Biểu đồ cột' },
        { value: 'line', label: 'Biểu đồ đường' },
        { value: 'radial', label: 'Biểu đồ thanh tròn' },
      ]}
      className="w-40"
    />
  );
});
ChartTypeSelector.displayName = 'ChartTypeSelector';

const ChartSection: React.FC<ChartSectionProps> = ({
  chartType,
  setChartType,
  chartData,
  pieData,
  onChartClick,
  loading = false,
  error = null,
}) => {
  // Create stable chart key
  const chartKey = useMemo(() => 
    `${chartType}-${Date.now()}`, 
    [chartType]
  );
  
  // Memoize data to prevent unnecessary re-renders
  const memoizedChartData = useMemo(() => chartData, [JSON.stringify(chartData)]);
  const memoizedPieData = useMemo(() => pieData, [JSON.stringify(pieData)]);
  
  const handleChartTypeChange = useCallback(
    (t: string) => {
      if (t === 'bar' || t === 'line' || t === 'radial') {
        setChartType(t);
      }
    },
    [setChartType]
  );

  const content = useMemo(() => {
    if (loading) return <div className="flex items-center justify-center h-96 w-full">Đang tải...</div>;
    if (error) return <div className="flex items-center justify-center h-96 w-full text-red-500">{error}</div>;
    
    // Return chart content based on chartType without Tabs to avoid conflict
    switch (chartType) {
      case 'bar':
        return <BarChartComponent data={memoizedChartData} onChartClick={onChartClick} chartKey={chartKey} />;
      case 'line':
        return <LineChartComponent data={memoizedChartData} chartKey={chartKey} />;
      case 'radial':
        return <RadialBarChartComponent data={memoizedPieData} onChartClick={onChartClick} chartKey={chartKey} />;
      default:
        return <BarChartComponent data={memoizedChartData} onChartClick={onChartClick} chartKey={chartKey} />;
    }
  }, [chartType, memoizedChartData, memoizedPieData, onChartClick, loading, error, chartKey]);

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <div>
          <CardTitle>Biểu đồ thống kê công nợ</CardTitle>
          <CardDescription>Theo dõi tình hình công nợ qua các khoảng thời gian</CardDescription>
        </div>
        <ChartTypeSelector value={chartType} onChange={handleChartTypeChange} />
      </CardHeader>
      <CardContent className="px-0 flex items-center justify-center">{content}</CardContent>
    </Card>
  );
};

export default React.memo(ChartSection);