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
  zaloLinkStatus?: number; // 0: chưa liên kết, 1: đã liên kết, 2: lỗi liên kết
  zaloName?: string;
  avatarZalo?: string;
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

export interface SystemConfig {
  id: number;
  name: string;
  display_name?: string;
  value: string;
  type?: string;
  section?: string;
  status?: number;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface CreateSystemConfigDto {
  name: string;
  display_name?: string;
  value: string;
  type?: string;
  section?: string;
  status?: number;
}

export interface UpdateSystemConfigDto {
  value: string;
  display_name?: string;
  type?: string;
  status?: number;
}

export interface UpdateUserDto extends Omit<CreateUserDto, "password"> {
  password?: string;
}

// Product Entity
export interface Category {
  id: number;
  catName: string;
}

export interface Brand {
  id: number;
  name: string;
  descriptions: string;
}

export interface Product {
  id: number;
  productName: string;
  categories?: Category[];
  brand?: Brand;
}
