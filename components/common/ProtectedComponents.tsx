import React from 'react';
import { PDynamic } from './PDynamic';
import { DynamicPermissionCheck } from '@/hooks/useDynamicPermission';

interface ProtectedComponentProps {
  children: React.ReactNode;
  permission?: DynamicPermissionCheck;
  permissions?: DynamicPermissionCheck[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'button' | 'div' | 'span';
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  permission,
  permissions,
  mode = 'any',
  fallback = null,
  className = '',
  onClick,
  disabled = false,
  variant = 'div'
}) => {
  return (
    <PDynamic
      permission={permission}
      permissions={permissions}
      mode={mode}
      fallback={fallback}
    >
      {variant === 'button' ? (
        <button 
          className={className} 
          onClick={onClick} 
          disabled={disabled}
        >
          {children}
        </button>
      ) : variant === 'span' ? (
        <span className={className} onClick={onClick}>
          {children}
        </span>
      ) : (
        <div className={className} onClick={onClick}>
          {children}
        </div>
      )}
    </PDynamic>
  );
};

interface ProtectedButtonProps {
  children: React.ReactNode;
  permission?: DynamicPermissionCheck;
  permissions?: DynamicPermissionCheck[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  children,
  permission,
  permissions,
  mode = 'any',
  fallback = null,
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}) => {
  return (
    <PDynamic
      permission={permission}
      permissions={permissions}
      mode={mode}
      fallback={fallback}
    >
      <button 
        type={type}
        className={className} 
        onClick={onClick} 
        disabled={disabled}
      >
        {children}
      </button>
    </PDynamic>
  );
};

interface ConditionalRenderProps {
  children: React.ReactNode;
  permission?: DynamicPermissionCheck;
  permissions?: DynamicPermissionCheck[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  permission,
  permissions,
  mode = 'any',
  fallback = null
}) => {
  return (
    <PDynamic
      permission={permission}
      permissions={permissions}
      mode={mode}
      fallback={fallback}
    >
      {children}
    </PDynamic>
  );
};

// HOC để bảo vệ toàn bộ component
export function withDynamicPermission<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  permission?: DynamicPermissionCheck,
  permissions?: DynamicPermissionCheck[],
  mode: 'any' | 'all' = 'any',
  fallback?: React.ReactNode
) {
  return function ProtectedComponent(props: T) {
    return (
      <PDynamic
        permission={permission}
        permissions={permissions}
        mode={mode}
        fallback={fallback || (
          <div className="text-center p-4 text-red-500">
            Bạn không có quyền truy cập chức năng này
          </div>
        )}
      >
        <WrappedComponent {...props} />
      </PDynamic>
    );
  };
}
