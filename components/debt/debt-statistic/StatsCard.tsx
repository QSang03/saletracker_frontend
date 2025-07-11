import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  description?: string;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  color
}) => (
  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`p-2 rounded-lg bg-opacity-10 ${color?.replace('text-', 'bg-')}`}>
        <Icon className={`h-5 w-5 ${color || ''}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {trend !== undefined && (
        <p
          className={`text-sm font-medium ${
            trend > 0
              ? 'text-green-600'
              : trend < 0
              ? 'text-red-600'
              : 'text-gray-600'
          }`}
        >
          {trend > 0 ? '+' : ''}
          {trend}%
          {' so với tuần trước'}
        </p>
      )}
      {description && (
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      )}
    </CardContent>
  </Card>
);

export default StatsCard;
