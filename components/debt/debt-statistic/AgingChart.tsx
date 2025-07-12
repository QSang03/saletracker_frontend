'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AgingData } from '@/lib/debt-statistics-api';

const agingColors = {
  '0-30 ngày': '#10b981',      // Green - good
  '31-60 ngày': '#f59e0b',     // Yellow - warning  
  '61-90 ngày': '#ef4444',     // Red - urgent
  '>90 ngày': '#7c2d12',       // Dark red - critical
};

const agingConfig = {
  '0-30 ngày': { label: '0-30 ngày', color: agingColors['0-30 ngày'] },
  '31-60 ngày': { label: '31-60 ngày', color: agingColors['31-60 ngày'] },
  '61-90 ngày': { label: '61-90 ngày', color: agingColors['61-90 ngày'] },
  '>90 ngày': { label: '>90 ngày', color: agingColors['>90 ngày'] },
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
  const chartData = data.map((item, index) => ({
    ...item,
    fill: Object.values(agingColors)[index] || agingColors['0-30 ngày'],
    percentage: data.reduce((sum, d) => sum + d.count, 0) > 0 
      ? Math.round((item.count / data.reduce((sum, d) => sum + d.count, 0)) * 100) 
      : 0
  }));

  const totalDebts = data.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phân tích nợ quá hạn</CardTitle>
          <CardDescription>Phân bổ công nợ theo độ tuổi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🕐 Phân tích nợ quá hạn
        </CardTitle>
        <CardDescription>
          Phân bổ {totalDebts} khoản nợ ({formatCurrency(totalAmount)}) theo độ tuổi
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalDebts === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Không có dữ liệu nợ quá hạn</div>
          </div>
        ) : (
          <ChartContainer config={agingConfig} className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tickLine={false} 
                  axisLine={false}
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={formatCompactCurrency}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <div className="font-semibold text-gray-900">{label}</div>
                          <div className="space-y-1 mt-2">
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Số khoản nợ:</span>
                              <span className="font-medium">{data.count}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Tổng tiền:</span>
                              <span className="font-medium">{formatCurrency(data.amount)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Tỷ lệ:</span>
                              <span className="font-medium">{data.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data: any) => onBarClick && onBarClick(data.payload)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
        
        {/* Summary stats below chart */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {chartData.map((item, index) => (
            <div 
              key={item.label}
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
      </CardContent>
    </Card>
  );
};

export default AgingChart;
