import type { User, Department, Permission } from "@/types";
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
      onUpdateUserRolesPermissions={onUpdateUserRolesPermissions}
    />
  );
}