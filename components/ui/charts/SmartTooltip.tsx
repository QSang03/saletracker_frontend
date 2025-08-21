// components/ui/chart/SmartTooltip.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { chartConfig } from '@/components/debt/debt-statistic/ChartSection';

interface SmartTooltipProps {
  active?: boolean;
  payload?: any[];
  coordinate?: { x: number; y: number };
  customConfig?: Record<string, { label: string; color: string }>;
  customFields?: string[];
  title?: string;
  formatter?: (value: any, field: string) => string;
  chartWidth?: number;
}

export default function SmartTooltip({ 
  active, 
  payload, 
  coordinate,
  customConfig,
  customFields,
  title = "Chi tiết",
  formatter,
  chartWidth = 800
}: SmartTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse movement globally
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (active) {
      // Add global mouse listener
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      const timer = setTimeout(() => setIsVisible(true), 20);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousemove', handleMouseMove);
      };
    } else {
      setIsVisible(false);
      document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [active, handleMouseMove]);

  if (!active || !payload?.length) return null;

  const formatValue = (value: any, field: string) => {
    if (formatter) {
      return formatter(value, field);
    }
    
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return new Intl.NumberFormat('vi-VN').format(value);
    }
    return value;
  };

  const config = customConfig || chartConfig;
  const fields = customFields || ['paid', 'promised', 'no_info'];

  const availableFields = fields.filter(field => 
    payload.some((p: any) => p.dataKey === field)
  );

  const fieldsToShow = availableFields.length > 0 ? availableFields : payload.map((p: any) => p.dataKey);

  const getFieldConfig = (field: string) => {
    if (config[field as keyof typeof config]) {
      return config[field as keyof typeof config];
    }
    const payloadItem = payload.find((p: any) => p.dataKey === field);
    if (payloadItem) {
      return {
        label: payloadItem.name || field,
        color: payloadItem.color || '#8884d8'
      };
    }
    return {
      label: field,
      color: '#8884d8'
    };
  };

  const calculateWidth = () => {
    const baseWidth = 120;
    const maxLabelLength = Math.max(
      ...fieldsToShow.map(field => {
        const fieldConfig = getFieldConfig(field);
        return fieldConfig.label.length;
      }),
      title.length
    );
    const maxValueLength = Math.max(
      ...payload.map(item => formatValue(item.value, item.dataKey || '').toString().length)
    );
    
    return Math.min(baseWidth + (maxLabelLength + maxValueLength) * 3.5, 200);
  };

  const tooltipWidth = calculateWidth();
  const tooltipHeight = 60 + (fieldsToShow.length * 18);

  // Vị trí tooltip sát con trỏ chuột
  const calculateCursorPosition = () => {
    const cursorOffset = 12; // Khoảng cách nhỏ từ con trỏ chuột (12px)
    const edgeBuffer = 20; // Buffer từ edge màn hình
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = mousePosition.x + cursorOffset;
    let y = mousePosition.y + cursorOffset;
    
    // Kiểm tra edge phải màn hình
    if (x + tooltipWidth > viewportWidth - edgeBuffer) {
      x = mousePosition.x - tooltipWidth - cursorOffset; // Hiển thị bên trái con trỏ
    }
    
    // Kiểm tra edge dưới màn hình
    if (y + tooltipHeight > viewportHeight - edgeBuffer) {
      y = mousePosition.y - tooltipHeight - cursorOffset; // Hiển thị phía trên con trỏ
    }
    
    // Đảm bảo không vượt quá edge trái và trên
    x = Math.max(edgeBuffer, x);
    y = Math.max(edgeBuffer, y);
    
    return {
      left: x,
      top: y,
      transform: 'none' // Không cần transform vì đã tính toán chính xác
    };
  };

  const position = calculateCursorPosition();

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.left,
    top: position.top,
    transform: position.transform,
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.1s ease-out',
    width: `${tooltipWidth}px`,
    willChange: 'transform, opacity',
  };

  const tooltipStyle: React.CSSProperties = {
    background: 'rgba(17, 24, 39, 0.95)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    padding: '6px 8px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    lineHeight: '1.2',
    userSelect: 'none',
  };

  return (
    <div style={containerStyle}>
      <div style={tooltipStyle}>
        {/* Compact Title */}
        {title && (
          <div className="flex items-center gap-1 mb-1 pb-0.5 border-b border-white/15">
            <div className="w-1 h-1 rounded-full bg-blue-400"></div>
            <span className="font-medium text-white/95 text-xs truncate">
              {title}
            </span>
          </div>
        )}
        
        {/* Ultra Compact Data Items */}
        <div className="space-y-0.5">
          {fieldsToShow.map(field => {
            const p = payload.find((d: any) => d.dataKey === field);
            if (!p) return null;
            
            const fieldConfig = getFieldConfig(field);
            
            return (
              <div 
                key={field} 
                className="flex items-center justify-between gap-1.5 min-w-0"
              >
                <div className="flex items-center gap-1 min-w-0 flex-shrink">
                  <span 
                    className="inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: fieldConfig.color }} 
                  />
                  <span className="text-white/75 text-xs truncate">
                    {fieldConfig.label}:
                  </span>
                </div>
                
                <span className="font-semibold text-white text-xs flex-shrink-0">
                  {formatValue(p.value, field)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}