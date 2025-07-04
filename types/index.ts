// types/index.ts

// Role Entity
export interface Role {
  id: number;
  name: string;
  rolePermissions?: RolePermission[];
  users?: User[];
}

// Department Entity
export interface Department {
  id: number;
  name: string;
  slug: string;
  users?: User[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string;
  manager?: {
    id: number;
    fullName: string;
    username: string;
  };
}

// Permission Entity
export interface Permission {
  id: number;
  name: string; // Thêm trường name cho đồng bộ backend (đại diện cho department/module)
  action: string;
  rolePermissions?: RolePermission[];
}

// User Entity
export interface User {
  id: number;
  username: string;
  fullName?: string;
  nickName?: string;
  email?: string;
  employeeCode?: string;
  status: "active" | "inactive";
  isBlock: boolean;
  password?: string;
  roles: Role[];
  departments: Department[];
  lastLogin?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string;
}

// RolePermission Entity (bảng trung gian)
export interface RolePermission {
  id?: number;
  roleId: number;
  permissionId: number;
  isActive: boolean;
  role?: Role;
  permission?: Permission;
  createdAt?: Date;
  updatedAt?: Date;
}

// Filter Params cho User
export interface FilterParams {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
}

// DTO cho phân quyền
export interface UpdatePermissionsDto {
  permissionIds: number[];
}

// DTO cho tạo/cập nhật User
export interface CreateUserDto {
  username: string;
  password: string;
  fullName?: string;
  nickName?: string;
  email?: string;
  employeeCode?: string;
  status?: "active" | "inactive";
  departmentIds?: number[];
  roleIds?: number[];
}

export interface ChangeUserLog {
  id: number;
  userId: number;
  fullNames: string[];
  timeChanges: string[];
  changerIds: number[];
}

export interface UpdateUserDto extends Omit<CreateUserDto, "password"> {
  password?: string;
}
