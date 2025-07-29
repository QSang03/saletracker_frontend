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
  server_ip?: string;
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
  zaloGender?: string;
  lastOnlineAt?: Date | string;
  server_ip?: string;
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

// Order Entity
export interface Order {
  id: number | string;
  conversation_id?: number | string;
  order_history?: Record<string, any>;
  associated_message_ids?: string[];
  order_code?: string;
  code?: string;
  order_id?: number;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount?: number;
  total?: number;
  status?: string;
  note?: string;
  sale_by_id?: number;
  sale_by?: User;
  customer?: {
    name?: string;
    fullName?: string;
  };
  details?: OrderDetail[];
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date;
}

// OrderDetail Entity
export interface OrderDetail {
  id: number | string;
  order_id: number | string;
  order?: Order; // ✅ Nested Order với sale_by info
  product_id?: number | string;
  product_name?: string;
  quantity: number;
  unit_price: number | string;
  raw_item?: string;
  customer_request_summary?: string;
  extended?: number;
  customer_name?: string;
  total_price?: number;
  status?: string;
  note?: string;
  notes?: string;
  reason?: string;
  zaloMessageId?: string;
  metadata?: Record<string, any>;
  product?: Product;
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date;
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
  error_msg: string;

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
  rolePermissions: {
    roleId: number;
    permissionId: number;
    isActive: boolean;
  }[];
}

export interface PermissionCheckParams {
  departmentSlug: string;
  action: string;
}

// Campaign Types
export enum CampaignType {
  HOURLY_KM = "hourly_km",
  DAILY_KM = "daily_km",
  THREE_DAY_KM = "3_day_km",
  WEEKLY_SP = "weekly_sp",
  WEEKLY_BBG = "weekly_bbg",
}

export enum CampaignStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

export enum SendMethod {
  API = "api",
  BOT = "bot",
}

export enum LogStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  CUSTOMER_REPLIED = "customer_replied",
  STAFF_HANDLED = "staff_handled",
  REMINDER_SENT = "reminder_sent",
}

// Campaign Interfaces
export interface Campaign {
  id: string;
  name: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  send_method: SendMethod;
  department: Department;
  created_by: User;
  created_at: Date;
  updated_at: Date;
  customer_count?: number;
  progress_percentage?: number;
  response_rate?: number;
}

