import { numberCompact } from '@/lib/order-helper';
import React from 'react';

interface StatDotProps {
  label: string;
  value: number;
  color: string;
}

const StatDot: React.FC<StatDotProps> = ({
  label,
  value,
  color,
}) => {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs font-medium">{numberCompact(value)}</span>
    </div>
  );
};

export default StatDot;
