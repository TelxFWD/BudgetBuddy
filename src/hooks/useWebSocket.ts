import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { updateForwardingPairStatus, updateStats } from '@/store/slices/dashboardSlice';
import { toast } from 'react-hot-toast';

interface WebSocketMessage {
  type: string;
  data: any;
  user_id?: number;
}

export const useWebSocket = () => {
  const { user, tokens } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxRetries = 5;

  const connect = () => {
    if (!user || !tokens || ws.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const wsUrl = `ws://${window.location.hostname}:8000/ws?user_id=${user.id}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionAttempts(0);
        
        // Send authentication
        ws.current?.send(JSON.stringify({
          type: 'auth',
          token: tokens.access_token
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Reconnect if not intentionally closed
        if (event.code !== 1000 && connectionAttempts < maxRetries) {
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, Math.pow(2, connectionAttempts) * 1000); // Exponential backoff
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'forwarding_pair_status':
        dispatch(updateForwardingPairStatus({
          pairId: message.data.pair_id,
          status: message.data.status,
          lastForwarded: message.data.last_forwarded
        }));
        break;

      case 'session_status':
        toast.success(`${message.data.platform} session ${message.data.status}`);
        break;

      case 'queue_stats':
        dispatch(updateStats({
          queueStats: message.data
        }));
        break;

      case 'notification':
        switch (message.data.priority) {
          case 'high':
            toast.error(message.data.message);
            break;
          case 'normal':
            toast.success(message.data.message);
            break;
          case 'low':
            toast(message.data.message);
            break;
        }
        break;

      case 'system_health':
        // Update system health in store
        break;

      case 'message_forwarded':
        // Update real-time stats
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close(1000, 'User initiated disconnect');
      ws.current = null;
    }
  };

  useEffect(() => {
    if (user && tokens) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, tokens]);

  return {
    isConnected,
    sendMessage,
    connect,
    disconnect
  };
};