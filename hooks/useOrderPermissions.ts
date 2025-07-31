// hooks/useOrderPermissions.ts
import { useMemo } from 'react';
import { useDynamicPermission } from './useDynamicPermission';

export const useOrderPermissions = () => {
  const {
    user,
    userRoles,
    userPermissions,
    getAccessibleDepartments,
    isAdmin,
    checkDynamicPermission
  } = useDynamicPermission();

  // Kiểm tra có role analysis không
  const hasAnalysisRole = useMemo(() => {
    return isAdmin || userRoles.includes('analysis');
  }, [isAdmin, userRoles]);

  // Lấy tất cả permissions từ các phòng ban của user
  const aggregatedPermissions = useMemo(() => {
    if (!hasAnalysisRole) return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canImport: false,
      canExport: false
    };

    // Admin có tất cả quyền
    if (isAdmin) {
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canImport: true,
        canExport: true
      };
    }

    // Lấy tất cả permissions từ các phòng ban
    const allActions = new Set<string>();
    userPermissions.forEach(permission => {
      allActions.add(permission.action);
    });

    return {
      canRead: allActions.has('read'),
      canCreate: allActions.has('create'),
      canUpdate: allActions.has('update'),
      canDelete: allActions.has('delete'),
      canImport: allActions.has('import'),
      canExport: allActions.has('export')
    };
  }, [hasAnalysisRole, isAdmin, userPermissions]);

  // Kiểm tra permission cụ thể cho order
  const canAccessOrderAction = (action: string): boolean => {
    if (!hasAnalysisRole) return false;
    if (isAdmin) return true;
    
    // Kiểm tra user có action này trong bất kỳ phòng ban nào không
    return userPermissions.some(permission => permission.action === action);
  };

  // Lấy danh sách phòng ban có thể truy cập với action cụ thể
  const getDepartmentsWithAction = (action: string): string[] => {
    if (!hasAnalysisRole) return [];
    if (isAdmin) return getAccessibleDepartments();
    
    return userPermissions
      .filter(permission => permission.action === action)
      .map(permission => permission.name);
  };

  return {
    user,
    hasAnalysisRole,
    canAccessOrderManagement: hasAnalysisRole,
    ...aggregatedPermissions,
    canAccessOrderAction,
    getDepartmentsWithAction,
    // Shortcuts cho các action thường dùng
    canReadOrder: canAccessOrderAction('read'),
    canCreateOrder: canAccessOrderAction('create'),
    canUpdateOrder: canAccessOrderAction('update'),
    canDeleteOrder: canAccessOrderAction('delete'),
    canImportOrder: canAccessOrderAction('import'),
    canExportOrder: canAccessOrderAction('export'),
  };
};
