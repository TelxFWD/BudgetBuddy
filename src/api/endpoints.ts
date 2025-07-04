import axiosInstance from './axiosInstance'

// Auth endpoints
export const authAPI = {
  sendOTP: (phone: string) => axiosInstance.post('/api/telegram/send-otp', { phone }),
  verifyOTP: (phone: string, otp: string) => axiosInstance.post('/api/telegram/verify-otp', { phone, otp }),
  refreshToken: (refresh_token: string) => axiosInstance.post('/api/auth/refresh', { refresh_token }),
  getMe: () => axiosInstance.get('/api/auth/me'),
  logout: () => axiosInstance.post('/api/auth/logout'),
}

// Forwarding pairs endpoints
export const forwardingAPI = {
  getPairs: () => axiosInstance.get('/api/forwarding/pairs'),
  createPair: (data: any) => axiosInstance.post('/api/forwarding/pairs', data),
  updatePair: (id: number, data: any) => axiosInstance.put(`/api/forwarding/pairs/${id}`, data),
  deletePair: (id: number) => axiosInstance.delete(`/api/forwarding/pairs/${id}`),
  pausePair: (id: number) => axiosInstance.post(`/api/forwarding/pairs/${id}/pause`),
  resumePair: (id: number) => axiosInstance.post(`/api/forwarding/pairs/${id}/resume`),
  bulkAction: (action: string, pairIds: number[]) => 
    axiosInstance.post('/api/forwarding/pairs/bulk', { action, pair_ids: pairIds }),
  updatePairSettings: (id: number, settings: { copy_mode?: boolean; block_text?: boolean; block_images?: boolean }) =>
    axiosInstance.patch(`/api/forwarding/pairs/${id}/settings`, settings),
}

// Accounts endpoints
export const accountsAPI = {
  getTelegramAccounts: () => axiosInstance.get('/api/accounts/telegram'),
  getDiscordAccounts: () => axiosInstance.get('/api/accounts/discord'),
  addTelegramAccount: (phone: string) => axiosInstance.post('/api/telegram/session/initiate', { phone }),
  getDiscordAuthUrl: () => axiosInstance.get('/api/discord/auth-url'),
  removeAccount: (platform: string, id: number) => 
    axiosInstance.delete(`/api/accounts/${platform}/${id}`),
  switchAccount: (platform: string, id: number) => 
    axiosInstance.post(`/api/accounts/${platform}/${id}/switch`),
  reconnectAccount: (platform: string, id: number) => 
    axiosInstance.post(`/api/accounts/${platform}/${id}/reconnect`),
  // New specific endpoints
  deleteTelegramSession: (id: number) => axiosInstance.delete(`/api/telegram/session/${id}`),
  deleteDiscordSession: (id: number) => axiosInstance.delete(`/api/discord/session/${id}`),
  reconnectTelegramSession: (id: number) => axiosInstance.post(`/api/telegram/session/reconnect/${id}`),
  reconnectDiscordSession: (id: number) => axiosInstance.post(`/api/discord/session/reconnect/${id}`),
  switchTelegramSession: (id: number) => axiosInstance.patch(`/api/telegram/session/switch/${id}`),
  switchDiscordSession: (id: number) => axiosInstance.patch(`/api/discord/session/switch/${id}`),
}

// Analytics endpoints
export const analyticsAPI = {
  getUserStats: () => axiosInstance.get('/api/analytics/stats'),
  getSystemStats: () => axiosInstance.get('/api/analytics/system'),
  getForwardingStats: (days: number = 7) => 
    axiosInstance.get(`/api/analytics/pairs?days=${days}`),
  getMessageVolume: (days: number = 30) => 
    axiosInstance.get(`/api/analytics/volume?days=${days}`),
  getErrorSummary: (days: number = 7) => 
    axiosInstance.get(`/api/analytics/errors?days=${days}`),
  exportData: (format: 'csv' | 'pdf', type: string) => 
    axiosInstance.get(`/api/analytics/export?format=${format}&type=${type}`, { 
      responseType: 'blob' 
    }),
}

// System endpoints
export const systemAPI = {
  getHealth: () => axiosInstance.get('/api/health'),
  getSessionHealth: () => axiosInstance.get('/api/analytics/session-health'),
  testConnection: () => axiosInstance.get('/api/health'),
}

// Settings endpoints
export const settingsAPI = {
  updateProfile: (data: any) => axiosInstance.put('/api/settings/profile', data),
  updateNotifications: (data: any) => axiosInstance.put('/api/settings/notifications', data),
  deleteAccount: () => axiosInstance.delete('/api/settings/account'),
  upgradeUser: (plan: string) => axiosInstance.post('/api/settings/upgrade', { plan }),
}

// Filters endpoints for Block Manager
export const filtersAPI = {
  getReplaceRules: (pairId: number) => axiosInstance.get(`/api/filters/replace/${pairId}`),
  createReplaceRule: (data: { searchText: string; replaceWith: string; pairId: number }) => 
    axiosInstance.post('/api/filters/replace', data),
  updateReplaceRule: (id: number, data: { searchText: string; replaceWith: string }) => 
    axiosInstance.put(`/api/filters/replace/${id}`, data),
  deleteReplaceRule: (id: number) => axiosInstance.delete(`/api/filters/replace/${id}`),
  updatePairSettings: (pairId: number, settings: { blockText?: boolean; blockImage?: boolean }) =>
    axiosInstance.patch(`/api/forwarding/pairs/${pairId}/settings`, settings),
}

// API_ENDPOINTS for backwards compatibility
export const API_ENDPOINTS = {
  AUTH: {
    SEND_OTP: '/api/telegram/send-otp',
    VERIFY_OTP: '/api/telegram/verify-otp',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    LOGOUT: '/api/auth/logout',
  },
  FORWARDING: {
    PAIRS: '/api/forwarding/pairs',
    BULK: '/api/forwarding/pairs/bulk',
  },
  ACCOUNTS: {
    TELEGRAM: '/api/accounts/telegram',
    DISCORD: '/api/accounts/discord',
  },
  ANALYTICS: {
    USER_STATS: '/api/analytics/stats',
    SYSTEM_STATS: '/api/analytics/system',
    FORWARDING_STATS: '/api/analytics/pairs',
    MESSAGE_VOLUME: '/api/analytics/volume',
    ERROR_SUMMARY: '/api/analytics/errors',
    EXPORT: '/api/analytics/export',
  },
  SYSTEM: {
    HEALTH: '/api/health',
    SESSION_HEALTH: '/api/analytics/session-health',
  },
  SETTINGS: {
    PROFILE: '/api/settings/profile',
    NOTIFICATIONS: '/api/settings/notifications',
    ACCOUNT: '/api/settings/account',
    UPGRADE: '/api/settings/upgrade',
  },
}