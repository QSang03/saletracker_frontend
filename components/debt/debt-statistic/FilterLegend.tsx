import React from 'react';
import { AlertTriangle, Clock, Timer, Zap } from 'lucide-react';

interface FilterLegendProps {
  title: string;
  filters: Array<{
    key: string;
    label: string;
    color: string;
    icon?: React.ComponentType<any>;
    gradient?: string;
  }>;
  onFilterClick?: (key: string) => void;
  activeFilters?: string[];
  className?: string;
}

const FilterLegend: React.FC<FilterLegendProps> = ({
  title,
  filters,
  onFilterClick,
  activeFilters = [],
  className = ""
}) => {
  const getIconForFilter = (key: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      '1-30': Timer,
      '31-60': Clock,
      '61-90': AlertTriangle,
      '>90': Zap,
      '1-7': Timer,
      '8-14': Clock,
      '15-30': AlertTriangle,
      '>30': Zap,
      'Debt Reported': Clock,
      'Customer Responded': Timer,
      'First Reminder': AlertTriangle,
      'Second Reminder': Zap,
    };
    return iconMap[key] || Clock;
  };

  const getGradientForFilter = (color: string) => {
    return `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`;
  };

  return (
    <div className={`bg-gradient-to-r from-gray-50 to-orange-50 rounded-2xl p-4 border border-gray-100 ${className}`}>
      <div className="flex items-center justify-center mb-3">
        <div className="flex items-center gap-2 text-gray-700">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="flex gap-6 flex-wrap justify-center">
          {filters.map((filter) => {
            const IconComponent = filter.icon || getIconForFilter(filter.key);
            const isActive = activeFilters.includes(filter.key);
            const gradient = filter.gradient || getGradientForFilter(filter.color);
            
            return (
              <div 
                key={filter.key} 
                className={`flex items-center group cursor-pointer hover:scale-105 transition-all duration-200 ${
                  isActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
                onClick={() => onFilterClick?.(filter.key)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-4 h-4 rounded-full shadow-lg ring-2 ring-white ring-opacity-50 transition-all duration-200 ${
                      isActive ? 'ring-blue-500 ring-opacity-30' : ''
                    }`}
                    style={{ 
                      background: gradient,
                      boxShadow: `0 4px 12px ${filter.color}40`
                    }}
                  />
                  <IconComponent className={`h-3 w-3 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                  }`} />
                </div>
                <span className={`text-sm font-medium transition-colors ml-2 ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {filter.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FilterLegend;
