import { Campaign, CampaignWithDetails } from "@/types";

// ✅ Helper function để transform Campaign thành CampaignWithDetails  
export const transformToCampaignWithDetails = (campaign: Partial<CampaignWithDetails>): CampaignWithDetails => {
  return {
    ...campaign,
    // Đảm bảo có đầy đủ properties của CampaignWithDetails với default values
    id: campaign.id || '',
    name: campaign.name || '',
    campaign_type: campaign.campaign_type || 'hourly_km',
    status: campaign.status || 'draft',
    send_method: campaign.send_method || 'manual',
    created_at: campaign.created_at || new Date().toISOString(),
    updated_at: campaign.updated_at || new Date().toISOString(),
    department: campaign.department || { id: 0, name: '', slug: '', server_ip: '', createdAt: '', updatedAt: '', deletedAt: null },
    created_by: campaign.created_by || { id: 0, username: '', fullName: '', email: '', isBlock: false, employeeCode: '', status: 'active', lastLogin: null, nickName: '', deletedAt: null, createdAt: '', updatedAt: '', zaloLinkStatus: false, zaloName: '', avatarZalo: '', zaloGender: '', lastOnlineAt: null },
    messages: campaign.messages || { 
      type: 'initial' as const, 
      text: '', 
      attachment: null 
    },
    schedule_config: campaign.schedule_config || {
      type: 'hourly',
      start_time: undefined,
      end_time: undefined,
      remind_after_minutes: undefined,
      days_of_week: undefined,
      day_of_week: undefined,
      time_of_day: undefined,
    },
    reminders: campaign.reminders || [],
    customers: campaign.customers || [],
    email_reports: campaign.email_reports || undefined,
    start_date: campaign.start_date || undefined,
    end_date: campaign.end_date || undefined,
    customer_count: campaign.customer_count || 0,
  } as CampaignWithDetails;
};
