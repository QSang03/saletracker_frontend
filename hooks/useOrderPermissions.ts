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
    isViewRole,
    isPM,
    isManager,
    checkDynamicPermission
  } = useDynamicPermission();

  // ✅ SỬA: Logic mới cho PM và Manager
  // PM chỉ được phép xem khi có role analysis
  // User có cả PM và Manager thì xem được như role Manager
  const hasAnalysisRole = useMemo(() => {
    // Admin luôn có quyền
    if (isAdmin) return true;
    
    // View role luôn có quyền
    if (isViewRole) return true;
    
    // User có role analysis luôn có quyền
    if (userRoles.includes('analysis')) return true;
    
    // User có cả PM và Manager thì xem được như role Manager
    if (isPM && isManager) return true;
    
    // PM đơn thuần (không có analysis) thì KHÔNG được phép xem
    if (isPM && !userRoles.includes('analysis')) return false;
    
    // Manager đơn thuần thì có quyền
    if (isManager) return true;
    
    return false;
  }, [isAdmin, isViewRole, isPM, isManager, userRoles]);

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

    // Role view chỉ có quyền read và export
    if (isViewRole) {
      return {
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canImport: false,
        canExport: true
      };
    }

    // ✅ SỬA: User có cả PM và Manager thì có quyền như Manager
    if (isPM && isManager) {
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canImport: true,
        canExport: true
      };
    }

    // User có role analysis có tất cả quyền
    if (userRoles.includes('analysis')) {
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canImport: true,
        canExport: true
      };
    }

    // Manager đơn thuần có tất cả quyền
    if (isManager) {
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
  }, [hasAnalysisRole, isAdmin, isViewRole, isPM, isManager, userRoles, userPermissions]);

  // Kiểm tra permission cụ thể cho order
  const canAccessOrderAction = (action: string): boolean => {
    if (!hasAnalysisRole) return false;
    if (isAdmin) return true;
    
    // Role view chỉ có quyền read và export
    if (isViewRole) {
      return action === 'read' || action === 'export';
    }
    
    // ✅ SỬA: User có cả PM và Manager thì có quyền như Manager
    if (isPM && isManager) {
      // Manager có tất cả quyền
      return true;
    }
    
    // User có role analysis luôn có quyền
    if (userRoles.includes('analysis')) {
      return true;
    }
    
    // Manager đơn thuần có tất cả quyền
    if (isManager) {
      return true;
    }
    
    // Kiểm tra user có action này trong bất kỳ phòng ban nào không
    return userPermissions.some(permission => permission.action === action);
  };

  // Lấy danh sách phòng ban có thể truy cập với action cụ thể
  const getDepartmentsWithAction = (action: string): string[] => {
    if (!hasAnalysisRole) return [];
    if (isAdmin) return getAccessibleDepartments();
    
    // ✅ SỬA: User có cả PM và Manager thì có quyền truy cập tất cả phòng ban
    if (isPM && isManager) {
      return getAccessibleDepartments();
    }
    
    // User có role analysis có quyền truy cập tất cả phòng ban
    if (userRoles.includes('analysis')) {
      return getAccessibleDepartments();
    }
    
    // Manager đơn thuần có quyền truy cập tất cả phòng ban
    if (isManager) {
      return getAccessibleDepartments();
    }
    
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
