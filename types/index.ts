// types/index.ts

// Role Entity
export interface Role {
  id: number;
  name: string;
  rolePermissions: RolePermission[];
  users?: User[];
}

// Department Entity
export interface Department {
  id: number;
  name: string;
  users?: User[];
  departmentPermissions?: DepartmentPermission[];
}

// Permission Entity
export interface Permission {
  id: number;
  action: string;
  rolePermissions?: RolePermission[];
  departmentPermissions?: DepartmentPermission[];
}

// User Entity
export interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: "active" | "inactive";
  password?: string;
  roles: Role[];
  departments: Department[];
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
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

// DepartmentPermission Entity (bảng trung gian)
export interface DepartmentPermission {
  id: number;
  departmentId: number;
  permissionId: number;
  isActive: boolean;
  department?: Department;
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
  email?: string;
  phone?: string;
  avatar?: string;
  status?: "active" | "inactive";
  departmentIds?: number[];
  roleIds?: number[];
}

export interface UpdateUserDto extends Omit<CreateUserDto, 'password'> {
  password?: string;
}
