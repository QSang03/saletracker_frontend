import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as RBarChart, Bar as RBar, XAxis as RXAxis, YAxis as RYAxis, CartesianGrid as RCartesianGrid, ResponsiveContainer as RResponsiveContainer, Tooltip as RTooltip } from "recharts";
import SmartTooltip from '@/components/ui/charts/SmartTooltip';
import { MessageSquare, Users, Bell, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

interface CustomerResponseChartProps {
  data: any[];
  onBarClick: (key: string, data: any, index: number) => void;
  loading?: boolean;
  labels?: string[];
  responseStatusVi?: { [key: string]: string };
}

const CustomerResponseChart: React.FC<CustomerResponseChartProps> = ({
  data,
  onBarClick,
  loading = false,
  labels = ['Debt Reported', 'Customer Responded', 'First Reminder', 'Second Reminder'],
  responseStatusVi = {
    'Debt Reported': 'Đã gửi báo nợ',
    'Customer Responded': 'Khách đã trả lời',
    'First Reminder': 'Nhắc lần 1',
    'Second Reminder': 'Nhắc lần 2'
  }
}) => {
  // Enhanced color mapping với gradients
  const getColorForLabel = (label: string, index: number) => {
    const colorMap: { [key: string]: { solid: string; gradient: string } } = {
      'Debt Reported': { 
        solid: '#3B82F6', 
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
      },
      'Customer Responded': { 
        solid: '#10B981', 
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      },
      'First Reminder': { 
        solid: '#F59E0B', 
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
      },
      'Second Reminder': { 
        solid: '#EF4444', 
        gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
      }
    };
    
    const defaultColors = [
      { solid: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
      { solid: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
      { solid: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
      { solid: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }
    ];
    
    return colorMap[label]?.solid || defaultColors[index % 4].solid;
  };

  // Get gradient for legend
  const getGradientForLabel = (label: string, index: number) => {
    const colorMap: { [key: string]: string } = {
      'Debt Reported': 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      'Customer Responded': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'First Reminder': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'Second Reminder': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
    };
    
    const defaultGradients = [
      'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
    ];
    
    return colorMap[label] || defaultGradients[index % 4];
  };

  // Get icon for each status
  const getIconForLabel = (label: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'Debt Reported': <Bell className="h-4 w-4" />,
      'Customer Responded': <CheckCircle2 className="h-4 w-4" />,
      'First Reminder': <AlertCircle className="h-4 w-4" />,
      'Second Reminder': <RotateCcw className="h-4 w-4" />
    };
    return iconMap[label] || <MessageSquare className="h-4 w-4" />;
  };

  // Tạo customConfig động từ labels
  const customConfig = labels.reduce((acc, label) => {
    acc[label] = { 
      label: responseStatusVi[label] || label, 
      color: getColorForLabel(label, labels.indexOf(label))
    };
    return acc;
  }, {} as { [key: string]: { label: string; color: string } });

  // Enhanced loading state
  if (loading) {
    return (
      <Card className="overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-blue-50 to-violet-50"></div>
        <CardHeader className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-600">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Biểu đồ thống kê khách đã trả lời
              </CardTitle>
              <CardDescription className="text-gray-600">
                Theo dõi phản hồi khách hàng qua các giai đoạn
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80 relative z-10">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-border mx-auto"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-transparent absolute inset-0 mx-auto" 
                   style={{
                     background: 'conic-gradient(from 0deg, transparent, rgba(16, 185, 129, 0.8))',
                     borderRadius: '50%'
                   }}>
              </div>
            </div>
            <p className="mt-4 text-gray-700 font-medium">Đang tải dữ liệu...</p>
            <p className="text-sm text-gray-500 mt-1">Đang phân tích phản hồi khách hàng</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden relative shadow-2xl border-0 bg-white">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-white to-blue-50/30 pointer-events-none"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-100/40 to-transparent rounded-full blur-2xl"></div>
      
      <CardHeader className="relative z-10 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-blue-800 bg-clip-text text-transparent mb-2">
                Biểu đồ thống kê khách đã trả lời
              </CardTitle>
              <CardDescription className="text-gray-600 flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Theo dõi phản hồi khách hàng qua các giai đoạn
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-blue-50 px-4 py-2 rounded-full border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Tracking</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 flex items-center justify-center relative z-10">
        <div className="h-80 w-full relative">
          {/* Chart background with subtle pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="h-full w-full" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(16, 185, 129, 0.15) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          
          <RResponsiveContainer width="100%" height="100%">
            <RBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                {/* Gradient definitions for bars */}
                {labels.map((label, idx) => (
                  <linearGradient key={`gradient-${label}`} id={`gradient-resp-${label}`} x1="0" y1="0" x2="0" y2="1">
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
                    title="Chi tiết khách hàng đã trả lời"
                    customConfig={customConfig}
                    customFields={labels}
                  />
                }
              />
              {labels.map((k, idx) => (
                <RBar 
                  key={`resp-daily-${k}`} 
                  dataKey={k} 
                  name={responseStatusVi[k] || k} 
                  fill={`url(#gradient-resp-${k})`}
                  className="cursor-pointer transition-all duration-200 hover:opacity-80" 
                  onClick={(data, index) => onBarClick(k, data, index)}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </RBarChart>
          </RResponsiveContainer>
        </div>
      </CardContent>
      
      {/* Enhanced Legend */}
      <div className="px-6 pb-6 relative z-10">
        <div className="bg-gradient-to-r from-gray-50 to-emerald-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2 text-gray-700">
              <MessageSquare className="h-4 w-4" />
              <span className="font-semibold text-sm">Trạng thái phản hồi khách hàng</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex gap-6 flex-wrap justify-center">
              {labels.map((status, idx) => (
                <div key={status} className="flex items-center group cursor-pointer hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full shadow-lg ring-2 ring-white ring-opacity-50"
                      style={{ 
                        background: getGradientForLabel(status, idx),
                        boxShadow: `0 4px 12px ${getColorForLabel(status, idx)}40`
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 opacity-70">
                        {getIconForLabel(status)}
                      </span>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                        {responseStatusVi[status] || status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CustomerResponseChart;
