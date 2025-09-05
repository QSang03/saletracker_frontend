import React from 'react';

interface CustomerSearchIndicatorProps {
  customerName: string;
  onRestorePrevious: () => void;
  onClearSearch: () => void;
  className?: string;
}
export const CustomerSearchIndicator: React.FC<CustomerSearchIndicatorProps> = ({
  customerName,
  className = "",
  onRestorePrevious,
  onClearSearch,
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-sm text-blue-700 hover:underline"
          onClick={onRestorePrevious}
        >
          Quay lại
        </button>
        <button
          type="button"
          className="text-sm text-red-600 hover:underline"
          onClick={onClearSearch}
        >
          Xóa
        </button>
      </div>
    </div>
  );
};
