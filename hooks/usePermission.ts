// hooks/usePermission.ts
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import {
  PermissionCheckParams,
  UserWithPermissions,
  Permission,
  Role,
} from "../types";

export type UsePermissionResult = {
  user: UserWithPermissions | null;
  canAccess: (departmentSlug: string, action: string) => boolean;
  getAllUserPermissions: () => Permission[];
  getAllUserRoles: () => Role[];
  refreshPermissions: () => void;
  isLoadingPermissions: boolean;
};

export const usePermission = (): UsePermissionResult => {
  const { user } = useContext(AuthContext);
  const [dbPermissions, setDbPermissions] = useState<Permission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // Load permissions from database for view role
  const loadDbPermissions = async () => {
    if (!user) return;
    
    // Chỉ load từ database nếu user có role "view"
    const hasViewRole = user.roles?.some((role: Role) => role.name === "view");
    if (!hasViewRole) return;

    setIsLoadingPermissions(true);
    try {
      // Lấy token từ localStorage và parse nếu cần
      let token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Nếu token được lưu dưới dạng JSON string, parse nó
          const parsed = JSON.parse(token);
          token = parsed;
        } catch {
          // Nếu không phải JSON, sử dụng trực tiếp
          token = token;
        }
      }

      const response = await fetch(`/api/users/${user.id}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDbPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Error loading permissions from database:', error);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  // Load permissions khi component mount hoặc user thay đổi
  useEffect(() => {
    loadDbPermissions();
  }, [user?.id]);

  // Helper function để lấy tất cả permissions từ roles (thông qua rolePermissions)
  const getUserPermissions = (user: UserWithPermissions): Permission[] => {
    if (!user?.permissions) return [];

    // Loại bỏ duplicate permissions dựa trên name + action
    const uniqueMap = new Map<string, Permission>();
    user.permissions.forEach((permission) => {
      const key = `${permission.name}:${permission.action}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, permission);
      }
    });

    return Array.from(uniqueMap.values());
  };

  const checkPermission = ({
    departmentSlug,
    action,
  }: PermissionCheckParams): boolean => {
    if (!user) return false;

    // Kiểm tra user có role admin hoặc scheduler không
    const isAdminOrScheduler = user.roles?.some((role: Role) => 
      role.name === "admin" || role.name === "scheduler"
    );

    if (isAdminOrScheduler) return true;

    // Kiểm tra user có role PM không
    const isPM = user.roles?.some((role: Role) => role.name === "PM");
    if (isPM) return true;

    // Kiểm tra role "view" - sử dụng permissions từ database
    const isViewRole = user.roles?.some((role: Role) => role.name === "view");
    if (isViewRole) {
      // Kiểm tra trong database permissions
      const hasPermission = dbPermissions.some(
        (permission) =>
          permission.name === departmentSlug && permission.action === action
      );
      return hasPermission;
    }

    // Kiểm tra user có role manager của department này không
    const isManagerOfDepartment = user.roles?.some((role: Role) => 
      role.name === `manager-${departmentSlug}`
    );

    if (isManagerOfDepartment) return true;

    // Lấy tất cả roles của user
    const userRoles = user.roles?.map((role: Role) => role.name) || [];

    // Tạo role cần kiểm tra
    const requiredRoles = [
      `user-${departmentSlug}`,
      `pm-${departmentSlug}`,
    ];

    // Kiểm tra user có role phù hợp không
    const hasRole = userRoles.some((role: string) =>
      requiredRoles.includes(role)
    );

    // Lấy tất cả permissions từ roles
    const userPermissions = getUserPermissions(user);

    // Kiểm tra user có permission phù hợp không
    const hasPermission = userPermissions.some(
      (permission) =>
        permission.name === departmentSlug && permission.action === action
    );

    // Nếu là manager của department thì không cần kiểm tra permission
    if (isManagerOfDepartment) return true;

    // User thường cần có cả role và permission
    return hasRole && hasPermission;
  };

  const canAccess = (departmentSlug: string, action: string): boolean => {
    const result = checkPermission({ departmentSlug, action });
    return result;
  };

  // Helper function để lấy tất cả permissions của user
  const getAllUserPermissions = (): Permission[] => {
    if (!user) return [];
    
    // Nếu có role "view", trả về permissions từ database
    const isViewRole = user.roles?.some((role: Role) => role.name === "view");
    if (isViewRole) {
      return dbPermissions;
    }
    
    return getUserPermissions(user);
  };

  // Helper function để lấy tất cả roles của user
  const getAllUserRoles = (): Role[] => {
    return user?.roles || [];
  };

  // Function để refresh permissions từ database
  const refreshPermissions = () => {
    loadDbPermissions();
  };

  return {
  user,
    canAccess,
    getAllUserPermissions,
  getAllUserRoles,
    refreshPermissions,
    isLoadingPermissions,
  };
};
