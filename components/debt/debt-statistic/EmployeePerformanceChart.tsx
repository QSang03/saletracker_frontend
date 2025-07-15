'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmployeePerformance } from '@/lib/debt-statistics-api';

const performanceConfig = {
  collectionRate: { label: 'Tỷ lệ thu hồi (%)', color: '#3b82f6' },
  totalAssigned: { label: 'Tổng phân công', color: '#8b5cf6' },
  totalCollected: { label: 'Đã thu hồi', color: '#10b981' },
};

interface EmployeePerformanceChartProps {
  data: EmployeePerformance[];
  loading?: boolean;
  onEmployeeClick?: (employee: EmployeePerformance) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const getPerformanceColor = (rate: number) => {
  if (rate >= 80) return 'bg-green-100 text-green-800';
  if (rate >= 60) return 'bg-yellow-100 text-yellow-800';
  if (rate >= 40) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

const getPerformanceLabel = (rate: number) => {
  if (rate >= 80) return 'Xuất sắc';
  if (rate >= 60) return 'Tốt';
  if (rate >= 40) return 'Trung bình';
  return 'Cần cải thiện';
};

const EmployeePerformanceChart: React.FC<EmployeePerformanceChartProps> = ({ 
  data, 
  loading = false, 
  onEmployeeClick 
}) => {
  
  // Take top 10 performers
  const topPerformers = data.slice(0, 10);
  
  // Transform data to ensure bars are visible even with 0 values
  const chartData = topPerformers.map(employee => ({
    ...employee,
    // Ensure minimum bar height for visibility, use 5% minimum for 0 values
    displayRate: employee.collectionRate > 0 ? employee.collectionRate : 5
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hiệu suất nhân viên</CardTitle>
          <CardDescription>Top nhân viên thu nợ hiệu quả nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hiệu suất nhân viên</CardTitle>
          <CardDescription>Top nhân viên thu nợ hiệu quả nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Không có dữ liệu hiệu suất</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👥 Hiệu suất nhân viên
          </CardTitle>
          <CardDescription>
            Top {topPerformers.length} nhân viên có tỷ lệ thu hồi cao nhất
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={performanceConfig} className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="employeeCode" 
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
                  domain={[0, 100]}
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
                              <span className="text-gray-600">Tỷ lệ thu hồi:</span>
                              <span className="font-medium">{(data.collectionRate || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Đã thu hồi:</span>
                              <span className="font-medium">{data.totalCollected || 0}/{data.totalAssigned || 0}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Tổng tiền:</span>
                              <span className="font-medium">{formatCurrency(data.totalAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Đã thu:</span>
                              <span className="font-medium">{formatCurrency(data.collectedAmount || 0)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="displayRate" 
                  fill={performanceConfig.collectionRate.color}
                  radius={[4, 4, 0, 0]}
                  onClick={(data: any) => onEmployeeClick && onEmployeeClick(data)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết hiệu suất</CardTitle>
          <CardDescription>Thống kê đầy đủ cho tất cả nhân viên</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Nhân viên</th>
                  <th className="text-right p-2 font-medium">Phân công</th>
                  <th className="text-right p-2 font-medium">Thu hồi</th>
                  <th className="text-right p-2 font-medium">Tỷ lệ</th>
                  <th className="text-right p-2 font-medium">Tổng tiền</th>
                  <th className="text-right p-2 font-medium">Đã thu</th>
                  <th className="text-center p-2 font-medium">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {data.map((employee, index) => (
                  <tr 
                    key={employee.employeeCode}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onEmployeeClick && onEmployeeClick(employee)}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{employee.employeeCode}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right">{employee.totalAssigned || 0}</td>
                    <td className="p-2 text-right">{employee.totalCollected || 0}</td>
                    <td className="p-2 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getPerformanceColor(employee.collectionRate || 0)
                      }`}>
                        {(employee.collectionRate || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 text-right text-xs">
                      {formatCurrency(employee.totalAmount || 0)}
                    </td>
                    <td className="p-2 text-right text-xs">
                      {formatCurrency(employee.collectedAmount || 0)}
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className={getPerformanceColor(employee.collectionRate)}>
                        {getPerformanceLabel(employee.collectionRate)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeePerformanceChart;
