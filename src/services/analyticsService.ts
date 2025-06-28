import axios from 'axios';

const API_BASE = '/api';

export interface AnalyticsSummary {
  totalMessages: number;
  messageGrowth: number;
  successRate: number;
  successfulMessages: number;
  activePairs: number;
  totalPairs: number;
  avgDelay: number;
  messageVolume: MessageVolumeData[];
  successRateData: SuccessRateData[];
  pairPerformance: PairPerformanceData[];
  errorData: ErrorAnalysisData[];
  weeklyReport?: WeeklyReportData;
}

export interface MessageVolumeData {
  date: string;
  messages: number;
  successful: number;
  failed: number;
}

export interface SuccessRateData {
  date: string;
  rate: number;
  platform: string;
}

export interface PairPerformanceData {
  id: number;
  sourcePlatform: string;
  destinationPlatform: string;
  messagesCount: number;
  successRate: number;
  avgDelay: number;
  lastActive: string;
}

export interface ErrorAnalysisData {
  type: string;
  count: number;
  percentage: number;
  lastOccurrence: string;
  commonCauses: string[];
}

export interface WeeklyReportData {
  totalMessages: number;
  dailyAverage: number;
  successRate: number;
  improvements: number;
  topPlatform: string;
  platformPercentage: number;
  insights: string[];
}

export class AnalyticsService {
  static async getAnalyticsSummary(period: string = '7d'): Promise<AnalyticsSummary> {
    const response = await axios.get(`${API_BASE}/analytics/summary?period=${period}`);
    return response.data;
  }

  static async getUserStats() {
    const response = await axios.get(`${API_BASE}/analytics/user-stats`);
    return response.data;
  }

  static async getSystemStats() {
    const response = await axios.get(`${API_BASE}/analytics/system-stats`);
    return response.data;
  }

  static async getForwardingPairStats(days: number = 7) {
    const response = await axios.get(`${API_BASE}/analytics/forwarding-pairs?days=${days}`);
    return response.data;
  }

  static async getMessageVolume(days: number = 30) {
    const response = await axios.get(`${API_BASE}/analytics/message-volume?days=${days}`);
    return response.data;
  }

  static async getErrorSummary(days: number = 7) {
    const response = await axios.get(`${API_BASE}/analytics/errors?days=${days}`);
    return response.data;
  }

  static async getSessionHealth() {
    const response = await axios.get(`${API_BASE}/analytics/session-health`);
    return response.data;
  }

  static async exportReport(format: 'csv' | 'pdf', period: string = '7d') {
    const response = await axios.get(`${API_BASE}/analytics/export?format=${format}&period=${period}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  static async generateWeeklyReport() {
    const response = await axios.post(`${API_BASE}/analytics/weekly-report`);
    return response.data;
  }

  static async sendReportToTelegram(reportId: string) {
    const response = await axios.post(`${API_BASE}/analytics/send-report`, {
      report_id: reportId,
      platform: 'telegram'
    });
    return response.data;
  }
}