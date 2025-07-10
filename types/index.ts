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

// DebtConfig Entity
export interface DebtConfig {
  id: number;
  customer_code: string;
  customer_name: string;
  customer_type: string;
  day_of_week?: number;
  gap_day?: number;
  is_send?: boolean;
  is_repeat?: boolean;
  send_last_at?: string | Date;
  last_update_at?: string | Date;
  actor_id?: number;
  employee_id?: number;
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date;
}

// Debt Entity
export interface Debt {
  id: number;
  customer_raw_code: string;
  invoice_code: string;
  bill_code: string;
  total_amount: number;
  remaining: number;
  issue_date?: string | Date;
  due_date?: string | Date;
  pay_later?: boolean;
  status?: string;
  sale_id?: number;
  sale_name_raw?: string;
  employee_code_raw?: string;
  note?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date;
  debt_config_id?: number;
}

// DebtLog Entity
export interface DebtLog {
  id: number;
  debt_config_id: number;
  debt_msg: string;
  send_at: string | Date;
  first_remind?: string;
  first_remind_at?: string | Date;
  second_remind?: string;
  second_remind_at?: string | Date;
  sale_msg?: string;
  conv_id?: string;
  debt_img?: string;
  remind_status?: string;
  render?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

// DebtHistory Entity
export interface DebtHistory {
  id: number;
  debt_log_id: number;
  debt_msg: string;
  send_at: string | Date;
  first_remind?: string;
  first_remind_at?: string | Date;
  second_remind?: string;
  second_remind_at?: string | Date;
  sale_msg?: string;
  conv_id?: string;
  debt_img?: string;
  remind_status?: string;
  render?: string;
}

// DTO cho Update User Roles and Permissions
export interface UpdateUserRolesPermissionsDto {
  departmentIds: number[];
  roleIds: number[];
  permissionIds: number[];
  rolePermissions: { roleId: number; permissionId: number; isActive: boolean }[];
}
