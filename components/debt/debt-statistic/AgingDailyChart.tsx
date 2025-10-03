import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as RBarChart, Bar as RBar, LineChart as RLineChart, Line as RLine, XAxis as RXAxis, YAxis as RYAxis, CartesianGrid as RCartesianGrid, ResponsiveContainer as RResponsiveContainer, Tooltip as RTooltip } from "recharts";
import SmartTooltip from '@/components/ui/charts/SmartTooltip';
import { Clock, Calendar, AlertTriangle, Timer, Zap, TrendingDown, CheckCircle2, RotateCcw, Sparkles, Users, BarChart3, TrendingUp } from 'lucide-react';

interface AgingDailyChartProps {
  data: any[];
  onBarClick: (key: string, data: any, index: number) => void;
  loading?: boolean;
  labels?: string[];
  chartType?: 'bar' | 'line';
  setChartType?: (type: 'bar' | 'line') => void;
}

const AgingDailyChart: React.FC<AgingDailyChartProps> = ({
  data,
  onBarClick,
  loading = false,
  labels = ['1-30', '31-60', '61-90', '>90'],
  chartType = 'bar',
  setChartType
}) => {
  const [activeFilters, setActiveFilters] = useState<string[]>(labels);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);

  // ✅ Filter data based on active filters - ẩn hoàn toàn
  const filteredData = useMemo(() => {
    return data.map(item => {
      const filteredItem: any = { name: item.name };
      
      // Chỉ thêm dữ liệu của các label được active
      labels.forEach(label => {
        if (activeFilters.includes(label)) {
          filteredItem[label] = item[label] || 0;
        }
        // Không thêm label không active = ẩn hoàn toàn
      });
      return filteredItem;
    });
  }, [data, labels, activeFilters]); // ✅ Thêm activeFilters vào dependency

  // Handle legend click
  const handleLegendClick = (dataKey: string) => {
    setActiveFilters(prev => {
      if (prev.includes(dataKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(f => f !== dataKey);
      } else {
        return [...prev, dataKey];
      }
    });
  };

  // ✨ Premium color schemes for aging periods
  const getColorScheme = (label: string, index: number) => {
    const colorSchemes: { [key: string]: { 
      primary: string; 
      secondary: string; 
      gradient: string;
    }} = {
      '1-30': { 
        primary: '#10B981', 
        secondary: '#059669',
        gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #3B82F6 100%)',
      },
      '31-60': { 
        primary: '#F59E0B', 
        secondary: '#D97706',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%)',
      },
      '61-90': { 
        primary: '#EF4444', 
        secondary: '#DC2626',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 50%, #EAB308 100%)',
      },
      '>90': { 
        primary: '#7C2D12', 
        secondary: '#451A03',
        gradient: 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)',
      },
      '>30': { 
        primary: '#7C2D12', 
        secondary: '#451A03',
        gradient: 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)',
      }
    };
    
    const defaultSchemes = [
      { primary: '#10B981', secondary: '#059669', gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)' },
      { primary: '#F59E0B', secondary: '#D97706', gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' },
      { primary: '#EF4444', secondary: '#DC2626', gradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)' },
      { primary: '#7C2D12', secondary: '#451A03', gradient: 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)' }
    ];
    
    return colorSchemes[label] || defaultSchemes[index % 4];
  };

  // Get appropriate icon for each aging period
  const getIconForLabel = (label: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      '1-30': <Timer className="h-3 w-3" />,
      '31-60': <Clock className="h-3 w-3" />,
      '61-90': <AlertTriangle className="h-3 w-3" />,
      '>90': <Zap className="h-3 w-3" />,
      '>30': <Zap className="h-3 w-3" />
    };
    return iconMap[label] || <Calendar className="h-3 w-3" />;
  };

  // Get label display text
  const getLabelText = (label: string) => {
    const labelMap: { [key: string]: string } = {
      '1-30': '1-30 ngày',
      '31-60': '31-60 ngày',
      '61-90': '61-90 ngày',
      '>90': '>90 ngày',
      '>30': '>30 ngày'
    };
    return labelMap[label] || label;
  };

  const createValidId = (label: string) => {
    return label.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
  };

  // Chart type selector component
  const ChartTypeSelector = React.memo<{ 
    value: string; 
    onChange: (value: 'bar' | 'line') => void; 
  }>(({ value, onChange }) => {
    return (
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl blur opacity-30 animate-pulse"></div>
        
        <div className="relative bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm rounded-2xl p-1 border border-white/50 shadow-xl">
          <div className="flex rounded-xl overflow-hidden">
            <button
              onClick={() => onChange('bar')}
              className={`
                flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all duration-300 transform
                ${value === 'bar' 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-105' 
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
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg scale-105' 
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

  const getCurrentChartIcon = () => {
    switch (chartType) {
      case 'bar': return <BarChart3 className="h-8 w-8 text-white drop-shadow-lg" />;
      case 'line': return <TrendingUp className="h-8 w-8 text-white drop-shadow-lg" />;
      default: return <BarChart3 className="h-8 w-8 text-white drop-shadow-lg" />;
    }
  };

  const customConfig = labels.reduce((acc, label) => {
    const scheme = getColorScheme(label, labels.indexOf(label));
    acc[label] = { 
      label: getLabelText(label), 
      color: scheme.primary
    };
    return acc;
  }, {} as { [key: string]: { label: string; color: string } });

  // ✨ SUPER WOW Loading Animation
  if (loading) {
    return (
      <Card className="overflow-hidden relative min-h-[500px] rounded-3xl">
        <div 
          className="absolute inset-0 opacity-60 rounded-3xl"
          style={{
            background: 'linear-gradient(-45deg, #ef4444, #f97316, #eab308, #84cc16)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 15s ease infinite'
          }}
        />
        
        <div className="absolute inset-0 backdrop-blur-3xl bg-white/10 border border-white/20 rounded-3xl" />
        
        <CardContent className="flex flex-col items-center justify-center h-[500px] relative z-10">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 via-orange-500 to-yellow-500 blur-lg opacity-70 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 animate-spin">
                <div className="absolute inset-2 rounded-full bg-white/20 backdrop-blur-sm" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-r from-yellow-400 to-red-400 animate-pulse" />
              </div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white animate-pulse" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Đang phân tích công nợ
            </h3>
            <p className="text-white/80 text-lg drop-shadow-md">
              Chuẩn bị báo cáo quá hạn...
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

  return (
    <Card className="overflow-hidden relative shadow-2xl border-0 bg-white rounded-3xl">
      {/* ✨ Animated background với glassmorphism */}
      <div 
        className="absolute inset-0 opacity-30 rounded-3xl"
        style={{
          background: 'linear-gradient(-45deg, #ef4444, #f97316, #eab308, #84cc16)',
          backgroundSize: '400% 400%',
          animation: 'gradientFlow 20s ease infinite'
        }}
      />
      
      <div className="absolute inset-0 backdrop-blur-3xl bg-white/80 rounded-3xl" />
      
      {/* Floating elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-24 h-24 bg-gradient-to-tr from-yellow-400/20 to-red-400/20 rounded-full blur-2xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-r from-orange-400/20 to-yellow-400/20 rounded-full blur-xl animate-pulse delay-2000" />
      
      <CardHeader className="relative z-10 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {/* ✨ Premium icon container */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 rounded-3xl blur-lg opacity-60 animate-pulse" />
              <div className="relative p-4 rounded-3xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 shadow-2xl transform rotate-1 hover:rotate-0 transition-all duration-500 hover:scale-105">
                {getCurrentChartIcon()}
              </div>
            </div>
            
            <div>
              <CardTitle className="text-3xl font-black mb-3">
                <span className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent drop-shadow-sm">
                  Biểu đồ thống kê công nợ
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 flex items-center gap-3 text-lg font-medium">
                <Users className="h-5 w-5 text-red-500" />
                Thống kê công nợ quá hạn theo thời gian
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* ✨ Premium status badge */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-500 rounded-full blur-md opacity-60" />
              <div className="relative flex items-center gap-3 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-3 rounded-full border border-white/50 shadow-xl backdrop-blur-sm">
                <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-orange-500 rounded-full animate-pulse shadow-lg" />
                <span className="text-sm font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  {activeFilters.length}/{labels.length} Kích hoạt
                </span>
              </div>
            </div>
            
            {setChartType && (
              <ChartTypeSelector value={chartType} onChange={setChartType} />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 relative z-10">
        {/* ✨ Premium chart container */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/20 rounded-[24px] backdrop-blur-sm border border-white/30 shadow-2xl" />
          
          <div className="relative h-80 w-full p-6">
            <RResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <RBarChart 
                  data={filteredData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  key={`aging-daily-bar-${chartType}`}
                >
                <defs>
                  {/* ✅ Chỉ tạo gradients cho active filters */}
                  {activeFilters.map((label, idx) => {
                    const validId = createValidId(label);
                    const scheme = getColorScheme(label, labels.indexOf(label));
                    
                    return (
                      <React.Fragment key={`defs-${validId}`}>
                        <linearGradient 
                          id={`gradient-${validId}`} 
                          x1="0" y1="0" x2="0" y2="1"
                        >
                          <stop 
                            offset="0%" 
                            stopColor={scheme.primary} 
                            stopOpacity={1}
                          />
                          <stop 
                            offset="100%" 
                            stopColor={scheme.secondary} 
                            stopOpacity={0.8}
                          />
                        </linearGradient>
                        
                        <filter id={`glow-${validId}`}>
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </React.Fragment>
                    );
                  })}
                </defs>
                
                <RCartesianGrid 
                  strokeDasharray="8 8" 
                  vertical={false} 
                  stroke="rgba(239, 68, 68, 0.2)"
                  strokeWidth={2}
                />
                
                <RXAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
                />
                
                <RYAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
                />
                
                <RTooltip 
                  content={
                    <SmartTooltip 
                      title="⏰ Chi tiết công nợ quá hạn"
                      customConfig={customConfig}
                      customFields={activeFilters}
                    />
                  }
                />
                
                {/* ✅ Chỉ render bars cho active filters */}
                {activeFilters.map((k, idx) => {
                  const validId = createValidId(k);
                  const isHovered = hoveredLegend === k || hoveredBar === k;
                  const originalIndex = labels.indexOf(k); // Giữ nguyên color scheme
                  
                  return (
                    <RBar 
                      key={`bar-${k}`} 
                      dataKey={k} 
                      name={getLabelText(k)} 
                      fill={`url(#gradient-${validId})`}
                      className="cursor-pointer transition-all duration-300" 
                      onClick={(data, index) => onBarClick(k, data, index)}
                      onMouseEnter={() => setHoveredBar(k)}
                      onMouseLeave={() => setHoveredBar(null)}
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={800}
                      animationEasing="ease-out"
                      animationBegin={idx * 150}
                      style={{ 
                        opacity: isHovered ? 1 : 0.9,
                        filter: isHovered ? `url(#glow-${validId})` : 'none',
                        transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                        transformOrigin: 'bottom',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  );
                })}
              </RBarChart>
              ) : (
                <RLineChart 
                  data={filteredData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  key={`aging-daily-line-${chartType}`}
                >
                <defs>
                  {/* ✅ Chỉ tạo gradients cho active filters */}
                  {activeFilters.map((label, idx) => {
                    const validId = createValidId(label);
                    const scheme = getColorScheme(label, labels.indexOf(label));
                    
                    return (
                      <React.Fragment key={`line-defs-${validId}`}>
                        <linearGradient 
                          id={`lineGradient-${validId}`} 
                          x1="0%" y1="0%" x2="100%" y2="0%"
                        >
                          <stop offset="0%" stopColor={scheme.primary} stopOpacity={0.8} />
                          <stop offset="50%" stopColor={scheme.primary} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={scheme.primary} stopOpacity={0.6} />
                        </linearGradient>
                        
                        <filter id={`activeDotGlow-${validId}`}>
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </React.Fragment>
                    );
                  })}
                </defs>
                
                <RCartesianGrid 
                  strokeDasharray="8 8" 
                  vertical={false} 
                  stroke="rgba(239, 68, 68, 0.2)"
                  strokeWidth={2}
                />
                
                <RXAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
                />
                
                <RYAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }}
                />
                
                <RTooltip 
                  content={
                    <SmartTooltip 
                      title="⏰ Chi tiết công nợ quá hạn"
                      customConfig={customConfig}
                      customFields={activeFilters}
                    />
                  }
                />
                
                {/* ✅ Chỉ render lines cho active filters */}
                {activeFilters.map((k, idx) => {
                  const validId = createValidId(k);
                  const isHovered = hoveredLegend === k || hoveredBar === k;
                  const originalIndex = labels.indexOf(k);
                  
                  return (
                    <RLine 
                      key={`line-${k}`} 
                      type="monotone"
                      dataKey={k} 
                      name={getLabelText(k)} 
                      stroke={`url(#lineGradient-${validId})`}
                      strokeWidth={4}
                      dot={(props: any) => {
                        const { cx, cy } = props || {};
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={getColorScheme(k, originalIndex).primary}
                            opacity={0.7}
                            style={{ transition: 'all 0.2s ease' }}
                          />
                        );
                      }}
                      activeDot={(props: any) => {
                        const { cx, cy, payload } = props || {};
                        return (
                          <g onClick={() => onBarClick && onBarClick(k, payload, 0)} style={{ cursor: 'pointer' }}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              stroke="#fff"
                              strokeWidth={3}
                              fill={getColorScheme(k, idx).primary}
                              filter={`url(#activeDotGlow-${validId})`}
                              style={{ opacity: 0.95 }}
                            />
                          </g>
                        );
                      }}
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={2000}
                      animationEasing="ease-in-out"
                      animationBegin={idx * 300}
                    />
                  );
                })}
              </RLineChart>
              )}
            </RResponsiveContainer>
          </div>
        </div>
        
        {/* ✨ TRADITIONAL CHART LEGEND với border radius mềm */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-4 bg-white/60 backdrop-blur-sm rounded-[20px] border border-white/30 shadow-lg">
            
            {/* Legend Items */}
            <div className="flex flex-wrap items-center justify-center gap-6">
              {labels.map((label, idx) => {
                const isActive = activeFilters.includes(label);
                const isHovered = hoveredLegend === label;
                const scheme = getColorScheme(label, idx);
                const icon = getIconForLabel(label);
                
                return (
                  <button
                    key={label}
                    onClick={() => handleLegendClick(label)}
                    onMouseEnter={() => setHoveredLegend(label)}
                    onMouseLeave={() => setHoveredLegend(null)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 
                      hover:bg-white/50 hover:shadow-md transform hover:-translate-y-0.5
                      ${isActive ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}
                    `}
                  >
                    {/* Icon */}
                    <div className={`
                      transition-all duration-200
                      ${isActive ? 'text-gray-700' : 'text-gray-400'}
                    `}>
                      {icon}
                    </div>
                    
                    {/* Color indicator */}
                    <div 
                      className={`
                        w-4 h-4 rounded-md border-2 transition-all duration-200
                        ${isActive ? 'shadow-md scale-110' : 'opacity-50'}
                      `}
                      style={{ 
                        background: scheme.gradient,
                        borderColor: isActive ? scheme.primary : '#d1d5db'
                      }}
                    />
                    
                    {/* Label */}
                    <span className={`
                      text-sm font-medium transition-all duration-200
                      ${isActive ? 'text-gray-800' : 'text-gray-400'}
                    `}>
                      {getLabelText(label)}
                    </span>
                    
                    {/* Status dot */}
                    <div className={`
                      w-2 h-2 rounded-full transition-all duration-200
                      ${isActive ? 'bg-green-500 shadow-md' : 'bg-gray-300'}
                    `} />
                  </button>
                );
              })}
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveFilters(labels)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 rounded-xl transition-all duration-200 hover:shadow-md"
              >
                <CheckCircle2 className="h-3 w-3" />
                Tất cả
              </button>
              
              <button
                onClick={() => setActiveFilters([labels[0]])}
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

export default AgingDailyChart;