export interface CampaignCustomer {
  id: string;
  phone_number: string;
  full_name: string;
  salutation?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignInteractionLog {
  id: string;
  campaign: Campaign;
  customer: CampaignCustomer;
  message_content_sent: string;
  attachment_sent?: Record<string, any>;
  status: LogStatus;
  sent_at?: Date;
  customer_replied_at?: Date;
  customer_reply_content?: string;
  staff_handled_at?: Date;
  staff_reply_content?: string;
  staff_handler?: User;
  error_details?: Record<string, any>;
  conversation_metadata?: Record<string, any>;
  reminder_metadata?: ReminderMetadata;
}

// Campaign Configuration Types
export type Attachment =
  | { type: "image"; base64: string }
  | { type: "link"; url: string }
  | { type: "file"; base64: string; filename: string }
  | null;

export type InitialMessage = {
  type: "initial";
  text: string;
  attachment: Attachment;
};

export type ReminderMessage = {
  type: "reminder";
  offset_minutes: number;
  text: string;
  attachment: Attachment;
};

export type PromoMessageStep = InitialMessage | ReminderMessage;
export type PromoMessageFlow =
  | [InitialMessage, ...ReminderMessage[]]
  | [InitialMessage];

export type DailyPromotion = {
  type: "hourly";
  start_time: string;
  end_time: string;
  remind_after_minutes: number;
};

export type WeeklyPromotion = {
  type: "weekly";
  day_of_week: number;
  time_of_day: string;
};

export type ThreeDayPromotion = {
  type: "3_day";
  days_of_week: number[];
  time_of_day: string;
};

export type ReminderMetadataItem = {
  message: string;
  remindAt: string;
  attachment_sent?: Record<string, any>;
  error?: string;
};

export type ReminderMetadata = ReminderMetadataItem[];

// Campaign Form Data
// export interface CampaignFormData {
//   name: string;
//   campaign_type: CampaignType;
//   schedule_config?: DailyPromotion | WeeklyPromotion | ThreeDayPromotion;
//   messages?: PromoMessageFlow;
//   reminders?: Array<{
//     content: string;
//     minutes: number;
//   }>;
//   email_reports?: {
//     recipients_to: string;
//     recipients_cc?: string[];
//     report_interval_minutes?: number;
//     stop_sending_at_time?: string;
//     is_active: boolean;
//     send_when_campaign_completed: boolean;
//   };
//   customers?: Array<{
//     phone_number: string;
//     full_name: string;
//     salutation?: string;
//   }>;
// }

// Campaign Content Types
export interface CampaignContent {
  id: string;
  campaign_id: string;
  message_content: string;
  attachment_type?: "image" | "file" | "link";
  attachment_url?: string;
  attachment_filename?: string;
  created_at: string | Date;
  updated_at: string | Date;
}

// Campaign Customer Types
export interface CampaignCustomer {
  id: string;
  phone_number: string;
  full_name: string;
  salutation?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Campaign Email Report Types
export interface CampaignEmailReport {
  id: string;
  campaign_id: string;
  recipients_to: string;
  recipients_cc?: string[];
  report_interval_minutes?: number;
  stop_sending_at_time?: string;
  is_active: boolean;
  send_when_campaign_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

// Campaign Interaction Log Types

export interface CampaignInteractionLog {
  id: string;
  campaign_id: string;
  customer_phone: string;
  customer_name: string;
  customer_salutation?: string;
  message_content: string;
  sent_at?: Date;
  reminder_times?: Array<{
    reminder_number: number;
    sent_at: Date;
    content: string;
  }>;
  status: LogStatus;
  customer_response?: string;
  customer_response_at?: Date;
  sale_response?: string;
  sale_response_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}


export interface CampaignFormData {
  id?: string; // Optional id for edit mode
  name: string;
  campaign_type: CampaignType;
  messages: {
    type: "initial";
    text: string;
    attachment?: {
      type: "image" | "link" | "file";
      url?: string;
      base64?: string;
      filename?: string;
    } | null;
  };
  schedule_config?: {
    type: "hourly" | "3_day" | "weekly";
    start_time?: string;
    end_time?: string;
    remind_after_minutes?: number;
    days_of_week?: number[];
    day_of_week?: number;
    time_of_day?: string;
  };
  reminders?: Array<{
    content: string;
    minutes: number;
  }>;
  email_reports?: {
    recipients_to: string;
    recipients_cc?: string[];
    report_interval_minutes?: number;
    stop_sending_at_time?: string;
    is_active: boolean;
    send_when_campaign_completed: boolean;
  };
  customers?: Array<{
    phone_number: string;
    full_name: string;
    salutation?: string;
  }>;
}

export interface CampaignWithDetails extends Campaign {
  customer_count?: number;
  
  messages: {
    type: "initial";
    text: string;
    attachment?: {
      type: "image" | "link" | "file";
      url?: string;
      base64?: string;
      filename?: string;
    } | null;
  };
  
  schedule_config: {
    type: "hourly" | "3_day" | "weekly";
    start_time?: string;
    end_time?: string;
    remind_after_minutes?: number;
    days_of_week?: number[];
    day_of_week?: number;
    time_of_day?: string;
  };
  
  reminders: Array<{
    content: string;
    minutes: number;
  }>;
  
  email_reports?: {
    recipients_to: string;
    recipients_cc?: string[];
    report_interval_minutes?: number;
    stop_sending_at_time?: string;
    is_active: boolean;
    send_when_campaign_completed: boolean;
  };
  
  customers: Array<{
    phone_number: string;
    full_name: string;
    salutation?: string;
  }>;
}