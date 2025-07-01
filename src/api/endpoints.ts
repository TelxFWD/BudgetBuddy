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
}

// Accounts endpoints
export const accountsAPI = {
  getTelegramAccounts: () => axiosInstance.get('/accounts/telegram'),
  getDiscordAccounts: () => axiosInstance.get('/accounts/discord'),
  addTelegramAccount: (data: any) => axiosInstance.post('/accounts/telegram', data),
  addDiscordAccount: (data: any) => axiosInstance.post('/accounts/discord', data),
  removeAccount: (platform: string, id: number) => 
    axiosInstance.delete(`/accounts/${platform}/${id}`),
  switchAccount: (platform: string, id: number) => 
    axiosInstance.post(`/accounts/${platform}/${id}/switch`),
  reconnectAccount: (platform: string, id: number) => 
    axiosInstance.post(`/accounts/${platform}/${id}/reconnect`),
}

// Analytics endpoints
export const analyticsAPI = {
  getUserStats: () => axiosInstance.get('/analytics/user-stats'),
  getSystemStats: () => axiosInstance.get('/analytics/system-stats'),
  getForwardingStats: (days: number = 7) => 
    axiosInstance.get(`/analytics/forwarding-pairs?days=${days}`),
  getMessageVolume: (days: number = 30) => 
    axiosInstance.get(`/analytics/message-volume?days=${days}`),
  getErrorSummary: (days: number = 7) => 
    axiosInstance.get(`/analytics/error-summary?days=${days}`),
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