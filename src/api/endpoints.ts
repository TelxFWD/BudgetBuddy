import axiosInstance from './axiosInstance'

// Auth endpoints
export const authAPI = {
  sendOTP: (phone: string) => axiosInstance.post('/telegram/send-otp', { phone }),
  verifyOTP: (phone: string, otp: string) => axiosInstance.post('/telegram/verify-otp', { phone, otp }),
  refreshToken: (refresh_token: string) => axiosInstance.post('/auth/refresh', { refresh_token }),
  getMe: () => axiosInstance.get('/auth/me'),
  logout: () => axiosInstance.post('/auth/logout'),
}

// Forwarding pairs endpoints
export const forwardingAPI = {
  getPairs: () => axiosInstance.get('/forwarding/pairs'),
  createPair: (data: any) => axiosInstance.post('/forwarding/pairs', data),
  updatePair: (id: number, data: any) => axiosInstance.put(`/forwarding/pairs/${id}`, data),
  deletePair: (id: number) => axiosInstance.delete(`/forwarding/pairs/${id}`),
  pausePair: (id: number) => axiosInstance.post(`/forwarding/pairs/${id}/pause`),
  resumePair: (id: number) => axiosInstance.post(`/forwarding/pairs/${id}/resume`),
  bulkAction: (action: string, pairIds: number[]) => 
    axiosInstance.post('/forwarding/pairs/bulk', { action, pair_ids: pairIds }),
  updatePairSettings: (id: number, settings: { copy_mode?: boolean; blockText?: boolean; blockImage?: boolean }) =>
    axiosInstance.patch(`/forwarding/pairs/${id}/settings`, settings),
}

// Accounts endpoints
export const accountsAPI = {
  getTelegramAccounts: () => axiosInstance.get('/accounts/telegram'),
  getDiscordAccounts: () => axiosInstance.get('/accounts/discord'),
  addTelegramAccount: (phone: string) => axiosInstance.post('/telegram/session/initiate', { phone }),
  getDiscordAuthUrl: () => axiosInstance.get('/discord/auth-url'),
  removeAccount: (platform: string, id: number) => 
    axiosInstance.delete(`/accounts/${platform}/${id}`),
  switchAccount: (platform: string, id: number) => 
    axiosInstance.post(`/accounts/${platform}/${id}/switch`),
  reconnectAccount: (platform: string, id: number) => 
    axiosInstance.post(`/accounts/${platform}/${id}/reconnect`),
  // New specific endpoints
  deleteTelegramSession: (id: number) => axiosInstance.delete(`/telegram/session/${id}`),
  deleteDiscordSession: (id: number) => axiosInstance.delete(`/discord/session/${id}`),
  reconnectTelegramSession: (id: number) => axiosInstance.post(`/telegram/session/reconnect/${id}`),
  reconnectDiscordSession: (id: number) => axiosInstance.post(`/discord/session/reconnect/${id}`),
  switchTelegramSession: (id: number) => axiosInstance.patch(`/telegram/session/switch/${id}`),
  switchDiscordSession: (id: number) => axiosInstance.patch(`/discord/session/switch/${id}`),
}

// Analytics endpoints
export const analyticsAPI = {
  getUserStats: () => axiosInstance.get('/analytics/stats'),
  getSystemStats: () => axiosInstance.get('/analytics/system'),
  getForwardingStats: (days: number = 7) => 
    axiosInstance.get(`/analytics/pairs?days=${days}`),
  getMessageVolume: (days: number = 30) => 
    axiosInstance.get(`/analytics/volume?days=${days}`),
  getErrorSummary: (days: number = 7) => 
    axiosInstance.get(`/analytics/errors?days=${days}`),
  exportData: (format: 'csv' | 'pdf', type: string) => 
    axiosInstance.get(`/analytics/export?format=${format}&type=${type}`, { 
      responseType: 'blob' 
    }),
}

// System endpoints
export const systemAPI = {
  getHealth: () => axiosInstance.get('/health'),
  getSessionHealth: () => axiosInstance.get('/analytics/session-health'),
  testConnection: () => axiosInstance.get('/health'),
}

// Settings endpoints
export const settingsAPI = {
  updateProfile: (data: any) => axiosInstance.put('/settings/profile', data),
  updateNotifications: (data: any) => axiosInstance.put('/settings/notifications', data),
  deleteAccount: () => axiosInstance.delete('/settings/account'),
  upgradeUser: (plan: string) => axiosInstance.post('/settings/upgrade', { plan }),
}

// Filters endpoints for Block Manager
export const filtersAPI = {
  getReplaceRules: (pairId: number) => axiosInstance.get(`/filters/replace/${pairId}`),
  createReplaceRule: (data: { searchText: string; replaceWith: string; pairId: number }) => 
    axiosInstance.post('/filters/replace', data),
  updateReplaceRule: (id: number, data: { searchText: string; replaceWith: string }) => 
    axiosInstance.put(`/filters/replace/${id}`, data),
  deleteReplaceRule: (id: number) => axiosInstance.delete(`/filters/replace/${id}`),
  updatePairSettings: (pairId: number, settings: { blockText?: boolean; blockImage?: boolean }) =>
    axiosInstance.patch(`/forwarding/pairs/${pairId}/settings`, settings),
}

// API_ENDPOINTS for backwards compatibility
export const API_ENDPOINTS = {
  AUTH: {
    SEND_OTP: '/telegram/send-otp',
    VERIFY_OTP: '/telegram/verify-otp',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  FORWARDING: {
    PAIRS: '/forwarding/pairs',
    BULK: '/forwarding/pairs/bulk',
  },
  ACCOUNTS: {
    TELEGRAM: '/accounts/telegram',
    DISCORD: '/accounts/discord',
  },
  ANALYTICS: {
    USER_STATS: '/analytics/stats',
    SYSTEM_STATS: '/analytics/system',
    FORWARDING_STATS: '/analytics/pairs',
    MESSAGE_VOLUME: '/analytics/volume',
    ERROR_SUMMARY: '/analytics/errors',
    EXPORT: '/analytics/export',
  },
  SYSTEM: {
    HEALTH: '/health',
    SESSION_HEALTH: '/analytics/session-health',
  },
  SETTINGS: {
    PROFILE: '/settings/profile',
    NOTIFICATIONS: '/settings/notifications',
    ACCOUNT: '/settings/account',
    UPGRADE: '/settings/upgrade',
  },
}