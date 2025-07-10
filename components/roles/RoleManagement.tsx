import type { User, Department, Permission, RolePermission } from "@/types";
import RoleTable from "./RoleTable";

export interface RoleManagementProps {
  users: User[];
  rolesGrouped: {
    main: { id: number; name: string }[];
    sub: { id: number; name: string; display_name: string }[];
  };
  departments: Department[];
  permissions: Permission[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => Promise<void>;
  allRolePermissions: RolePermission[];
  onUpdateUserRolesPermissions: (
    userId: number,
    data: { departmentIds: number[]; roleIds: number[]; permissionIds: number[] }
  ) => Promise<void>;
}

export default function RoleManagement({
  users,
  rolesGrouped,
  departments,
  permissions,
  expectedRowCount,
  startIndex,
  onReload,
  allRolePermissions,
  onUpdateUserRolesPermissions,
}: RoleManagementProps) {
  return (
    <RoleTable
      users={users}
      rolesGrouped={rolesGrouped}
      departments={departments}
      permissions={permissions}
      expectedRowCount={expectedRowCount}
      startIndex={startIndex}
      onReload={onReload}
      allRolePermissions={allRolePermissions}
      onUpdateUserRolesPermissions={onUpdateUserRolesPermissions}
    />
  );
}