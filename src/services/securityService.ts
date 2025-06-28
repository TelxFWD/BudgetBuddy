import axios from 'axios';

const API_BASE = '/api';

export interface SecurityOverview {
  activeSessions: number;
  deviceCount: number;
  apiCallsToday: number;
  dailyLimit: number;
  securityScore: number;
  securityLevel: string;
  lastLogin: string;
  lastLoginIP: string;
  sessions: SessionInfo[];
  rateLimitUsage: RateLimitUsage;
  rateLimits: RateLimits;
  securitySettings: SecuritySettings;
  securityAlerts: SecurityAlert[];
}

export interface SessionInfo {
  id: string;
  deviceName: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface RateLimitUsage {
  current: number;
  limit: number;
  resetTime: string;
}

export interface RateLimits {
  api: number;
  messages: number;
  accounts: number;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipWhitelisting: boolean;
  loginNotifications: boolean;
}

export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export class SecurityService {
  static async getSecurityOverview(): Promise<SecurityOverview> {
    const response = await axios.get(`${API_BASE}/security/overview`);
    return response.data;
  }

  static async getSessions(): Promise<SessionInfo[]> {
    const response = await axios.get(`${API_BASE}/security/sessions`);
    return response.data;
  }

  static async logoutSession(sessionId: string): Promise<void> {
    await axios.delete(`${API_BASE}/security/sessions/${sessionId}`);
  }

  static async logoutAllSessions(): Promise<void> {
    await axios.delete(`${API_BASE}/security/sessions`);
  }

  static async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void> {
    await axios.put(`${API_BASE}/security/settings`, settings);
  }

  static async getRateLimits(): Promise<RateLimits> {
    const response = await axios.get(`${API_BASE}/security/rate-limits`);
    return response.data;
  }

  static async getSecurityAlerts(): Promise<SecurityAlert[]> {
    const response = await axios.get(`${API_BASE}/security/alerts`);
    return response.data;
  }
}