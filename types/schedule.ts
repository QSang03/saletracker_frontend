import { Department } from ".";

// types/schedule.ts
export enum ScheduleType {
  DAILY_DATES = 'daily_dates',
  HOURLY_SLOTS = 'hourly_slots'
}

export enum ScheduleStatus {
  ACTIVE = 'active',      // Thay đổi từ 'ACTIVE' thành 'active'
  INACTIVE = 'inactive',  // Thay đổi từ 'INACTIVE' thành 'inactive'
  EXPIRED = 'expired'     // Thêm status mới
}

export interface DailyDatesConfig {
  dates: Array<{
    day_of_month: number;
    month: number;
    year?: number | undefined; // Năm có thể không được chỉ định
  }>;
}

export interface HourlySlotsConfig {
  slots: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    applicable_date?: string; // "YYYY-MM-DD", ngày áp dụng cụ thể, null = mọi ngày
  }>;
}

export interface DepartmentSchedule {
  id: string;
  name: string;
  description?: string;
  schedule_type: ScheduleType;
  schedule_config: DailyDatesConfig | HourlySlotsConfig;
  status: ScheduleStatus;
  department_id: number;
  department?: Department;
  created_by?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentScheduleDto {
  name: string;
  description?: string;
  schedule_type: ScheduleType;
  status?: ScheduleStatus;
  schedule_config: DailyDatesConfig | HourlySlotsConfig;
  department_id: number;
}

export interface UpdateDepartmentScheduleDto {
  name?: string;
  description?: string;
  schedule_type?: ScheduleType;
  status?: ScheduleStatus;
  schedule_config?: DailyDatesConfig | HourlySlotsConfig;
  department_id?: number;
}

export interface QueryDepartmentScheduleDto {
  name?: string;
  schedule_type?: ScheduleType;
  status?: ScheduleStatus;
  department_id?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// Schedule Collaboration Types
export interface SchedulePresence {
  userId: number;
  userName: string;
  departmentId: number;
  departmentName: string;
  avatar_zalo?: string; // ✅ THÊM: Avatar Zalo của user
  position: {
    x: number;
    y: number;
    dayIndex?: number;
    time?: string;
    date?: number;
    month?: number;
    year?: number;
    cellType?: 'timeSlot' | 'day';
    action?: 'clicked' | 'hover' | 'move';
  };
  isEditing: boolean;
  editingField?: string;
  lastSeen: string;
}

export interface ScheduleEditSession {
  userId: number;
  userName: string;
  departmentId: number;
  avatar_zalo?: string; // ✅ THÊM: Avatar Zalo của user
  fieldId: string;
  fieldType: 'calendar_cell' | 'form_field';
  coordinates?: {
    dayIndex?: number;
    time?: string;
    date?: number;
    month?: number;
    year?: number;
  };
  startedAt: string;
  expiresAt: string;
  isRenewed: boolean;
}

export interface SchedulePreviewPatch {
  userId: number;
  userName: string;
  departmentId: number;
  avatar_zalo?: string; // ✅ THÊM: Avatar Zalo của user
  fieldId: string;
  content: string;
  selection?: {
    start: number;
    end: number;
  };
  timestamp: string;
}

export interface ScheduleConflict {
  scheduleId: string;
  conflictingUsers: Array<{
    userId: number;
    userName: string;
    departmentId: number;
  }>;
  conflictType: 'version' | 'edit_session';
  detectedAt: string;
}

export interface ScheduleVersion {
  scheduleId: string;
  version: number;
  updatedBy: number;
  updatedAt: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}
