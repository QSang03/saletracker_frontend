'use client';

import React from 'react';

interface SimpleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

const SimpleSelect: React.FC<SimpleSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  className = '' 
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        w-40 px-3 py-2 border border-gray-300 rounded-md
        bg-white text-sm font-medium text-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        hover:bg-gray-50 transition-colors duration-200
        ${className}
      `}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default React.memo(SimpleSelect);
