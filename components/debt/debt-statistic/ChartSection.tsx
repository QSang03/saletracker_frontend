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
import SmartTooltip from '@/components/ui/charts/SmartTooltip';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Zap,
  Database,
  DollarSign
} from 'lucide-react';

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
      <div className="w-full h-full relative">
        {/* Chart background with subtle pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(16, 185, 129, 0.15) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <ChartContainer config={chartConfig} className="h-full w-full relative z-10" key={`bar-${chartKey}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={memoizedData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              key={`barchart-${chartKey}`}
            >
              <defs>
                <linearGradient id="gradientPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="gradientPromised" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="gradientNoInfo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D1D5DB" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#D1D5DB" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#e2e8f0"
                strokeOpacity={0.6}
              />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                fontSize={12}
                tick={{ fill: '#64748b', fontWeight: 500 }}
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
              />
              <YAxis 
                tickLine={false} 
                fontSize={12}
                tick={{ fill: '#64748b', fontWeight: 500 }}
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                content={<SmartTooltip title="Chi tiết công nợ" />} 
                wrapperStyle={{ visibility:'visible' }}
              />
              {(['paid', 'promised', 'no_info'] as const).map(key => (
                <Bar
                  key={`${key}-${chartKey}`}
                  dataKey={key}
                  fill={
                    key === 'paid' ? 'url(#gradientPaid)' :
                    key === 'promised' ? 'url(#gradientPromised)' :
                    'url(#gradientNoInfo)'
                  }
                  radius={[6, 6, 0, 0]}
                  onClick={(d, index) => {
                    const fullRowData = memoizedData[index];
                    onChartClick(fullRowData, key);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-all duration-200"
                  isAnimationActive={true}
                  animationDuration={300}
                />
              ))}
              
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }
);
BarChartComponent.displayName = 'BarChartComponent';

const LineChartComponent = React.memo<{ data: ChartDataItem[]; chartKey: string }>(({ data, chartKey }) => {
  const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
  
  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(96, 165, 250, 0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      <ChartContainer config={chartConfig} className="h-full w-full relative z-10" key={`line-${chartKey}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={memoizedData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            key={`linechart-${chartKey}`}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.6}
            />
            <XAxis 
              dataKey="name" 
              tickLine={false} 
              
              fontSize={12}
              tick={{ fill: '#64748b', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
            />
            <YAxis 
              tickLine={false} 
               
              fontSize={12}
              tick={{ fill: '#64748b', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
            />
            <ChartTooltip
              cursor={{ stroke: '#60A5FA', strokeWidth: 2, strokeOpacity: 0.5 }}
              content={<SmartTooltip title="Chi tiết công nợ" />} 
              wrapperStyle={{ visibility:'visible' }}
            />
            {(['paid', 'promised', 'no_info'] as const).map(key => (
              <Line
                key={`${key}-${chartKey}`}
                type="monotone"
                dataKey={key}
                stroke={chartConfig[key].color}
                strokeWidth={4}
                dot={{ 
                  r: 6, 
                  fill: chartConfig[key].color,
                  strokeWidth: 2,
                  stroke: '#fff'
                }}
                activeDot={{ 
                  r: 8,
                  strokeWidth: 3,
                  stroke: '#fff',
                  fill: chartConfig[key].color
                }}
                isAnimationActive={true}
                animationDuration={300}
              />
            ))}
            
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});
LineChartComponent.displayName = 'LineChartComponent';

const RadialBarChartComponent = React.memo<{ data: PieDataItem[]; onChartClick: any; chartKey: string }>(
  ({ data, onChartClick, chartKey }) => {
    const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
    
    return (
      <div className="w-full h-full relative">
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-80 h-80 rounded-full border-4 border-dashed border-blue-200"></div>
          </div>
        </div>
        
        <ChartContainer config={chartConfig} className="h-full w-full relative z-10" key={`radial-${chartKey}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="15%"
              outerRadius="75%"
              barSize={15}
              data={memoizedData}
              key={`radialchart-${chartKey}`}
            >
              <RadialBar
                label={{ position: 'insideStart', fill: '#fff', fontSize: 12, fontWeight: 600 }}
                background={{ fill: '#f8fafc', opacity: 0.3 }}
                dataKey="value"
                onClick={(d) => onChartClick(d, d.name)}
                isAnimationActive={true}
                animationDuration={300}
                className="cursor-pointer hover:opacity-80 transition-all duration-200"
              >
                {memoizedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}-${chartKey}`} 
                    fill={entry.fill}
                    style={{
                      filter: `drop-shadow(0 4px 8px ${entry.fill}40)`
                    }}
                  />
                ))}
              </RadialBar>
              <ChartTooltip 
                content={<SmartTooltip title="Chi tiết công nợ" />} 
                wrapperStyle={{ visibility:'visible' }} 
              />
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
      </div>
    );
  }
);
RadialBarChartComponent.displayName = 'RadialBarChartComponent';

const ChartTypeSelector = React.memo<{ 
  value: string; 
  onChange: (value: string) => void; 
}>(({ value, onChange }) => {
  return (
    <div className="relative">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-25"></div>
      <div className="relative">
        <SimpleSelect
          value={value}
          onChange={onChange}
          options={[
            { value: 'bar', label: '📊 Biểu đồ cột' },
            { value: 'line', label: '📈 Biểu đồ đường' },
          ]}
          className="w-48 bg-white border-2 border-gray-200 hover:border-blue-300 transition-colors font-medium"
        />
      </div>
    </div>
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
  const chartKey = useMemo(() => 
    `${chartType}-${Date.now()}`, 
    [chartType]
  );
  
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

  const getCurrentChartIcon = () => {
    switch (chartType) {
      case 'bar': return <BarChart3 className="h-6 w-6 text-white" />;
      case 'line': return <TrendingUp className="h-6 w-6 text-white" />;
      case 'radial': return <PieChart className="h-6 w-6 text-white" />;
      default: return <BarChart3 className="h-6 w-6 text-white" />;
    }
  };

  // Enhanced loading state giống các charts khác
  if (loading) {
    return (
      <Card className="overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
        <CardHeader className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Biểu đồ thống kê công nợ
              </CardTitle>
              <CardDescription className="text-gray-600">
                Theo dõi tình hình công nợ qua các khoảng thời gian
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80 relative z-10">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-border mx-auto"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-transparent absolute inset-0 mx-auto" 
                   style={{
                     background: 'conic-gradient(from 0deg, transparent, rgba(59, 130, 246, 0.8))',
                     borderRadius: '50%'
                   }}>
              </div>
            </div>
            <p className="mt-4 text-gray-700 font-medium">Đang tải dữ liệu...</p>
            <p className="text-sm text-gray-500 mt-1">Vui lòng chờ trong giây lát</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = useMemo(() => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 font-medium text-lg mb-2">Có lỗi xảy ra</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      );
    }
    
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
  }, [chartType, memoizedChartData, memoizedPieData, onChartClick, error, chartKey]);

  return (
    <Card className="overflow-hidden relative shadow-2xl border-0 bg-white">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30 pointer-events-none"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-100/40 to-transparent rounded-full blur-2xl"></div>
      
      <CardHeader className="relative z-10 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              {getCurrentChartIcon()}
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                Biểu đồ thống kê công nợ
              </CardTitle>
              <CardDescription className="text-gray-600 flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Theo dõi tình hình công nợ qua các khoảng thời gian
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full border border-blue-200">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Interactive</span>
            </div>
            <ChartTypeSelector value={chartType} onChange={handleChartTypeChange} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 flex items-center justify-center relative z-10">
        <div className="h-80 w-full relative">
          <div className="absolute inset-0 opacity-5">
            <div className="h-full w-full" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.15) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          {content}
        </div>
      </CardContent>
      
      {/* Enhanced Legend */}
      <div className="px-6 pb-6 relative z-10">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold text-sm">Trạng thái công nợ</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex gap-6 flex-wrap justify-center">
              <div className="flex items-center group cursor-pointer hover:scale-105 transition-transform duration-200">
                <div 
                  className="w-4 h-4 rounded-full mr-3 shadow-lg ring-2 ring-white ring-opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: `0 4px 12px #10B98140`
                  }}
                />
                <CheckCircle2 className="h-3 w-3 text-gray-500 group-hover:text-gray-700 transition-colors mr-1" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Đã thanh toán
                </span>
              </div>
              <div className="flex items-center group cursor-pointer hover:scale-105 transition-transform duration-200">
                <div 
                  className="w-4 h-4 rounded-full mr-3 shadow-lg ring-2 ring-white ring-opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
                    boxShadow: `0 4px 12px #60A5FA40`
                  }}
                />
                <Clock className="h-3 w-3 text-gray-500 group-hover:text-gray-700 transition-colors mr-1" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Khách hẹn trả
                </span>
              </div>
              <div className="flex items-center group cursor-pointer hover:scale-105 transition-transform duration-200">
                <div 
                  className="w-4 h-4 rounded-full mr-3 shadow-lg ring-2 ring-white ring-opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
                    boxShadow: `0 4px 12px #D1D5DB40`
                  }}
                />
                <AlertCircle className="h-3 w-3 text-gray-500 group-hover:text-gray-700 transition-colors mr-1" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Chưa có thông tin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default React.memo(ChartSection);
