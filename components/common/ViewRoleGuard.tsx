"use client";

import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { canAccessUrl } from '@/lib/url-permission-mapping';
import { usePathname } from 'next/navigation';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

interface ViewRoleGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ViewRoleGuard: React.FC<ViewRoleGuardProps> = ({ 
  children, 
  fallback = <div>Bạn không có quyền truy cập trang này</div> 
}) => {
  const pathname = usePathname();
  const { user } = useContext(AuthContext);
  const { getAllUserPermissions } = usePermission();

  // Kiểm tra nếu user có role "view"
  const isViewRole = user?.roles?.some((role: any) => role.name === 'view');
  
  if (!isViewRole) {
    // Nếu không phải role view, hiển thị bình thường
    return <>{children}</>;
  }

  // Nếu là role view, kiểm tra permissions
  const userPermissions = getAllUserPermissions();
  const hasAccess = canAccessUrl(pathname, userPermissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
