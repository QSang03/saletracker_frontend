'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AgingData } from '@/lib/debt-statistics-api';
import SmartTooltip from '@/components/ui/charts/SmartTooltip';

const agingColors = {
  '0-30': '#10b981',           // Green - good
  '1-30': '#10b981',           // Green - good  
  '0-30 ngày': '#10b981',      // Green - good
  '31-60': '#f59e0b',          // Yellow - warning
  '31-60 ngày': '#f59e0b',     // Yellow - warning  
  '61-90': '#ef4444',          // Red - urgent
  '61-90 ngày': '#ef4444',     // Red - urgent
  '>90': '#7c2d12',            // Dark red - critical
  '>90 ngày': '#7c2d12',       // Dark red - critical
};

const agingConfig = {
  amount: { label: 'Tổng tiền', color: '#8884d8' },
  count: { label: 'Số khoản nợ', color: '#10b981' },
  percentage: { label: 'Tỷ lệ', color: '#f59e0b' },
};

interface AgingChartProps {
  data: AgingData[];
  loading?: boolean;
  onBarClick?: (data: AgingData) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toString();
};

const AgingChart: React.FC<AgingChartProps> = ({ data, loading = false, onBarClick }) => {
  console.log('🔍 [AgingChart] Raw data:', data);
  console.log('🔍 [AgingChart] Data length:', data?.length);
  console.log('🔍 [AgingChart] Loading state:', loading);
  
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) {
      console.log('🔍 [AgingChart] No data provided, returning empty array');
      return [];
    }
    
    console.log('🔍 [AgingChart] Processing data:', data);
    
    const result = data.map((item, index) => {
      // Get range from API data
      const range = (item as any).range || item.label;
      
      // Map API range format to color - use the exact range as key
      const color = (agingColors as any)[range] || agingColors['1-30'] || '#10b981';
      
      // Create display label from range
      let displayLabel = range;
      if (range === '1-30') displayLabel = '1-30 ngày';
      if (range === '31-60') displayLabel = '31-60 ngày';  
      if (range === '61-90') displayLabel = '61-90 ngày';
      if (range === '>90') displayLabel = '>90 ngày';
      
      const processedItem = {
        ...item,
        name: displayLabel, // Use name for XAxis dataKey
        label: displayLabel, // Keep label for compatibility
        fill: color,
        percentage: data.reduce((sum, d) => sum + d.count, 0) > 0 
          ? Math.round((item.count / data.reduce((sum, d) => sum + d.count, 0)) * 100) 
          : 0
      };
      
      console.log(`🔍 [AgingChart] Processed item ${index}:`, processedItem);
      return processedItem;
    });
    
    console.log('🔍 [AgingChart] Final chart data:', result);
    return result;
  }, [data]);
  
  console.log('🔍 [AgingChart] Chart data with displayAmount:', chartData);
  console.log('🔍 [AgingChart] onBarClick function:', typeof onBarClick);

  const totalDebts = React.useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);
  const totalAmount = React.useMemo(() => data.reduce((sum, item) => sum + item.amount, 0), [data]);

  console.log('🔍 [AgingChart] Total debts:', totalDebts, 'Total amount:', totalAmount);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle>Phân tích nợ quá hạn</CardTitle>
            <CardDescription>Phân bổ công nợ theo ngày quá hạn</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 flex items-center justify-center">
          <div className="h-80 flex items-center justify-center w-full">
            <div className="text-muted-foreground">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <div>
          <CardTitle className="flex items-center gap-2">
            🕐 Phân tích nợ quá hạn
          </CardTitle>
          <CardDescription>
            Phân bổ {totalDebts} khoản nợ ({formatCurrency(totalAmount)}) theo ngày quá hạn
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 flex items-center justify-center">
        {totalDebts === 0 || !chartData || chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center w-full">
            <div className="text-muted-foreground">
              {totalDebts === 0 ? "Không có dữ liệu nợ quá hạn" : "Đang tải dữ liệu..."}
            </div>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false}
                  fontSize={12}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={formatCompactCurrency}
                  domain={[0, (dataMax: number) => Math.max(dataMax * 1.1, 1000)]}
                />
                <Tooltip
                  content={
                    <SmartTooltip 
                      title="Chi tiết công nợ quá hạn"
                      customConfig={agingConfig}
                      customFields={['amount', 'count', 'percentage']}
                      formatter={(value, field) => {
                        if (field === 'amount') return formatCurrency(value);
                        if (field === 'percentage') return `${value}%`;
                        return value.toString();
                      }}
                    />
                  }
                />
                <Bar 
                  dataKey="amount" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data: any) => {
                    if (onBarClick) {
                      console.log('📊 [AgingChart] Bar clicked:', data.payload);
                      onBarClick(data.payload);
                    }
                  }}
                  className="cursor-pointer hover:opacity-80 transition-colors"
                  fill="#8884d8"
                  minPointSize={5}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`aging-cell-${index}-${entry.name}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
      
      {/* Summary stats below chart */}
      {totalDebts > 0 && chartData && chartData.length > 0 && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {chartData.map((item, index) => (
              <div 
                key={`aging-stat-${index}-${item.label}`}
                className="bg-gray-50 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onBarClick && onBarClick(item)}
              >
                <div 
                  className="w-4 h-4 rounded mx-auto mb-2" 
                  style={{ backgroundColor: item.fill }}
                />
                <div className="text-xs text-gray-600 mb-1">{item.label}</div>
                <div className="font-semibold text-sm">{item.count} khoản</div>
                <div className="text-xs text-gray-500">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AgingChart;
