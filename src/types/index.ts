// User and Authentication types
export interface User {
  id: number
  username: string
  email: string
  plan: string
  status: string
  created_at: string
  last_login?: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (phone: string, otp: string) => Promise<void>
  logout: () => void
  sendOTP: (phone: string) => Promise<void>
  isLoading: boolean
  isAuthenticated: boolean
}

// Forwarding Pair types
export interface ForwardingPair {
  id: number
  name: string
  source_platform: 'telegram' | 'discord'
  target_platform: 'telegram' | 'discord'
  source_id: string
  target_id: string
  status: 'active' | 'paused' | 'error'
  delay_mode: 'realtime' | '24h' | 'custom'
  delay_minutes: number
  messages_forwarded: number
  created_at: string
  last_forwarded?: string
  copy_mode: boolean
  custom_header?: string
  custom_footer?: string
  remove_header: boolean
  remove_footer: boolean
}

// Account types
export interface TelegramAccount {
  id: number
  user_id: number
  phone_number: string
  username?: string
  first_name?: string
  last_name?: string
  is_active: boolean
  session_data?: string
  created_at: string
  last_seen?: string
}

export interface DiscordAccount {
  id: number
  user_id: number
  bot_token: string
  bot_username?: string
  is_active: boolean
  guilds_count: number
  created_at: string
  last_seen?: string
}

// Analytics types
export interface UserStats {
  active_pairs: number
  total_messages_forwarded: number
  messages_today: number
  messages_this_week: number
  success_rate: number
  avg_delay: number
}

export interface SystemStats {
  total_users: number
  active_sessions: number
  total_forwarding_pairs: number
  messages_processed_today: number
  queue_health: {
    high_priority: number
    medium_priority: number
    low_priority: number
  }
  error_rate: number
}

export interface MessageVolumeData {
  date: string
  message_count: number
  success_count: number
  error_count: number
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  status: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

// UI State types
export interface DashboardState {
  isLoading: boolean
  error: string | null
  userStats: UserStats | null
  systemStats: SystemStats | null
  forwardingPairs: ForwardingPair[]
  selectedPairs: number[]
}

// Notification types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
}