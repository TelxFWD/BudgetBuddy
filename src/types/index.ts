// API Response Types
export interface User {
  id: number;
  username: string;
  email: string;
  plan: 'free' | 'pro' | 'elite';
  status: 'active' | 'suspended' | 'banned';
  created_at: string;
  last_login?: string;
  plan_expires_at?: string;
  max_pairs: number;
  max_telegram_accounts: number;
  max_discord_accounts: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TelegramOTPRequest {
  phone_number: string;
}

export interface TelegramOTPVerify {
  phone_number: string;
  otp_code: string;
}

export interface TelegramAccount {
  id: number;
  user_id: number;
  telegram_user_id: number;
  phone_number: string;
  status: 'active' | 'inactive' | 'suspended' | 'disconnected' | 'reconnecting';
  created_at: string;
  last_seen?: string;
  display_name?: string;
  username?: string;
  channels?: TelegramChannel[];
}

export interface DiscordAccount {
  id: number;
  user_id: number;
  discord_token: string;
  discord_servers: DiscordServer[];
  status: 'active' | 'inactive' | 'suspended' | 'disconnected' | 'reconnecting';
  created_at: string;
  last_seen?: string;
  display_name?: string;
}

export interface DiscordServer {
  id: string;
  name: string;
  channels: DiscordChannel[];
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: string;
}

export interface TelegramChannel {
  id: string;
  title: string;
  username?: string;
  type: 'channel' | 'group' | 'supergroup';
  member_count?: number;
}

export interface ForwardingPair {
  id: number;
  source_platform: 'telegram' | 'discord';
  source_account_id: number;
  source_chat_id: string;
  source_chat_name?: string;
  destination_platform: 'telegram' | 'discord';
  destination_account_id: number;
  destination_chat_id: string;
  destination_chat_name?: string;
  delay_seconds: number;
  is_active: boolean;
  silent_mode: boolean;
  copy_mode: boolean;
  created_at: string;
  last_forwarded?: string;
  messages_count?: number;
  success_rate?: number;
  queue_status?: 'idle' | 'processing' | 'paused' | 'error';
}

export interface ForwardingPairCreate {
  source_platform: 'telegram' | 'discord';
  source_account_id: number;
  source_chat_id: string;
  destination_platform: 'telegram' | 'discord';
  destination_account_id: number;
  destination_chat_id: string;
  delay_seconds: number;
  silent_mode: boolean;
  copy_mode: boolean;
}

export interface ForwardingPairUpdate {
  delay_seconds?: number;
  is_active?: boolean;
  silent_mode?: boolean;
  copy_mode?: boolean;
}

export interface UserStats {
  active_pairs: number;
  total_messages_forwarded: number;
  messages_today: number;
  messages_this_week: number;
  success_rate: number;
  avg_delay: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: string;
    redis: string;
    celery: string;
  };
}

// UI State Types
export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
}

export interface DashboardState {
  stats: UserStats | null;
  health: SystemHealth | null;
  isLoading: boolean;
}

export interface NotificationState {
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

// Queue and sync types
export interface QueueStatus {
  total_tasks: number;
  pending_tasks: number;
  processing_tasks: number;
  failed_tasks: number;
  retry_tasks: number;
}

export interface SessionHealth {
  telegram_sessions: Record<number, {
    status: 'connected' | 'disconnected' | 'reconnecting';
    last_ping: string;
    error_count: number;
  }>;
  discord_sessions: Record<number, {
    status: 'connected' | 'disconnected' | 'reconnecting';
    last_ping: string;
    error_count: number;
  }>;
}

// Bulk operations
export interface BulkOperation {
  action: 'pause' | 'resume' | 'delete';
  pair_ids: number[];
  account_id?: number;
}

// Real-time sync types
export interface RealTimeUpdate {
  type: 'pair_status' | 'session_health' | 'queue_status' | 'new_pair' | 'pair_deleted';
  data: any;
  timestamp: string;
}

// Plan limits
export interface PlanLimits {
  max_forwarding_pairs: number;
  max_telegram_accounts: number;
  max_discord_accounts: number;
  current_pairs: number;
  current_telegram_accounts: number;
  current_discord_accounts: number;
  plan: string;
}

// Forwarding Management State
export interface ForwardingState {
  pairs: ForwardingPair[];
  telegramAccounts: TelegramAccount[];
  discordAccounts: DiscordAccount[];
  selectedAccount: number | null;
  isLoading: boolean;
  error: string | null;
  queueStatus: QueueStatus | null;
  sessionHealth: SessionHealth | null;
  planLimits: PlanLimits | null;
}