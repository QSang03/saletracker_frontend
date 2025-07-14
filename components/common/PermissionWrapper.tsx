import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionWrapperProps {
  children: React.ReactNode;
  permissions: {
    departmentSlug: string;
    actions: string[];
  }[];
  fallback?: React.ReactNode;
  mode?: 'any' | 'all'; // 'any': có 1 permission là đủ, 'all': phải có tất cả
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  permissions,
  fallback = null,
  mode = 'any'
}) => {
  const { canAccess } = usePermission();

  const hasPermission = mode === 'any' 
    ? permissions.some(perm => 
        perm.actions.some(action => canAccess(perm.departmentSlug, action))
      )
    : permissions.every(perm => 
        perm.actions.every(action => canAccess(perm.departmentSlug, action))
      );

  // Log permission check details
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[PermissionWrapper] mode:', mode, 'permissions:', permissions, 'hasPermission:', hasPermission);
  }, [mode, permissions, hasPermission]);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};