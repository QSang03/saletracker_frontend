import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as RBarChart, Bar as RBar, XAxis as RXAxis, YAxis as RYAxis, CartesianGrid as RCartesianGrid, ResponsiveContainer as RResponsiveContainer, Tooltip as RTooltip } from "recharts";
import SmartTooltip from '@/components/ui/charts/SmartTooltip';
import { Clock, Calendar, AlertTriangle, Timer, Zap, TrendingDown } from 'lucide-react';

interface AgingDailyChartProps {
  data: any[];
  onBarClick: (key: string, data: any, index: number) => void;
  loading?: boolean;
  labels?: string[];
}

const AgingDailyChart: React.FC<AgingDailyChartProps> = ({
  data,
  onBarClick,
  loading = false,
  labels = ['1-30', '31-60', '61-90', '>90']
}) => {
  // Enhanced color mapping với gradients
  const getColorForLabel = (label: string, index: number) => {
    const colorMap: { [key: string]: { solid: string; gradient: string } } = {
      '1-30': { 
        solid: '#10B981', 
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      },
      '31-60': { 
        solid: '#F59E0B', 
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
      },
      '61-90': { 
        solid: '#EF4444', 
        gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
      },
      '>90': { 
        solid: '#7C2D12', 
        gradient: 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)'
      },
      '>30': { 
        solid: '#7C2D12', 
        gradient: 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)'
      }
    };
    
    const defaultColors = [
      { solid: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
      { solid: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
      { solid: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' },
      { solid: '#7C2D12', gradient: 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)' }
    ];
    
    return colorMap[label]?.solid || defaultColors[index % 4].solid;
  };

  // Get gradient for legend
  const getGradientForLabel = (label: string, index: number) => {
    const colorMap: { [key: string]: string } = {
      '1-30': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      '31-60': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      '61-90': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      '>90': 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)',
      '>30': 'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)'
    };
    
    const defaultGradients = [
      'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      'linear-gradient(135deg, #7C2D12 0%, #451A03 100%)'
    ];
    
    return colorMap[label] || defaultGradients[index % 4];
  };

  // Get appropriate icon for each aging period
  const getIconForLabel = (label: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      '1-30': Timer,
      '31-60': Clock,
      '61-90': AlertTriangle,
      '>90': Zap,
      '>30': Zap
    };
    return iconMap[label] || Calendar;
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

  // Tạo customConfig động từ labels
  const customConfig = labels.reduce((acc, label) => {
    acc[label] = { 
      label: getLabelText(label), 
      color: getColorForLabel(label, labels.indexOf(label))
    };
    return acc;
  }, {} as { [key: string]: { label: string; color: string } });

  // Enhanced loading state
  if (loading) {
    return (
      <Card className="overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50"></div>
        <CardHeader className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-600">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Biểu đồ thống kê công nợ quá hạn
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
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent bg-gradient-to-r from-red-500 to-orange-600 bg-clip-border mx-auto"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-transparent absolute inset-0 mx-auto" 
                   style={{
                     background: 'conic-gradient(from 0deg, transparent, rgba(239, 68, 68, 0.8))',
                     borderRadius: '50%'
                   }}>
              </div>
            </div>
            <p className="mt-4 text-gray-700 font-medium">Đang tải dữ liệu...</p>
            <p className="text-sm text-gray-500 mt-1">Đang phân tích công nợ quá hạn</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden relative shadow-2xl border-0 bg-white">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-orange-50/30 pointer-events-none"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-100/40 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-100/40 to-transparent rounded-full blur-2xl"></div>
      
      <CardHeader className="relative z-10 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-orange-800 bg-clip-text text-transparent mb-2">
                Biểu đồ thống kê công nợ quá hạn
              </CardTitle>
              <CardDescription className="text-gray-600 flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Theo dõi tình hình công nợ qua các khoảng thời gian
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 rounded-full border border-red-200">
            <Clock className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Aging Monitor</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 flex items-center justify-center relative z-10">
        <div className="h-80 w-full relative">
          {/* Chart background with subtle pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="h-full w-full" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(239, 68, 68, 0.15) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          
          <RResponsiveContainer width="100%" height="100%">
            <RBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                {/* Gradient definitions for bars */}
                {labels.map((label, idx) => (
                  <linearGradient key={`gradient-aging-${label}`} id={`gradient-aging-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getColorForLabel(label, idx)} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={getColorForLabel(label, idx)} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <RCartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#e2e8f0"
                strokeOpacity={0.6}
              />
              <RXAxis 
                dataKey="name" 
                angle={0} 
                textAnchor="middle" 
                height={60}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
              />
              <RYAxis 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
              />
              <RTooltip 
                content={
                  <SmartTooltip 
                    title="Chi tiết công nợ quá hạn"
                    customConfig={customConfig}
                    customFields={labels}
                  />
                }
              />
              {labels.map((k, idx) => (
                <RBar 
                  key={`aging-daily-${k}`} 
                  dataKey={k} 
                  name={getLabelText(k)}
                  fill={`url(#gradient-aging-${k})`}
                  className="cursor-pointer transition-all duration-200 hover:opacity-80" 
                  onClick={(data, index) => onBarClick(k, data, index)}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </RBarChart>
          </RResponsiveContainer>
        </div>
      </CardContent>
      
      {/* Enhanced Legend with Icons */}
      <div className="px-6 pb-6 relative z-10">
        <div className="bg-gradient-to-r from-gray-50 to-orange-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2 text-gray-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold text-sm">Khoảng thời gian quá hạn</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex gap-6 flex-wrap justify-center">
              {labels.map((label, idx) => {
                const IconComponent = getIconForLabel(label);
                return (
                  <div key={label} className="flex items-center group cursor-pointer hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full shadow-lg ring-2 ring-white ring-opacity-50"
                        style={{ 
                          background: getGradientForLabel(label, idx),
                          boxShadow: `0 4px 12px ${getColorForLabel(label, idx)}40`
                        }}
                      />
                      <IconComponent className="h-3 w-3 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors ml-2">
                      {getLabelText(label)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AgingDailyChart;
