/**
 * WebSocket service for real-time communication with the backend
 * Handles connection management, message handling, and event broadcasting
 */

import React from 'react';

export interface ForwardingPairStatus {
  id: number;
  status: string;
  platform_type: string;
  source_channel: string;
  destination_channel: string;
  delay: number;
  silent_mode: boolean;
  copy_mode: boolean;
}

export interface AccountStatus {
  id: number;
  status: string;
  phone_number?: string;
  bot_name?: string;
}

export interface StatusUpdate {
  type: 'status_update';
  forwarding_pairs: ForwardingPairStatus[];
  telegram_accounts: AccountStatus[];
  discord_accounts: AccountStatus[];
}

export interface PairUpdate {
  type: 'pair_updated';
  pair_id: number;
  status: string;
}

export interface SessionUpdate {
  type: 'session_updated';
  platform: string;
  account_id: number;
  status: string;
}

export interface Notification {
  type: 'notification';
  notification_type: string;
  message: string;
}

export type WebSocketMessage = StatusUpdate | PairUpdate | SessionUpdate | Notification;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private userId: number | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private isConnecting: boolean = false;

  constructor() {
    this.listeners = new Map();
  }

  connect(userId: number) {
    if (this.isConnecting || this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.userId = userId;
    this.isConnecting = true;

    try {
      // Construct WebSocket URL using the same proxy setup as REST API
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Include port from current location
      const wsUrl = `${protocol}//${host}/api/realtime/ws?user_id=${userId}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected', { connected: true });
        
        // Request initial status
        this.send({ type: 'get_status' });
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.emit('disconnected', { connected: false });
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', { error });
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId) {
      this.reconnectAttempts++;
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        if (this.userId) {
          this.connect(this.userId);
        }
      }, this.reconnectInterval);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  send(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    // Emit the message type as an event
    this.emit(message.type, message);
    
    // Also emit a general 'message' event
    this.emit('message', message);
  }

  // Event listener management
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  // Ping to keep connection alive
  ping() {
    this.send({ type: 'ping' });
  }

  // Request fresh status data
  requestStatus() {
    this.send({ type: 'get_status' });
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService();

// React hook for WebSocket connection
export const useWebSocket = (userId: number | null) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionState, setConnectionState] = React.useState('disconnected');

  React.useEffect(() => {
    if (!userId) return;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    webSocketService.on('connected', handleConnect);
    webSocketService.on('disconnected', handleDisconnect);

    // Connect to WebSocket
    webSocketService.connect(userId);

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
      if (webSocketService.isConnected()) {
        webSocketService.ping();
      }
    }, 30000); // Ping every 30 seconds

    return () => {
      webSocketService.off('connected', handleConnect);
      webSocketService.off('disconnected', handleDisconnect);
      clearInterval(pingInterval);
      webSocketService.disconnect();
    };
  }, [userId]);

  return {
    isConnected,
    connectionState,
    send: webSocketService.send.bind(webSocketService),
    on: webSocketService.on.bind(webSocketService),
    off: webSocketService.off.bind(webSocketService),
    requestStatus: webSocketService.requestStatus.bind(webSocketService)
  };
};

export default webSocketService;