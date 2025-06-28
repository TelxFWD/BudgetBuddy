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
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_seen?: string;
}

export interface DiscordAccount {
  id: number;
  user_id: number;
  discord_token: string;
  discord_servers: string[];
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_seen?: string;
}

export interface ForwardingPair {
  id: number;
  source_platform: 'telegram' | 'discord';
  source_account_id: number;
  source_chat_id: string;
  destination_platform: 'telegram' | 'discord';
  destination_account_id: number;
  destination_chat_id: string;
  delay_seconds: number;
  is_active: boolean;
  silent_mode: boolean;
  copy_mode: boolean;
  created_at: string;
  last_forwarded?: string;
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