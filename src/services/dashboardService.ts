import { api } from './authService';
import { UserStats, SystemHealth } from '@/types';

export const dashboardService = {
  async getUserStats(): Promise<UserStats> {
    const response = await api.get('/analytics/user-stats');
    return response.data;
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get('/health');
    return response.data;
  },
};