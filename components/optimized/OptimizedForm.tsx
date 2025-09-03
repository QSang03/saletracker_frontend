// components/optimized/OptimizedForm.tsx
import React, { memo, useCallback, useMemo } from 'react';
import { useFormOptimization, useDebounce } from '@/hooks/usePerformance';

// Optimized Input Component
interface OptimizedInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
  debounceMs?: number;
}

export const OptimizedInput = memo<OptimizedInputProps>(({
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  touched,
  className = '',
  debounceMs = 300,
}) => {
  const debouncedOnChange = useDebounce(onChange, debounceMs);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Immediate update for better UX
    onChange(newValue);
    // Debounced update for performance
    debouncedOnChange(newValue);
  }, [onChange, debouncedOnChange]);

  const inputClassName = useMemo(() => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
    const errorClasses = error && touched ? 'border-red-500' : 'border-gray-300';
    const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
    return `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`;
  }, [error, touched, disabled, className]);

  return (
    <div className="space-y-1">
      <input
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />
      {error && touched && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

OptimizedInput.displayName = 'OptimizedInput';

// Optimized Textarea Component
interface OptimizedTextareaProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
  debounceMs?: number;
}

export const OptimizedTextarea = memo<OptimizedTextareaProps>(({
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
  disabled = false,
  error,
  touched,
  className = '',
  debounceMs = 300,
}) => {
  const debouncedOnChange = useDebounce(onChange, debounceMs);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedOnChange(newValue);
  }, [onChange, debouncedOnChange]);

  const textareaClassName = useMemo(() => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical';
    const errorClasses = error && touched ? 'border-red-500' : 'border-gray-300';
    const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
    return `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`;
  }, [error, touched, disabled, className]);

  return (
    <div className="space-y-1">
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={textareaClassName}
      />
      {error && touched && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

OptimizedTextarea.displayName = 'OptimizedTextarea';

// Optimized Select Component
interface OptimizedSelectProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
}

export const OptimizedSelect = memo<OptimizedSelectProps>(({
  name,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled = false,
  error,
  touched,
  className = '',
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const selectClassName = useMemo(() => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
    const errorClasses = error && touched ? 'border-red-500' : 'border-gray-300';
    const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
    return `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`;
  }, [error, touched, disabled, className]);

  return (
    <div className="space-y-1">
      <select
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        className={selectClassName}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && touched && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

OptimizedSelect.displayName = 'OptimizedSelect';

// Optimized Form Component
interface OptimizedFormProps<T extends Record<string, any>> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validationSchema?: any;
  children: (formProps: {
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    isSubmitting: boolean;
    handleChange: (name: keyof T, value: any) => void;
    handleBlur: (name: keyof T) => void;
    handleSubmit: (onSubmit: (values: T) => Promise<void>) => Promise<void>;
    reset: () => void;
  }) => React.ReactNode;
  className?: string;
}

export const OptimizedForm = <T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validationSchema,
  children,
  className = '',
}: OptimizedFormProps<T>) => {
  const formProps = useFormOptimization(initialValues, validationSchema);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    formProps.handleSubmit(onSubmit);
  }, [formProps, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children(formProps)}
    </form>
  );
};

// Optimized Search Input
interface OptimizedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const OptimizedSearchInput = memo<OptimizedSearchInputProps>(({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 500,
  className = '',
}) => {
  const debouncedOnChange = useDebounce(onChange, debounceMs);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );
});

OptimizedSearchInput.displayName = 'OptimizedSearchInput';

// Optimized Checkbox
interface OptimizedCheckboxProps {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
}

export const OptimizedCheckbox = memo<OptimizedCheckboxProps>(({
  name,
  checked,
  onChange,
  label,
  disabled = false,
  error,
  touched,
  className = '',
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  }, [onChange]);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      {error && touched && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

OptimizedCheckbox.displayName = 'OptimizedCheckbox';

// Optimized Radio Group
interface OptimizedRadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
}

export const OptimizedRadioGroup = memo<OptimizedRadioGroupProps>(({
  name,
  value,
  onChange,
  options,
  disabled = false,
  error,
  touched,
  className = '',
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={handleChange}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <label className="text-sm font-medium text-gray-700">
            {option.label}
          </label>
        </div>
      ))}
      {error && touched && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

OptimizedRadioGroup.displayName = 'OptimizedRadioGroup';
