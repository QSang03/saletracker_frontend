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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SmartTooltip from '@/components/ui/charts/SmartTooltip';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Users,
  Sparkles,
  RotateCcw,
  X
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

const BarChartComponent = React.memo<{ 
  data: ChartDataItem[]; 
  onChartClick: any; 
  chartKey: string; 
  activeFilters: string[] 
}>(({ data, onChartClick, chartKey, activeFilters }) => {
  const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
  
  // ✅ State để track hovered bar cụ thể
  const [hoveredBar, setHoveredBar] = useState<{ index: number; dataKey: string } | null>(null);
  
  // ✅ Custom bar component với hover logic
  const CustomBar = useCallback(({ x, y, width, height, index, dataKey, ...props }: any) => {
    const isHovered = hoveredBar?.index === index && hoveredBar?.dataKey === dataKey;
    const color = chartConfig[dataKey as keyof typeof chartConfig]?.color || '#10B981';
    
    const handleMouseEnter = () => {
      setHoveredBar({ index, dataKey });
    };
    
    const handleMouseLeave = () => {
      setHoveredBar(null);
    };
    
    const handleClick = () => {
      const fullRowData = memoizedData[index];
      onChartClick(fullRowData, dataKey);
    };
    
    return (
      <g>
        {/* ✅ Background bar với opacity thấp */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          opacity={0.1}
          rx={8}
          ry={8}
        />
        
        {/* ✅ Main bar với gradient */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#gradient${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)})`}
          rx={8}
          ry={8}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="cursor-pointer transition-all duration-300"
          style={{
            filter: isHovered 
              ? `drop-shadow(0 0 12px ${color}) brightness(1.2)` 
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            transformOrigin: 'bottom center',
            transition: 'all 0.3s ease-in-out'
          }}
        />
        
        {/* ✅ Highlight border khi hover */}
        {isHovered && (
          <rect
            x={x - 2}
            y={y - 2}
            width={width + 4}
            height={height + 4}
            fill="none"
            stroke={color}
            strokeWidth={3}
            opacity={0.8}
            rx={10}
            ry={10}
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        )}
      </g>
    );
  }, [hoveredBar, memoizedData, onChartClick]);
  
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
                shape={CustomBar}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
});
BarChartComponent.displayName = 'BarChartComponent';

const LineChartComponent = React.memo<{ 
  data: ChartDataItem[]; 
  chartKey: string; 
  activeFilters: string[];
  onDotClick: (payload: any, dataKey: string) => void;
}>(({ data, chartKey, activeFilters, onDotClick }) => {
  const memoizedData = useMemo(() => data, [JSON.stringify(data)]);
  
  // ✅ State để track active index
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // ✅ Optimized mouse handlers - chỉ update khi thay đổi
  const handleMouseMove = useCallback((state: any) => {
    if (state?.isTooltipActive && typeof state.activeTooltipIndex === 'number') {
      // ✅ CHỈ update khi activeIndex thực sự thay đổi
      if (state.activeTooltipIndex !== activeIndex) {
        setActiveIndex(state.activeTooltipIndex);
      }
    } else if (activeIndex !== null) {
      // ✅ CHỈ set null khi cần thiết
      setActiveIndex(null);
    }
  }, [activeIndex]); // ✅ Dependency để tránh stale closure

  const handleMouseLeave = useCallback(() => {
    if (activeIndex !== null) {
      setActiveIndex(null);
    }
  }, [activeIndex]);

  // ✅ Progressive Dot Component - chỉ hiện dots đến điểm active
  const CustomDot = useCallback(({ cx, cy, payload, dataKey, index }: any) => {
    if (!cx || !cy || !payload) {
      return <circle cx={0} cy={0} r={0} style={{ display: 'none' }} />;
    }
    
    // ✅ Progressive logic: chỉ hiện dots có index <= activeIndex
    if (activeIndex === null || index > activeIndex) {
      return <circle cx={0} cy={0} r={0} style={{ display: 'none' }} />;
    }
    
    const isCurrentActive = index === activeIndex;
    const color = chartConfig[dataKey as keyof typeof chartConfig]?.color || '#10B981';
    
    const handleClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      onDotClick(payload, dataKey);
    };

    return (
      <circle
        cx={cx}
        cy={cy}
        r={isCurrentActive ? 6 : 4} // ✅ Active dot lớn hơn
        fill={isCurrentActive ? color : '#fff'} 
        stroke={isCurrentActive ? '#fff' : color} 
        strokeWidth={isCurrentActive ? 3 : 2}
        onClick={handleClick}
        className="cursor-pointer transition-all duration-200"
        style={{
          filter: isCurrentActive 
            ? `drop-shadow(0 0 8px ${color})` 
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
          transformOrigin: 'center',
          // ✅ Smooth transition giữa states
          transform: isCurrentActive ? 'scale(1.1)' : 'scale(1)',
        }}
      />
    );
  }, [activeIndex, onDotClick]);
  
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
            // ✅ Optimized event handlers
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
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
                // ✅ Progressive dots với optimized rendering
                dot={CustomDot}
                activeDot={false} // ✅ Tắt activeDot để tránh conflict
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

const ChartDetailModal = React.memo<{
  isOpen: boolean;
  onClose: () => void;
  data: any;
  category: string;
}>(({ isOpen, onClose, data, category }) => {
  const getCategoryLabel = (cat: string) => {
    return chartConfig[cat as keyof typeof chartConfig]?.label || cat;
  };

  const getCategoryIcon = (cat: string) => {
    const icons = {
      'paid': <CheckCircle2 className="h-5 w-5 text-green-500" />,
      'promised': <Clock className="h-5 w-5 text-blue-500" />,
      'no_info': <AlertCircle className="h-5 w-5 text-gray-500" />
    };
    return icons[cat as keyof typeof icons];
  };

  const getCategoryColor = (cat: string) => {
    return chartConfig[cat as keyof typeof chartConfig]?.color || '#10B981';
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border-0">
        <div 
          className="absolute inset-0 opacity-10 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${getCategoryColor(category)}20 0%, ${getCategoryColor(category)}10 100%)`
          }}
        />
        
        <DialogHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: `${getCategoryColor(category)}20` }}
              >
                {getCategoryIcon(category)}
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Chi tiết dữ liệu
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 relative z-10">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(category) }}></div>
              <span className="font-semibold text-gray-700">{getCategoryLabel(category)}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: getCategoryColor(category) }}>
              {data[category]?.toLocaleString() || 0}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white rounded-lg border p-3">
              <div className="text-sm text-gray-500 mb-1">Thời gian</div>
              <div className="font-semibold text-gray-900">{data.name}</div>
            </div>
            
            <div className="bg-white rounded-lg border p-3">
              <div className="text-sm text-gray-500 mb-1">Tổng quan</div>
              <div className="space-y-2">
                {Object.entries(chartConfig).map(([key, config]) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{config.label}:</span>
                    <span 
                      className="font-semibold"
                      style={{ color: config.color }}
                    >
                      {data[key]?.toLocaleString() || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
ChartDetailModal.displayName = 'ChartDetailModal';

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
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalCategory, setModalCategory] = useState<string>('');

  const filteredChartData = useMemo(() => {
    return chartData.map(item => {
      const filteredItem: any = { name: item.name };
      
      if (activeFilters.includes('paid')) filteredItem.paid = item.paid;
      if (activeFilters.includes('promised')) filteredItem.promised = item.promised;
      if (activeFilters.includes('no_info')) filteredItem.no_info = item.no_info;
      
      return filteredItem;
    });
  }, [chartData, activeFilters]);

  const handleDotClick = useCallback((payload: any, dataKey: string) => {
    setModalData(payload);
    setModalCategory(dataKey);
    setModalOpen(true);
  }, []);

  const handleBarClick = useCallback((data: any, category: string) => {
    setModalData(data);
    setModalCategory(category);
    setModalOpen(true);
  }, []);

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
        return <BarChartComponent data={filteredChartData} onChartClick={handleBarClick} chartKey={chartKey} activeFilters={activeFilters} />;
      case 'line':
        return <LineChartComponent data={filteredChartData} chartKey={chartKey} activeFilters={activeFilters} onDotClick={handleDotClick} />;
      default:
        return <BarChartComponent data={filteredChartData} onChartClick={handleBarClick} chartKey={chartKey} activeFilters={activeFilters} />;
    }
  }, [chartType, filteredChartData, handleBarClick, handleDotClick, error, chartKey, activeFilters]);

  return (
    <>
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
                    Biểu đồ thống kê công nợ
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
                    {activeFilters.length}/3 Kích hoạt
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

      <ChartDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
        category={modalCategory}
      />
    </>
  );
};

export default React.memo(ChartSection);
