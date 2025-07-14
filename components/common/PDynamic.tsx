import React from 'react';
import { useDynamicPermission, DynamicPermissionCheck } from '@/hooks/useDynamicPermission';

interface PDynamicProps {
  children: React.ReactNode;
  permission?: DynamicPermissionCheck;
  permissions?: DynamicPermissionCheck[]; // Cho multiple permissions
  mode?: 'any' | 'all'; // any: OR logic, all: AND logic
  fallback?: React.ReactNode;
  showLoading?: boolean;
  loadingComponent?: React.ReactNode;
}

export const PDynamic: React.FC<PDynamicProps> = ({
  children,
  permission,
  permissions,
  mode = 'any',
  fallback = null,
  showLoading = false,
  loadingComponent = <div className="opacity-50">Loading...</div>
}) => {
  const {
    checkDynamicPermission,
    checkAnyPermission,
    checkAllPermissions,
    user
  } = useDynamicPermission();

  // Loading state
  if (!user && showLoading) {
    return <>{loadingComponent}</>;
  }

  let hasPermission = false;

  if (permissions && permissions.length > 0) {
    // Multiple permissions
    hasPermission = mode === 'any' 
      ? checkAnyPermission(permissions)
      : checkAllPermissions(permissions);
  } else if (permission) {
    // Single permission
    hasPermission = checkDynamicPermission(permission);
  } else {
    // No permission check, always show
    hasPermission = true;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Backwards compatibility với component P cũ
export const P = PDynamic;
