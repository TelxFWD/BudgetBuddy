import axios from 'axios';
import { 
  ForwardingPair, 
  ForwardingPairCreate, 
  ForwardingPairUpdate,
  TelegramAccount,
  DiscordAccount,
  TelegramChannel,
  DiscordServer,
  QueueStatus,
  SessionHealth,
  PlanLimits,
  BulkOperation
} from '@/types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-domain.com'
  : 'http://localhost:5000';

class ForwardingService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Forwarding Pairs Management
  async getForwardingPairs(): Promise<ForwardingPair[]> {
    const response = await axios.get(`${API_BASE_URL}/api/forwarding/pairs`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createForwardingPair(pair: ForwardingPairCreate): Promise<ForwardingPair> {
    const response = await axios.post(`${API_BASE_URL}/api/forwarding/pairs`, pair, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async updateForwardingPair(pairId: number, updates: ForwardingPairUpdate): Promise<ForwardingPair> {
    const response = await axios.patch(`${API_BASE_URL}/api/forwarding/pairs/${pairId}`, updates, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async deleteForwardingPair(pairId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/forwarding/pairs/${pairId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async pauseForwardingPair(pairId: number): Promise<ForwardingPair> {
    const response = await axios.post(`${API_BASE_URL}/api/forwarding/pairs/${pairId}/pause`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async resumeForwardingPair(pairId: number): Promise<ForwardingPair> {
    const response = await axios.post(`${API_BASE_URL}/api/forwarding/pairs/${pairId}/resume`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Bulk Operations
  async bulkPairOperation(operation: BulkOperation): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/forwarding/pairs/bulk`, operation, {
      headers: this.getAuthHeaders(),
    });
  }

  // Account Management
  async getTelegramAccounts(): Promise<TelegramAccount[]> {
    const response = await axios.get(`${API_BASE_URL}/api/accounts/telegram`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getDiscordAccounts(): Promise<DiscordAccount[]> {
    const response = await axios.get(`${API_BASE_URL}/api/accounts/discord`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async addTelegramAccount(phoneNumber: string): Promise<{ requires_otp: boolean; session_id?: string }> {
    const response = await axios.post(`${API_BASE_URL}/api/accounts/telegram`, 
      { phone_number: phoneNumber }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async verifyTelegramOTP(phoneNumber: string, otpCode: string): Promise<TelegramAccount> {
    const response = await axios.post(`${API_BASE_URL}/api/accounts/telegram/verify`, 
      { phone_number: phoneNumber, otp_code: otpCode }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async removeTelegramAccount(accountId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/accounts/telegram/${accountId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async addDiscordAccount(discordToken: string): Promise<DiscordAccount> {
    const response = await axios.post(`${API_BASE_URL}/api/accounts/discord`, 
      { discord_token: discordToken }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async removeDiscordAccount(accountId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/accounts/discord/${accountId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Channel Management
  async getTelegramChannels(accountId: number): Promise<TelegramChannel[]> {
    const response = await axios.get(`${API_BASE_URL}/api/accounts/telegram/${accountId}/channels`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getDiscordServers(accountId: number): Promise<DiscordServer[]> {
    const response = await axios.get(`${API_BASE_URL}/api/accounts/discord/${accountId}/servers`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Status and Health
  async getQueueStatus(): Promise<QueueStatus> {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/queue-status`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getSessionHealth(): Promise<SessionHealth> {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/session-health`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getPlanLimits(): Promise<PlanLimits> {
    const response = await axios.get(`${API_BASE_URL}/api/forwarding/plan-limits`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Real-time sync via polling (WebSocket can be added later)
  startRealTimeSync(callbacks: {
    onPairUpdate?: (pair: ForwardingPair) => void;
    onSessionHealthUpdate?: (health: SessionHealth) => void;
    onQueueStatusUpdate?: (status: QueueStatus) => void;
  }): () => void {
    const intervals: NodeJS.Timeout[] = [];

    // Poll for pair updates every 10 seconds
    if (callbacks.onPairUpdate) {
      const pairInterval = setInterval(async () => {
        try {
          const pairs = await this.getForwardingPairs();
          pairs.forEach(callbacks.onPairUpdate!);
        } catch (error) {
          console.error('Failed to fetch pair updates:', error);
        }
      }, 10000);
      intervals.push(pairInterval);
    }

    // Poll for session health every 30 seconds
    if (callbacks.onSessionHealthUpdate) {
      const healthInterval = setInterval(async () => {
        try {
          const health = await this.getSessionHealth();
          callbacks.onSessionHealthUpdate!(health);
        } catch (error) {
          console.error('Failed to fetch session health:', error);
        }
      }, 30000);
      intervals.push(healthInterval);
    }

    // Poll for queue status every 15 seconds
    if (callbacks.onQueueStatusUpdate) {
      const queueInterval = setInterval(async () => {
        try {
          const status = await this.getQueueStatus();
          callbacks.onQueueStatusUpdate!(status);
        } catch (error) {
          console.error('Failed to fetch queue status:', error);
        }
      }, 15000);
      intervals.push(queueInterval);
    }

    // Return cleanup function
    return () => {
      intervals.forEach(clearInterval);
    };
  }
}

export const forwardingService = new ForwardingService();