// services/scheduleService.ts
import { api } from '@/lib/api';
import { 
  DepartmentSchedule, 
  CreateDepartmentScheduleDto, 
  UpdateDepartmentScheduleDto, 
  QueryDepartmentScheduleDto,
  ScheduleStatus,
  ScheduleType,
  DailyDatesConfig,
  HourlySlotsConfig
} from '@/types/schedule';

export class ScheduleService {
  // Create new schedule
  static async create(data: CreateDepartmentScheduleDto): Promise<DepartmentSchedule> {
    const response = await api.post('campaign-departments-schedules', data);
    return response.data;
  }

  // Get all schedules with query
  static async findAll(query?: QueryDepartmentScheduleDto): Promise<{
    data: DepartmentSchedule[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`campaign-departments-schedules?${params.toString()}`);
    return response.data;
  }

  // Get active schedules
  static async getActiveSchedules(): Promise<DepartmentSchedule[]> {
    const response = await api.get('campaign-departments-schedules/active');
    return response.data;
  }

  // Get schedules by department
  static async findByDepartment(departmentId: number): Promise<DepartmentSchedule[]> {
    const response = await api.get(`campaign-departments-schedules/department/${departmentId}`);
    return response.data;
  }

  // Get single schedule
  static async findOne(id: string): Promise<DepartmentSchedule> {
    const response = await api.get(`campaign-departments-schedules/${id}`);
    return response.data;
  }

  // Update schedule
  static async update(id: string, data: UpdateDepartmentScheduleDto): Promise<DepartmentSchedule> {
    const response = await api.patch(`campaign-departments-schedules/${id}`, data);
    return response.data;
  }

  // Update schedule status
  static async updateStatus(id: string, status: ScheduleStatus): Promise<DepartmentSchedule> {
    // Validate status trước khi gửi
    const validStatuses = Object.values(ScheduleStatus);
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const response = await api.patch(`campaign-departments-schedules/${id}/status`, { status });
    return response.data;
  }

  static async markAsExpired(id: string): Promise<DepartmentSchedule> {
    return this.updateStatus(id, ScheduleStatus.EXPIRED);
  }

  // Delete schedule
  static async remove(id: string): Promise<{ message: string }> {
    const response = await api.delete(`campaign-departments-schedules/${id}`);
    return response.data;
  }

  // Validate schedule config
  static validateScheduleConfig(
    config: DailyDatesConfig | HourlySlotsConfig, 
    type: ScheduleType
  ): boolean {
    if (type === ScheduleType.DAILY_DATES) {
      const dailyConfig = config as DailyDatesConfig;
      return dailyConfig.dates && dailyConfig.dates.length > 0;
    } else if (type === ScheduleType.HOURLY_SLOTS) {
      const hourlyConfig = config as HourlySlotsConfig;
      return hourlyConfig.slots && hourlyConfig.slots.length > 0;
    }
    return false;
  }
}
