// API endpoints configuration
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    SEND_OTP: '/telegram/send-otp',
    VERIFY_OTP: '/telegram/verify-otp',
    REFRESH_TOKEN: '/auth/refresh',
    USER_INFO: '/auth/me',
    LINKED_ACCOUNTS: '/auth/linked-accounts',
  },
  
  // Forwarding Pairs
  PAIRS: {
    LIST: '/pairs',
    CREATE: '/pairs',
    UPDATE: (id: number) => `/pairs/${id}`,
    DELETE: (id: number) => `/pairs/${id}`,
    TOGGLE: (id: number) => `/pairs/${id}/toggle`,
    BULK_ACTION: '/pairs/bulk',
  },
  
  // Analytics
  ANALYTICS: {
    USER_STATS: '/analytics/user-stats',
    SYSTEM_STATS: '/analytics/system-stats',
    PAIR_STATS: '/analytics/forwarding-pairs',
    MESSAGE_VOLUME: '/analytics/message-volume',
    ERROR_SUMMARY: '/analytics/errors',
    SESSION_HEALTH: '/analytics/session-health',
  },
  
  // System
  SYSTEM: {
    HEALTH: '/health',
    STATS: '/stats',
  },
  
  // Admin (if applicable)
  ADMIN: {
    USERS: '/admin/users',
    SYSTEM_HEALTH: '/admin/system-health',
    BULK_ACTIONS: '/admin/bulk-actions',
  }
} as const