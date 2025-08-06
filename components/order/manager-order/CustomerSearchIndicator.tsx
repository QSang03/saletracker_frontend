import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';

interface CustomerSearchIndicatorProps {
  customerName: string;
  onRestorePrevious: () => void;
  onClearSearch: () => void;
  className?: string;
}
export const CustomerSearchIndicator: React.FC<CustomerSearchIndicatorProps> = ({
  customerName,
  onRestorePrevious,
  onClearSearch,
  className = ""
}) => {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-blue-800 font-medium">
          Đang xem đơn hàng của khách hàng: 
          <span className="font-bold text-blue-900 ml-1">"{customerName}"</span>
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button
          onClick={onRestorePrevious}
          variant="outline"
          size="sm"
          className="text-blue-700 hover:text-blue-800 hover:bg-blue-100 border-blue-300"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        
        <Button
          onClick={() => {
            // Clear search bằng cách navigate về trang chủ không có search
            window.history.back();
          }}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
