// Notification Entity
export interface Notification {
  id: number;
  title: string;
  content: string;
  is_read: number;
  created_at: string | Date;
  updated_at?: string | Date;
}
export interface Role {
  id: number;
  name: string;
  rolePermissions?: RolePermission[];
  users?: User[];
}

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

export interface Permission {
  id: number;
  name: string;
  action: string;
  rolePermissions?: RolePermission[];
}

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
  zaloLinkStatus?: number;
  zaloName?: string;
  avatarZalo?: string;
}

export interface UserWithPermissions extends User {
  permissions: Permission[];
}

export interface RolePermission {
  id?: number;
  roleId: number;
  permissionId: number;
  isActive: boolean;
  role?: Role;
  permission?: Permission;
  createdAt?: Date;
  updatedAt?: Date;
  deleted_at?: string | Date;
}

export interface FilterParams {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
}

export interface UpdatePermissionsDto {
  permissionIds: number[];
}

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
  pay_later?: boolean | string | Date; // Can be boolean, date string, or Date
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

// DebtLog Entity - Updated to match API response structure
export interface DebtLog {
  id: number;
  debt_config_id?: number;
  
  // Customer information
  customer_code?: string;
  customer_name?: string;
  customer_type?: string;
  customer_gender?: string;
  
  // Debt messages and image
  image_url?: string;
  debt_message?: string;
  remind_message_1?: string;
  remind_message_2?: string;
  business_remind_message?: string;
  
  // Timing information
  send_time?: string | Date;
  remind_time_1?: string | Date;
  remind_time_2?: string | Date;
  
  // Configuration
  is_send?: boolean;
  is_repeat?: boolean;
  day_of_week?: number;
  gap_day?: number;
  
  // Status and tracking
  remind_status?: string;
  send_last_at?: string | Date;
  last_update_at?: string | Date;
  
  // Related entities
  actor?: {
    id?: number;
    fullName: string;
    username: string;
  };
  employee?: {
    id?: number;
    fullName: string;
    username: string;
  };
  
  // Additional fields
  conv_id?: string;
  render?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  
  // Legacy fields (for backward compatibility)
  debt_msg?: string;
  send_at?: string | Date;
  first_remind?: string;
  first_remind_at?: string | Date;
  second_remind?: string;
  second_remind_at?: string | Date;
  sale_msg?: string;
  debt_img?: string;
  
  // API Response structure - nested debt_logs array
  debt_logs?: DebtLog[];
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


export interface PermissionCheckParams {
  departmentSlug: string;
  action: string;
}