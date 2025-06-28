import axios from 'axios';

const API_BASE = '/api';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  usageCount: number;
  isActive: boolean;
  permissions: string[];
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggered: string | null;
  secretKey: string;
}

export class ApiKeyService {
  static async getApiKeys(): Promise<ApiKey[]> {
    const response = await axios.get(`${API_BASE}/api-keys`);
    return response.data;
  }

  static async createApiKey(name: string, permissions: string[]): Promise<ApiKey> {
    const response = await axios.post(`${API_BASE}/api-keys`, {
      name,
      permissions
    });
    return response.data;
  }

  static async deleteApiKey(keyId: string): Promise<void> {
    await axios.delete(`${API_BASE}/api-keys/${keyId}`);
  }

  static async updateApiKey(keyId: string, updates: Partial<ApiKey>): Promise<ApiKey> {
    const response = await axios.put(`${API_BASE}/api-keys/${keyId}`, updates);
    return response.data;
  }

  static async getWebhooks(): Promise<Webhook[]> {
    const response = await axios.get(`${API_BASE}/webhooks`);
    return response.data;
  }

  static async createWebhook(url: string, events: string[]): Promise<Webhook> {
    const response = await axios.post(`${API_BASE}/webhooks`, {
      url,
      events
    });
    return response.data;
  }

  static async deleteWebhook(webhookId: string): Promise<void> {
    await axios.delete(`${API_BASE}/webhooks/${webhookId}`);
  }

  static async testWebhook(webhookId: string): Promise<void> {
    await axios.post(`${API_BASE}/webhooks/${webhookId}/test`);
  }
}