import React from 'react';
import { PermissionWrapper } from './PermissionWrapper';
import { COMPONENT_PERMISSIONS } from '@/utils/permissionConfig';

interface PProps {
  children: React.ReactNode;
  name: keyof typeof COMPONENT_PERMISSIONS; // Tên component đã cấu hình
  mode?: 'all' | 'any'; // Chế độ kiểm tra quyền, mặc định là 'any'
  fallback?: React.ReactNode;
}

export const P: React.FC<PProps> = ({ children, name, mode = 'any', fallback }) => {
  const permissions = COMPONENT_PERMISSIONS[name];
  
  if (!permissions) {
    console.warn(`No permission config found for component: ${name}`);
    return <>{children}</>;
  }

  return (
    <PermissionWrapper permissions={permissions} fallback={fallback} mode={mode}>
      {children}
    </PermissionWrapper>
  );
};