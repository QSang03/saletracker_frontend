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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

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

const BarChartComponent = React.memo<{ data: ChartDataItem[]; onChartClick: any }>(
  ({ data, onChartClick }) => (
    <ChartContainer config={chartConfig} className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} />
          <ChartTooltip
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            content={<ChartTooltipContent indicator="line" labelKey="name" nameKey="dataKey" />}
          />
          {(['paid', 'promised', 'no_info'] as const).map(key => (
            <Bar
              key={key}
              dataKey={key}
              fill={chartConfig[key].color}
              radius={[4, 4, 0, 0]}
              onClick={(d) => onChartClick(d, key)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          ))}
          <ChartLegend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            content={(legendProps) => (
              <ChartLegendContent
                nameKey="dataKey"
                payload={legendProps.payload}
                verticalAlign={legendProps.verticalAlign}
              />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
);
BarChartComponent.displayName = 'BarChartComponent';

const LineChartComponent = React.memo<{ data: ChartDataItem[] }>(({ data }) => (
  <ChartContainer config={chartConfig} className="h-96 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <ChartTooltip
          cursor={{ stroke: '#8884d8', strokeWidth: 2 }}
          content={<ChartTooltipContent indicator="line" labelKey="name" nameKey="dataKey" />}
        />
        {(['paid', 'promised', 'no_info'] as const).map(key => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={chartConfig[key].color}
            strokeWidth={3}
            dot={{ r: 6, fill: chartConfig[key].color }}
            activeDot={{ r: 8 }}
          />
        ))}
        <ChartLegend
          layout="horizontal"
          align="center"
          verticalAlign="bottom"
          content={(legendProps) => (
            <ChartLegendContent
              nameKey="dataKey"
              payload={legendProps.payload}
              verticalAlign={legendProps.verticalAlign}
            />
          )}
        />
      </LineChart>
    </ResponsiveContainer>
  </ChartContainer>
));
LineChartComponent.displayName = 'LineChartComponent';

const RadialBarChartComponent = React.memo<{ data: PieDataItem[]; onChartClick: any }>(
  ({ data, onChartClick }) => (
    <ChartContainer config={chartConfig} className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="10%"
          outerRadius="80%"
          barSize={10}
          data={data}
        >
          <RadialBar
            label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
            background
            dataKey="value"
            onClick={(d) => onChartClick(d, d.name)}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
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
                payload={props.payload}
                verticalAlign={props.verticalAlign}
              />
            )}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
);
RadialBarChartComponent.displayName = 'RadialBarChartComponent';

const ChartSection: React.FC<ChartSectionProps> = ({
  chartType,
  setChartType,
  chartData,
  pieData,
  onChartClick,
  loading = false,
  error = null,
}) => {
  const handleChartTypeChange = useCallback(
    (t: string) => {
      if (t === 'bar' || t === 'line' || t === 'radial') {
        setChartType(t);
      }
    },
    [setChartType]
  );

  const content = useMemo(() => {
    if (loading) return <div className="flex items-center justify-center h-96">Đang tải...</div>;
    if (error) return <div className="flex items-center justify-center h-96 text-red-500">{error}</div>;
    return (
      <Tabs value={chartType} onValueChange={handleChartTypeChange} className="w-[90%]">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="bar">Biểu đồ cột</TabsTrigger>
          <TabsTrigger value="line">Biểu đồ đường</TabsTrigger>
          <TabsTrigger value="radial">Biểu đồ thanh tròn</TabsTrigger>
        </TabsList>
        <TabsContent value="bar">
          <BarChartComponent data={chartData} onChartClick={onChartClick} />
        </TabsContent>
        <TabsContent value="line">
          <LineChartComponent data={chartData} />
        </TabsContent>
        <TabsContent value="radial">
          <RadialBarChartComponent data={pieData} onChartClick={onChartClick} />
        </TabsContent>
      </Tabs>
    );
  }, [chartType, chartData, pieData, onChartClick, loading, error, handleChartTypeChange]);

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <div>
          <CardTitle>Biểu đồ thống kê công nợ</CardTitle>
          <CardDescription>Theo dõi tình hình công nợ qua các khoảng thời gian</CardDescription>
        </div>
        <Select value={chartType} onValueChange={handleChartTypeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">Biểu đồ cột</SelectItem>
            <SelectItem value="line">Biểu đồ đường</SelectItem>
            <SelectItem value="radial">Biểu đồ thanh tròn</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-0">{content}</CardContent>
    </Card>
  );
};

export default React.memo(ChartSection);