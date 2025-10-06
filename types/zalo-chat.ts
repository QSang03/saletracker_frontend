// Types for Zalo NKC Chat feature (mapped from backend API)

export interface Conversation {
  id: number;
  zalo_conversation_id: string;
  conversation_name: string;
  conversation_type: 'private' | 'group' | 'official' | 'business' | 'bot';
  unread_count: number;
  total_messages: number;
  last_message_timestamp: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  account_username: string;
  account_display_name: string;
  last_message?: {
    id: number;
    content: string;
    content_type: string;
    timestamp: string;
    is_outgoing: boolean;
    sender_name: string;
  };
  participant?: {
    name: string;
    real_name?: string | null;
    avatar?: string | null;
    zalo_id: string;
  } | null;
  is_group: boolean;
  is_private: boolean;
}

export interface MessageReaction {
  user_id: string;
  user_name: string;
  reaction_type: string;
  reaction_text?: string | null;
  created_at: string;
}

export interface MessageSender {
  id: number;
  name: string;
  zalo_id: string;
  is_favorite: boolean;
  is_blocked: boolean;
}

export interface MessageMetadata {
  media_metadata?: any;
  client_message_id?: string;
  raw_websocket_data?: any;
  ar_flag?: number;
  ov2_flag?: number;
  ar_batch_id?: string;
  ar_processed_at?: string;
  ov2_skip_reason?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string; // JSON string from backend
  content_type:
    | 'TEXT'
    | 'IMAGE'
    | 'VIDEO'
    | 'AUDIO'
    | 'FILE'
    | 'STICKER'
    | 'LOCATION'
    | 'CONTACT'
    | 'SYSTEM'
    | 'QUOTE';
  timestamp: string;
  is_outgoing: boolean;
  is_read: boolean;
  metadata: MessageMetadata;
  created_at: string;
  updated_at: string;
  quoted_message_id?: number | null;
  quote_text?: string | null;
  reactions: MessageReaction[];
  sender: MessageSender;
  quoted_message?: Message | null;
  is_text: boolean;
  has_media: boolean;
  is_quote: boolean;
  formatted_timestamp: string;
}

export interface ContactNameHistoryItem {
  at: string;
  new: string;
  old: string;
}

export interface Contact {
  id: number;
  zalo_account_id: number;
  display_name: string;
  info_metadata?: {
    zName?: string;
    avatar?: string;
    name_history?: ContactNameHistoryItem[];
  } | null;
  zalo_contact_id: string;
  raw_payload?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: number;
  account_username: string;
  account_display_name: string;
  z_name?: string | null;
  avatar?: string | null;
  pb_name?: string | null;
  alias_name?: string | null;
  name_history?: ContactNameHistoryItem[] | null;
  has_private_conversation: boolean;
  last_message?: Message | null;
  has_info: boolean;
  is_online: boolean;
}

export interface AccountStats {
  contact_count: number;
  conversation_count: number;
  message_count: number;
}

export interface Account {
  id: number;
  zalo_username: string;
  zalo_id: string;
  display_name: string;
  avatar_url?: string;
  gender?: string;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  stats: AccountStats;
  is_online: number;
  formatted_last_active: string;
}

export type GroupRole = 'admin' | 'moderator' | 'member' | 'owner';

export interface GroupMember {
  id: number;
  conversation_id: number;
  contact_id: number;
  role: string;
  is_owner: boolean;
  is_active: boolean;
  metadata?: any;
  is_muted: boolean;
  is_blocked: boolean;
  zalo_group_member_id?: string | null;
  raw_payload?: any;
  joined_at: string;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
  contact: {
    id: number;
    display_name: string;
    zalo_contact_id: string;
    info_metadata?: {
      zName?: string;
      avatar?: string;
      pbName?: string;
      name_history?: Array<{
        at: string;
        new: string;
        old: string;
      }>;
    } | null;
    is_favorite: boolean;
    is_blocked: boolean;
  };
  group: {
    id: number;
    name: string;
    type: string;
  };
  stats: {
    message_count: number;
    reaction_count: number;
  };
  is_admin: number;
  is_moderator: number;
  can_manage_group: number;
  formatted_joined_at: string;
  formatted_last_seen?: string | null;
  is_online: boolean;
}

export interface DashboardStats {
  stats: {
    total_accounts: number;
    total_conversations: number;
    total_messages: number;
    total_contacts: number;
    unread_messages: number;
    active_groups: number;
    blocked_contacts: number;
    favorite_contacts: number;
    archived_conversations: number;
    pinned_conversations: number;
    muted_conversations: number;
  };
  period_stats: {
    new_messages: number;
    new_conversations: number;
    new_contacts: number;
    active_users: number;
    message_growth_rate: number;
    conversation_growth_rate: number;
    contact_growth_rate: number;
  };
  trends: {
    daily_messages: Array<{ date: string; count: number }>;
    daily_conversations: Array<{ date: string; count: number }>;
    daily_contacts: Array<{ date: string; count: number }>;
  };
  breakdown: {
    conversation_types: Record<string, number>;
    message_types: Record<string, number>;
    contact_types: Record<string, number>;
    account_statuses: Record<string, number>;
  };
  performance: {
    avg_response_time: number;
    success_rate: number;
    error_rate: number;
    uptime: number;
  };
  generated_at: string;
  period: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
}

export interface ConversationsResponse {
  success: boolean;
  data: Conversation[];
  pagination: PaginationMeta;
  filters?: Record<string, any>;
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
  pagination: PaginationMeta;
  filters?: Record<string, any>;
}

export interface GroupMembersResponse {
  success: boolean;
  data: GroupMember[];
  total_count: number;
  conversation_id: number;
  filters?: Record<string, any>;
}


