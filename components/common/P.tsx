import React from 'react';
import { PDynamic } from './PDynamic';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';

interface PProps {
  children: React.ReactNode;
  name?: string; // Deprecated: để backwards compatibility
  permission?: {
    departmentSlug?: string;
    action?: string;
    requireAdmin?: boolean;
    requireManager?: boolean;
    requireSpecificRole?: string;
  };
  permissions?: Array<{
    departmentSlug?: string;
    action?: string;
    requireAdmin?: boolean;
    requireManager?: boolean;
    requireSpecificRole?: string;
  }>;
  mode?: 'all' | 'any';
  fallback?: React.ReactNode;
}

export const P: React.FC<PProps> = ({ 
  children, 
  name, 
  permission, 
  permissions,
  mode = 'any', 
  fallback 
}) => {
  const { getAccessibleDepartments } = useDynamicPermission();

  // Backwards compatibility: convert old name-based system to new dynamic system
  if (name && !permission && !permissions) {
    // Extract department and action from name
    let dynamicPermission = {};
    
    // Map common permission names to dynamic structure
    switch (name) {
      case 'debt-config-table':
        dynamicPermission = { departmentSlug: 'cong-no', action: 'read' };
        break;
      case 'debt-config-create':
        dynamicPermission = { departmentSlug: 'cong-no', action: 'create' };
        break;
      case 'debt-config-edit':
        dynamicPermission = { departmentSlug: 'cong-no', action: 'update' };
        break;
      case 'debt-config-delete':
        dynamicPermission = { departmentSlug: 'cong-no', action: 'delete' };
        break;
      case 'debt-config-import':
        dynamicPermission = { departmentSlug: 'cong-no', action: 'import' };
        break;
      case 'debt-config-export':
        dynamicPermission = { departmentSlug: 'cong-no', action: 'export' };
        break;
      case 'debt-config-actions':
        // Multiple permissions for actions
        return (
          <PDynamic
            permissions={[
              { departmentSlug: 'cong-no', action: 'read' },
              { departmentSlug: 'cong-no', action: 'update' },
              { departmentSlug: 'cong-no', action: 'delete' }
            ]}
            mode="any"
            fallback={fallback}
          >
            {children}
          </PDynamic>
        );
      default:
        // Try to auto-detect from name pattern
        const parts = name.split('-');
        if (parts.length >= 2) {
          const dept = parts[0];
          const action = parts[parts.length - 1];
          
          // Map department names
          const deptSlugMap: Record<string, string> = {
            'debt': 'cong-no',
            'user': 'quan-ly-nguoi-dung',
            'report': 'bao-cao',
            'sale': 'ban-hang',
            'warehouse': 'kho',
            'accounting': 'ke-toan'
          };
          
          const departmentSlug = deptSlugMap[dept] || dept;
          dynamicPermission = { departmentSlug, action };
        }
        break;
    }
    
    return (
      <PDynamic
        permission={dynamicPermission}
        mode={mode}
        fallback={fallback}
      >
        {children}
      </PDynamic>
    );
  }

  // Use new dynamic system
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