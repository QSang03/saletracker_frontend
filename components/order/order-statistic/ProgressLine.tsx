import { numberCompact } from '@/lib/order-helper';
import React from 'react';

interface ProgressLineProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

const ProgressLine: React.FC<ProgressLineProps> = ({
  label,
  value,
  max,
  color,
}) => {
  const percent = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{numberCompact(value)}</span>
      </div>
      <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressLine;
