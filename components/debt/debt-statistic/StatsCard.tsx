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
  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 p-5">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
      <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{title}</CardTitle>
      <div className={`p-0.5 rounded bg-opacity-10 ${color?.replace('text-', 'bg-')}`}>
        <Icon className={`h-3 w-3 ${color || ''}`} />
      </div>
    </CardHeader>
    <CardContent className="px-3 pb-3">
      <div className="text-3xl font-bold mb-0.5">{value}</div>
      {trend !== undefined && (
        <p
          className={`text-xs font-medium leading-tight ${
            trend > 0
              ? 'text-green-600'
              : trend < 0
              ? 'text-red-600'
              : 'text-gray-600'
          }`}
        >
          {trend > 0 ? '+' : ''}
          {trend}%
        </p>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
      )}
    </CardContent>
  </Card>
);

export default StatsCard;
