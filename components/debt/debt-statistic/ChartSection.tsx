'use client';

import React, { useMemo, useCallback, useState } from 'react';
import {
  Bar, BarChart, Line, LineChart,
  CartesianGrid, XAxis, YAxis, ResponsiveContainer
} from 'recharts';
import {
  ChartConfig, ChartContainer, ChartTooltip
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SimpleSelect from './SimpleSelect';
import SmartTooltip from '@/components/ui/charts/SmartTooltip';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Users,
  Sparkles,
  RotateCcw
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
  chartType: 'bar' | 'line';
  setChartType: (type: 'bar' | 'line') => void;
  chartData: ChartDataItem[];
  pieData: PieDataItem[];
  onChartClick: (data: unknown, category: string) => void;
  loading?: boolean;
  error?: string | null;
}

const BarChartComponent = React.memo<{ data: ChartDataItem[]; onChartClick: any; chartKey: string; activeFilters: string[] }>(
  ({ data, onChartClick, chartKey, activeFilters }) => {
    const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
    
    return (
      <div className="w-full h-full relative">
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
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              key={`barchart-${chartKey}`}
            >
              <defs>
                {activeFilters.map((key) => (
                  <linearGradient key={`gradient-${key}`} id={`gradient${key.charAt(0).toUpperCase() + key.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartConfig[key as keyof typeof chartConfig].color} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={chartConfig[key as keyof typeof chartConfig].color} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid 
                strokeDasharray="8 8" 
                vertical={false} 
                stroke="rgba(16, 185, 129, 0.2)"
                strokeWidth={2}
              />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                content={<SmartTooltip title="💰 Chi tiết công nợ" />} 
                wrapperStyle={{ visibility:'visible' }}
              />
              {activeFilters.map((key) => (
                <Bar
                  key={`${key}-${chartKey}`}
                  dataKey={key}
                  fill={`url(#gradient${key.charAt(0).toUpperCase() + key.slice(1)})`}
                  radius={[8, 8, 0, 0]}
                  onClick={(d, index) => {
                    const fullRowData = memoizedData[index];
                    onChartClick(fullRowData, key);
                  }}
                  className="cursor-pointer transition-all duration-300"
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
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

type LineChartProps = {
  data: ChartDataItem[];
  chartKey: string;
  activeFilters: string[];
  onChartClick: (data: unknown, category: string) => void;
};

const LineChartComponent = React.memo(({
  data,
  chartKey,
  activeFilters,
  onChartClick,
}: LineChartProps) => {
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
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            key={`linechart-${chartKey}`}
          >
            <defs>
              {activeFilters.map((key) => (
                <React.Fragment key={`line-defs-${key}`}>
                  <linearGradient 
                    id={`lineGradient${key.charAt(0).toUpperCase() + key.slice(1)}`} 
                    x1="0%" y1="0%" x2="100%" y2="0%"
                  >
                    <stop offset="0%" stopColor={chartConfig[key as keyof typeof chartConfig].color} stopOpacity={0.8} />
                    <stop offset="50%" stopColor={chartConfig[key as keyof typeof chartConfig].color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={chartConfig[key as keyof typeof chartConfig].color} stopOpacity={0.6} />
                  </linearGradient>
                  
                  <filter id={`activeDotGlow${key.charAt(0).toUpperCase() + key.slice(1)}`}>
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </React.Fragment>
              ))}
            </defs>
            
            <CartesianGrid 
              strokeDasharray="8 8" 
              vertical={false}
              stroke="rgba(96, 165, 250, 0.2)"
              strokeWidth={2}
            />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
            />
            <ChartTooltip
              cursor={{ 
                stroke: '#60A5FA', 
                strokeWidth: 2, 
                strokeOpacity: 0.3, 
                strokeDasharray: '5 5' 
              }}
              content={<SmartTooltip title="📈 Chi tiết công nợ" />} 
              wrapperStyle={{ visibility:'visible' }}
            />
            {activeFilters.map((key, index) => (
              <Line
                key={`${key}-${chartKey}`}
                type="monotone"
                dataKey={key}
                stroke={`url(#lineGradient${key.charAt(0).toUpperCase() + key.slice(1)})`}
                strokeWidth={4}
                dot={false}
                activeDot={(props: any) => {
                  // use the cx/cy and payload provided by Recharts to ensure the dot is positioned exactly on the path
                  const { cx, cy, payload } = props || {};
                  return (
                    <g onClick={() => onChartClick && onChartClick(payload, key)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        stroke="#fff"
                        strokeWidth={3}
                        fill={chartConfig[key as keyof typeof chartConfig].color}
                        filter={`url(#activeDotGlow${key.charAt(0).toUpperCase() + key.slice(1)})`}
                        style={{ opacity: 0.95 }}
                      />
                    </g>
                  );
                }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={2000}
                animationEasing="ease-in-out"
                animationBegin={index * 300}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});
LineChartComponent.displayName = 'LineChartComponent';

const ChartTypeSelector = React.memo<{ 
  value: string; 
  onChange: (value: string) => void; 
}>(({ value, onChange }) => {
  return (
    <div className="relative">
      <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-2xl blur opacity-30 animate-pulse"></div>
      
      <div className="relative bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm rounded-2xl p-1 border border-white/50 shadow-xl">
        <div className="flex rounded-xl overflow-hidden">
          <button
            onClick={() => onChange('bar')}
            className={`
              flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all duration-300 transform
              ${value === 'bar' 
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg scale-105' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }
            `}
          >
            <BarChart3 className="h-4 w-4" />
            Biểu đồ cột
          </button>
          
          <button
            onClick={() => onChange('line')}
            className={`
              flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all duration-300 transform
              ${value === 'line' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }
            `}
          >
            <TrendingUp className="h-4 w-4" />
            Biểu đồ đường
          </button>
        </div>
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
  const [activeFilters, setActiveFilters] = useState<string[]>(['paid', 'promised', 'no_info']);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);

  const filteredChartData = useMemo(() => {
    return chartData.map(item => {
      const filteredItem: any = { name: item.name };
      
      if (activeFilters.includes('paid')) filteredItem.paid = item.paid;
      if (activeFilters.includes('promised')) filteredItem.promised = item.promised;
      if (activeFilters.includes('no_info')) filteredItem.no_info = item.no_info;
      
      return filteredItem;
    });
  }, [chartData, activeFilters]);

  const handleFilterClick = (filterKey: string) => {
    setActiveFilters(prev => {
      if (prev.includes(filterKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(f => f !== filterKey);
      } else {
        return [...prev, filterKey];
      }
    });
  };

  const getColorScheme = (key: string) => {
    const schemes = {
      'paid': {
        primary: '#10B981',
        secondary: '#059669',
        gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #3B82F6 100%)',
      },
      'promised': {
        primary: '#60A5FA',
        secondary: '#3B82F6',
        gradient: 'linear-gradient(135deg, #60A5FA 0%, #8B5CF6 50%, #A855F7 100%)',
      },
      'no_info': {
        primary: '#D1D5DB',
        secondary: '#9CA3AF',
        gradient: 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
      }
    };
    return schemes[key as keyof typeof schemes];
  };

  const getIconForFilter = (key: string) => {
    const icons = {
      'paid': <CheckCircle2 className="h-3 w-3" />,
      'promised': <Clock className="h-3 w-3" />,
      'no_info': <AlertCircle className="h-3 w-3" />
    };
    return icons[key as keyof typeof icons];
  };

  const getLabelText = (key: string) => {
    return chartConfig[key as keyof typeof chartConfig]?.label || key;
  };

  const chartKey = useMemo(() => 
    `${chartType}-${activeFilters.join('-')}-${Date.now()}`, 
    [chartType, activeFilters]
  );
  
  const handleChartTypeChange = useCallback(
    (t: string) => {
      if (t === 'bar' || t === 'line') {
        setChartType(t);
      }
    },
    [setChartType]
  );

  const getCurrentChartIcon = () => {
    switch (chartType) {
      case 'bar': return <BarChart3 className="h-8 w-8 text-white drop-shadow-lg" />;
      case 'line': return <TrendingUp className="h-8 w-8 text-white drop-shadow-lg" />;
      default: return <BarChart3 className="h-8 w-8 text-white drop-shadow-lg" />;
    }
  };

  if (loading) {
    return (
      <Card className="overflow-hidden relative min-h-[500px] rounded-3xl">
        <div 
          className="absolute inset-0 opacity-60 rounded-3xl"
          style={{
            background: 'linear-gradient(-45deg, #10b981, #60A5FA, #D1D5DB, #8B5CF6)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 15s ease infinite'
          }}
        />
        
        <div className="absolute inset-0 backdrop-blur-3xl bg-white/10 border border-white/20 rounded-3xl" />
        
        <CardContent className="flex flex-col items-center justify-center h-[500px] relative z-10">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 blur-lg opacity-70 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 animate-spin">
                <div className="absolute inset-2 rounded-full bg-white/20 backdrop-blur-sm" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-400 to-green-400 animate-pulse" />
              </div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white animate-pulse" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Đang phân tích công nợ
            </h3>
            <p className="text-white/80 text-lg drop-shadow-md">
              Chuẩn bị báo cáo chi tiết...
            </p>
          </div>
        </CardContent>
        
        <style jsx>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
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
        return <BarChartComponent data={filteredChartData} onChartClick={onChartClick} chartKey={chartKey} activeFilters={activeFilters} />;
      case 'line':
        return <LineChartComponent data={filteredChartData} chartKey={chartKey} activeFilters={activeFilters} onChartClick={onChartClick} />;
      default:
        return <BarChartComponent data={filteredChartData} onChartClick={onChartClick} chartKey={chartKey} activeFilters={activeFilters} />;
    }
  }, [chartType, filteredChartData, onChartClick, error, chartKey, activeFilters]);

  return (
    <Card className="overflow-hidden relative shadow-2xl border-0 bg-white rounded-3xl">
      <div 
        className="absolute inset-0 opacity-30 rounded-3xl"
        style={{
          background: 'linear-gradient(-45deg, #10b981, #60A5FA, #D1D5DB, #8B5CF6)',
          backgroundSize: '400% 400%',
          animation: 'gradientFlow 20s ease infinite'
        }}
      />
      
      <div className="absolute inset-0 backdrop-blur-3xl bg-white/80 rounded-3xl" />
      
      <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-green-400/20 rounded-full blur-2xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse delay-2000" />
      
      <CardHeader className="relative z-10 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 rounded-3xl blur-lg opacity-60 animate-pulse" />
              <div className="relative p-4 rounded-3xl bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 shadow-2xl transform rotate-1 hover:rotate-0 transition-all duration-500 hover:scale-105">
                {getCurrentChartIcon()}
              </div>
            </div>
            
            <div>
              <CardTitle className="text-3xl font-black mb-3">
                <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                  Debt Analytics
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 flex items-center gap-3 text-lg font-medium">
                <Users className="h-5 w-5 text-green-500" />
                Thống kê công nợ theo trạng thái thanh toán
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-md opacity-60" />
              <div className="relative flex items-center gap-3 bg-gradient-to-r from-green-50 to-blue-50 px-6 py-3 rounded-full border border-white/50 shadow-xl backdrop-blur-sm">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse shadow-lg" />
                <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  {activeFilters.length}/3 ACTIVE
                </span>
              </div>
            </div>
            
            <ChartTypeSelector value={chartType} onChange={handleChartTypeChange} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 relative z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/20 rounded-[24px] backdrop-blur-sm border border-white/30 shadow-2xl" />
          
          <div className="relative h-80 w-full p-6">
            {content}
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-4 bg-white/60 backdrop-blur-sm rounded-[20px] border border-white/30 shadow-lg">
            
            <div className="flex flex-wrap items-center justify-center gap-6">
              {(['paid', 'promised', 'no_info'] as const).map((key) => {
                const isActive = activeFilters.includes(key);
                const isHovered = hoveredLegend === key;
                const scheme = getColorScheme(key);
                const icon = getIconForFilter(key);
                
                return (
                  <button
                    key={key}
                    onClick={() => handleFilterClick(key)}
                    onMouseEnter={() => setHoveredLegend(key)}
                    onMouseLeave={() => setHoveredLegend(null)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 
                      hover:bg-white/50 hover:shadow-md transform hover:-translate-y-0.5
                      ${isActive ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}
                    `}
                  >
                    <div className={`
                      transition-all duration-200
                      ${isActive ? 'text-gray-700' : 'text-gray-400'}
                    `}>
                      {icon}
                    </div>
                    
                    <div 
                      className={`
                        w-4 h-4 rounded-md border-2 transition-all duration-200
                        ${isActive ? 'shadow-md scale-110' : 'opacity-50'}
                      `}
                      style={{ 
                        background: scheme?.gradient,
                        borderColor: isActive ? scheme?.primary : '#d1d5db'
                      }}
                    />
                    
                    <span className={`
                      text-sm font-medium transition-all duration-200
                      ${isActive ? 'text-gray-800' : 'text-gray-400'}
                    `}>
                      {getLabelText(key)}
                    </span>
                    
                    <div className={`
                      w-2 h-2 rounded-full transition-all duration-200
                      ${isActive ? 'bg-green-500 shadow-md' : 'bg-gray-300'}
                    `} />
                  </button>
                );
              })}
            </div>
            
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveFilters(['paid', 'promised', 'no_info'])}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 rounded-xl transition-all duration-200 hover:shadow-md"
              >
                <CheckCircle2 className="h-3 w-3" />
                Tất cả
              </button>
              
              <button
                onClick={() => setActiveFilters(['paid'])}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-xl transition-all duration-200 hover:shadow-md"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </CardContent>
      
      <style jsx>{`
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </Card>
  );
};

export default React.memo(ChartSection);
